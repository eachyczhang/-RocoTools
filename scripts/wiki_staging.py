#!/usr/bin/env python3
"""
Fetch BWIKI data into isolated per-entity folders and selectively import it.

Fetch never writes the canonical data/*.json files or downloads images.
Remote image URLs are retained as review metadata so the admin review page can
download an image only after a new entity has been explicitly confirmed.
Import is dry-run by default. Use --apply to write a backed-up local SQLite DB.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STAGE = ROOT / "data" / "wiki-staging"
DEFAULT_RELEASES = ROOT / "data" / "wiki-releases"
DEFAULT_DB = ROOT / "app" / "server" / "data" / "roco.db"
DEFAULT_PUBLIC = ROOT / "data" / "public"
SCRAPERS = ROOT / "crawler" / "scrapers"

PET_FIELDS = (
    "pet_id", "name", "element", "sub_element", "ability_name", "ability_desc",
    "hp", "speed", "atk", "matk", "def", "mdef", "total",
)
PET_BASIC_FIELDS = tuple(
    field for field in PET_FIELDS if field not in {"pet_id", "name"}
)
DETAIL_FIELDS = (
    "height", "weight", "location", "evolution_chain",
    "restrain_strong", "restrain_weak", "restrain_resist", "restrain_resisted",
)
SKILL_FIELDS = ("name", "element", "category", "cost", "power", "description")
SKILL_SET_KEYS = ("skills", "bloodline_skills", "learnable_stones")
PET_SUPPLEMENT_KEYS = ("height", "weight", *SKILL_SET_KEYS, "egg_groups")
IMAGE_KEYS = {
    "image_url", "thumb_url", "icon_url", "ability_icon", "avatar_url",
    "image_default", "image_shiny", "image_fruit", "image_egg",
    "review_avatar_url", "review_ability_icon_url", "review_icon_url",
}
IGNORED_IMPORT_FIELDS = {"version"}
RESOLVED_REVIEW_DECISIONS = {
    "approved-new", "approved-fields", "approved-reference",
    "approved-no-change", "approved-uid-migration", "auto-unchanged", "ignored",
}
ENTITY_STAGE_DIRS = ("skills", "abilities", "pets")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_scraper(module_name: str, filename: str):
    spec = importlib.util.spec_from_file_location(module_name, SCRAPERS / filename)
    if not spec or not spec.loader:
        raise RuntimeError(f"无法加载爬虫模块：{filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fetch_with_retries(fetcher, page_title: str, attempts: int = 3) -> str:
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return fetcher(page_title)
        except Exception as error:
            if getattr(error, "stop_retry", False):
                raise
            last_error = error
            if attempt == attempts:
                break
            wait_seconds = attempt * 2
            print(f"[RETRY] {page_title} 连接失败：{error}；{wait_seconds}s 后重试")
            time.sleep(wait_seconds)
    raise RuntimeError(f"{page_title} 获取失败（{attempts} 次）：{last_error}")


def open_db(path: Path) -> sqlite3.Connection | None:
    if not path.exists():
        return None
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def element_lookup(db: sqlite3.Connection | None) -> dict[str, int]:
    if not db:
        return {}
    return {row["name"]: row["id"] for row in db.execute("SELECT id, name FROM elements")}


def existing_pet_names(db: sqlite3.Connection | None) -> dict[tuple[str, str], str]:
    if not db:
        return {}
    return {
        (row["pet_id"], row["name"]): row["uid"]
        for row in db.execute("SELECT uid, pet_id, name FROM pets")
    }


def existing_skills(db: sqlite3.Connection | None) -> tuple[dict[str, str], set[str]]:
    if not db:
        return {}, set()
    rows = list(db.execute("SELECT uid, name FROM skills"))
    return {row["name"]: row["uid"] for row in rows}, {row["uid"] for row in rows}


def prepare_pet_parser(stage: Path, db: sqlite3.Connection | None):
    module = load_scraper("rocotools_fetch_pet_list", "fetch_pet_list.py")
    meta_dir = stage / ".meta" / "pets"
    meta_dir.mkdir(parents=True, exist_ok=True)
    module.OUTPUT_DIR = str(meta_dir)

    canonical_map = read_json(ROOT / "data" / "pets" / "_uid_mapping.json", {}) or {}
    for (pet_id, name), uid in existing_pet_names(db).items():
        canonical_map.setdefault(f"{pet_id}::{name}", uid)
    write_json(meta_dir / "_uid_mapping.json", canonical_map)
    return module


def parse_remote_lists(stage: Path, db: sqlite3.Connection | None, pet_html: str, skill_html: str):
    pet_module = prepare_pet_parser(stage, db)
    pets = pet_module.parse_pet_list(pet_html)
    if not pets:
        raise RuntimeError("BWIKI 精灵筛选页未解析出数据")
    skills = []
    if skill_html is not None:
        skill_module = load_scraper("rocotools_fetch_skill_list", "fetch_skill_list.py")
        skills = skill_module.parse_skill_list(skill_html)
        if not skills:
            raise RuntimeError("BWIKI 技能查询页未解析出数据")

    name_to_uid, used_uids = existing_skills(db)
    next_skill_id = max(
        [int(match.group(1)) for uid in used_uids if (match := re.fullmatch(r"skill_(\d+)", uid))],
        default=0,
    ) + 1

    for skill in skills:
        uid = name_to_uid.get(skill["name"])
        if not uid:
            while f"skill_{next_skill_id}" in used_uids:
                next_skill_id += 1
            uid = f"skill_{next_skill_id}"
            used_uids.add(uid)
            next_skill_id += 1
        skill["uid"] = uid

        image_name = unquote(Path(skill.get("icon_url") or "").name)
        source_match = re.search(r"Skill[ _](\d+)", image_name, re.IGNORECASE)
        skill["source_id"] = skill.get("source_id") or (source_match.group(1) if source_match else None)

    return pets, skills


def fetch_remote_lists(stage: Path, db: sqlite3.Connection | None, include_skills: bool):
    pet_module = prepare_pet_parser(stage, db)
    pet_html = fetch_with_retries(pet_module.fetch_page_html, "精灵筛选")
    skill_html = None
    if include_skills:
        skill_module = load_scraper("rocotools_fetch_skill_list", "fetch_skill_list.py")
        skill_html = fetch_with_retries(skill_module.fetch_page_html, "技能查询")
    return parse_remote_lists(stage, db, pet_html, skill_html)


def read_saved_page(path_value: str, label: str) -> str:
    path = Path(path_value).expanduser().resolve()
    if not path.is_file():
        raise RuntimeError(f"{label}文件不存在：{path}")
    try:
        content = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError as error:
        raise RuntimeError(f"{label}不是 UTF-8 文本：{path}") from error
    if not content.strip():
        raise RuntimeError(f"{label}文件为空：{path}")

    if content.lstrip().startswith("{"):
        try:
            payload = json.loads(content)
        except json.JSONDecodeError as error:
            raise RuntimeError(f"{label} JSON 无法解析：{path}") from error
        parsed = payload.get("parse", {}).get("text")
        if isinstance(parsed, dict):
            parsed = parsed.get("*")
        if not isinstance(parsed, str) or not parsed.strip():
            raise RuntimeError(f"{label} JSON 不含 parse.text HTML：{path}")
        content = parsed

    print(f"[OFFLINE] {label}：{path.name}")
    return content


def normalize_pet_selector(value: str) -> str:
    value = value.strip()
    if value.startswith("pet_"):
        return value
    if value.isdigit():
        return value.zfill(3)
    return value


def select_pets(pets: list[dict], selectors: list[str], fetch_all: bool) -> list[dict]:
    if fetch_all:
        return pets
    wanted = {normalize_pet_selector(value) for value in selectors}
    selected = [
        pet for pet in pets
        if pet["uid"] in wanted or pet["pet_id"] in wanted or pet["name"] in wanted
    ]
    missing = sorted(wanted - {
        key
        for pet in selected
        for key in (pet["uid"], pet["pet_id"], pet["name"])
    })
    if missing:
        print(f"[WARN] 未匹配精灵选择器：{', '.join(missing)}")
    return selected


def select_skills(skills: list[dict], selectors: list[str], fetch_all: bool) -> list[dict]:
    if fetch_all:
        return skills
    wanted = {value.strip() for value in selectors}
    wanted.update(f"skill_{value}" for value in selectors if value.isdigit())
    selected = [
        skill for skill in skills
        if skill["uid"] in wanted
        or skill["name"] in wanted
        or (skill.get("source_id") and skill["source_id"] in wanted)
    ]
    if selectors and not selected:
        print("[WARN] 技能选择器未匹配；可使用 skill_N、技能名称或 BWIKI source_id")
    return selected


def without_images(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: without_images(item)
            for key, item in value.items()
            if key not in IMAGE_KEYS
        }
    if isinstance(value, list):
        return [without_images(item) for item in value]
    return value


def fetch_pet_details(selected: list[dict]) -> dict[str, dict]:
    if not selected:
        return {}
    module = load_scraper("rocotools_fetch_pet_detail", "fetch_pet_detail.py")
    names = sorted({pet["name"] for pet in selected})
    results: dict[str, dict] = {}

    def fetch_one(name: str):
        html = fetch_with_retries(module.fetch_page_html, name)
        detail = module.parse_detail(html)
        time.sleep(0.25)
        return name, detail

    workers = min(4, len(names))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(fetch_one, name): name for name in names}
        for index, future in enumerate(as_completed(futures), start=1):
            name = futures[future]
            try:
                fetched_name, detail = future.result()
                results[fetched_name] = detail
                print(f"[DETAIL {index}/{len(names)}] {fetched_name}")
            except Exception as error:
                print(f"[WARN] {name} 详情抓取失败：{error}")
                results[name] = {}
    return results


def parse_detail_file_assignments(values: list[str]) -> dict[str, Path]:
    assignments: dict[str, Path] = {}
    for value in values:
        name, separator, file_value = value.partition("=")
        name = name.strip()
        file_value = file_value.strip()
        if not separator or not name or not file_value:
            raise RuntimeError("--pet-detail-html 必须使用“精灵名称=HTML路径”格式")
        key = normalize_match_name(name)
        if key in assignments:
            raise RuntimeError(f"重复的详情 HTML 映射：{name}")
        assignments[key] = Path(file_value).expanduser().resolve()
    return assignments


def index_detail_directory(path_value: str | None) -> dict[str, Path]:
    if not path_value:
        return {}
    directory = Path(path_value).expanduser().resolve()
    if not directory.is_dir():
        raise RuntimeError(f"精灵详情 HTML 目录不存在：{directory}")
    indexed: dict[str, Path] = {}
    for path in sorted(directory.iterdir()):
        if not path.is_file() or path.suffix.casefold() not in {".html", ".htm", ".json"}:
            continue
        key = normalize_match_name(unquote(path.stem))
        if key in indexed:
            raise RuntimeError(f"详情目录存在重名文件：{indexed[key].name} / {path.name}")
        indexed[key] = path
    return indexed


def load_saved_pet_details(
    selected: list[dict],
    detail_directory: str | None,
    detail_assignments: list[str],
) -> dict[str, dict]:
    if not detail_directory and not detail_assignments:
        return {}
    module = load_scraper("rocotools_fetch_pet_detail", "fetch_pet_detail.py")
    files = index_detail_directory(detail_directory)
    explicit_files = parse_detail_file_assignments(detail_assignments)
    files.update(explicit_files)
    selected_by_key = {
        normalize_match_name(pet["name"]): pet["name"]
        for pet in selected
    }
    unknown = sorted(key for key in explicit_files if key not in selected_by_key)
    if unknown:
        raise RuntimeError(
            "详情 HTML 未匹配当前选择的精灵；请检查文件名或 --pet 选择器："
            + ", ".join(files[key].name for key in unknown)
        )

    details: dict[str, dict] = {}
    for key, name in selected_by_key.items():
        path = files.get(key)
        if not path:
            print(f"[OFFLINE WARN] {name} 没有详情 HTML，仅使用列表基础数据")
            continue
        html = read_saved_page(str(path), f"{name}详情")
        details[name] = module.parse_detail(html)
        print(f"[OFFLINE DETAIL] {name}")
    return details


def parse_json_value(value: Any, default: Any) -> Any:
    if value is None:
        return default
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default


def local_pet_snapshot(db: sqlite3.Connection | None, uid: str) -> dict | None:
    if not db:
        return None
    row = db.execute(
        """
        SELECT p.uid, p.pet_id, p.name, e.name AS element, se.name AS sub_element,
               p.ability_name, p.ability_desc, p.hp, p.speed, p.atk, p.matk,
               p.def, p.mdef, p.total, p.manual_edit AS pet_manual_edit,
               pd.image_default, pd.image_shiny, pd.image_fruit, pd.image_egg,
               pd.ability_icon
        FROM pets p
        LEFT JOIN elements e ON e.id = p.element_id
        LEFT JOIN elements se ON se.id = p.sub_element_id
        LEFT JOIN pet_details pd ON pd.pet_uid = p.uid
        WHERE p.uid = ?
        """,
        (uid,),
    ).fetchone()
    if not row:
        return None

    data = {field: row[field] for field in PET_FIELDS}
    data["uid"] = row["uid"]
    for field in ("image_default", "image_shiny", "image_fruit", "image_egg", "ability_icon"):
        data[field] = row[field]
    return {
        "data": data,
        "manual_edit": {"pet": bool(row["pet_manual_edit"])},
    }


def local_skill_snapshot(db: sqlite3.Connection | None, uid: str) -> dict | None:
    if not db:
        return None
    row = db.execute(
        """
        SELECT s.uid, s.name, e.name AS element, s.category, s.cost, s.power,
               s.description, s.manual_edit
        FROM skills s LEFT JOIN elements e ON e.id = s.element_id WHERE s.uid = ?
        """,
        (uid,),
    ).fetchone()
    if not row:
        return None
    return {
        "data": {field: row[field] for field in SKILL_FIELDS} | {"uid": row["uid"]},
        "manual_edit": {"skill": bool(row["manual_edit"])},
    }


def local_ability_snapshot(db: sqlite3.Connection | None, name: str) -> dict | None:
    if not db:
        return None
    rows = db.execute(
        """
        SELECT uid, ability_desc, manual_edit FROM pets
        WHERE ability_name = ? ORDER BY uid
        """,
        (name,),
    ).fetchall()
    if not rows:
        return None
    descriptions = list(dict.fromkeys((row["ability_desc"] or "") for row in rows))
    return {
        "data": {
            "name": name,
            "description": descriptions[0] if len(descriptions) == 1 else descriptions,
            "description_variants": descriptions,
            "pet_uids": [row["uid"] for row in rows],
        },
        "manual_edit": {
            "pet_uids": [row["uid"] for row in rows if row["manual_edit"]],
        },
    }


def normalize_match_name(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "")).casefold()


def normalize_pet_form_name(value: Any) -> str:
    """Normalize BWIKI/local form labels to their shared species name."""
    text = normalize_match_name(value)
    text = re.sub(r"[\uFF08(][^\uFF09)]*[\uFF09)]$", "", text)
    return text


def normalize_pet_form_label(value: Any) -> str:
    """Normalize equivalent parenthetical form labels without discarding the form."""
    text = normalize_match_name(value)
    match = re.search(r"[（(]([^）)]*)[）)]$", text)
    if not match:
        return ""
    label = re.sub(r"的样子$", "", match.group(1))
    return re.sub(r"^(储水|枯水)时$", r"\1期", label)


def pet_uid_suffix(uid: Any) -> int:
    match = re.search(r"_(\d+)$", str(uid or ""))
    return int(match.group(1)) if match else 0


def match_local_entity(
    db: sqlite3.Connection | None,
    entity: str,
    remote_data: dict,
) -> tuple[dict | None, dict]:
    remote_name = remote_data.get("name")
    normalized_name = normalize_match_name(remote_name)
    remote_identity = {
        "uid": remote_data.get("uid"),
        "pet_id": remote_data.get("pet_id") if entity == "pet" else None,
        "source_id": remote_data.get("source_id") if entity == "skill" else None,
        "name": remote_name,
    }
    if not db:
        return None, {
            "status": "unmatched",
            "basis": "identity",
            "remote": remote_identity,
            "local": None,
            "candidates": [],
            "safe_to_compare": False,
            "safe_to_import": False,
        }

    if entity == "pet":
        rows = db.execute("SELECT uid, pet_id, name FROM pets ORDER BY uid").fetchall()
    elif entity == "skill":
        rows = db.execute("SELECT uid, name FROM skills ORDER BY uid").fetchall()
    elif entity == "ability":
        rows = db.execute(
            "SELECT ability_name AS name FROM pets "
            "WHERE ability_name IS NOT NULL GROUP BY ability_name ORDER BY ability_name"
        ).fetchall()
    else:
        raise ValueError(f"不支持名称匹配的实体：{entity}")
    if entity == "pet":
        remote_uid = str(remote_data.get("uid") or "")
        uid_candidates = [
            dict(row) for row in rows
            if remote_uid and str(row["uid"] or "") == remote_uid
        ]
        if uid_candidates:
            candidate = uid_candidates[0]
            local = local_pet_snapshot(db, candidate["uid"])
            identity_changed = (
                normalize_match_name(candidate.get("name")) != normalized_name
                or str(candidate.get("pet_id") or "") != str(remote_data.get("pet_id") or "")
            )
            return local, {
                "status": "id-match-name-different" if identity_changed else "matched",
                "basis": "uid",
                "remote": remote_identity,
                "local": candidate,
                "candidates": [candidate],
                "safe_to_compare": True,
                "safe_to_import": True,
            }

    candidates = [
        dict(row) for row in rows
        if normalize_match_name(row["name"]) == normalized_name
    ]
    match_basis = "normalized-name"
    form_candidates = []
    if entity == "pet" and remote_data.get("pet_id") is not None and not candidates:
        remote_pet_id = str(remote_data.get("pet_id") or "")
        remote_form_label = normalize_pet_form_label(remote_name)
        if remote_form_label:
            form_candidates = [
                dict(row) for row in rows
                if str(row["pet_id"] or "") == remote_pet_id
                and normalize_pet_form_label(row["name"]) == remote_form_label
            ]
            if form_candidates:
                candidates = sorted(form_candidates, key=lambda row: (pet_uid_suffix(row["uid"]), str(row["uid"])))
                match_basis = "pet-id-form-label"
        if not candidates:
            remote_form_name = normalize_pet_form_name(remote_name)
            form_candidates = [
                dict(row) for row in rows
                if str(row["pet_id"] or "") == remote_pet_id
                and normalize_pet_form_name(row["name"]) == remote_form_name
            ]
            if form_candidates:
                candidates = sorted(form_candidates, key=lambda row: (pet_uid_suffix(row["uid"]), str(row["uid"])))
                match_basis = "pet-id-form-name"
    if len(candidates) == 1:
        candidate = candidates[0]
    elif form_candidates:
        candidate = candidates[0]
        local = local_pet_snapshot(db, candidate["uid"])
        return local, {
            "status": "name-match-id-different",
            "basis": match_basis,
            "remote": remote_identity,
            "local": candidate,
            "candidates": candidates,
            "safe_to_compare": True,
            "safe_to_import": True,
        }
    elif entity == "pet" and not candidates and remote_data.get("pet_id") is not None:
        remote_pet_id = str(remote_data.get("pet_id") or "")
        pet_id_candidates = [
            dict(row) for row in rows
            if str(row["pet_id"] or "") == remote_pet_id
        ]
        if len(pet_id_candidates) == 1 and not remote_identity["uid"]:
            candidate = pet_id_candidates[0]
            local = local_pet_snapshot(db, candidate["uid"])
            return local, {
                "status": "id-match-name-different",
                "basis": "pet-id",
                "remote": remote_identity,
                "local": candidate,
                "candidates": pet_id_candidates,
                "safe_to_compare": True,
                "safe_to_import": True,
            }
        return None, {
            "status": "unmatched" if remote_identity["uid"] else ("ambiguous" if pet_id_candidates else "unmatched"),
            "basis": "uid-new-form" if remote_identity["uid"] else "pet-id",
            "remote": remote_identity,
            "local": None,
            "candidates": pet_id_candidates,
            "safe_to_compare": False,
            "safe_to_import": False,
        }
    else:
        return None, {
            "status": "ambiguous" if candidates else "unmatched",
            "basis": "normalized-name",
            "remote": remote_identity,
            "local": None,
            "candidates": candidates,
            "safe_to_compare": False,
            "safe_to_import": False,
        }

    if entity == "pet":
        local = local_pet_snapshot(db, candidate["uid"])
    elif entity == "skill":
        local = local_skill_snapshot(db, candidate["uid"])
    else:
        local = local_ability_snapshot(db, candidate["name"])
    identifiers_differ = (
        entity in {"pet", "skill"}
        and remote_data.get("uid") != candidate["uid"]
    )
    if entity == "pet":
        identifiers_differ = identifiers_differ or (
            str(remote_data.get("pet_id") or "") != str(candidate.get("pet_id") or "")
        )
    return local, {
        "status": "name-match-id-different" if identifiers_differ else "matched",
        "basis": match_basis,
        "remote": remote_identity,
        "local": candidate,
        "candidates": [candidate],
        "safe_to_compare": True,
        "safe_to_import": not identifiers_differ,
    }


def nested_value(data: dict, path: str) -> Any:
    value: Any = data
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def comparison_paths(entity: str) -> list[str]:
    if entity == "pet":
        return list(PET_BASIC_FIELDS)
    if entity == "skill":
        return [field for field in SKILL_FIELDS if field != "name"]
    if entity == "ability":
        return []
    raise ValueError(f"未知实体类型：{entity}")


def comparable_value(path: str, value: Any) -> Any:
    if path not in {f"detail.{key}" for key in SKILL_SET_KEYS} or not isinstance(value, list):
        return value
    normalized = []
    for item in value:
        reference = item.get("skill_ref") or {}
        level = item.get("level")
        level_match = re.search(r"\d+", str(level)) if level is not None else None
        normalized.append({
            "level": level_match.group(0) if level_match else None,
            "name": item.get("name"),
            "element": item.get("element"),
            "type": item.get("type"),
            "cost": item.get("cost") or 0,
            "power": item.get("power") or 0,
            "description": item.get("description"),
            "skill_ref_uid": item.get("skill_ref_uid") or reference.get("uid"),
        })
    return normalized


def build_skill_collection_diff(remote_value: Any, local_value: Any) -> dict:
    remote_items = remote_value if isinstance(remote_value, list) else []
    local_items = local_value if isinstance(local_value, list) else []

    def item_key(item: dict) -> str:
        return str(item.get("name") or item.get("skill_ref_uid") or "")

    remote_by_key = {item_key(item): item for item in remote_items if item_key(item)}
    local_by_key = {item_key(item): item for item in local_items if item_key(item)}
    added = [
        {"key": key, "remote": remote_by_key[key]}
        for key in sorted(remote_by_key.keys() - local_by_key.keys())
    ]
    removed = [
        {"key": key, "local": local_by_key[key]}
        for key in sorted(local_by_key.keys() - remote_by_key.keys())
    ]
    changed = []
    same = 0
    for key in sorted(remote_by_key.keys() & local_by_key.keys()):
        remote_item = remote_by_key[key]
        local_item = local_by_key[key]
        field_changes = {
            field: {"local": local_item.get(field), "remote": remote_item.get(field)}
            for field in sorted(remote_item.keys() | local_item.keys())
            if remote_item.get(field) != local_item.get(field)
            and not (
                field == "skill_ref_uid"
                and (remote_item.get(field) is None or local_item.get(field) is None)
            )
        }
        if field_changes:
            changed.append({"key": key, "fields": field_changes})
        else:
            same += 1
    return {
        "same": same,
        "added": added,
        "removed": removed,
        "changed": changed,
    }


def build_diff(
    entity: str,
    remote_data: dict,
    local_snapshot: dict | None,
    identity: dict,
) -> dict:
    if not identity.get("safe_to_compare"):
        return {
            "schema_version": 1,
            "entity": entity,
            "identity": identity,
            "summary": {
                "same": 0,
                "changed": 0,
                "remote-only": 0,
                "local-only": 0,
                "has_changes": False,
                "local_exists": False,
                "manual_edit": {},
                "comparison_status": "skipped-identity-unresolved",
            },
            "fields": {},
            "collections": {},
        }
    local_data = local_snapshot["data"] if local_snapshot else {}
    fields = {}
    collections = {}
    counts = {"same": 0, "changed": 0, "remote-only": 0, "local-only": 0}
    if entity == "ability":
        variants = local_data.get("description_variants")
        if isinstance(variants, list):
            has_local_description = any(str(value or "").strip() for value in variants)
        else:
            description = local_data.get("description")
            if isinstance(description, list):
                has_local_description = any(str(value or "").strip() for value in description)
            else:
                has_local_description = bool(str(description or "").strip())
        if not has_local_description:
            counts["changed"] += 1
            fields["description"] = {
                "status": "changed",
                "local": local_data.get("description"),
                "remote": remote_data.get("description"),
                "reason": "local-description-missing",
                "selectable": False,
            }
    for path in comparison_paths(entity):
        if entity == "pet" and path == "ability_desc" and path not in remote_data:
            continue
        remote_value = comparable_value(path, nested_value(remote_data, path))
        local_value = comparable_value(path, nested_value(local_data, path))
        if local_snapshot is None:
            status = "remote-only"
        elif remote_value == local_value:
            status = "same"
        elif remote_value is None and local_value is not None:
            status = "local-only"
        else:
            status = "changed"
        counts[status] += 1
        fields[path] = {
            "status": status,
            "local": local_value,
            "remote": remote_value,
        }
        if entity == "pet" and path in {f"detail.{key}" for key in SKILL_SET_KEYS}:
            collections[path] = build_skill_collection_diff(remote_value, local_value)
    return {
        "schema_version": 1,
        "entity": entity,
        "identity": identity,
        "summary": {
            **counts,
            "has_changes": counts["changed"] + counts["remote-only"] + counts["local-only"] > 0,
            "local_exists": local_snapshot is not None,
            "manual_edit": local_snapshot.get("manual_edit", {}) if local_snapshot else {},
        },
        "fields": fields,
        "collections": collections,
    }


def write_comparison(
    folder: Path,
    entity: str,
    entity_id: str,
    remote_data: dict,
    local_snapshot: dict | None,
    identity: dict,
) -> None:
    local_document = {
        "schema_version": 1,
        "entity": entity,
        "id": entity_id,
        "captured_at": utc_now(),
        "exists": local_snapshot is not None,
        "data": local_snapshot.get("data") if local_snapshot else None,
        "manual_edit": local_snapshot.get("manual_edit", {}) if local_snapshot else {},
        "identity": identity,
    }
    difference = build_diff(entity, remote_data, local_snapshot, identity)
    difference["id"] = entity_id
    difference["compared_at"] = utc_now()
    write_json(folder / "local.json", local_document)
    write_json(folder / "diff.json", difference)


def detect_pet_uid_migration(
    remote_data: dict,
    local_snapshot: dict | None,
    identity: dict,
) -> dict[str, str] | None:
    if not local_snapshot or identity.get("status") != "name-match-id-different":
        return None
    local_data = local_snapshot.get("data") or {}
    pet_id = str(remote_data.get("pet_id") or "")
    source_uid = str(local_data.get("uid") or "")
    target_uid = str(remote_data.get("uid") or "")
    if (
        pet_id
        and str(local_data.get("pet_id") or "") == pet_id
        and source_uid == f"pet_{pet_id}"
        and re.fullmatch(rf"pet_{re.escape(pet_id)}_[1-9]\d*", target_uid)
    ):
        return {"from": source_uid, "to": target_uid}
    return None


def save_pet(stage: Path, pet: dict, detail: dict, db: sqlite3.Connection | None) -> None:
    pet_data = dict(pet)
    detail_data = dict(detail or {})
    for ability_key in ("ability_name", "ability_desc"):
        if detail_data.get(ability_key):
            pet_data[ability_key] = detail_data.pop(ability_key)
    data = without_images(pet_data)
    assets = {}
    for key in ("image_default", "image_shiny", "image_fruit", "image_egg"):
        remote_url = detail_data.get(key) or pet.get(key)
        assets[key] = {"remote_url": remote_url or None}
    assets["ability_icon"] = {
        "remote_url": detail_data.get("ability_icon") or pet.get("ability_icon") or None,
    }
    assets["review_avatar"] = {
        "remote_url": pet.get("review_avatar_url") or (
            pet.get("image_url") if not detail else None
        ),
        "review_only": True,
    }
    assets["review_ability_icon"] = {
        "remote_url": pet.get("review_ability_icon_url") or (
            pet.get("ability_icon") if not detail else None
        ),
        "review_only": True,
    }

    remote = {
        "schema_version": 1,
        "entity": "pet",
        "id": pet["uid"],
        "source_url": f"https://wiki.biligame.com/rocom/{pet['name']}" if detail else "https://wiki.biligame.com/rocom/精灵筛选",
        "fetched_at": utc_now(),
        "data": data,
        "assets": assets,
    }
    local_snapshot, identity = match_local_entity(db, "pet", data)
    exists = local_snapshot is not None
    uid_migration = detect_pet_uid_migration(data, local_snapshot, identity)
    if uid_migration:
        identity = {**identity, "uid_migration": uid_migration}
    target_id = uid_migration["to"] if uid_migration else (
        local_snapshot["data"]["uid"] if local_snapshot else pet["uid"]
    )
    plan = {
        **remote,
        "id": target_id,
        "identity": identity,
        "uid_migration": uid_migration,
        "identity_confirmed": identity["safe_to_import"],
        "enabled": False,
        "fields": {
            "pet": [field for field in PET_FIELDS if field in data] if not exists else [],
            "detail": [],
            "replace_skill_sets": False,
        },
        "notes": "精灵筛选页只提供名称、属性、特性名称、基础数值和审核缩略图；列表小头像/压缩特性图标不作为正式立绘或特性图标。已有精灵优先显示本地正式图片并只补缺失项；新增精灵确认时请求当前精灵详情页，尽可能抓取本体、异色、果实、精灵蛋和正式特性图标。",
    }
    folder = stage / "pets" / pet["uid"]
    write_json(folder / "remote.json", remote)
    write_json(folder / "import.json", plan)
    write_comparison(folder, "pet", pet["uid"], data, local_snapshot, identity)


def save_skill(stage: Path, skill: dict, db: sqlite3.Connection | None) -> None:
    data = without_images(skill)
    icon_url = skill.get("icon_url") or None
    remote = {
        "schema_version": 1,
        "entity": "skill",
        "id": skill["uid"],
        "source_url": "https://wiki.biligame.com/rocom/技能查询",
        "fetched_at": utc_now(),
        "data": data,
        "assets": {
            "icon": {
                "remote_url": icon_url,
            },
        },
    }
    local_snapshot, identity = match_local_entity(db, "skill", data)
    exists = local_snapshot is not None
    target_id = local_snapshot["data"]["uid"] if local_snapshot else skill["uid"]
    plan = {
        **remote,
        "id": target_id,
        "identity": identity,
        "identity_confirmed": identity["safe_to_import"],
        "enabled": False,
        "fields": list(SKILL_FIELDS) if not exists else [],
        "notes": "现有记录默认禁用。可编辑 data，选择 fields，再将 enabled 改为 true。",
    }
    folder = stage / "skills" / skill["uid"]
    write_json(folder / "remote.json", remote)
    write_json(folder / "import.json", plan)
    write_comparison(folder, "skill", skill["uid"], data, local_snapshot, identity)


def ability_folder(name: str) -> str:
    digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:10]
    return f"ability_{digest}"


def save_abilities(
    stage: Path,
    pets: list[dict],
    selectors: list[str],
    fetch_all: bool,
    db: sqlite3.Connection | None,
) -> int:
    grouped: dict[str, dict] = {}
    for pet in pets:
        name = (pet.get("ability_name") or "").strip()
        if not name:
            continue
        entry = grouped.setdefault(name, {
            "name": name,
            "pet_uids": [],
            "pet_refs": [],
            "ability_icon": pet.get("ability_icon") or None,
            "review_icon_url": pet.get("review_ability_icon_url") or None,
        })
        description = (pet.get("ability_desc") or "").strip()
        if description and not entry.get("description"):
            entry["description"] = description
        if not entry.get("ability_icon") and pet.get("ability_icon"):
            entry["ability_icon"] = pet["ability_icon"]
        if not entry.get("review_icon_url") and pet.get("review_ability_icon_url"):
            entry["review_icon_url"] = pet["review_ability_icon_url"]
        entry["pet_uids"].append(pet["uid"])
        entry["pet_refs"].append({
            "uid": pet["uid"],
            "name": pet["name"],
            "pet_id": pet.get("pet_id"),
        })

    wanted = set(selectors)
    selected = grouped.values() if fetch_all else [
        value for name, value in grouped.items() if name in wanted
    ]
    existing_names = set()
    if db:
        existing_names = {
            row["ability_name"]
            for row in db.execute(
                "SELECT DISTINCT ability_name FROM pets WHERE ability_name IS NOT NULL"
            )
        }

    count = 0
    for ability in selected:
        exists = ability["name"] in existing_names
        ability_data = without_images(ability)
        remote = {
            "schema_version": 1,
            "entity": "ability",
            "id": ability_folder(ability["name"]),
            "source_url": "https://wiki.biligame.com/rocom/精灵筛选",
            "fetched_at": utc_now(),
            "data": ability_data,
            "assets": {
                "icon": {"remote_url": ability.get("ability_icon") or None},
                "review_icon": {
                    "remote_url": ability.get("review_icon_url") or None,
                    "review_only": True,
                },
            },
        }
        local_snapshot, identity = match_local_entity(db, "ability", ability_data)
        plan = {
            **remote,
            "identity": identity,
            "identity_confirmed": identity["safe_to_import"],
            "enabled": False,
            "fields": [],
            "notes": "精灵筛选页未提供特性描述时不比较 description；只有明确抓到描述后，才允许选择该字段更新关联精灵。",
        }
        folder = stage / "abilities" / remote["id"]
        write_json(folder / "remote.json", remote)
        write_json(folder / "import.json", plan)
        write_comparison(
            folder,
            "ability",
            remote["id"],
            ability_data,
            local_snapshot,
            identity,
        )
        count += 1
    return count


def select_fetch_entities(args: argparse.Namespace, pets: list[dict], skills: list[dict]):
    chosen_pets = select_pets(pets, args.pet, args.all or args.all_pets)
    chosen_skills = select_skills(skills, args.skill, args.all or args.all_skills)
    detail_targets = list(chosen_pets)
    if args.ability and not args.all:
        for ability_name in args.ability:
            representative = next(
                (pet for pet in pets if pet.get("ability_name") == ability_name),
                None,
            )
            if representative and representative not in detail_targets:
                detail_targets.append(representative)
    return chosen_pets, chosen_skills, detail_targets


def write_fetch_stage(
    args: argparse.Namespace,
    stage: Path,
    db: sqlite3.Connection | None,
    pets: list[dict],
    skills: list[dict],
    chosen_pets: list[dict],
    chosen_skills: list[dict],
    details: dict[str, dict],
    fetch_mode: str,
    source_files: dict[str, str] | None = None,
) -> int:
    for pet in pets:
        detail = details.get(pet["name"]) or {}
        if detail.get("ability_name"):
            pet["ability_name"] = detail["ability_name"]
        if detail.get("ability_desc"):
            pet["ability_desc"] = detail["ability_desc"]
        if detail.get("ability_icon"):
            pet["ability_icon"] = detail["ability_icon"]

    for pet in chosen_pets:
        save_pet(stage, pet, details.get(pet["name"], {}), db)
    for skill in chosen_skills:
        save_skill(stage, skill, db)

    ability_count = save_abilities(stage, pets, args.ability, args.all or args.all_pets, db)
    manifest = {
        "schema_version": 1,
        "source": "https://wiki.biligame.com/rocom/",
        "fetch_mode": fetch_mode,
        "fetched_at": utc_now(),
        "counts": {
            "remote_pets": len(pets),
            "remote_skills": len(skills),
            "staged_pets": len(chosen_pets),
            "staged_skills": len(chosen_skills),
            "staged_abilities": ability_count,
            "offline_pet_details": len(details) if fetch_mode == "offline-html" else 0,
        },
        "images_downloaded": 0,
        "image_download_policy": "confirmed-pet-differences-and-new-entities-only",
        "pet_detail_mode": "selected" if details else "none",
    }
    if source_files:
        manifest["offline_sources"] = source_files
    write_json(stage / "manifest.json", manifest)
    print(json.dumps(manifest["counts"], ensure_ascii=False, indent=2))
    print(f"[DONE] 暂存目录：{stage}")
    return 0


def fetch_command(args: argparse.Namespace) -> int:
    stage = Path(args.output).resolve()
    db = open_db(Path(args.db).resolve())
    try:
        include_skills = bool(args.all or args.all_skills or args.skill)
        pets, skills = fetch_remote_lists(stage, db, include_skills)
        chosen_pets, chosen_skills, detail_targets = select_fetch_entities(args, pets, skills)
        details = fetch_pet_details(detail_targets) if args.with_details else {}
        return write_fetch_stage(
            args, stage, db, pets, skills, chosen_pets, chosen_skills, details, "online"
        )
    finally:
        if db:
            db.close()


def fetch_html_command(args: argparse.Namespace) -> int:
    stage = Path(args.output).resolve()
    db = open_db(Path(args.db).resolve())
    try:
        pet_html = read_saved_page(args.pet_list_html, "精灵筛选")
        include_skills = bool(args.all or args.all_skills or args.skill)
        if include_skills and not args.skill_list_html:
            raise RuntimeError("当前选择包含技能，必须提供 --skill-list-html")
        skill_html = read_saved_page(args.skill_list_html, "技能查询") if include_skills else None
        pets, skills = parse_remote_lists(stage, db, pet_html, skill_html)
        chosen_pets, chosen_skills, detail_targets = select_fetch_entities(args, pets, skills)
        details = load_saved_pet_details(
            detail_targets,
            args.pet_detail_html_dir,
            args.pet_detail_html,
        )
        source_files = {
            "pet_list": Path(args.pet_list_html).name,
        }
        if args.skill_list_html:
            source_files["skill_list"] = Path(args.skill_list_html).name
        if args.pet_detail_html_dir:
            source_files["pet_detail_directory"] = Path(args.pet_detail_html_dir).name
        return write_fetch_stage(
            args, stage, db, pets, skills, chosen_pets, chosen_skills,
            details, "offline-html", source_files,
        )
    finally:
        if db:
            db.close()


def resolve_element(db: sqlite3.Connection, value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, dict):
        if value.get("id") is not None:
            return int(value["id"])
        value = value.get("name")
    if isinstance(value, int):
        return value
    row = db.execute("SELECT id FROM elements WHERE name = ?", (str(value),)).fetchone()
    if not row:
        raise ValueError(f"未知属性：{value}")
    return row["id"]


def update_columns(
    db: sqlite3.Connection,
    table: str,
    key_column: str,
    key_value: str,
    values: dict[str, Any],
) -> None:
    if not values:
        return
    assignments = ", ".join(f"{column} = ?" for column in values)
    db.execute(
        f"UPDATE {table} SET {assignments}, manual_edit = 1 WHERE {key_column} = ?",
        [*values.values(), key_value],
    )


def replace_uid_in_json(value: Any, source_uid: str, target_uid: str) -> tuple[Any, bool]:
    if isinstance(value, str):
        return (target_uid, True) if value == source_uid else (value, False)
    if isinstance(value, list):
        changed = False
        result = []
        for item in value:
            replaced, item_changed = replace_uid_in_json(item, source_uid, target_uid)
            result.append(replaced)
            changed = changed or item_changed
        return result, changed
    if isinstance(value, dict):
        changed = False
        result = {}
        for key, item in value.items():
            replaced, item_changed = replace_uid_in_json(item, source_uid, target_uid)
            result[key] = replaced
            changed = changed or item_changed
        return result, changed
    return value, False


def migrate_json_uid_column(
    db: sqlite3.Connection,
    table: str,
    key_column: str,
    json_column: str,
    source_uid: str,
    target_uid: str,
) -> None:
    table_exists = db.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    if not table_exists:
        return
    rows = db.execute(
        f"SELECT {key_column}, {json_column} FROM {table} WHERE {json_column} IS NOT NULL"
    ).fetchall()
    for row in rows:
        raw = row[json_column]
        try:
            parsed = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            parsed = raw
        replaced, changed = replace_uid_in_json(parsed, source_uid, target_uid)
        if not changed:
            continue
        encoded = json.dumps(replaced, ensure_ascii=False) if not isinstance(parsed, str) else replaced
        db.execute(
            f"UPDATE {table} SET {json_column} = ? WHERE {key_column} = ?",
            (encoded, row[key_column]),
        )


def migrate_pet_uid(db: sqlite3.Connection, plan: dict) -> None:
    migration = plan.get("uid_migration")
    if not migration:
        return
    source_uid = str(migration.get("from") or "")
    target_uid = str(migration.get("to") or "")
    data = plan.get("data") or {}
    if not source_uid or not target_uid or source_uid == target_uid or plan.get("id") != target_uid:
        raise ValueError(f"无效精灵 UID 迁移：{migration}")
    target = db.execute(
        "SELECT uid, pet_id, name FROM pets WHERE uid = ?",
        (target_uid,),
    ).fetchone()
    if target:
        if str(target["pet_id"]) == str(data.get("pet_id") or "") and target["name"] == data.get("name"):
            return
        raise ValueError(f"UID 迁移目标已被其他精灵占用：{target_uid}")
    source = db.execute(
        "SELECT uid, pet_id, name FROM pets WHERE uid = ?",
        (source_uid,),
    ).fetchone()
    if not source:
        raise ValueError(f"UID 迁移源不存在：{source_uid}")
    if str(source["pet_id"]) != str(data.get("pet_id") or "") or source["name"] != data.get("name"):
        raise ValueError(f"UID 迁移身份不一致：{source_uid} -> {target_uid}")

    tables = db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    for table_row in tables:
        table = table_row["name"]
        columns = {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}
        if "pet_uid" in columns:
            db.execute(f"UPDATE {table} SET pet_uid = ? WHERE pet_uid = ?", (target_uid, source_uid))
    db.execute("UPDATE pets SET uid = ?, manual_edit = 1 WHERE uid = ?", (target_uid, source_uid))

    for column in ("pass_pets", "legend_pet", "season_pets", "shiny_pets"):
        migrate_json_uid_column(db, "seasons", "id", column, source_uid, target_uid)
    migrate_json_uid_column(db, "pet_details", "pet_uid", "evolution_chain", source_uid, target_uid)
    sort_match = re.search(r"_(\d+)$", target_uid.removeprefix("pet_"))
    if sort_match:
        db.execute(
            "UPDATE variants_map SET sort_order = ? WHERE pet_uid = ?",
            (int(sort_match.group(1)), target_uid),
        )


def apply_pet(db: sqlite3.Connection, plan: dict, version_override: str | None = None) -> None:
    data = dict(plan["data"])
    if version_override is not None:
        data["version"] = version_override
    uid = plan["id"]
    migrate_pet_uid(db, plan)
    raw_selected_pet = set(plan.get("fields", {}).get("pet", []))
    selected_pet = raw_selected_pet - IGNORED_IMPORT_FIELDS
    if version_override is not None:
        selected_pet.add("version")
    selected_detail = set(plan.get("fields", {}).get("detail", []))
    unknown = (selected_pet - set(PET_FIELDS) - {"version"}) | (selected_detail - set(DETAIL_FIELDS))
    if unknown:
        raise ValueError(f"{uid} 含不允许字段：{sorted(unknown)}")

    pet_values = {}
    for field in selected_pet:
        column = {"element": "element_id", "sub_element": "sub_element_id"}.get(field, field)
        value = data.get(field)
        if field in ("element", "sub_element"):
            value = resolve_element(db, value)
        pet_values[column] = value

    exists = db.execute("SELECT 1 FROM pets WHERE uid = ?", (uid,)).fetchone()
    if exists:
        identity_fields = selected_pet & {"pet_id", "name"}
        if identity_fields:
            existing_identity = db.execute(
                "SELECT pet_id, name FROM pets WHERE uid = ?", (uid,)
            ).fetchone()
            mismatched = [
                field for field in identity_fields
                if str(existing_identity[field]) != str(data.get(field))
            ]
            if mismatched:
                raise ValueError(f"{uid} 现有精灵身份与导入计划不一致：{sorted(mismatched)}")
            for field in identity_fields:
                pet_values.pop(field, None)
        update_columns(db, "pets", "uid", uid, pet_values)
    else:
        base_values = {
            "uid": uid,
            "pet_id": data.get("pet_id"),
            "name": data.get("name"),
            **pet_values,
            "manual_edit": 1,
        }
        if not base_values["pet_id"] or not base_values["name"]:
            raise ValueError(f"{uid} 新精灵缺少 pet_id/name")
        columns = ", ".join(base_values)
        placeholders = ", ".join("?" for _ in base_values)
        db.execute(
            f"INSERT INTO pets ({columns}) VALUES ({placeholders})",
            list(base_values.values()),
        )
        sort_match = re.search(r"_(\d+)$", uid.removeprefix("pet_"))
        sort_order = int(sort_match.group(1)) if sort_match else 0
        db.execute(
            "INSERT OR REPLACE INTO variants_map (pet_id, pet_uid, sort_order) VALUES (?, ?, ?)",
            (data["pet_id"], uid, sort_order),
        )


def normalized_skill_name(value: Any) -> str:
    return re.sub(r"[\s·•・,，。.!！?？:：;；'\"“”‘’（）()【】\[\]_-]+", "", str(value or "")).casefold()


def clean_detail_text(value: Any, label: str, max_length: int = 500) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if "\ufffd" in text:
        raise ValueError(f"{label} 包含损坏字符，请重新抓取当前 Batch")
    if len(text) > max_length:
        raise ValueError(f"{label} 长度超过 {max_length}")
    return text


def resolve_pet_skill(db: sqlite3.Connection, uid: str, skill_type: str, item: dict) -> dict:
    name = clean_detail_text(item.get("name"), f"{uid}/{skill_type} 技能名称", 100)
    if not name:
        raise ValueError(f"{uid}/{skill_type} 存在无名称技能")
    requested_uid = clean_detail_text(
        item.get("skill_ref_uid") or (item.get("skill_ref") or {}).get("uid"),
        f"{uid}/{skill_type}/{name} 技能 UID", 100,
    )
    row = None
    if requested_uid:
        row = db.execute(
            """SELECT s.uid, s.name, e.name AS element, s.category, s.cost, s.power, s.description
               FROM skills s LEFT JOIN elements e ON e.id = s.element_id WHERE s.uid = ?""",
            (requested_uid,),
        ).fetchone()
        if row and normalized_skill_name(row["name"]) != normalized_skill_name(name):
            raise ValueError(f"{uid}/{skill_type} 技能 UID 与名称不一致：{requested_uid}={row['name']}，远程={name}")
    if row is None:
        normalized = normalized_skill_name(name)
        candidates = [candidate for candidate in db.execute(
            """SELECT s.uid, s.name, e.name AS element, s.category, s.cost, s.power, s.description
               FROM skills s LEFT JOIN elements e ON e.id = s.element_id"""
        ).fetchall() if normalized_skill_name(candidate["name"]) == normalized]
        if len(candidates) != 1:
            raise ValueError(f"{uid}/{skill_type} 技能“{name}”无法唯一关联全局技能表；请先完成技能审核")
        row = candidates[0]
    level = clean_detail_text(item.get("level"), f"{uid}/{skill_type}/{name} 学习等级", 40)
    level_match = re.search(r"\d+", level) if level else None
    return {
        "level": level_match.group(0) if level_match else None,
        "name": row["name"], "element": row["element"], "type": row["category"],
        "cost": int(row["cost"] or 0), "power": int(row["power"] or 0),
        "description": row["description"], "skill_ref_uid": row["uid"],
    }


def apply_pet_supplement(db: sqlite3.Connection, plan: dict) -> dict[str, int]:
    uid = str(plan.get("id") or "")
    detail = plan.get("detail")
    result = {"details": 0, "skill_sets": 0, "skills": 0, "egg_groups": 0}
    if not uid or not isinstance(detail, dict):
        return result
    if not db.execute("SELECT 1 FROM pets WHERE uid = ?", (uid,)).fetchone():
        raise ValueError(f"{uid} 详情补全目标精灵不存在")
    unknown = set(detail) - set(PET_SUPPLEMENT_KEYS) - {"stats"}
    if unknown:
        raise ValueError(f"{uid} 详情补全包含未知字段：{sorted(unknown)}")

    height = clean_detail_text(detail.get("height"), f"{uid} 身高", 100)
    weight = clean_detail_text(detail.get("weight"), f"{uid} 体重", 100)
    if height or weight:
        db.execute(
            """INSERT INTO pet_details (pet_uid, height, weight, manual_edit)
               VALUES (?, ?, ?, 1)
               ON CONFLICT(pet_uid) DO UPDATE SET
                 height = CASE WHEN pet_details.height IS NULL OR TRIM(pet_details.height) = ''
                   OR INSTR(pet_details.height, '�') > 0
                   THEN COALESCE(excluded.height, pet_details.height) ELSE pet_details.height END,
                 weight = CASE WHEN pet_details.weight IS NULL OR TRIM(pet_details.weight) = ''
                   OR INSTR(pet_details.weight, '�') > 0
                   THEN COALESCE(excluded.weight, pet_details.weight) ELSE pet_details.weight END,
                 manual_edit = 1""",
            (uid, height, weight),
        )
        result["details"] = 1

    for skill_type in SKILL_SET_KEYS:
        items = detail.get(skill_type)
        if not isinstance(items, list) or not items:
            continue
        resolved = [resolve_pet_skill(db, uid, skill_type, item) for item in items]
        seen, unique = set(), []
        for item in resolved:
            key = (item["skill_ref_uid"], item["level"])
            if key not in seen:
                seen.add(key)
                unique.append(item)
        db.execute("DELETE FROM pet_skills WHERE pet_uid = ? AND skill_type = ?", (uid, skill_type))
        for item in unique:
            db.execute(
                """INSERT INTO pet_skills
                   (pet_uid, skill_type, level, name, element, type, cost, power, description, skill_ref_uid)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (uid, skill_type, item["level"], item["name"], item["element"], item["type"],
                 item["cost"], item["power"], item["description"], item["skill_ref_uid"]),
            )
        result["skill_sets"] += 1
        result["skills"] += len(unique)

    egg_groups = detail.get("egg_groups")
    if isinstance(egg_groups, list) and egg_groups:
        resolved_group_ids = []
        for group in egg_groups:
            group_id = group.get("id") if isinstance(group, dict) else None
            group_name = group.get("name") if isinstance(group, dict) else group
            row = db.execute(
                "SELECT id, name FROM egg_groups WHERE id = ?" if group_id is not None
                else "SELECT id, name FROM egg_groups WHERE name = ?",
                (group_id if group_id is not None else group_name,),
            ).fetchone()
            if not row or (group_name and str(row["name"]) != str(group_name)):
                raise ValueError(f"{uid} 蛋组无法关联：{group}")
            resolved_group_ids.append(row["id"])
        manual_groups = db.execute(
            "SELECT COUNT(*) FROM pet_egg_groups WHERE pet_uid = ? AND manual_edit = 1", (uid,)
        ).fetchone()[0]
        if manual_groups:
            print(f"[PET DETAIL] {uid} 保留 {manual_groups} 个人工蛋组关联")
        else:
            db.execute("DELETE FROM pet_egg_groups WHERE pet_uid = ?", (uid,))
            for group_id in dict.fromkeys(resolved_group_ids):
                db.execute(
                    "INSERT INTO pet_egg_groups (pet_uid, egg_group_id, manual_edit) VALUES (?, ?, 0)",
                    (uid, group_id),
                )
            result["egg_groups"] = len(set(resolved_group_ids))
    return result

def apply_skill(db: sqlite3.Connection, plan: dict, version_override: str | None = None) -> None:
    data = dict(plan["data"])
    if version_override is not None:
        data["version"] = version_override
    uid = plan["id"]
    raw_selected = set(plan.get("fields", []))
    selected = raw_selected - IGNORED_IMPORT_FIELDS
    if version_override is not None:
        selected.add("version")
    unknown = selected - set(SKILL_FIELDS) - {"version"}
    if unknown:
        raise ValueError(f"{uid} 含不允许字段：{sorted(unknown)}")
    values = {}
    for field in selected:
        column = "element_id" if field == "element" else field
        value = resolve_element(db, data.get(field)) if field == "element" else data.get(field)
        values[column] = value

    exists = db.execute("SELECT 1 FROM skills WHERE uid = ?", (uid,)).fetchone()
    if exists:
        if "name" in selected:
            existing_name = db.execute("SELECT name FROM skills WHERE uid = ?", (uid,)).fetchone()["name"]
            if existing_name != data.get("name"):
                raise ValueError(f"{uid} 现有技能名称与导入计划不一致")
            values.pop("name", None)
        update_columns(db, "skills", "uid", uid, values)
    else:
        base_values = {"uid": uid, "name": data.get("name"), **values, "manual_edit": 1}
        if not base_values["name"]:
            raise ValueError(f"{uid} 新技能缺少 name")
        columns = ", ".join(base_values)
        placeholders = ", ".join("?" for _ in base_values)
        db.execute(
            f"INSERT INTO skills ({columns}) VALUES ({placeholders})",
            list(base_values.values()),
        )


def apply_ability(db: sqlite3.Connection, plan: dict) -> None:
    selected = set(plan.get("fields", []))
    if selected - {"description"}:
        raise ValueError(f"{plan['id']} 特性仅允许 description")
    if "description" in selected:
        data = plan["data"]
        result = db.execute(
            "UPDATE pets SET ability_desc = ?, manual_edit = 1 WHERE ability_name = ?",
            (data.get("description"), data.get("name")),
        )
        if result.rowcount == 0:
            raise ValueError(f"数据库中没有使用特性 {data.get('name')} 的精灵")


def apply_reference_ability(db: sqlite3.Connection, plan: dict) -> None:
    data = plan.get("data") or {}
    name = data.get("name")
    description = data.get("description")
    if not name:
        raise ValueError(f"{plan.get('id')} 特性补全缺少名称")
    if description:
        result = db.execute(
            """
            UPDATE pets
            SET ability_desc = ?, manual_edit = 1
            WHERE ability_name = ?
              AND (ability_desc IS NULL OR TRIM(ability_desc) = '' OR INSTR(ability_desc, '�') > 0)
            """,
            (description, name),
        )
        print(f"[ABILITY] {name} 补全空描述：{result.rowcount} 只精灵")


def iter_entity_files(stage: Path, filename: str):
    for entity_dir in ENTITY_STAGE_DIRS:
        root = stage / entity_dir
        if not root.is_dir():
            continue
        yield from sorted(root.glob(f"*/{filename}"))


def load_enabled_plans(stage: Path) -> list[tuple[Path, dict]]:
    plans = []
    for path in iter_entity_files(stage, "import.json"):
        plan = read_json(path)
        if plan and plan.get("enabled"):
            plans.append((path, plan))
    return plans


def plan_review_decision(plan: dict, plan_path: Path | None = None) -> str:
    review = plan.get("review") or {}
    decision = review.get("decision") or (
        "approved-fields" if plan.get("enabled") else "pending"
    )
    if decision != "pending" or plan_path is None:
        return decision

    diff = read_json(plan_path.parent / "diff.json", {}) or {}
    if (diff.get("identity") or {}).get("status") != "matched":
        return decision
    allowed_fields = {
        "pet": PET_BASIC_FIELDS,
        "skill": SKILL_FIELDS,
        "ability": ("description",),
    }.get(plan.get("entity"), ())
    fields = diff.get("fields") or {}
    has_changes = any(
        fields.get(field, {}).get("status") not in {None, "same"}
        for field in allowed_fields
    )
    return decision if has_changes else "auto-unchanged"


def selected_plan_fields(plan: dict) -> list[str]:
    fields = plan.get("fields") or []
    if plan.get("entity") == "pet":
        selected = list(fields.get("pet") or []) if isinstance(fields, dict) else []
    else:
        selected = list(fields) if isinstance(fields, list) else []
    return [field for field in selected if field not in IGNORED_IMPORT_FIELDS]


def inferred_pet_asset_slot(metadata: dict) -> str | None:
    hint = unquote(" ".join(
        str(metadata.get(key) or "")
        for key in ("remote_url", "resolved_url")
    )).lower()
    if re.search(r"界面[\s_-]*宠物[\s_-]*(本体|宠物蛋|果实)|icon[\s_-]*异色", hint):
        return "ui-control"
    if re.search(r"果实|fruit", hint):
        return "image_fruit"
    if re.search(r"精灵蛋|宠物蛋|蛋图|egg", hint):
        return "image_egg"
    if re.search(r"异色|闪光|shiny|(^|[/_.-])yise([/_.-]|$)", hint):
        return "image_shiny"
    if re.search(r"本体|立绘|原图|default|(^|[/_.-])jl([/_.-]|$)", hint):
        return "image_default"
    return None


def downloaded_assets(folder: Path) -> dict[str, dict]:
    assets = read_json(folder / "assets.json", {}) or {}
    remote = read_json(folder / "remote.json", {}) or {}
    if not assets and (folder / "image.json").exists():
        image = read_json(folder / "image.json")
        if image:
            assets = {"icon": image}
    blocked_keys: set[str] = set()
    if not remote.get("detail_source") and "/精灵筛选" in str(remote.get("source_url") or ""):
        if remote.get("entity") == "pet":
            blocked_keys = {"image_default", "ability_icon"}
        elif remote.get("entity") == "ability":
            blocked_keys = {"icon"}
    return {
        key: metadata for key, metadata in assets.items()
        if key not in blocked_keys
        and isinstance(metadata, dict)
        and not (
            remote.get("entity") == "pet"
            and inferred_pet_asset_slot(metadata) not in {None, key}
        )
        and str(metadata.get("status") or "").startswith("downloaded-after-")
    }


def verified_asset_path(folder: Path, metadata: dict) -> Path:
    relative = metadata.get("local_file")
    if not isinstance(relative, str) or not re.fullmatch(
        r"images/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|gif)", relative, re.IGNORECASE
    ):
        raise ValueError(f"无效暂存素材路径：{relative}")
    images_root = (folder / "images").resolve()
    source = (folder / relative).resolve()
    if images_root not in source.parents or not source.is_file():
        raise FileNotFoundError(f"暂存素材不存在：{source}")
    actual_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    expected_hash = metadata.get("sha256")
    if expected_hash and actual_hash.lower() != str(expected_hash).lower():
        raise ValueError(f"暂存素材 SHA-256 不匹配：{source}")
    return source


def build_release_change(folder: Path, plan: dict, decision: str, assets: dict) -> dict:
    difference = read_json(folder / "diff.json", {}) or {}
    data = plan.get("data") or {}
    fields = []
    for field in selected_plan_fields(plan):
        field_diff = (difference.get("fields") or {}).get(field) or {}
        fields.append({
            "field": field,
            "status": field_diff.get("status") or (
                "new" if (difference.get("identity") or {}).get("status") == "unmatched"
                else "approved"
            ),
            "local": field_diff.get("local"),
            "remote": field_diff.get("remote", data.get(field)),
            "applied": data.get(field),
        })
    return {
        "schema_version": 1,
        "entity": plan.get("entity"),
        "id": plan.get("id"),
        "name": data.get("name"),
        "decision": decision,
        "action": "database-import" if plan.get("enabled") else "reference-assets-only",
        "identity": plan.get("identity") or difference.get("identity") or {},
        "fields": fields,
        "detail": plan.get("detail") if plan.get("entity") == "pet" else None,
        "data": data if not plan.get("enabled") else None,
        "assets": sorted(assets),
    }


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ensure_staging_cleanup_target(value: str) -> Path:
    allowed_root = DEFAULT_STAGE.resolve()
    target = Path(value).resolve()
    if target != allowed_root and allowed_root not in target.parents:
        raise ValueError(f"清理目标必须位于 {allowed_root} 内：{target}")
    return target


def cleanup_targets(stage: Path, include_batches: bool) -> list[Path]:
    names = [".meta", "skills", "abilities", "pets", "manifest.json"]
    if include_batches:
        names.append("batches")
    return [stage / name for name in names if (stage / name).exists()]


def path_usage(path: Path) -> tuple[int, int, int]:
    if path.is_file() or path.is_symlink():
        return 1, 0, path.stat().st_size if path.is_file() else 0
    files = 0
    directories = 1
    size = 0
    for child in path.rglob("*"):
        if child.is_symlink():
            files += 1
        elif child.is_dir():
            directories += 1
        elif child.is_file():
            files += 1
            size += child.stat().st_size
    return files, directories, size


def clean_command(args: argparse.Namespace) -> int:
    stage = ensure_staging_cleanup_target(args.input)
    targets = cleanup_targets(stage, args.include_batches)
    if not targets:
        print(f"[DONE] 暂存目录已经为空：{stage}")
        return 0
    for target in targets:
        resolved = target.resolve()
        if resolved.parent != stage and stage not in resolved.parents:
            raise ValueError(f"拒绝读取或删除暂存目录外路径：{resolved}")

    decisions: dict[str, int] = {}
    for target in targets:
        plan_paths = [target] if target.name == "import.json" else (
            list(target.rglob("import.json")) if target.is_dir() else []
        )
        for plan_path in plan_paths:
            plan = read_json(plan_path, {}) or {}
            decision = plan_review_decision(plan, plan_path)
            decisions[decision] = decisions.get(decision, 0) + 1

    usage = [path_usage(target) for target in targets]
    files = sum(item[0] for item in usage)
    directories = sum(item[1] for item in usage)
    bytes_total = sum(item[2] for item in usage)
    print(f"[CLEAN] 目标：{stage}")
    print(f"[CLEAN] 将删除：{files} 个文件，{directories} 个目录，{bytes_total} bytes")
    for target in targets:
        print(f"  - {target.relative_to(stage).as_posix()}")
    if decisions:
        print(f"[CLEAN] 审核状态：{json.dumps(decisions, ensure_ascii=False, sort_keys=True)}")
    if not args.include_batches and (stage / "batches").exists():
        print("[KEEP] batches/ 历史批次将保留；需要一并删除时追加 --include-batches")
    if DEFAULT_RELEASES.exists():
        print(f"[KEEP] 已生成发布包将保留：{DEFAULT_RELEASES}")

    pending = decisions.get("pending", 0)
    if pending and not args.force:
        raise ValueError(
            f"仍有 {pending} 个待审核候选；确认这些内容可丢弃后追加 --force"
        )
    if not args.apply:
        print("[DRY-RUN] 未删除任何文件；确认后追加 --apply --confirm CLEAN")
        return 0
    if args.confirm != "CLEAN":
        raise ValueError("实际清理必须同时传入 --confirm CLEAN")

    for target in targets:
        resolved = target.resolve()
        if resolved.parent != stage and stage not in resolved.parents:
            raise ValueError(f"拒绝删除暂存目录外路径：{resolved}")
        if target.is_symlink() or target.is_file():
            target.unlink()
        elif target.is_dir():
            shutil.rmtree(target)
    stage.mkdir(parents=True, exist_ok=True)
    print(f"[DONE] 已清理暂存数据：{stage}")
    print("[KEEP] 正式数据库、data/public、data/wiki-releases 均未修改")
    return 0

def package_command(args: argparse.Namespace) -> int:
    stage = Path(args.input).resolve()
    if not stage.is_dir():
        raise FileNotFoundError(f"暂存目录不存在：{stage}")

    plan_paths = list(iter_entity_files(stage, "import.json"))
    if not plan_paths:
        raise ValueError(f"暂存目录没有 import.json：{stage}")

    reviews = []
    pending = []
    inconsistent = []
    for plan_path in plan_paths:
        plan = read_json(plan_path) or {}
        decision = plan_review_decision(plan, plan_path)
        reviews.append((plan_path, plan, decision))
        if decision not in RESOLVED_REVIEW_DECISIONS:
            pending.append(plan_path.parent.relative_to(stage).as_posix())
        if plan.get("enabled") and decision not in {"approved-new", "approved-fields", "approved-uid-migration"}:
            inconsistent.append(plan_path.parent.relative_to(stage).as_posix())
    if pending:
        preview = ", ".join(pending[:10])
        suffix = " …" if len(pending) > 10 else ""
        raise ValueError(f"仍有 {len(pending)} 个候选未审核：{preview}{suffix}")
    if inconsistent:
        raise ValueError(f"存在审核决定与 enabled 冲突的计划：{', '.join(inconsistent)}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = Path(args.output).resolve() if args.output else (
        DEFAULT_RELEASES / f"wiki_release_{timestamp}"
    ).resolve()
    zip_path = output.with_suffix(".zip")
    if output.exists() or zip_path.exists():
        raise FileExistsError(f"发布包目标已存在：{output} 或 {zip_path}")

    temp_output = output.parent / f".{output.name}.building"
    if temp_output.exists():
        raise FileExistsError(f"发布包临时目录已存在：{temp_output}")
    temp_output.mkdir(parents=True, exist_ok=False)

    items = []
    payload_files: list[Path] = []
    try:
        for plan_path, plan, decision in reviews:
            folder = plan_path.parent
            assets = downloaded_assets(folder)
            include_import = bool(plan.get("enabled"))
            include_reference_assets = decision == "approved-reference" and bool(assets)
            detail = plan.get("detail") if plan.get("entity") == "pet" else None
            include_reference_detail = (
                not include_import
                and decision not in {"pending", "ignored"}
                and isinstance(detail, dict)
                and any(detail.get(key) for key in PET_SUPPLEMENT_KEYS)
            )
            if not include_import and not include_reference_assets and not include_reference_detail:
                continue

            relative_folder = folder.relative_to(stage)
            destination = temp_output / relative_folder
            destination.mkdir(parents=True, exist_ok=True)

            if include_import or include_reference_assets or include_reference_detail:
                import_target = destination / "import.json"
                write_json(import_target, plan)
                payload_files.append(import_target)

            packaged_assets = {}
            for key, metadata in assets.items():
                source = verified_asset_path(folder, metadata)
                relative_asset = Path(metadata["local_file"])
                target = destination / relative_asset
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                payload_files.append(target)
                packaged_assets[key] = metadata
            if packaged_assets:
                assets_target = destination / "assets.json"
                write_json(assets_target, packaged_assets)
                payload_files.append(assets_target)

            change = build_release_change(folder, plan, decision, packaged_assets)
            change_target = destination / "change.json"
            write_json(change_target, change)
            payload_files.append(change_target)
            items.append({
                "entity": change["entity"],
                "id": change["id"],
                "name": change["name"],
                "decision": decision,
                "action": change["action"],
                "fields": [entry["field"] for entry in change["fields"]],
                "detail": sorted(
                    key for key in PET_SUPPLEMENT_KEYS
                    if isinstance(plan.get("detail"), dict) and plan["detail"].get(key)
                ),
                "assets": sorted(packaged_assets),
                "folder": relative_folder.as_posix(),
            })

        if not items:
            raise ValueError("审核已完成，但没有确认的数据库差异或已下载素材可打包")

        checksums = {
            path.relative_to(temp_output).as_posix(): file_sha256(path)
            for path in sorted(payload_files)
        }
        manifest = {
            "schema_version": 2,
            "package_id": output.name,
            "created_at": utc_now(),
            "source_stage": stage.name,
            "review": {
                "total": len(reviews),
                "resolved": len(reviews),
                "pending": 0,
            },
            "counts": {
                "items": len(items),
                "database_imports": sum(item["action"] == "database-import" for item in items),
                "reference_asset_items": sum(item["action"] == "reference-assets-only" for item in items),
                "asset_files": sum(len(item["assets"]) for item in items),
            },
            "items": items,
            "sha256": checksums,
            "server_commands": {
                "dry_run": "python3 scripts/wiki_staging.py import --input <package-dir>",
                "apply": "python3 scripts/wiki_staging.py import --input <package-dir> --apply",
            },
        }
        write_json(temp_output / "manifest.json", manifest)
        output.parent.mkdir(parents=True, exist_ok=True)
        temp_output.rename(output)
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in sorted(output.rglob("*")):
                if file_path.is_file():
                    archive.write(file_path, Path(output.name) / file_path.relative_to(output))
    except Exception:
        if temp_output.exists():
            shutil.rmtree(temp_output)
        raise

    print(json.dumps(manifest["counts"], ensure_ascii=False, indent=2))
    print(f"[DONE] 发布目录：{output}")
    print(f"[DONE] 发布压缩包：{zip_path}")
    print("[NOTE] 仅整理审核结果；未写数据库、未上传服务器、未发布正式图片")
    return 0

def compare_command(args: argparse.Namespace) -> int:
    stage = Path(args.input).resolve()
    db = open_db(Path(args.db).resolve())
    if not db:
        raise FileNotFoundError(f"数据库不存在：{args.db}")
    compared = 0
    try:
        for path in iter_entity_files(stage, "remote.json"):
            remote = read_json(path)
            if not remote:
                continue
            entity = remote.get("entity")
            entity_id = remote.get("id")
            data = remote.get("data") or {}
            if entity in {"pet", "skill", "ability"}:
                local, identity = match_local_entity(db, entity, data)
            else:
                print(f"[WARN] 跳过未知实体：{path}")
                continue
            write_comparison(path.parent, entity, entity_id, data, local, identity)
            compared += 1
        print(f"[DONE] 已重新比较 {compared} 个实体：{stage}")
        return 0
    finally:
        db.close()


ASSET_TARGETS = {
    ("pet", "image_default"): ("pets/default", "_default"),
    ("pet", "image_shiny"): ("pets/shiny", "_shiny"),
    ("pet", "image_fruit"): ("pets/fruit", "_fruit"),
    ("pet", "image_egg"): ("pets/egg", "_egg"),
    ("pet", "ability_icon"): ("pets/abilities", "_ability"),
    ("skill", "icon"): ("skills/icons", ""),
}


def load_release_items(stage: Path) -> list[dict]:
    manifest = read_json(stage / "manifest.json", {}) or {}
    result = []
    for item in manifest.get("items") or []:
        relative = item.get("folder")
        if not isinstance(relative, str) or relative.startswith("/") or ".." in Path(relative).parts:
            raise ValueError(f"发布包包含非法实体目录：{relative}")
        folder = (stage / relative).resolve()
        if stage not in folder.parents:
            raise ValueError(f"发布包实体目录越界：{relative}")
        result.append({
            **item,
            "folder_path": folder,
            "plan": read_json(folder / "import.json", {}) or {},
            "change": read_json(folder / "change.json", {}) or {},
            "asset_data": read_json(folder / "assets.json", {}) or {},
        })
    return result


def asset_public_path(public_dir: Path, entity: str, uid: str, key: str, source: Path) -> tuple[Path, str]:
    config = ASSET_TARGETS.get((entity, key))
    if not config:
        raise ValueError(f"不支持的正式素材槽位：{entity}/{key}")
    directory, suffix = config
    extension = source.suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        raise ValueError(f"不支持的图片扩展名：{source}")
    relative = Path(directory) / f"{uid}{suffix}{extension}"
    return public_dir / relative, "/public/" + relative.as_posix()


def publish_file(source: Path, target: Path, public_dir: Path, backup_dir: Path, originals: dict[Path, Path | None]) -> None:
    if target not in originals:
        if target.exists():
            backup = backup_dir / target.relative_to(public_dir)
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)
            originals[target] = backup
        else:
            originals[target] = None
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".wiki-import.tmp")
    shutil.copy2(source, temporary)
    temporary.replace(target)


def rollback_published_files(originals: dict[Path, Path | None]) -> None:
    for target, backup in reversed(list(originals.items())):
        if backup is None:
            if target.exists():
                target.unlink()
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(backup, target)


def set_pet_detail_asset(db: sqlite3.Connection, uid: str, field: str, url: str) -> None:
    if not db.execute("SELECT 1 FROM pets WHERE uid = ?", (uid,)).fetchone():
        raise ValueError(f"图片对应精灵不存在：{uid}")
    db.execute(
        f"INSERT INTO pet_details (pet_uid, {field}) VALUES (?, ?) "
        f"ON CONFLICT(pet_uid) DO UPDATE SET {field} = excluded.{field}, manual_edit = 1",
        (uid, url),
    )
    if field == "image_default":
        db.execute("UPDATE pets SET image_url = ?, manual_edit = 1 WHERE uid = ?", (url, uid))


def apply_packaged_assets(db: sqlite3.Connection, stage: Path, public_dir: Path, backup_dir: Path, originals: dict[Path, Path | None]) -> int:
    published = 0
    for item in load_release_items(stage):
        entity = item.get("entity")
        uid = item.get("id")
        folder = item["folder_path"]
        plan = item.get("plan") or {}
        data = plan.get("data") or (item.get("change") or {}).get("data") or {}
        for key, metadata in (item.get("asset_data") or {}).items():
            source = verified_asset_path(folder, metadata)
            if entity == "ability" and key == "icon":
                ability_name = data.get("name") or item.get("name")
                pet_rows = db.execute("SELECT uid FROM pets WHERE ability_name = ?", (ability_name,)).fetchall()
                if not pet_rows:
                    raise ValueError(f"特性图标没有可关联精灵：{ability_name}")
                for row in pet_rows:
                    target, url = asset_public_path(public_dir, "pet", row["uid"], "ability_icon", source)
                    publish_file(source, target, public_dir, backup_dir, originals)
                    set_pet_detail_asset(db, row["uid"], "ability_icon", url)
                    published += 1
                continue
            target, url = asset_public_path(public_dir, entity, uid, key, source)
            publish_file(source, target, public_dir, backup_dir, originals)
            if entity == "pet":
                set_pet_detail_asset(db, uid, key, url)
            elif entity == "skill":
                result = db.execute("UPDATE skills SET icon_url = ?, manual_edit = 1 WHERE uid = ?", (url, uid))
                if result.rowcount == 0:
                    raise ValueError(f"图片对应技能不存在：{uid}")
            published += 1
    return published


def generate_packaged_derivatives(
    db: sqlite3.Connection,
    stage: Path,
    public_dir: Path,
    backup_dir: Path,
    originals: dict[Path, Path | None],
) -> dict[str, int]:
    generator = ROOT / "scripts" / "generate_image_derivatives.js"
    node = shutil.which("node")
    if not node:
        raise RuntimeError("未找到 Node.js，无法生成缩略图和 WebP")
    if not generator.is_file():
        raise RuntimeError(f"衍生图生成器不存在：{generator}")

    jobs: list[dict[str, str]] = []
    outputs: list[dict[str, Any]] = []
    seen_targets: set[Path] = set()

    def add_job(source: Path, target: Path, mode: str, uid: str | None = None) -> None:
        target = target.resolve()
        if target in seen_targets:
            return
        if public_dir != target and public_dir not in target.parents:
            raise ValueError(f"衍生图输出越界：{target}")
        seen_targets.add(target)
        output_name = f"job_{len(jobs):05d}.webp"
        jobs.append({"source": str(source), "output": output_name, "mode": mode})
        outputs.append({
            "temporary": output_name,
            "target": target,
            "uid": uid,
            "mode": mode,
        })

    for item in load_release_items(stage):
        entity = item.get("entity")
        uid = item.get("id")
        if entity == "ability":
            metadata = (item.get("asset_data") or {}).get("icon")
            if not metadata:
                continue
            source = verified_asset_path(item["folder_path"], metadata)
            if source.suffix.lower() == ".webp":
                continue
            plan = item.get("plan") or {}
            data = plan.get("data") or (item.get("change") or {}).get("data") or {}
            ability_name = data.get("name") or item.get("name")
            pet_rows = db.execute(
                "SELECT uid FROM pets WHERE ability_name = ?",
                (ability_name,),
            ).fetchall()
            for row in pet_rows:
                published_target, _ = asset_public_path(
                    public_dir, "pet", row["uid"], "ability_icon", source
                )
                add_job(published_target, published_target.with_suffix(".webp"), "webp")
            continue
        if entity not in {"pet", "skill"} or not uid:
            continue
        for key, metadata in (item.get("asset_data") or {}).items():
            if entity == "pet" and key not in {"image_default", "image_shiny", "image_fruit", "image_egg", "ability_icon"}:
                continue
            if entity == "skill" and key != "icon":
                continue
            source = verified_asset_path(item["folder_path"], metadata)
            published_target, _ = asset_public_path(public_dir, entity, uid, key, source)
            if source.suffix.lower() != ".webp":
                add_job(published_target, published_target.with_suffix(".webp"), "webp")
            if entity == "pet" and key == "image_default":
                thumbnail = public_dir / "pets" / "thumbs" / f"{uid}_default.webp"
                add_job(published_target, thumbnail, "thumbnail", uid)

    if not jobs:
        return {"webp": 0, "thumbnails": 0}

    backup_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".wiki-derivatives-", dir=backup_dir) as temporary:
        temporary_dir = Path(temporary)
        jobs_path = temporary_dir / "jobs.json"
        output_dir = temporary_dir / "output"
        write_json(jobs_path, jobs)
        result = subprocess.run(
            [
                node, str(generator),
                "--input", str(jobs_path),
                "--output-dir", str(output_dir),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=max(120, len(jobs) * 3),
            check=False,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(f"衍生图生成失败（code {result.returncode}）：{detail[-2000:]}")
        for output in outputs:
            source = output_dir / output["temporary"]
            if not source.is_file():
                raise RuntimeError(f"衍生图结果缺失：{source}")
            publish_file(source, output["target"], public_dir, backup_dir, originals)
            if output["mode"] == "thumbnail":
                url = "/public/" + output["target"].relative_to(public_dir).as_posix()
                result_row = db.execute(
                    "UPDATE pets SET thumb_url = ? WHERE uid = ?",
                    (url, output["uid"]),
                )
                if result_row.rowcount == 0:
                    raise ValueError(f"缩略图对应精灵不存在：{output['uid']}")

    return {
        "webp": sum(1 for output in outputs if output["mode"] == "webp"),
        "thumbnails": sum(1 for output in outputs if output["mode"] == "thumbnail"),
    }


def verify_release_package(stage: Path) -> None:
    manifest = read_json(stage / "manifest.json", {}) or {}
    expected = manifest.get("sha256")
    if not isinstance(expected, dict):
        return
    expected_paths = set(expected)
    actual_paths = {
        path.relative_to(stage).as_posix()
        for path in stage.rglob("*")
        if path.is_file() and path.name != "manifest.json"
    }
    if actual_paths != expected_paths:
        missing = sorted(expected_paths - actual_paths)
        extra = sorted(actual_paths - expected_paths)
        raise ValueError(f"发布包文件清单不一致；缺失={missing}；额外={extra}")
    for relative, expected_hash in expected.items():
        if not isinstance(relative, str) or relative.startswith("/") or ".." in Path(relative).parts:
            raise ValueError(f"发布包包含非法路径：{relative}")
        actual_hash = file_sha256(stage / relative)
        if actual_hash.lower() != str(expected_hash).lower():
            raise ValueError(f"发布包 SHA-256 校验失败：{relative}")
    print(f"[VERIFY] 发布包文件校验通过：{len(expected)} 个")

def import_command(args: argparse.Namespace) -> int:
    stage = Path(args.input).resolve()
    db_path = Path(args.db).resolve()
    public_dir = Path(args.public_dir).resolve()
    verify_release_package(stage)
    release_items = load_release_items(stage)
    plans = load_enabled_plans(stage)
    reference_plans = []
    pet_supplement_plans = []
    for item in release_items:
        plan = item.get("plan") or {}
        if item.get("entity") == "pet" and isinstance(plan.get("detail"), dict):
            if any(plan["detail"].get(key) for key in PET_SUPPLEMENT_KEYS):
                pet_supplement_plans.append((item["folder_path"] / "import.json", plan))
        if item.get("action") != "reference-assets-only":
            continue
        if item.get("entity") == "ability" and not plan:
            raise ValueError(
                f"旧发布包缺少特性补全数据：{item.get('folder')}；请用修复后的 package 重新打包"
            )
        if item.get("entity") == "ability" and plan:
            reference_plans.append((item["folder_path"] / "import.json", plan))

    unresolved = [
        (path, plan) for path, plan in plans + pet_supplement_plans
        if not plan.get("identity", {}).get("safe_to_import")
        and not plan.get("identity_confirmed", False)
    ]
    if unresolved:
        names = ", ".join(str(path.parent) for path, _ in unresolved)
        raise ValueError(f"存在未确认身份匹配的导入项：{names}")

    asset_items = [item for item in release_items if item.get("asset_data")]
    asset_files = sum(len(item.get("asset_data") or {}) for item in asset_items)
    for item in asset_items:
        for key, metadata in (item.get("asset_data") or {}).items():
            source = verified_asset_path(item["folder_path"], metadata)
            if item.get("entity") != "ability":
                asset_public_path(public_dir, item.get("entity"), item.get("id"), key, source)

    print(f"[PLAN] 数据库导入项：{len(plans)}")
    print(f"[PLAN] 精灵详情补全项：{len(pet_supplement_plans)}")
    print(f"[PLAN] 特性补全项：{len(reference_plans)}")
    print(f"[PLAN] 正式素材文件：{asset_files}（特性图标会展开到关联精灵）")
    for path, plan in plans:
        print(f"  - {plan.get('entity')} {plan.get('id')} ({path.parent})")

    if not plans and not pet_supplement_plans and not reference_plans and not asset_files:
        print("[DONE] 没有可导入的数据、详情或素材")
        return 0
    if args.version is not None and not args.version.strip():
        raise ValueError("--version 不能为空")
    if args.version:
        print(f"[VERSION] 将统一写入 skills/pets.version: {args.version}")
    if not args.apply:
        print("[DRY-RUN] 未写入数据库或 data/public；确认后追加 --apply")
        return 0
    if not db_path.exists():
        raise FileNotFoundError(f"数据库不存在：{db_path}")
    if public_dir != ROOT and ROOT not in public_dir.parents:
        raise ValueError(f"正式素材目录必须位于项目内：{public_dir}")

    backup_dir = db_path.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"wiki_staging_{timestamp}.db"
    asset_backup_dir = backup_dir / f"wiki_assets_{timestamp}"

    source_db = sqlite3.connect(db_path)
    target_db = sqlite3.connect(backup_path)
    try:
        source_db.backup(target_db)
    finally:
        target_db.close()
        source_db.close()
    print(f"[BACKUP] 数据库：{backup_path}")

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    originals: dict[Path, Path | None] = {}
    try:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("BEGIN IMMEDIATE")
        db.execute("PRAGMA defer_foreign_keys = ON")
        try:
            entity_order = {"skill": 0, "pet": 1, "ability": 2}
            for _, plan in sorted(plans, key=lambda entry: entity_order.get(entry[1].get("entity"), 99)):
                entity = plan.get("entity")
                if entity == "pet":
                    apply_pet(db, plan, args.version)
                elif entity == "skill":
                    apply_skill(db, plan, args.version)
                elif entity == "ability":
                    apply_ability(db, plan)
                else:
                    raise ValueError(f"未知实体类型：{entity}")
            supplement_totals = {"details": 0, "skill_sets": 0, "skills": 0, "egg_groups": 0}
            for _, plan in pet_supplement_plans:
                applied = apply_pet_supplement(db, plan)
                for key, value in applied.items():
                    supplement_totals[key] += value
            for _, plan in reference_plans:
                apply_reference_ability(db, plan)
            published = apply_packaged_assets(
                db, stage, public_dir, asset_backup_dir, originals
            ) if asset_files else 0
            derivatives = generate_packaged_derivatives(
                db, stage, public_dir, asset_backup_dir, originals
            ) if asset_files else {"webp": 0, "thumbnails": 0}
            integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise RuntimeError(f"导入后数据库完整性失败：{integrity}")
            foreign_key_errors = db.execute("PRAGMA foreign_key_check").fetchall()
            if foreign_key_errors:
                preview = ", ".join(str(tuple(row)) for row in foreign_key_errors[:5])
                raise RuntimeError(f"导入后外键检查失败：{preview}")
            db.commit()
        except Exception:
            db.rollback()
            rollback_published_files(originals)
            raise
        print(
            f"[DONE] 数据库导入 {len(plans)} 项，精灵详情 {supplement_totals['details']} 项，"
            f"技能分类 {supplement_totals['skill_sets']} 组/{supplement_totals['skills']} 条，"
            f"蛋组关联 {supplement_totals['egg_groups']} 条，特性补全 {len(reference_plans)} 项，"
            f"发布图片 {published} 个，生成缩略图 {derivatives['thumbnails']} 个/"
            f"WebP {derivatives['webp']} 个，integrity_check=ok"
        )
        if originals:
            journal_path = Path(args.asset_journal).resolve() if args.asset_journal else asset_backup_dir / "journal.json"
            write_json(journal_path, {
                "public_dir": str(public_dir),
                "files": [
                    {
                        "target": target.relative_to(public_dir).as_posix(),
                        "backup": str(backup) if backup else None,
                    }
                    for target, backup in originals.items()
                ],
            })
            print(f"[BACKUP] 被替换素材备份：{asset_backup_dir}")
            print(f"[BACKUP] 素材回滚清单：{journal_path}")
        return 0
    finally:
        db.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="RocoTools BWIKI 隔离式逐实体同步")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch = subparsers.add_parser("fetch", help="抓取到逐实体暂存目录，不写数据库")
    fetch.add_argument("--all", action="store_true", help="抓取所有精灵、技能和特性")
    fetch.add_argument("--all-skills", action="store_true", help="只暂存全部技能，不暂存精灵和特性")
    fetch.add_argument("--pet", action="append", default=[], help="精灵编号、UID 或名称，可重复")
    fetch.add_argument("--skill", action="append", default=[], help="skill_N、名称或 BWIKI source_id，可重复")
    fetch.add_argument("--all-pets", action="store_true", help="只暂存精灵筛选页的全部基础数据和特性名称")
    fetch.add_argument("--ability", action="append", default=[], help="特性名称，可重复")
    fetch.add_argument("--with-details", action="store_true", help="仅对 --pet 选中的精灵额外请求详情页")
    fetch.add_argument("--no-details", action="store_true", help=argparse.SUPPRESS)
    fetch.add_argument("--output", default=str(DEFAULT_STAGE), help="暂存目录")
    fetch.add_argument("--db", default=str(DEFAULT_DB), help="本地 SQLite，用于稳定 UID 和判定新旧")
    fetch.set_defaults(handler=fetch_command)

    fetch_html = subparsers.add_parser("fetch-html", help="从本地保存的 BWIKI HTML 离线生成暂存数据")
    fetch_html.add_argument("--all", action="store_true", help="暂存所有精灵、技能和特性")
    fetch_html.add_argument("--all-skills", action="store_true", help="只暂存全部技能")
    fetch_html.add_argument("--pet", action="append", default=[], help="精灵编号、UID 或名称，可重复")
    fetch_html.add_argument("--skill", action="append", default=[], help="skill_N、名称或 BWIKI source_id，可重复")
    fetch_html.add_argument("--all-pets", action="store_true", help="只暂存精灵筛选页的全部基础数据和特性名称")
    fetch_html.add_argument("--ability", action="append", default=[], help="特性名称，可重复")
    fetch_html.add_argument("--pet-list-html", required=True, help="精灵筛选 HTML，或 MediaWiki parse API JSON")
    fetch_html.add_argument("--skill-list-html", help="包含技能选择时必需；技能查询 HTML 或 MediaWiki parse API JSON")
    fetch_html.add_argument("--pet-detail-html-dir", help="可选；以精灵名称命名的 .html/.htm/.json 详情文件目录")
    fetch_html.add_argument("--pet-detail-html", action="append", default=[], help="可选；精灵名称=详情文件，可重复")
    fetch_html.add_argument("--output", default=str(DEFAULT_STAGE), help="暂存目录")
    fetch_html.add_argument("--db", default=str(DEFAULT_DB), help="本地 SQLite，用于稳定 UID 和判定新旧")
    fetch_html.set_defaults(handler=fetch_html_command)

    compare = subparsers.add_parser("compare", help="用当前本地数据库重新生成 local.json/diff.json")
    compare.add_argument("--input", default=str(DEFAULT_STAGE), help="暂存目录")
    compare.add_argument("--db", default=str(DEFAULT_DB), help="要比较的本地 SQLite")
    compare.set_defaults(handler=compare_command)

    clean = subparsers.add_parser("clean", help="安全预览或清理 BWIKI 暂存工作区")
    clean.add_argument("--input", default=str(DEFAULT_STAGE), help="要清理的暂存根或历史批次目录")
    clean.add_argument("--include-batches", action="store_true", help="同时清理输入目录下的 batches 历史批次")
    clean.add_argument("--force", action="store_true", help="允许丢弃仍处于 pending 的候选")
    clean.add_argument("--apply", action="store_true", help="实际删除；默认只预览")
    clean.add_argument("--confirm", help="实际删除时必须明确传 CLEAN")
    clean.set_defaults(handler=clean_command)
    package = subparsers.add_parser("package", help="把全部已审核差异整理为独立线上发布包")
    package.add_argument("--input", default=str(DEFAULT_STAGE), help="已完成审核的暂存目录")
    package.add_argument("--output", help="发布包目录；默认写入 data/wiki-releases/wiki_release_时间")
    package.set_defaults(handler=package_command)
    importer = subparsers.add_parser("import", help="按 import.json 选择性导入")
    importer.add_argument("--input", default=str(DEFAULT_STAGE), help="暂存目录")
    importer.add_argument("--db", default=str(DEFAULT_DB), help="目标本地 SQLite")
    importer.add_argument("--public-dir", default=str(DEFAULT_PUBLIC), help="正式图片目录；默认 data/public")
    importer.add_argument("--asset-journal", help="可选；写入素材回滚清单 JSON")
    importer.add_argument("--apply", action="store_true", help="实际写入；不传时只做 dry-run")
    importer.add_argument("--version", help="导入时统一写入 skills/pets.version；例如 S3")
    importer.set_defaults(handler=import_command)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command in {"fetch", "fetch-html"} and not (
        args.all or args.all_pets or args.all_skills or args.pet or args.skill or args.ability
    ):
        parser.error(f"{args.command} 至少需要 --all、--all-pets、--all-skills、--pet、--skill 或 --ability")
    if args.command == "fetch" and args.with_details and (args.all or args.all_pets or not args.pet):
        parser.error("--with-details 只能和一个或多个 --pet 一起使用，不能用于全量精灵")
    try:
        return args.handler(args)
    except KeyboardInterrupt:
        print("\n[STOP] 已取消")
        return 130
    except Exception as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""
洛克王国世界 BWIKI 精灵筛选列表爬取

数据来源：https://wiki.biligame.com/rocom/精灵筛选
仅爬取列表页面的范式数据（图片、属性、六维等），不深入详情页。

输出：
  - data/pets/pet_list.csv
  - data/pets/pet_list.json
"""

import csv
import json
import os
import re
import sys

from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
UTILS_DIR = os.path.join(PROJECT_ROOT, "crawler", "utils")
sys.path.insert(0, UTILS_DIR)
_session = None

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "pets")

CSV_OUTPUT = os.path.join(OUTPUT_DIR, "pet_list.csv")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "pet_list.json")
THUMB_DIR = os.path.join(PROJECT_ROOT, "data", "public", "pets", "thumbnails")
ELEMENT_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "elements", "element_chart_structured.json")

CSV_FIELDS = [
    "uid", "pet_id", "name", "element", "ability_name", "ability_desc",
    "hp", "speed", "atk", "matk", "def", "mdef", "total",
    "version", "image_url",
]


# ============================================================
# 爬取与解析
# ============================================================

def fetch_page_html(page_title: str) -> str:
    """通过 MediaWiki API 获取页面解析后的 HTML"""
    global _session
    from polite_request import create_session, fetch_json

    _session = _session or create_session()
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    print(f"[INFO] 正在获取页面: {page_title}")
    data = fetch_json(_session, API_URL, params=params)
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    return data["parse"]["text"]["*"]


def parse_pet_list(html: str) -> list[dict]:
    """解析精灵筛选页面表格"""
    soup = BeautifulSoup(html, "lxml")

    # 定位目标表格
    target_table = None
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "精灵名称" in headers and "精灵编号" in headers:
            target_table = table
            break

    if not target_table:
        print("[ERROR] 未找到精灵数据表格")
        return []

    pets = []
    rows = target_table.find_all("tr")[1:]  # 跳过表头

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 12:
            continue

        # 2026+ dex-pet-table: 编号、头像、名称、属性、特性、六维、总值（无版本列）
        is_dex_layout = "dex-pet-number" in (cells[0].get("class") or [])
        if is_dex_layout:
            pet_id = cells[0].get_text(strip=True)
            image_cell = cells[1]
            name_cell = cells[2]
            element_cell = cells[3]
            ability_cell = cells[4]
            stat_start = 5
            version = None
        else:
            if len(cells) < 13:
                continue
            image_cell = cells[0]
            name_cell = cells[1]
            element_cell = cells[2]
            pet_id = cells[3].get_text(strip=True)
            ability_cell = cells[4]
            stat_start = 5
            version = cells[12].get_text(strip=True) or None

        img_el = image_cell.find("img")
        image_url = _fix_url((img_el.get("data-src") or img_el.get("src") or "")) if img_el else ""
        link_el = name_cell.find("a") or image_cell.find("a")
        name_from_link = link_el.get("title", "").strip() if link_el else ""
        name = name_cell.get_text(strip=True) or name_from_link

        attr_imgs = element_cell.find_all("img")
        elements_raw = []
        for attr_img in attr_imgs:
            alt = attr_img.get("alt", "")
            match = re.search(r"属性\s+(.+?)\.png", alt)
            if match:
                elements_raw.append(match.group(1).strip())
        element = elements_raw[0] if elements_raw else ""
        sub_element = elements_raw[1] if len(elements_raw) > 1 else None

        ability_full = ability_cell.get_text(strip=True)
        ability_name, ability_desc = _split_ability(ability_full)
        ability_img = ability_cell.find("img")
        ability_icon = _fix_url((ability_img.get("data-src") or ability_img.get("src") or "")) if ability_img else ""

        hp = _safe_int(cells[stat_start].get_text(strip=True))
        speed = _safe_int(cells[stat_start + 1].get_text(strip=True))
        atk = _safe_int(cells[stat_start + 2].get_text(strip=True))
        matk = _safe_int(cells[stat_start + 3].get_text(strip=True))
        def_ = _safe_int(cells[stat_start + 4].get_text(strip=True))
        mdef = _safe_int(cells[stat_start + 5].get_text(strip=True))
        total = _safe_int(cells[stat_start + 6].get_text(strip=True))

        pet = {
            "pet_id": pet_id,
            "name": name,
            "element": element,
            "sub_element": sub_element,
            "ability_name": ability_name,
            "hp": hp,
            "speed": speed,
            "atk": atk,
            "matk": matk,
            "def": def_,
            "mdef": mdef,
            "total": total,
            "version": version,
            # 精灵筛选页只提供列表缩略图，不是详情页正式立绘/特性图标。
            "review_avatar_url": image_url,
            "review_ability_icon_url": ability_icon,
        }
        if ability_desc:
            pet["ability_desc"] = ability_desc
        pets.append(pet)

    # 分配 uid (with stable mapping)
    from collections import Counter
    id_counter = Counter()
    id_total = Counter(p["pet_id"] for p in pets)

    # Load existing UID mapping for stability
    uid_map_path = os.path.join(OUTPUT_DIR, "_uid_mapping.json")
    existing_uid_map = {}  # key: "pet_id::name" -> uid
    if os.path.exists(uid_map_path):
        with open(uid_map_path, "r", encoding="utf-8") as f:
            existing_uid_map = json.load(f)

    # A pet_id that used to have one unsuffixed UID becomes a canonical
    # multi-form group as soon as BWIKI exposes more than one row. Re-number the
    # complete remote group in row order so the original form becomes _1 and
    # newly added forms become _2, _3, ... .
    legacy_multi_ids = {
        pet["pet_id"]
        for pet in pets
        if id_total[pet["pet_id"]] > 1
        and existing_uid_map.get(f"{pet['pet_id']}::{pet['name']}") == f"pet_{pet['pet_id']}"
    }
    canonical_multi_map = {}
    for pid in legacy_multi_ids:
        group = [pet for pet in pets if pet["pet_id"] == pid]
        for index, pet in enumerate(group, start=1):
            canonical_multi_map[f"{pid}::{pet['name']}"] = f"pet_{pid}_{index}"

    reserved_uids = set(canonical_multi_map.values())
    for map_key, uid in existing_uid_map.items():
        pid = map_key.split("::", 1)[0]
        if id_total[pid] > 1 and pid not in legacy_multi_ids:
            reserved_uids.add(uid)

    # Assign stable canonical UIDs.
    new_uid_map = {}
    assigned_uids = set()

    for pet in pets:
        pid = pet["pet_id"]
        map_key = f"{pid}::{pet['name']}"

        if id_total[pid] == 1:
            pet["uid"] = f"pet_{pid}"
        elif map_key in canonical_multi_map:
            pet["uid"] = canonical_multi_map[map_key]
        else:
            if map_key in existing_uid_map:
                pet["uid"] = existing_uid_map[map_key]
            else:
                id_counter[pid] += 1
                candidate = f"pet_{pid}_{id_counter[pid]}"
                while candidate in reserved_uids or candidate in assigned_uids:
                    id_counter[pid] += 1
                    candidate = f"pet_{pid}_{id_counter[pid]}"
                pet["uid"] = candidate

        assigned_uids.add(pet["uid"])
        new_uid_map[map_key] = pet["uid"]

    # Save updated UID mapping for future stability
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(uid_map_path, "w", encoding="utf-8") as f:
        json.dump(new_uid_map, f, ensure_ascii=False, indent=2)

    return pets


# ============================================================
# 工具函数
# ============================================================

def _safe_int(val) -> int:
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return 0


def _split_ability(text: str) -> tuple[str, str]:
    """拆分 '特性名:描述' 格式"""
    for sep in (":", "："):
        if sep in text:
            parts = text.split(sep, 1)
            return parts[0].strip(), parts[1].strip()
    return text.strip(), ""


def _fix_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return "https://wiki.biligame.com" + url
    return url


# ============================================================
# 保存
# ============================================================

def save_csv(pets: list[dict], filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for pet in pets:
            row = dict(pet)
            # element 可能是对象，CSV 中展平为名称
            if isinstance(row.get("element"), dict):
                row["element"] = row["element"].get("name", "")
            writer.writerow(row)
    print(f"[INFO] CSV 已保存: {filepath} ({len(pets)} 条)")


def save_json(pets: list[dict], filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(pets, f, ensure_ascii=False, indent=2)
    print(f"[INFO] JSON 已保存: {filepath} ({len(pets)} 条)")


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60)
    print("洛克王国世界 BWIKI 精灵筛选列表爬取")
    print("=" * 60)
    print()

    html = fetch_page_html("精灵筛选")
    pets = parse_pet_list(html)

    if not pets:
        print("[ERROR] 未解析到数据")
        sys.exit(1)

    print(f"[INFO] 共解析 {len(pets)} 条精灵数据")
    print()

    # 加载属性结构化数据，将 element 映射为结构化引用
    if os.path.exists(ELEMENT_DATA_PATH):
        with open(ELEMENT_DATA_PATH, "r", encoding="utf-8") as f:
            elem_data = json.load(f)
        # 构建 name -> 结构化引用 的映射
        elem_lookup = {}
        for key, obj in elem_data["elements"].items():
            elem_lookup[obj["name"]] = {
                "id": obj["id"],
                "key": obj["key"],
                "name": obj["name"],
                "color": obj.get("color", ""),
                "icon": obj.get("icon", ""),
            }
        # 替换每个精灵的 element 和 sub_element 字段
        for pet in pets:
            name = pet.get("element", "")
            if name in elem_lookup:
                pet["element"] = elem_lookup[name]
            else:
                pet["element"] = {"id": None, "key": None, "name": name, "color": "", "icon": ""}
            # 副属性
            sub_name = pet.get("sub_element")
            if sub_name and sub_name in elem_lookup:
                pet["sub_element"] = elem_lookup[sub_name]
            elif sub_name:
                pet["sub_element"] = {"id": None, "key": None, "name": sub_name, "color": "", "icon": ""}
            else:
                pet["sub_element"] = None
        print(f"[INFO] element 已映射为结构化引用（{len(elem_lookup)} 种属性）")
    else:
        print("[WARN] 未找到属性结构化数据，element 保持字符串格式")

    # 加载蛋组数据，将 egg_groups 写入每个精灵
    EGG_GROUP_PATH = os.path.join(PROJECT_ROOT, "data", "eggs", "egg_group.json")
    if os.path.exists(EGG_GROUP_PATH):
        with open(EGG_GROUP_PATH, "r", encoding="utf-8") as f:
            egg_data = json.load(f)
        pet_egg_groups = egg_data.get("pet_egg_groups", {})
        for pet in pets:
            pid = pet["pet_id"]
            pet["egg_groups"] = pet_egg_groups.get(pid, [])
        has_egg = sum(1 for p in pets if p["egg_groups"])
        print(f"[INFO] egg_groups 已写入（{has_egg}/{len(pets)} 有蛋组数据）")
    else:
        for pet in pets:
            pet["egg_groups"] = []
        print("[WARN] 未找到蛋组数据，egg_groups 为空")

    save_csv(pets, CSV_OUTPUT)
    save_json(pets, JSON_OUTPUT)

    # 下载精灵缩略图
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from downloader import batch_download

    print()
    print("[INFO] 下载精灵缩略图...")
    thumb_items = [{"url": p["image_url"], "filename": f"{p['uid']}.png"}
                   for p in pets if p.get("image_url")]
    batch_download(thumb_items, THUMB_DIR, label="缩略图 ")

    # 更新 image_url 为本地路径
    for pet in pets:
        if pet.get("image_url"):
            pet["image_url"] = f"/public/pets/thumbnails/{pet['uid']}.png"

    # 重新保存（含本地路径）
    save_json(pets, JSON_OUTPUT)

    # 统计
    has_img = sum(1 for p in pets if p["image_url"])
    has_elem = sum(1 for p in pets if p["element"])
    print()
    print(f"[STAT] 有图片: {has_img}/{len(pets)}")
    print(f"[STAT] 有属性: {has_elem}/{len(pets)}")

    # 生成校验报告
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from report import generate_report

    total = len(pets)
    check_fields = ["uid", "pet_id", "name", "element", "ability_name", "ability_desc",
                     "hp", "speed", "atk", "matk", "def", "mdef", "total",
                     "version", "image_url", "egg_groups"]
    field_checks = []
    for f in check_fields:
        has = sum(1 for p in pets if p.get(f))
        missing_items = [f"{p['name']}(NO.{p['pet_id']})" for p in pets if not p.get(f)]
        field_checks.append({"field": f, "has": has, "missing_items": missing_items})

    generate_report(
        output_dir=OUTPUT_DIR,
        report_name="pet_list_report.md",
        title="精灵筛选列表 - 完整性校验报告",
        source="https://wiki.biligame.com/rocom/精灵筛选",
        total=total,
        field_checks=field_checks,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
set -Eeuo pipefail
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8
IFS=$'\n\t'

PYTHON_BIN="${PYTHON_BIN:-python}"
export PYTHON_BIN
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RELEASE=""
VERSION=""
DEV_DB="app/server/data/roco.db"
TEST_ONLY=0
CURRENT_STEP="初始化"
CURRENT_LOG=""
SESSION_DIR=""
DEV_BACKUP=""
TEST_PUBLIC=""
TEST_ASSET_JOURNAL=""
DEV_ASSET_JOURNAL=""
SESSION_ROOT="${WIKI_IMPORT_SESSION_ROOT:-}"

usage() {
  cat <<'EOF'
用法：
  bash scripts/wiki_dev_import.sh --release <发布包目录> --version <版本号>

参数：
  --release DIR   阶段一生成的发布包目录，必须包含 manifest.json
  --version TEXT  写入 skills.version / pets.version 的版本号，例如 S3
  --db FILE       DEV SQLite，默认 app/server/data/roco.db
  --test-only     只完成测试库演练，不询问写入 DEV 正式库
  -h, --help      显示帮助

示例：
  bash scripts/wiki_dev_import.sh \
    --release data/wiki-releases/s3-2026-07-25-03 \
    --version S3
EOF
}

say() {
  printf '%s\n' "$*"
}

die() {
  say ""
  say "[ERROR] 步骤失败：$CURRENT_STEP"
  say "[ERROR] $*"
  if [[ -n "$CURRENT_LOG" && -f "$CURRENT_LOG" ]]; then
    say "[ERROR] 最近日志：$CURRENT_LOG"
    tail -n 20 "$CURRENT_LOG" || true
  fi
  if [[ -n "$DEV_BACKUP" && -f "$DEV_BACKUP" ]]; then
    say "[RECOVERY] DEV 导入前备份仍在：$DEV_BACKUP"
    say "[RECOVERY] 不要启动服务；重新运行本脚本并在人工验收阶段选择 RESTORE，或按文档恢复。"
  fi
  [[ -n "$SESSION_DIR" ]] && say "[INFO] 本次检查目录：$SESSION_DIR"
  exit 1
}

unexpected_error() {
  local code=$?
  local line=${1:-unknown}
  die "脚本在第 ${line} 行异常退出（code ${code}）"
}
trap 'unexpected_error $LINENO' ERR

run_logged() {
  local step="$1"
  local log="$2"
  shift 2
  CURRENT_STEP="$step"
  CURRENT_LOG="$log"
  say ""
  say "============================================================"
  say "[STEP] $CURRENT_STEP"
  say "[LOG]  $CURRENT_LOG"
  say "============================================================"
  local code=0
  if "$@" 2>&1 | tee "$CURRENT_LOG"; then
    code=0
  else
    code=${PIPESTATUS[0]}
  fi
  if [[ "$code" -ne 0 ]]; then
    die "命令执行失败（code $code）"
  fi
}

run_logged_quiet() {
  local step="$1"
  local log="$2"
  shift 2
  CURRENT_STEP="$step"
  CURRENT_LOG="$log"
  say ""
  say "============================================================"
  say "[STEP] $CURRENT_STEP"
  say "[LOG]  $CURRENT_LOG"
  say "============================================================"
  local code=0
  if "$@" >"$CURRENT_LOG" 2>&1; then
    tail -n 5 "$CURRENT_LOG" || true
  else
    code=$?
    die "命令执行失败（code $code）"
  fi
}

resolve_existing() {
  "$PYTHON_BIN" - "$1" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1]).resolve(strict=True)
print(path)
PY
}

assert_inside() {
  "$PYTHON_BIN" - "$PROJECT_ROOT" "$1" "$2" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2]).resolve()
label = sys.argv[3]
try:
    target.relative_to(root)
except ValueError:
    raise SystemExit(f"{label} 必须位于项目目录内：{target}")
print(target)
PY
}

server_is_running() {
  curl -sS --max-time 2 -o /dev/null "http://localhost:3000/" >/dev/null 2>&1
}

require_server_stopped() {
  if server_is_running; then
    die "检测到 http://localhost:3000 有服务响应。请先在运行 npm run dev 的终端按 Ctrl+C，确认服务停止后重试。"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      RELEASE="$2"
      shift 2
      ;;
    --version)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      VERSION="$2"
      shift 2
      ;;
    --db)
      [[ $# -ge 2 ]] || { usage; exit 2; }
      DEV_DB="$2"
      shift 2
      ;;
    --test-only)
      TEST_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      say "[ERROR] 未知参数：$1"
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$RELEASE" ]]; then
  read -r -p "请输入发布包目录（例如 data/wiki-releases/s3-release）： " RELEASE
fi
if [[ -z "$VERSION" ]]; then
  read -r -p "请输入本次统一版本号（例如 S3）： " VERSION
fi

[[ -n "${RELEASE//[[:space:]]/}" ]] || die "发布包目录不能为空"
[[ -n "${VERSION//[[:space:]]/}" ]] || die "版本号不能为空"
[[ ${#VERSION} -le 40 ]] || die "版本号不能超过 40 个字符"
command -v "$PYTHON_BIN" >/dev/null 2>&1 || die "未找到 Python 命令：$PYTHON_BIN"
command -v curl >/dev/null 2>&1 || die "未找到 curl；Windows Git Bash 应自带 curl，请检查当前终端环境"
[[ -d "$RELEASE" ]] || die "发布包目录不存在：$RELEASE"
[[ -f "$RELEASE/manifest.json" ]] || die "发布包缺少 manifest.json：$RELEASE"
[[ -f "$DEV_DB" ]] || die "DEV 数据库不存在：$DEV_DB"

RELEASE="$(resolve_existing "$RELEASE")"
DEV_DB="$(resolve_existing "$DEV_DB")"
assert_inside "$RELEASE" "发布包目录" >/dev/null
assert_inside "$DEV_DB" "DEV 数据库" >/dev/null

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
if [[ -z "$SESSION_ROOT" ]]; then
  SESSION_ROOT="$PROJECT_ROOT/tmp/wiki-dev-import"
fi
mkdir -p "$SESSION_ROOT"
SESSION_ROOT="$(resolve_existing "$SESSION_ROOT")"
assert_inside "$SESSION_ROOT" "导入会话目录" >/dev/null
SESSION_DIR="$SESSION_ROOT/${TIMESTAMP}-$$"
mkdir -p "$SESSION_DIR"
TEST_DB="$SESSION_DIR/roco-import-test.db"
TEST_REPORT="$SESSION_DIR/test-report.json"
DEV_REPORT="$SESSION_DIR/dev-report.json"
DEV_BACKUP="$SESSION_DIR/dev-before-import.db"
TEST_PUBLIC="$SESSION_DIR/test-public"
TEST_ASSET_JOURNAL="$SESSION_DIR/test-assets.json"
DEV_ASSET_JOURNAL="$SESSION_DIR/dev-assets.json"

say ""
say "BWIKI DEV 导入向导"
say "项目目录：$PROJECT_ROOT"
say "发布包：  $RELEASE"
say "版本号：  $VERSION"
say "DEV 数据库：$DEV_DB"
say "检查目录：$SESSION_DIR"
say ""
say "本脚本不会连接生产服务器；测试阶段发布到隔离图片目录，DEV 阶段发布到 data/public。"

if [[ $TEST_ONLY -eq 0 ]]; then
  CURRENT_STEP="检查 DEV 服务状态"
  require_server_stopped
fi

run_logged "1/8 发布包和 DEV 数据库预检" "$SESSION_DIR/01-preflight.log" \
  "$PYTHON_BIN" - "$RELEASE" "$DEV_DB" "$VERSION" <<'PY'
from pathlib import Path
import json
import sqlite3
import sys

release = Path(sys.argv[1])
db_path = Path(sys.argv[2])
version = sys.argv[3]
manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
counts = manifest.get("counts") or {}
if manifest.get("review", {}).get("pending", 0):
    raise SystemExit(f"发布包仍有 pending：{manifest['review']['pending']}")
if not version.strip():
    raise SystemExit("版本号不能为空")
db = sqlite3.connect(db_path)
try:
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    foreign_keys = db.execute("PRAGMA foreign_key_check").fetchall()
    if integrity != "ok":
        raise SystemExit(f"DEV 数据库完整性失败：{integrity}")
    if foreign_keys:
        raise SystemExit(f"DEV 数据库已有外键错误：{foreign_keys[:5]}")
    print(f"[OK] package_id={manifest.get('package_id')}")
    print(f"[OK] database_imports={counts.get('database_imports', 0)}")
    print(f"[OK] reference_asset_items={counts.get('reference_asset_items', 0)}")
    print(f"[OK] asset_files={counts.get('asset_files', 0)}")
    print(f"[OK] DEV integrity_check={integrity}, foreign_key_errors=0")
finally:
    db.close()
PY

run_logged "2/8 使用 SQLite Backup API 生成独立测试库" "$SESSION_DIR/02-create-test-db.log" \
  "$PYTHON_BIN" - "$DEV_DB" "$TEST_DB" <<'PY'
import sqlite3
import sys

source_path, target_path = sys.argv[1:3]
source = sqlite3.connect(source_path)
target = sqlite3.connect(target_path)
try:
    source.backup(target)
finally:
    target.close()
    source.close()
print(f"[OK] 测试数据库已生成：{target_path}")
PY

run_logged_quiet "3/8 在测试库执行 import dry-run" "$SESSION_DIR/03-test-dry-run.log" \
  "$PYTHON_BIN" scripts/wiki_staging.py import \
    --input "$RELEASE" --db "$TEST_DB" --public-dir "$TEST_PUBLIC" --version "$VERSION"

run_logged_quiet "4/8 在测试库执行真实导入" "$SESSION_DIR/04-test-apply.log" \
  "$PYTHON_BIN" scripts/wiki_staging.py import \
    --input "$RELEASE" --db "$TEST_DB" --public-dir "$TEST_PUBLIC" --asset-journal "$TEST_ASSET_JOURNAL" --version "$VERSION" --apply

validate_import() {
  local before_db="$1"
  local after_db="$2"
  local report="$3"
  "$PYTHON_BIN" - "$RELEASE" "$before_db" "$after_db" "$VERSION" "$report" <<'PY'
from pathlib import Path
import json
import sqlite3
import sys

release = Path(sys.argv[1])
before_path = Path(sys.argv[2])
after_path = Path(sys.argv[3])
version = sys.argv[4]
report_path = Path(sys.argv[5])
manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
all_items = manifest.get("items", [])
items = [item for item in all_items if item.get("action") == "database-import"]
reference_items = [item for item in all_items if item.get("action") == "reference-assets-only"]
pet_target_uids = set()
migration_source_by_target = {}
migration_source_uids = set()
for item in items:
    if item.get("entity") == "pet":
        item_plan = json.loads((release / item["folder"] / "import.json").read_text(encoding="utf-8"))
        if item_plan.get("id"):
            pet_target_uids.add(item_plan["id"])
        migration = item_plan.get("uid_migration") or {}
        if migration.get("from") and migration.get("to"):
            migration_source_by_target[migration["to"]] = migration["from"]
            migration_source_uids.add(migration["from"])

def summary(path):
    db = sqlite3.connect(path)
    try:
        integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_keys = db.execute("PRAGMA foreign_key_check").fetchall()
        return db, {
            "integrity_check": integrity,
            "foreign_key_errors": len(foreign_keys),
            "pets": db.execute("SELECT COUNT(*) FROM pets").fetchone()[0],
            "skills": db.execute("SELECT COUNT(*) FROM skills").fetchone()[0],
            "version_pets": db.execute("SELECT COUNT(*) FROM pets WHERE version = ?", (version,)).fetchone()[0],
            "version_skills": db.execute("SELECT COUNT(*) FROM skills WHERE version = ?", (version,)).fetchone()[0],
        }
    except Exception:
        db.close()
        raise

before_db, before = summary(before_path)
after_db, after = summary(after_path)
errors = []
checked = {
    "skill": 0, "pet": 0, "ability": 0, "uid_migration": 0,
    "pet_detail": 0, "pet_skill_sets": 0, "pet_skills": 0, "pet_egg_groups": 0,
}

def clean_text(value):
    return str(value or "").strip()

def level_key(value):
    value = clean_text(value)
    return int(value) if value.isdigit() else None

def normalized_measurement(value):
    import re
    from decimal import Decimal, InvalidOperation
    text = clean_text(value).replace("～", "-").replace("~", "-").replace("—", "-").replace("–", "-")
    parts = [part.strip() for part in text.split("-")]
    if not parts or any(not re.fullmatch(r"\d+(?:\.\d+)?", part) for part in parts):
        return text
    try:
        return tuple(Decimal(part).normalize() for part in parts)
    except InvalidOperation:
        return text

def resolve_skill_uid(db, skill):
    ref_uid = clean_text(skill.get("skill_ref_uid"))
    if ref_uid and db.execute("SELECT 1 FROM skills WHERE uid = ?", (ref_uid,)).fetchone():
        return ref_uid
    name = clean_text(skill.get("name"))
    rows = db.execute(
        "SELECT uid FROM skills WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '（', '('), '）', ')')) = "
        "LOWER(REPLACE(REPLACE(REPLACE(?, ' ', ''), '（', '('), '）', ')'))",
        (name,),
    ).fetchall()
    return rows[0][0] if len(rows) == 1 else None

def validate_pet_supplement(item):
    folder = release / item["folder"]
    plan_path = folder / "import.json"
    if not plan_path.exists():
        return
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    detail = plan.get("detail") or {}
    supplement_keys = (
        "height", "weight", "skills", "bloodline_skills", "learnable_stones", "egg_groups"
    )
    if not isinstance(detail, dict) or not any(detail.get(key) for key in supplement_keys):
        return
    uid = plan.get("id")
    row = after_db.execute("SELECT height, weight FROM pet_details WHERE pet_uid = ?", (uid,)).fetchone()
    if uid in migration_source_by_target:
        before_uid = migration_source_by_target[uid]
        before_row = before_db.execute(
            "SELECT height, weight FROM pet_details WHERE pet_uid = ?", (before_uid,)
        ).fetchone()
    elif uid in migration_source_uids:
        before_row = None
    else:
        before_row = before_db.execute(
            "SELECT height, weight FROM pet_details WHERE pet_uid = ?", (uid,)
        ).fetchone()
    for index, field in enumerate(("height", "weight")):
        expected = clean_text(detail.get(field))
        if not expected:
            continue
        checked["pet_detail"] += 1
        previous = clean_text(before_row[index]) if before_row else ""
        actual = clean_text(row[index]) if row else ""
        expected_after = previous if previous and "�" not in previous else expected
        if normalized_measurement(actual) != normalized_measurement(expected_after):
            errors.append(f"{uid} {field} 未正确导入：expected={expected_after!r}, actual={actual!r}")
    for source_key, skill_type in (
        ("skills", "skills"),
        ("bloodline_skills", "bloodline_skills"),
        ("learnable_stones", "learnable_stones"),
    ):
        source_skills = detail.get(source_key)
        if not isinstance(source_skills, list) or not source_skills:
            continue
        checked["pet_skill_sets"] += 1
        expected_rows = set()
        for skill in source_skills:
            skill_uid = resolve_skill_uid(after_db, skill)
            if not skill_uid:
                errors.append(f"{uid}/{source_key} 无法解析技能：{skill.get('name') or skill.get('skill_ref_uid')}")
                continue
            expected_rows.add((skill_uid, level_key(skill.get("level"))))
        actual_rows = {
            (entry[0], level_key(entry[1]))
            for entry in after_db.execute(
                "SELECT skill_ref_uid, level FROM pet_skills WHERE pet_uid = ? AND skill_type = ?",
                (uid, skill_type),
            ).fetchall()
        }
        checked["pet_skills"] += len(actual_rows)
        if actual_rows != expected_rows:
            errors.append(
                f"{uid}/{source_key} 导入不完整：expected={len(expected_rows)}, actual={len(actual_rows)}"
            )
    source_groups = detail.get("egg_groups")
    if isinstance(source_groups, list) and source_groups:
        manual_rows = before_db.execute(
            "SELECT egg_group_id FROM pet_egg_groups WHERE pet_uid = ? AND manual_edit = 1", (uid,)
        ).fetchall()
        expected_ids = {entry[0] for entry in manual_rows}
        if not expected_ids:
            for group in source_groups:
                group_id = group.get("id") if isinstance(group, dict) else None
                name = clean_text(group.get("name") if isinstance(group, dict) else group)
                if group_id is None and name:
                    matched = after_db.execute("SELECT id FROM egg_groups WHERE name = ?", (name,)).fetchone()
                    group_id = matched[0] if matched else None
                if group_id is not None:
                    expected_ids.add(int(group_id))
        actual_ids = {
            entry[0] for entry in after_db.execute(
                "SELECT egg_group_id FROM pet_egg_groups WHERE pet_uid = ?", (uid,)
            ).fetchall()
        }
        checked["pet_egg_groups"] += len(actual_ids)
        if actual_ids != expected_ids:
            errors.append(
                f"{uid}/egg_groups 导入不完整：expected={sorted(expected_ids)}, actual={sorted(actual_ids)}"
            )
try:
    if after["integrity_check"] != "ok":
        errors.append(f"integrity_check={after['integrity_check']}")
    if after["foreign_key_errors"]:
        errors.append(f"foreign_key_errors={after['foreign_key_errors']}")
    for item in items:
        entity = item.get("entity")
        folder = release / item["folder"]
        plan = json.loads((folder / "import.json").read_text(encoding="utf-8"))
        uid = plan.get("id")
        if entity == "skill":
            checked["skill"] += 1
            row = after_db.execute("SELECT version FROM skills WHERE uid = ?", (uid,)).fetchone()
            if not row:
                errors.append(f"技能未写入：{uid}")
            elif row[0] != version:
                errors.append(f"技能版本不正确：{uid}={row[0]!r}")
        elif entity == "pet":
            checked["pet"] += 1
            row = after_db.execute("SELECT version FROM pets WHERE uid = ?", (uid,)).fetchone()
            if not row:
                errors.append(f"精灵未写入：{uid}")
            elif row[0] != version:
                errors.append(f"精灵版本不正确：{uid}={row[0]!r}")
            migration = plan.get("uid_migration") or {}
            if migration.get("from") and migration.get("to"):
                checked["uid_migration"] += 1
                old_row = after_db.execute("SELECT 1 FROM pets WHERE uid = ?", (migration["from"],)).fetchone()
                new_row = after_db.execute("SELECT 1 FROM pets WHERE uid = ?", (migration["to"],)).fetchone()
                old_uid_is_reused = migration["from"] in pet_target_uids
                if not new_row or (old_row and not old_uid_is_reused):
                    errors.append(f"UID 迁移结果不正确：{migration['from']} -> {migration['to']}")
        elif entity == "ability":
            checked["ability"] += 1
            data = plan.get("data") or {}
            if "description" in (plan.get("fields") or []):
                count = after_db.execute(
                    "SELECT COUNT(*) FROM pets WHERE ability_name = ? AND ability_desc = ?",
                    (data.get("name"), data.get("description")),
                ).fetchone()[0]
                if count == 0:
                    errors.append(f"特性描述未写入关联精灵：{data.get('name')}")
    for item in reference_items:
        if item.get("entity") != "ability":
            continue
        folder = release / item["folder"]
        plan_path = folder / "import.json"
        if not plan_path.exists():
            errors.append(f"特性补全计划缺失：{item.get('folder')}")
            continue
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        data = plan.get("data") or {}
        checked["ability"] += 1
        if data.get("description"):
            empty_count = after_db.execute(
                "SELECT COUNT(*) FROM pets WHERE ability_name = ? AND (ability_desc IS NULL OR TRIM(ability_desc) = '' OR INSTR(ability_desc, '�') > 0)",
                (data.get("name"),),
            ).fetchone()[0]
            if empty_count:
                errors.append(f"特性描述仍有空关联精灵：{data.get('name')}={empty_count}")
    for item in all_items:
        if item.get("entity") == "pet":
            validate_pet_supplement(item)
finally:
    before_db.close()
    after_db.close()

report = {
    "version": version,
    "package_id": manifest.get("package_id"),
    "before": before,
    "after": after,
    "delta": {"pets": after["pets"] - before["pets"], "skills": after["skills"] - before["skills"]},
    "checked": checked,
    "errors": errors,
}
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(f"导入结果验证失败，共 {len(errors)} 项")
PY
}

validate_assets() {
  local db_path="$1"
  local public_dir="$2"
  "$PYTHON_BIN" - "$RELEASE" "$db_path" "$public_dir" <<'PY'
from pathlib import Path
import hashlib
import json
import sqlite3
import sys

release, db_path, public_dir = map(Path, sys.argv[1:4])
manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
db = sqlite3.connect(db_path)
errors = []
checked = 0
derivatives_checked = 0
pet_fields = {
    "image_default": "image_default", "image_shiny": "image_shiny",
    "image_fruit": "image_fruit", "image_egg": "image_egg",
    "ability_icon": "ability_icon",
}
def check_url(url, expected_hash, label):
    global checked
    if not url or not url.startswith("/public/"):
        errors.append(f"{label} 数据库图片路径无效：{url!r}")
        return
    target = public_dir / url.removeprefix("/public/")
    if not target.is_file():
        errors.append(f"{label} 图片文件不存在：{target}")
        return
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual != expected_hash:
        errors.append(f"{label} 图片 SHA-256 不匹配：{target}")
        return
    checked += 1

def check_derivative(url, label):
    global derivatives_checked
    if not url or not url.startswith("/public/"):
        errors.append(f"{label} 衍生图数据库路径无效：{url!r}")
        return
    target = public_dir / url.removeprefix("/public/")
    if not target.is_file():
        errors.append(f"{label} 衍生图文件不存在：{target}")
        return
    if target.suffix.lower() != ".webp":
        errors.append(f"{label} 衍生图不是 WebP：{target}")
        return
    derivatives_checked += 1

def companion_webp(url, label):
    if not url or not url.startswith("/public/"):
        return
    path = Path(url.removeprefix("/public/"))
    check_derivative("/public/" + path.with_suffix(".webp").as_posix(), label)

try:
    for item in manifest.get("items") or []:
        folder = release / item["folder"]
        assets_path = folder / "assets.json"
        if not assets_path.exists():
            continue
        assets = json.loads(assets_path.read_text(encoding="utf-8"))
        entity, uid = item.get("entity"), item.get("id")
        plan_path = folder / "import.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8")) if plan_path.exists() else {}
        data = plan.get("data") or {}
        for key, metadata in assets.items():
            expected_hash = metadata.get("sha256")
            if entity == "pet":
                field = pet_fields[key]
                row = db.execute(f"SELECT {field} FROM pet_details WHERE pet_uid = ?", (uid,)).fetchone()
                url = row[0] if row else None
                check_url(url, expected_hash, f"{uid}/{key}")
                companion_webp(url, f"{uid}/{key}/webp")
                if key == "image_default":
                    thumb = db.execute("SELECT thumb_url FROM pets WHERE uid = ?", (uid,)).fetchone()
                    check_derivative(thumb[0] if thumb else None, f"{uid}/thumb")
            elif entity == "skill":
                row = db.execute("SELECT icon_url FROM skills WHERE uid = ?", (uid,)).fetchone()
                url = row[0] if row else None
                check_url(url, expected_hash, f"{uid}/icon")
                companion_webp(url, f"{uid}/icon/webp")
            elif entity == "ability":
                name = data.get("name") or item.get("name")
                rows = db.execute(
                    "SELECT p.uid, p.ability_desc, pd.ability_icon FROM pets p "
                    "LEFT JOIN pet_details pd ON pd.pet_uid = p.uid WHERE p.ability_name = ?",
                    (name,),
                ).fetchall()
                if not rows:
                    errors.append(f"特性没有关联精灵：{name}")
                if data.get("description") and any(not row[1] or "�" in row[1] for row in rows):
                    errors.append(f"特性描述仍为空：{name}")
                for row in rows:
                    check_url(row[2], expected_hash, f"{name}/{row[0]}/icon")
                    companion_webp(row[2], f"{name}/{row[0]}/icon/webp")
finally:
    db.close()
print(f"[OK] 已验证原图 {checked} 个、WebP/缩略图 {derivatives_checked} 个")
if errors:
    for error in errors[:30]:
        print(f"[ERROR] {error}")
    raise SystemExit(f"素材或特性验证失败，共 {len(errors)} 项")
PY
}

validate_all() {
  validate_import "$1" "$2" "$3" || return $?
  validate_assets "$2" "$4" || return $?
}

run_logged "5/8 验证测试库结果和每个导入 UID" "$SESSION_DIR/05-test-verify.log" \
  validate_all "$DEV_DB" "$TEST_DB" "$TEST_REPORT" "$TEST_PUBLIC"

say ""
say "[PASS] 测试库演练通过。"
say "[REPORT] $TEST_REPORT"
say "[INFO] 目前尚未修改 DEV 正式数据库。"

if [[ $TEST_ONLY -eq 1 ]]; then
  say "[DONE] --test-only 已完成，脚本在 DEV 正式库写入前停止。"
  exit 0
fi

say ""
say "下一步会备份并修改 DEV 正式数据库："
say "  $DEV_DB"
say "如只想查看测试结果，请输入 STOP。"
read -r -p "输入 APPLY-DEV 才会继续： " APPLY_CONFIRM
if [[ "$APPLY_CONFIRM" != "APPLY-DEV" ]]; then
  say "[STOP] 未获得 APPLY-DEV 授权，DEV 正式数据库没有修改。"
  exit 0
fi

CURRENT_STEP="再次检查 DEV 服务状态"
require_server_stopped

run_logged "6/8 生成 DEV 导入前独立备份" "$SESSION_DIR/06-backup-dev.log" \
  "$PYTHON_BIN" - "$DEV_DB" "$DEV_BACKUP" <<'PY'
import sqlite3
import sys

source_path, target_path = sys.argv[1:3]
source = sqlite3.connect(source_path)
target = sqlite3.connect(target_path)
try:
    source.backup(target)
finally:
    target.close()
    source.close()
print(f"[OK] DEV 导入前备份：{target_path}")
PY

run_logged_quiet "7/8 DEV 正式库 dry-run 后执行导入" "$SESSION_DIR/07-dev-import.log" \
  bash -c '
    set -euo pipefail
    "$PYTHON_BIN" scripts/wiki_staging.py import --input "$1" --db "$2" --public-dir "$4" --version "$3"
    "$PYTHON_BIN" scripts/wiki_staging.py import --input "$1" --db "$2" --public-dir "$4" --asset-journal "$5" --version "$3" --apply
  ' _ "$RELEASE" "$DEV_DB" "$VERSION" "$PROJECT_ROOT/data/public" "$DEV_ASSET_JOURNAL"

run_logged "8/8 验证 DEV 正式库结果和每个导入 UID" "$SESSION_DIR/08-dev-verify.log" \
  validate_all "$DEV_BACKUP" "$DEV_DB" "$DEV_REPORT" "$PROJECT_ROOT/data/public"

say ""
say "============================================================"
say "[PASS] DEV 数据库导入与自动检查通过"
say "============================================================"
say "DEV 导入前备份：$DEV_BACKUP"
say "DEV 验证报告：  $DEV_REPORT"
say ""
say "现在请在另一个 Git Bash 终端执行："
say "  npm run dev"
say ""
say "请人工检查："
say "  1. 管理端技能、特性、精灵的新增和修改内容"
say "  2. 精灵 UID、形态列表以及原有关联是否正常"
say "  3. 本次版本号是否正确"
say "  4. 身高、体重、蛋组是否正确；已有人工数据没有被远程空值覆盖"
say "  5. 精灵技能、血脉技能、技能石技能的数量、等级和详情是否正确"
say "  6. 本体、异色、果实、精灵蛋、技能图标和特性图标是否正确显示"
say "  7. 公开 API 和页面是否能正常打开"
say ""
say "检查完成后先停止 npm run dev，再回到这里输入结果。"
read -r -p "输入 CONFIRM 表示验收成功；RESTORE 恢复；KEEP 暂时保留： " MANUAL_RESULT

case "$MANUAL_RESULT" in
  CONFIRM)
    say "[DONE] 已记录人工验收成功。可以进入服务器部署阶段。"
    ;;
  RESTORE)
    CURRENT_STEP="人工要求恢复 DEV 数据库"
    require_server_stopped
    run_logged "恢复 DEV 到导入前备份" "$SESSION_DIR/09-restore-dev.log" \
      "$PYTHON_BIN" - "$DEV_BACKUP" "$DEV_DB" "$DEV_ASSET_JOURNAL" "$PROJECT_ROOT/data/public" <<'PY'
from pathlib import Path
import json
import shutil
import sqlite3
import sys

backup_path, db_path = sys.argv[1:3]
journal_path = Path(sys.argv[3])
public_dir = Path(sys.argv[4]).resolve()
asset_operations = []
if journal_path.exists():
    journal = json.loads(journal_path.read_text(encoding="utf-8"))
    for item in journal.get("files") or []:
        relative = Path(item["target"])
        if relative.is_absolute() or ".." in relative.parts:
            raise SystemExit(f"素材回滚路径非法：{relative}")
        target_file = (public_dir / relative).resolve()
        if public_dir not in target_file.parents:
            raise SystemExit(f"素材回滚路径越界：{target_file}")
        source_file = Path(item["backup"]).resolve() if item.get("backup") else None
        if source_file and not source_file.is_file():
            raise SystemExit(f"素材备份不存在：{source_file}")
        asset_operations.append((target_file, source_file))
source = sqlite3.connect(backup_path)
target = sqlite3.connect(db_path)
try:
    source.backup(target)
finally:
    target.close()
    source.close()
check = sqlite3.connect(db_path)
try:
    integrity = check.execute("PRAGMA integrity_check").fetchone()[0]
    foreign_keys = check.execute("PRAGMA foreign_key_check").fetchall()
finally:
    check.close()
if integrity != "ok" or foreign_keys:
    raise SystemExit(f"恢复后检查失败：integrity={integrity}, foreign_keys={foreign_keys[:5]}")
for target_file, source_file in asset_operations:
    if source_file:
        target_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target_file)
    elif target_file.exists():
        target_file.unlink()
print(f"[OK] DEV 数据库和 {len(asset_operations)} 个素材文件已恢复")
PY
    say "[RESTORED] 已恢复到导入前状态，不得进入服务器部署阶段。"
    ;;
  KEEP)
    say "[PENDING] DEV 数据保留，但尚未完成人工验收，不得进入服务器部署阶段。"
    exit 3
    ;;
  *)
    say "[PENDING] 输入未识别。DEV 数据保留，尚未完成人工验收。"
    say "[INFO] 备份仍在：$DEV_BACKUP"
    exit 3
    ;;
esac

say "[INFO] 本次完整日志和报告：$SESSION_DIR"

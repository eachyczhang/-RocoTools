#!/usr/bin/env bash
set -Eeuo pipefail
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
IFS=$'\n\t'

PYTHON_BIN="${PYTHON_BIN:-python3}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RELEASE=""
VERSION=""
PROD_DB="app/server/data/roco.db"
PUBLIC_DIR="data/public"
PM2_APP="roco"
HEALTH_URL="http://127.0.0.1:3000/api/stats"
APPLY=0
SESSION_ROOT="${WIKI_SERVER_SESSION_ROOT:-$PROJECT_ROOT/app/server/data/backups/wiki-server-import}"
SESSION_DIR=""
DB_BACKUP=""
ASSET_JOURNAL=""
SERVICE_STOPPED=0
PRODUCTION_TOUCHED=0
ROLLING_BACK=0
CURRENT_STEP="初始化"
LOCK_DIR=""

usage() {
  cat <<'EOF'
用法：
  bash scripts/wiki_server_import.sh --release <发布包目录> --version <版本号> [--apply]

参数：
  --release DIR       已通过 DEV 演练的发布包目录（必须位于项目目录内）
  --version TEXT      统一写入 skills.version / pets.version 的版本号
  --db FILE           生产 SQLite，默认 app/server/data/roco.db
  --public-dir DIR    正式素材目录，默认 data/public
  --pm2-app NAME      PM2 应用名，默认 roco
  --health-url URL    健康检查 URL，默认 http://127.0.0.1:3000/api/stats
  --apply             隔离演练通过后进入生产写入；默认只演练
  -h, --help          显示帮助

默认模式不会停止 PM2，也不会写生产数据库或正式图片。
EOF
}
say() { printf '%s\n' "$*"; }
die() { say "[ERROR] $*" >&2; exit 1; }

resolve_existing() {
  "$PYTHON_BIN" - "$1" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).resolve(strict=True))
PY
}
assert_inside() {
  "$PYTHON_BIN" - "$PROJECT_ROOT" "$1" "$2" <<'PY'
from pathlib import Path
import sys
root, target, label = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(), sys.argv[3]
try:
    target.relative_to(root)
except ValueError:
    raise SystemExit(f"{label}必须位于项目目录内：{target}")
PY
}
cleanup_lock() {
  if [[ -n "$LOCK_DIR" && -d "$LOCK_DIR" ]]; then
    rmdir "$LOCK_DIR" >/dev/null 2>&1 || true
  fi
}
trap cleanup_lock EXIT
health_ok() { curl -fsS --max-time 3 -o /dev/null "$HEALTH_URL" >/dev/null 2>&1; }
start_service() {
  pm2 start "$PM2_APP" >/dev/null
  SERVICE_STOPPED=0
  for _ in $(seq 1 30); do
    if health_ok; then
      curl -fsS --max-time 5 "$HEALTH_URL" >"$SESSION_DIR/health.json"
      return 0
    fi
    sleep 2
  done
  return 1
}
restore_assets() {
  [[ -f "$ASSET_JOURNAL" ]] || return 0
  "$PYTHON_BIN" - "$PUBLIC_DIR" "$ASSET_JOURNAL" <<'PY'
import json, shutil, sys
from pathlib import Path
public = Path(sys.argv[1]).resolve()
journal = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
for item in reversed(journal.get("files", [])):
    target = (public / item["target"]).resolve()
    try:
        target.relative_to(public)
    except ValueError:
        raise SystemExit(f"素材回滚目标越界：{target}")
    backup = Path(item["backup"]).resolve() if item.get("backup") else None
    if backup:
        if not backup.is_file():
            raise SystemExit(f"素材备份缺失：{backup}")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(backup, target)
    elif target.exists():
        target.unlink()
print("素材回滚完成")
PY
}
restore_database() {
  [[ -f "$DB_BACKUP" ]] || return 1
  "$PYTHON_BIN" - "$DB_BACKUP" "$PROD_DB" <<'PY'
import sqlite3, sys
source, target = sqlite3.connect(sys.argv[1]), sqlite3.connect(sys.argv[2])
try:
    source.backup(target)
finally:
    target.close()
    source.close()
db = sqlite3.connect(sys.argv[2])
try:
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    foreign = db.execute("PRAGMA foreign_key_check").fetchall()
finally:
    db.close()
if integrity != "ok" or foreign:
    raise SystemExit(f"恢复后的数据库校验失败：integrity={integrity}, foreign_keys={len(foreign)}")
print("数据库回滚完成")
PY
}
rollback_production() {
  [[ $ROLLING_BACK -eq 0 ]] || return 1
  ROLLING_BACK=1
  say "[ROLLBACK] 正在恢复导入前数据库和图片……"
  pm2 stop "$PM2_APP" >/dev/null 2>&1 || true
  SERVICE_STOPPED=1
  restore_database || die "生产数据库备份缺失，服务保持停止；检查 $SESSION_DIR"
  if [[ -f "$ASSET_JOURNAL" ]]; then
    restore_assets || die "图片回滚失败，服务保持停止；检查 $SESSION_DIR"
  elif [[ "${ASSET_COUNT:-0}" -gt 0 ]]; then
    die "发布包包含图片但素材回滚清单不存在，服务保持停止；检查 $SESSION_DIR"
  fi
  start_service || die "数据已恢复，但 PM2/健康检查失败；检查 $SESSION_DIR"
  PRODUCTION_TOUCHED=0
  ROLLING_BACK=0
  say "[ROLLBACK] 已恢复导入前状态并重新通过健康检查。"
}
on_error() {
  local code=$?
  local line=${1:-unknown}
  trap - ERR INT TERM HUP
  say "[ERROR] 步骤“$CURRENT_STEP”在第 $line 行失败（code $code）。"
  if [[ $PRODUCTION_TOUCHED -eq 1 ]]; then
    rollback_production
  elif [[ $SERVICE_STOPPED -eq 1 ]]; then
    start_service || say "[ERROR] PM2 恢复失败，请人工检查。"
  fi
  [[ -n "$SESSION_DIR" ]] && say "[INFO] 日志与恢复点：$SESSION_DIR"
  exit "$code"
}
on_signal() {
  trap - ERR INT TERM HUP
  say "[WARN] 收到中断信号，正在执行安全收尾。"
  if [[ $PRODUCTION_TOUCHED -eq 1 ]]; then
    rollback_production
  elif [[ $SERVICE_STOPPED -eq 1 ]]; then
    start_service || say "[ERROR] PM2 恢复失败，请人工检查 $SESSION_DIR"
  fi
  exit 130
}
trap 'on_error $LINENO' ERR
trap 'on_signal' INT TERM HUP

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release) RELEASE="${2:-}"; shift 2 ;;
    --version) VERSION="${2:-}"; shift 2 ;;
    --db) PROD_DB="${2:-}"; shift 2 ;;
    --public-dir) PUBLIC_DIR="${2:-}"; shift 2 ;;
    --pm2-app) PM2_APP="${2:-}"; shift 2 ;;
    --health-url) HEALTH_URL="${2:-}"; shift 2 ;;
    --apply) APPLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "未知参数：$1" ;;
  esac
done

[[ -n "$RELEASE" ]] || die "缺少 --release"
[[ -n "${VERSION//[[:space:]]/}" ]] || die "缺少 --version"
[[ ${#VERSION} -le 40 ]] || die "版本号不能超过 40 个字符"
command -v "$PYTHON_BIN" >/dev/null || die "未找到 Python：$PYTHON_BIN"
command -v curl >/dev/null || die "未找到 curl"
[[ -f "$RELEASE/manifest.json" ]] || die "发布包缺少 manifest.json：$RELEASE"
[[ -f "$PROD_DB" ]] || die "生产数据库不存在：$PROD_DB"
mkdir -p "$PUBLIC_DIR" "$SESSION_ROOT"
RELEASE="$(resolve_existing "$RELEASE")"
PROD_DB="$(resolve_existing "$PROD_DB")"
PUBLIC_DIR="$(resolve_existing "$PUBLIC_DIR")"
SESSION_ROOT="$(resolve_existing "$SESSION_ROOT")"
assert_inside "$RELEASE" "发布包目录"
assert_inside "$PROD_DB" "生产数据库"
assert_inside "$PUBLIC_DIR" "正式素材目录"
assert_inside "$SESSION_ROOT" "持久恢复目录"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SESSION_DIR="$SESSION_ROOT/${TIMESTAMP}-$$"
mkdir -p "$SESSION_DIR"
DB_BACKUP="$SESSION_DIR/roco-before-import.db"
ASSET_JOURNAL="$SESSION_DIR/assets.json"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$SESSION_ROOT/import.lock"
  flock -n 9 || die "已有另一个线上导入任务运行中"
else
  LOCK_DIR="$SESSION_ROOT/import.lock.d"
  mkdir "$LOCK_DIR" 2>/dev/null || die "已有另一个线上导入任务运行中"
fi

readarray -t MANIFEST_INFO < <("$PYTHON_BIN" - "$RELEASE/manifest.json" <<'PY'
import json, sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_bytes().decode("utf-8")
if "�" in text:
    raise SystemExit("manifest.json 含 Unicode 替换字符")
data = json.loads(text)
schema = int(data.get("schema_version", 0))
if schema < 2:
    raise SystemExit(f"发布包 schema_version={schema}，至少需要 2")
pending = int(data.get("review", {}).get("pending", 0))
if pending:
    raise SystemExit(f"发布包仍有 {pending} 项待审核")
print(data.get("package_id") or path.parent.name)
print(int(data.get("counts", {}).get("asset_files", 0)))
PY
)
PACKAGE_ID="${MANIFEST_INFO[0]}"
ASSET_COUNT="${MANIFEST_INFO[1]}"
{
  printf 'time=%s\npackage=%s\nversion=%s\nrelease=%s\ndb=%s\npublic=%s\npm2=%s\n' \
    "$(date -Iseconds)" "$PACKAGE_ID" "$VERSION" "$RELEASE" "$PROD_DB" "$PUBLIC_DIR" "$PM2_APP"
  git rev-parse --abbrev-ref HEAD 2>/dev/null | sed 's/^/branch=/' || true
  git rev-parse HEAD 2>/dev/null | sed 's/^/commit=/' || true
} >"$SESSION_DIR/session.txt"

CURRENT_STEP="隔离候选库完整演练"
say "[STEP] $CURRENT_STEP（不会停止 PM2，不会写生产库）"
env PYTHON_BIN="$PYTHON_BIN" WIKI_IMPORT_SESSION_ROOT="$SESSION_DIR/candidate" \
  bash scripts/wiki_dev_import.sh \
    --release "$RELEASE" --version "$VERSION" --db "$PROD_DB" --test-only \
    2>&1 | tee "$SESSION_DIR/candidate.log"
if [[ $APPLY -eq 0 ]]; then
  say "[DONE] 隔离演练通过。生产环境未修改。"
  say "[NEXT] 确认后用同一命令追加 --apply。"
  say "[INFO] 报告目录：$SESSION_DIR"
  exit 0
fi

command -v pm2 >/dev/null || die "未找到 pm2"
pm2 describe "$PM2_APP" >/dev/null || die "PM2 应用不存在：$PM2_APP"
health_ok || die "生产 API 在导入前未通过健康检查：$HEALTH_URL"
say ""
say "即将停止 PM2 并覆盖生产数据与图片。"
say "发布包：$PACKAGE_ID"
say "版本号：$VERSION"
read -r -p "请输入 APPLY-PRODUCTION $PACKAGE_ID 继续： " APPLY_CONFIRM
[[ "$APPLY_CONFIRM" == "APPLY-PRODUCTION $PACKAGE_ID" ]] || die "确认文本不匹配，已取消；生产环境未修改"

CURRENT_STEP="停止 PM2"
pm2 stop "$PM2_APP" | tee "$SESSION_DIR/pm2-stop.log"
SERVICE_STOPPED=1
sleep 2
if health_ok; then false; fi

CURRENT_STEP="生成持久数据库恢复点"
"$PYTHON_BIN" - "$PROD_DB" "$DB_BACKUP" <<'PY'
import sqlite3, sys
source, target = sqlite3.connect(sys.argv[1]), sqlite3.connect(sys.argv[2])
try:
    source.backup(target)
finally:
    target.close()
    source.close()
db = sqlite3.connect(sys.argv[2])
try:
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    foreign = db.execute("PRAGMA foreign_key_check").fetchall()
finally:
    db.close()
if integrity != "ok" or foreign:
    raise SystemExit(f"备份校验失败：integrity={integrity}, foreign_keys={len(foreign)}")
print("生产数据库恢复点已生成")
PY

CURRENT_STEP="生产目标 dry-run"
"$PYTHON_BIN" scripts/wiki_staging.py import \
  --input "$RELEASE" --db "$PROD_DB" --public-dir "$PUBLIC_DIR" --version "$VERSION" \
  2>&1 | tee "$SESSION_DIR/production-dry-run.log"
CURRENT_STEP="写入生产数据库和正式图片"
PRODUCTION_TOUCHED=1
"$PYTHON_BIN" scripts/wiki_staging.py import \
  --input "$RELEASE" --db "$PROD_DB" --public-dir "$PUBLIC_DIR" \
  --asset-journal "$ASSET_JOURNAL" --version "$VERSION" --apply \
  2>&1 | tee "$SESSION_DIR/production-apply.log"

CURRENT_STEP="导入后数据库与图片校验"
"$PYTHON_BIN" - "$PROD_DB" "$PUBLIC_DIR" "$RELEASE" "$VERSION" "$ASSET_JOURNAL" "$SESSION_DIR/production-report.json" <<'PY'
import json, sqlite3, sys
from pathlib import Path
db_path, public_raw, release_raw, version, journal_raw, report_raw = sys.argv[1:]
public, release = Path(public_raw).resolve(), Path(release_raw).resolve()
journal, report = Path(journal_raw), Path(report_raw)
manifest = json.loads((release / "manifest.json").read_text(encoding="utf-8"))
db = sqlite3.connect(db_path)
try:
    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
    foreign = db.execute("PRAGMA foreign_key_check").fetchall()
    if integrity != "ok" or foreign:
        raise SystemExit(f"导入后数据库校验失败：integrity={integrity}, foreign_keys={len(foreign)}")
    missing = []
    checked = 0
    for item in manifest.get("items", []):
        if item.get("action") != "database-import":
            continue
        plan_path = release / item["folder"] / "import.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        if not plan.get("enabled"):
            raise SystemExit(f"manifest 与 import.json 冲突：{item['folder']}")
        entity, uid = plan.get("entity"), plan.get("id")
        if entity == "pet":
            row = db.execute("SELECT version FROM pets WHERE uid=?", (uid,)).fetchone()
        elif entity == "skill":
            row = db.execute("SELECT version FROM skills WHERE uid=?", (uid,)).fetchone()
        else:
            row = True
        checked += 1
        if not row:
            missing.append(f"{entity}:{uid}")
        elif entity in {"pet", "skill"} and row[0] != version:
            missing.append(f"{entity}:{uid}:version={row[0]}")
    if missing:
        raise SystemExit("导入实体校验失败：" + ", ".join(missing[:20]))
finally:
    db.close()

asset_count = int(manifest.get("counts", {}).get("asset_files", 0))
verified_assets = 0
if asset_count:
    if not journal.is_file():
        raise SystemExit("发布包包含图片，但素材回滚清单未生成")
    journal_data = json.loads(journal.read_text(encoding="utf-8"))
    errors = []
    for item in journal_data.get("files", []):
        target = (public / item["target"]).resolve()
        try:
            target.relative_to(public)
        except ValueError:
            errors.append(f"越界:{target}")
            continue
        if not target.is_file():
            errors.append(f"缺失:{target}")
        else:
            verified_assets += 1
    if errors:
        raise SystemExit("正式图片校验失败：" + ", ".join(errors[:20]))
report.write_text(json.dumps({
    "integrity_check": integrity,
    "foreign_key_errors": len(foreign),
    "database_imports": checked,
    "package_asset_files": asset_count,
    "published_and_derived_files": verified_assets,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("导入后数据库、实体版本与正式图片校验通过")
PY

CURRENT_STEP="启动 PM2 并检查 API"
start_service
say "[PASS] PM2 已启动，API 健康检查通过。"
say "[INFO] 请人工检查管理端、精灵详情、技能、特性、异色/果实/精灵蛋图片。"
read -r -p "验收通过请输入 CONFIRM；需要恢复请输入 ROLLBACK： " FINAL_CONFIRM
if [[ "$FINAL_CONFIRM" == "ROLLBACK" ]]; then
  rollback_production
  exit 0
fi
if [[ "$FINAL_CONFIRM" != "CONFIRM" ]]; then
  say "[WARN] 输入无效，按安全策略自动恢复。"
  rollback_production
  exit 1
fi
PRODUCTION_TOUCHED=0
say "[DONE] 线上导入已确认完成。"
say "[KEEP] 请保留发布包和恢复目录：$SESSION_DIR"

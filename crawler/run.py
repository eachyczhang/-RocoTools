"""
洛克王国世界 BWIKI 数据爬取 - 总入口

用法：
  python crawler/run.py          # 全量爬取
  python crawler/run.py --full   # 全量爬取（同上）
  python crawler/run.py --update # 增量更新（仅爬取新增/版本变更的精灵详情）

执行顺序：
  1. 属性克制关系（fetch_element_chart + process_element_chart）
  2. 技能列表（fetch_skill_list）
  3. 精灵列表（fetch_pet_list）
  4. 精灵详情（fetch_pet_detail）—— 增量模式下仅处理变更项
"""

import argparse
import json
import os
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SCRAPERS_DIR = os.path.join(SCRIPT_DIR, "scrapers")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# 爬虫执行顺序
STEPS = [
    {
        "name": "属性克制关系",
        "script": "fetch_element_chart.py",
        "always_run": True,
    },
    {
        "name": "属性结构化处理",
        "script": "process_element_chart.py",
        "always_run": True,
    },
    {
        "name": "技能列表",
        "script": "fetch_skill_list.py",
        "always_run": True,
    },
    {
        "name": "蛋组数据",
        "script": "fetch_egg_group.py",
        "always_run": True,
    },
    {
        "name": "精灵列表",
        "script": "fetch_pet_list.py",
        "always_run": True,
    },
    {
        "name": "精灵详情",
        "script": "fetch_pet_detail.py",
        "always_run": False,  # 增量模式下可跳过无变更项
    },
]


def run_script(script_name: str, extra_args: list = None) -> bool:
    """运行单个爬虫脚本"""
    script_path = os.path.join(SCRAPERS_DIR, script_name)
    cmd = [sys.executable, script_path] + (extra_args or [])
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(cmd, cwd=PROJECT_ROOT, env=env)
    return result.returncode == 0


def check_updates() -> dict:
    """
    对比新旧 pet_list，检测哪些精灵需要更新详情。
    返回 {"new": [...], "updated": [...], "unchanged": [...]}
    """
    list_path = os.path.join(DATA_DIR, "pets", "pet_list.json")
    detail_path = os.path.join(DATA_DIR, "pets", "pet_detail.json")

    if not os.path.exists(list_path):
        return {"new": [], "updated": [], "unchanged": [], "status": "no_list"}

    with open(list_path, "r", encoding="utf-8") as f:
        new_list = json.load(f)

    if not os.path.exists(detail_path):
        # 没有旧数据，全部为新增
        return {
            "new": [p["uid"] for p in new_list],
            "updated": [],
            "unchanged": [],
            "status": "no_detail",
        }

    with open(detail_path, "r", encoding="utf-8") as f:
        old_detail = json.load(f)

    old_pets = old_detail.get("pets", {})

    new_uids = []
    updated_uids = []
    unchanged_uids = []

    for pet in new_list:
        uid = pet["uid"]
        if uid not in old_pets:
            new_uids.append(uid)
        else:
            old_version = old_pets[uid].get("version", "")
            new_version = pet.get("version", "")
            if new_version and new_version != old_version:
                updated_uids.append(uid)
            else:
                unchanged_uids.append(uid)

    return {
        "new": new_uids,
        "updated": updated_uids,
        "unchanged": unchanged_uids,
        "status": "ok",
    }


def run_detail_update(uids_to_update: list[str]):
    """仅更新指定 uid 的精灵详情"""
    if not uids_to_update:
        print("[INFO] 无需更新精灵详情")
        return

    print(f"[INFO] 需要更新 {len(uids_to_update)} 个精灵详情")

    # 传递需要更新的 uid 列表给 detail 脚本
    filter_path = os.path.join(DATA_DIR, "pets", "_update_filter.json")
    with open(filter_path, "w", encoding="utf-8") as f:
        json.dump(uids_to_update, f)

    # 运行 detail 脚本（带 --filter 参数）
    success = run_script("fetch_pet_detail.py", ["--filter", filter_path])

    # 清理临时文件
    if os.path.exists(filter_path):
        os.remove(filter_path)

    return success


def main():
    parser = argparse.ArgumentParser(description="洛克王国世界数据爬取总入口")
    parser.add_argument("--full", action="store_true", default=True, help="全量爬取（默认）")
    parser.add_argument("--update", action="store_true", help="增量更新（仅变更项）")
    args = parser.parse_args()

    mode = "update" if args.update else "full"

    print("=" * 60)
    print(f"洛克王国世界 BWIKI 数据爬取 [{mode.upper()} 模式]")
    print("=" * 60)
    print(f"[INFO] 项目根目录: {PROJECT_ROOT}")
    print(f"[INFO] 数据目录: {DATA_DIR}")
    print()

    start_time = time.time()
    results = []

    for step in STEPS:
        step_name = step["name"]
        script = step["script"]

        # 增量模式下，精灵详情特殊处理
        if mode == "update" and script == "fetch_pet_detail.py":
            print(f"\n{'='*40}")
            print(f"[STEP] {step_name}（增量模式）")
            print(f"{'='*40}")

            diff = check_updates()
            print(f"[INFO] 新增: {len(diff['new'])} | 版本变更: {len(diff['updated'])} | 无变化: {len(diff['unchanged'])}")

            uids_to_update = diff["new"] + diff["updated"]
            if uids_to_update:
                success = run_detail_update(uids_to_update)
                results.append((step_name, "updated" if success else "failed"))
            else:
                print("[INFO] 所有精灵详情均为最新，跳过")
                results.append((step_name, "skipped"))
            continue

        # 全量模式或 always_run 的步骤
        print(f"\n{'='*40}")
        print(f"[STEP] {step_name}")
        print(f"{'='*40}")

        success = run_script(script)
        results.append((step_name, "ok" if success else "failed"))

        if not success:
            print(f"[ERROR] {step_name} 执行失败")
            if script in ("fetch_element_chart.py", "process_element_chart.py"):
                print("[ERROR] 属性数据为后续依赖，终止执行")
                break

        # 步骤间冷却
        time.sleep(5)

    # 总结
    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print(f"[SUMMARY] 模式: {mode.upper()} | 耗时: {elapsed:.1f}s")
    print("=" * 60)
    for name, status in results:
        icon = "[OK]" if status in ("ok", "skipped", "updated") else "[FAIL]"
        print(f"  {icon} {name}: {status}")
    print()

    failed = [name for name, status in results if status == "failed"]
    if failed:
        print(f"[WARN] 有 {len(failed)} 个步骤失败: {', '.join(failed)}")
        sys.exit(1)
    else:
        print("[DONE] 全部完成！")

    # 数据完整性汇总分析
    print()
    print_integrity_summary()

    # 同步数据库
    sync_database()


def sync_database():
    """爬虫完成后自动同步 JSON → SQLite"""
    server_dir = os.path.join(PROJECT_ROOT, "app", "server")
    node_modules = os.path.join(server_dir, "node_modules")

    if not os.path.exists(node_modules):
        print("[SYNC] 跳过数据库同步（app/server 未安装依赖，请先执行 cd app/server && npm install）")
        return

    print()
    print("=" * 60)
    print("[SYNC] 同步数据到 SQLite")
    print("=" * 60)

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"

    # 初始化 + 导入
    init_script = os.path.join(server_dir, "src", "db", "init.js")
    import_script = os.path.join(server_dir, "src", "db", "import.js")

    for label, script in [("初始化数据库", init_script), ("导入数据", import_script)]:
        print(f"[SYNC] {label}...")
        result = subprocess.run(["node", script], cwd=server_dir, env=env)
        if result.returncode != 0:
            print(f"[SYNC] {label} 失败")
            return

    print("[SYNC] 数据库同步完成！")


def print_integrity_summary():
    """读取所有数据文件，打印汇总完整性报告"""
    from datetime import datetime

    print("=" * 60)
    print("[INTEGRITY] 数据完整性汇总分析")
    print("=" * 60)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"  分析时间: {now}")
    print()

    summary_sections = []

    # 1. 属性数据
    elem_path = os.path.join(DATA_DIR, "elements", "element_chart_structured.json")
    if os.path.exists(elem_path):
        with open(elem_path, "r", encoding="utf-8") as f:
            elem_data = json.load(f)
        elem_count = len(elem_data.get("elements", {}))
        print(f"  [elements] 属性数据: {elem_count} 种")
        summary_sections.append(f"| 属性 (elements) | {elem_count} | - | 0.0% |")
    else:
        print(f"  [elements] 属性数据: 未找到")
        summary_sections.append(f"| 属性 (elements) | 0 | - | - |")

    # 2. 技能数据
    skill_path = os.path.join(DATA_DIR, "skills", "skill_list.json")
    if os.path.exists(skill_path):
        with open(skill_path, "r", encoding="utf-8") as f:
            skill_list = json.load(f)
        skill_total = len(skill_list)
        skill_missing_fields = {}
        for field in ["uid", "name", "element", "category", "cost", "power", "description", "icon_url"]:
            miss = sum(1 for s in skill_list if not s.get(field))
            if miss > 0:
                skill_missing_fields[field] = miss
        skill_issues = f" (缺失: {skill_missing_fields})" if skill_missing_fields else ""
        print(f"  [skills] 技能数据: {skill_total} 条{skill_issues}")
        miss_rate = sum(skill_missing_fields.values()) / (skill_total * 8) * 100 if skill_missing_fields else 0
        summary_sections.append(f"| 技能 (skills) | {skill_total} | {sum(skill_missing_fields.values()) if skill_missing_fields else 0} 字段缺失 | {miss_rate:.1f}% |")
    else:
        print(f"  [skills] 技能数据: 未找到")
        summary_sections.append(f"| 技能 (skills) | 0 | - | - |")

    # 3. 精灵列表
    pet_list_path = os.path.join(DATA_DIR, "pets", "pet_list.json")
    if os.path.exists(pet_list_path):
        with open(pet_list_path, "r", encoding="utf-8") as f:
            pet_list = json.load(f)
        pet_list_total = len(pet_list)
        print(f"  [pets/list] 精灵列表: {pet_list_total} 条")
    else:
        pet_list_total = 0
        print(f"  [pets/list] 精灵列表: 未找到")

    # 4. 精灵详情
    pet_detail_path = os.path.join(DATA_DIR, "pets", "pet_detail.json")
    if os.path.exists(pet_detail_path):
        with open(pet_detail_path, "r", encoding="utf-8") as f:
            pet_detail = json.load(f)
        pets = pet_detail.get("pets", {})
        detail_total = len(pets)
        no_detail = sum(1 for p in pets.values() if not p.get("detail"))
        no_skills = sum(1 for p in pets.values() if p.get("detail") and not p["detail"].get("skills"))
        print(f"  [pets/detail] 精灵详情: {detail_total} 条 (无detail: {no_detail}, 无skills: {no_skills})")

        # 关键字段缺失率
        key_fields = {
            "detail": no_detail,
            "skills": no_skills,
            "image_default": sum(1 for p in pets.values() if not (p.get("detail") and p["detail"].get("image_default"))),
            "evolution_chain": sum(1 for p in pets.values() if not (p.get("detail") and p["detail"].get("evolution_chain"))),
        }
        print(f"  [pets/detail] 关键缺失: {key_fields}")
    else:
        detail_total = 0
        print(f"  [pets/detail] 精灵详情: 未找到")

    # 5. 图片资源统计
    print()
    img_stats = {}
    img_dirs = {
        "缩略图": os.path.join(DATA_DIR, "public", "pets", "thumbnails"),
        "本体立绘": os.path.join(DATA_DIR, "public", "pets", "default"),
        "异色立绘": os.path.join(DATA_DIR, "public", "pets", "shiny"),
        "果实图片": os.path.join(DATA_DIR, "public", "pets", "fruit"),
        "精灵蛋": os.path.join(DATA_DIR, "public", "pets", "egg"),
        "技能图标": os.path.join(DATA_DIR, "public", "skills", "icons"),
        "属性图标": os.path.join(DATA_DIR, "public", "elements", "icons"),
    }
    for label, dir_path in img_dirs.items():
        if os.path.exists(dir_path):
            count = len([f for f in os.listdir(dir_path) if f.endswith(".png")])
        else:
            count = 0
        img_stats[label] = count
        print(f"  [images] {label}: {count} 张")

    # 打印汇总表
    print()
    print("-" * 60)
    print("  汇总:")
    print(f"    属性: {elem_count if os.path.exists(elem_path) else 0} 种")
    print(f"    技能: {skill_total if os.path.exists(skill_path) else 0} 条")
    print(f"    精灵(列表): {pet_list_total} 条")
    print(f"    精灵(详情): {detail_total} 条")
    print(f"    图片资源: {sum(img_stats.values())} 张")
    print("-" * 60)
    print()


if __name__ == "__main__":
    main()

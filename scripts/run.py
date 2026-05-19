"""
洛克王国世界 BWIKI 数据爬取 - 总入口

用法：
  python scripts/run.py          # 全量爬取
  python scripts/run.py --full   # 全量爬取（同上）
  python scripts/run.py --update # 增量更新（仅爬取新增/版本变更的精灵详情）

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

        # 步骤间冷却，防止限流
        time.sleep(5)

    # 总结
    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print(f"[SUMMARY] 模式: {mode.upper()} | 耗时: {elapsed:.1f}s")
    print("=" * 60)
    for name, status in results:
        icon = "✓" if status in ("ok", "skipped", "updated") else "✗"
        print(f"  {icon} {name}: {status}")
    print()

    failed = [name for name, status in results if status == "failed"]
    if failed:
        print(f"[WARN] 有 {len(failed)} 个步骤失败: {', '.join(failed)}")
        sys.exit(1)
    else:
        print("[DONE] 全部完成！")


if __name__ == "__main__":
    main()

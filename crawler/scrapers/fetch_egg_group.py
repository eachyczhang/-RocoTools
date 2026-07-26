"""
洛克王国世界 BWIKI 蛋组数据爬取

数据来源：https://wiki.biligame.com/rocom/蛋组计算器
爬取所有精灵的蛋组归属关系。

蛋组共 15 类：
  无法孵蛋、动物组、拟人组、巨灵组、魔力组、天空组、两栖组、
  植物组、大地组、妖精组、昆虫组、软体组、机械组、海洋组、龙组

输出：
  - data/eggs/egg_group.json
"""

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

OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "eggs")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "egg_group.json")

# 蛋组 ID 映射（与页面中 data-type 对应）
EGG_GROUP_NAMES = [
    "无法孵蛋",
    "动物组",
    "拟人组",
    "巨灵组",
    "魔力组",
    "天空组",
    "两栖组",
    "植物组",
    "大地组",
    "妖精组",
    "昆虫组",
    "软体组",
    "机械组",
    "海洋组",
    "龙组",
]


# ============================================================
# 爬取与解析
# ============================================================

def fetch_page_html(page_title: str) -> str:
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


def parse_egg_groups(html: str) -> dict:
    """
    解析蛋组计算器页面，提取每个蛋组下的精灵列表。

    返回:
    {
        "groups": {
            "无法孵蛋": {"id": 0, "name": "无法孵蛋", "pets": [{"pet_id": "001", "name": "迪莫"}, ...]},
            "动物组": {"id": 1, ...},
            ...
        },
        "pet_egg_groups": {
            "001": ["动物组", "拟人组"],  # pet_id -> 所属蛋组列表
            ...
        }
    }
    """
    soup = BeautifulSoup(html, "lxml")

    groups = {}
    pet_egg_groups = {}  # pet_id -> [蛋组名称列表]

    # 查找所有蛋组结果容器
    result_boxes = soup.select(".rocom_egg_cacl_result")

    for box in result_boxes:
        group_name = box.get("data-type", "").strip()
        if not group_name:
            continue

        # 分配 group id
        if group_name in EGG_GROUP_NAMES:
            group_id = EGG_GROUP_NAMES.index(group_name)
        else:
            group_id = len(EGG_GROUP_NAMES)
            EGG_GROUP_NAMES.append(group_name)

        pets_in_group = []
        cards = box.select(".rocom_egg_cacl_card")

        for card in cards:
            # 提取编号
            num_el = card.select_one(".rocom_egg_cacl_card_num")
            name_el = card.select_one(".rocom_egg_cacl_card_name")

            if not num_el or not name_el:
                continue

            num_text = num_el.get_text(strip=True)  # "NO.001"
            name = name_el.get_text(strip=True)

            # 提取 pet_id（三位数字）
            match = re.search(r"NO\.(\d+)", num_text)
            if not match:
                continue

            pet_id = match.group(1)  # "001", "002" ...

            pets_in_group.append({
                "pet_id": pet_id,
                "name": name,
            })

            # 记录到 pet_egg_groups（以 pet_id 为 key）
            if pet_id not in pet_egg_groups:
                pet_egg_groups[pet_id] = []
            if group_name not in pet_egg_groups[pet_id]:
                pet_egg_groups[pet_id].append(group_name)

        groups[group_name] = {
            "id": group_id,
            "name": group_name,
            "count": len(pets_in_group),
            "pets": pets_in_group,
        }

    return {
        "groups": groups,
        "pet_egg_groups": pet_egg_groups,
    }


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60)
    print("洛克王国世界 BWIKI 蛋组数据爬取")
    print("=" * 60)
    print()

    html = fetch_page_html("蛋组计算器")
    result = parse_egg_groups(html)

    groups = result["groups"]
    pet_egg_groups = result["pet_egg_groups"]

    print(f"[INFO] 共解析 {len(groups)} 个蛋组")
    for name, group in groups.items():
        print(f"  [{group['id']:2d}] {name}: {group['count']} 条")
    print()
    print(f"[INFO] 覆盖精灵(按 pet_id): {len(pet_egg_groups)} 个")

    # 统计跨组精灵
    multi_group = {pid: gs for pid, gs in pet_egg_groups.items() if len(gs) > 1}
    print(f"[INFO] 跨蛋组精灵: {len(multi_group)} 个")

    # 保存
    output = {
        "description": "洛克王国世界精灵蛋组数据",
        "source": "https://wiki.biligame.com/rocom/蛋组计算器",
        "total_groups": len(groups),
        "total_pets": len(pet_egg_groups),
        "group_names": EGG_GROUP_NAMES,
        "groups": groups,
        "pet_egg_groups": pet_egg_groups,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print()
    print(f"[INFO] JSON 已保存: {JSON_OUTPUT}")

    # 生成校验报告
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from report import generate_report

    total = len(pet_egg_groups)
    field_checks = [
        {"field": "pet_id", "has": total, "missing_items": []},
        {"field": "egg_groups (非空)", "has": total, "missing_items": []},
    ]

    # 检查哪些 pet_id 只在"无法孵蛋"中
    no_breed = [pid for pid, gs in pet_egg_groups.items() if gs == ["无法孵蛋"]]
    field_checks.append({
        "field": "可孵蛋",
        "has": total - len(no_breed),
        "missing_items": [f"NO.{pid}" for pid in no_breed],
    })

    extra = [{
        "title": "蛋组分布统计",
        "content": (
            "| 蛋组 | 精灵数(含形态) |\n"
            "|------|---------------|\n" +
            "\n".join(f"| {name} | {groups[name]['count']} |" for name in EGG_GROUP_NAMES if name in groups)
        ),
    }]

    generate_report(
        output_dir=OUTPUT_DIR,
        report_name="egg_group_report.md",
        title="蛋组数据 - 完整性校验报告",
        source="https://wiki.biligame.com/rocom/蛋组计算器",
        total=total,
        field_checks=field_checks,
        extra_sections=extra,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

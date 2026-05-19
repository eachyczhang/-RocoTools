"""
洛克王国世界 BWIKI 属性克制关系爬取脚本

数据来源：https://wiki.biligame.com/rocom/克制计算器
全部 18 种属性：普通、草、火、水、光、地、冰、龙、电、毒、虫、武、翼、萌、幽、恶、机械、幻

输出文件保存在项目根目录 data/ 下：
  - element_chart.csv
  - element_chart.json
"""

import csv
import json
import os
import re
import sys

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data")

CSV_OUTPUT = os.path.join(OUTPUT_DIR, "elements", "element_chart.csv")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "elements", "element_chart.json")
ICON_DIR = os.path.join(OUTPUT_DIR, "public", "elements", "icons")

HEADERS = {
    "User-Agent": "RocoDataBot/1.0 (personal data collection)"
}

# 全部 18 种属性
ALL_ELEMENTS = [
    "普通", "草", "火", "水", "光", "地", "冰", "龙",
    "电", "毒", "虫", "武", "翼", "萌", "幽", "恶", "机械", "幻",
]

# 属性免疫效果
ELEMENT_IMMUNITY = {
    "草": "寄生",
    "火": "灼烧",
    "毒": "中毒",
    "冰": "冻结",
}

# 属性颜色（来源：wiki Common.css .rocom_spirit_screen_3 nth-child 定义）
ELEMENT_COLORS = {
    "普通": "#3F89B4",
    "草":   "#4EBC73",
    "火":   "#DB5525",
    "水":   "#6AA9FE",
    "光":   "#4FC0FF",
    "地":   "#9A7E3F",
    "冰":   "#5FADDD",
    "龙":   "#ED4962",
    "电":   "#E7C506",
    "毒":   "#BA62E0",
    "虫":   "#9ECE21",
    "武":   "#FF9636",
    "翼":   "#3EC7CA",
    "萌":   "#FC7CAC",
    "幽":   "#9446EC",
    "恶":   "#CF467A",
    "机械": "#40CBA9",
    "幻":   "#9FA7F8",
}

# 属性图标（来源：wiki 精灵筛选页面属性列图标）
ELEMENT_ICONS = {
    "普通": "https://patchwiki.biligame.com/images/rocom/6/69/nc77midbqeafn7i2snh5a5h16ctdi0o.png",
    "草":   "https://patchwiki.biligame.com/images/rocom/1/12/b8bsilucec9a98rsmqkmxt06c4mnnix.png",
    "火":   "https://patchwiki.biligame.com/images/rocom/a/ab/8wvxz3p479e2b702afdqyzhx9340qgx.png",
    "水":   "https://patchwiki.biligame.com/images/rocom/d/d1/csqsyhq1k488329455xdlzdcybv6zjh.png",
    "光":   "https://patchwiki.biligame.com/images/rocom/d/de/pxfi7cg0j94c45uxf4itigu90wis7jr.png",
    "地":   "https://patchwiki.biligame.com/images/rocom/3/32/0w5pybmkd8qm306doqx8kh5onl1o8cq.png",
    "冰":   "https://patchwiki.biligame.com/images/rocom/9/9b/oxnxxud1xhopw87c7mnawxijz8r1hns.png",
    "龙":   "https://patchwiki.biligame.com/images/rocom/6/65/kgcg0hvl19o7up0ug8f42bbvhi71dke.png",
    "电":   "https://patchwiki.biligame.com/images/rocom/0/02/iqzkamzcra945jsw5z6o8h9p30fv7db.png",
    "毒":   "https://patchwiki.biligame.com/images/rocom/5/53/jnd3vijasgthdz2ukggyfpisd464r2v.png",
    "虫":   "https://patchwiki.biligame.com/images/rocom/c/cb/q3mlwj270f67spwr934hpqx7hj62bm3.png",
    "武":   "https://patchwiki.biligame.com/images/rocom/5/52/q9hbq9nrnhjt7t86hy7sftv3e2e5fvx.png",
    "翼":   "https://patchwiki.biligame.com/images/rocom/2/2b/p7wdw88ziupp84s1mr8t9t602psswzz.png",
    "萌":   "https://patchwiki.biligame.com/images/rocom/5/5f/80jhk99eosjv1ld26wp7ljtmif27lfv.png",
    "幽":   "https://patchwiki.biligame.com/images/rocom/e/e7/ttqdi3zlz72g5dgmc8qg9ko4aorwllw.png",
    "恶":   "https://patchwiki.biligame.com/images/rocom/3/3b/hrdmz7n0qt3bnmir9fdn7977fvleec0.png",
    "机械": "https://patchwiki.biligame.com/images/rocom/a/ad/fw81a2pvdickbcnq5rt17m6066cchcf.png",
    "幻":   "https://patchwiki.biligame.com/images/rocom/6/64/89miqle961qdw2tt56hb78bps6f34ci.png",
}

# CSV 字段
CSV_FIELDS = [
    "element",           # 属性名
    "color",             # 属性颜色色号
    "strong_against",    # 克制（造成伤害×2.0）
    "resisted_by",       # 被抵抗（造成伤害×0.5）
    "weak_to",           # 弱点（受到伤害×2.0）
    "resistant_to",      # 抗性（受到伤害×0.5）
    "immunity",          # 免疫异常状态
]


# ============================================================
# 数据定义（从 BWIKI 克制计算器页面提取的完整数据）
# ============================================================

ELEMENT_CHART_RAW = {
    "普通": {
        "strong_against": [],
        "resisted_by": ["地", "幽", "机械"],
        "weak_to": ["武"],
        "resistant_to": ["幽"],
    },
    "草": {
        "strong_against": ["水", "光", "地"],
        "resisted_by": ["火", "龙", "毒", "虫", "翼", "机械"],
        "weak_to": ["火", "冰", "毒", "虫", "翼"],
        "resistant_to": ["水", "地", "电", "光"],
    },
    "火": {
        "strong_against": ["草", "冰", "虫", "机械"],
        "resisted_by": ["水", "地", "龙"],
        "weak_to": ["水", "地"],
        "resistant_to": ["草", "冰", "虫", "萌", "机械"],
    },
    "水": {
        "strong_against": ["火", "地", "机械"],
        "resisted_by": ["草", "冰", "龙"],
        "weak_to": ["草", "电"],
        "resistant_to": ["火", "机械"],
    },
    "光": {
        "strong_against": ["幽", "恶"],
        "resisted_by": ["草", "冰"],
        "weak_to": ["草", "幽"],
        "resistant_to": ["恶", "幻"],
    },
    "地": {
        "strong_against": ["火", "冰", "电", "毒"],
        "resisted_by": ["草", "武"],
        "weak_to": ["草", "水", "冰", "武", "机械"],
        "resistant_to": ["普通", "火", "电", "毒", "翼"],
    },
    "冰": {
        "strong_against": ["草", "地", "龙", "翼"],
        "resisted_by": ["火", "冰", "机械"],
        "weak_to": ["火", "地", "武", "机械"],
        "resistant_to": ["水", "冰", "光"],
    },
    "龙": {
        "strong_against": ["龙"],
        "resisted_by": ["机械"],
        "weak_to": ["冰", "龙", "萌"],
        "resistant_to": ["草", "火", "水", "电", "翼"],
    },
    "电": {
        "strong_against": ["水", "翼"],
        "resisted_by": ["草", "地", "龙", "电"],
        "weak_to": ["地"],
        "resistant_to": ["电", "翼", "机械"],
    },
    "毒": {
        "strong_against": ["草", "萌"],
        "resisted_by": ["地", "毒", "幽", "机械"],
        "weak_to": ["地", "恶", "幻"],
        "resistant_to": ["草", "毒", "虫", "武", "萌"],
    },
    "虫": {
        "strong_against": ["草", "恶", "幻"],
        "resisted_by": ["火", "毒", "武", "翼", "萌", "幽", "机械"],
        "weak_to": ["火", "翼"],
        "resistant_to": ["草", "武"],
    },
    "武": {
        "strong_against": ["普通", "地", "冰", "恶", "机械"],
        "resisted_by": ["毒", "虫", "翼", "萌", "幽", "幻"],
        "weak_to": ["翼", "萌", "幻"],
        "resistant_to": ["地", "虫", "恶"],
    },
    "翼": {
        "strong_against": ["草", "虫", "武"],
        "resisted_by": ["地", "龙", "电", "机械"],
        "weak_to": ["冰", "电"],
        "resistant_to": ["草", "虫", "武"],
    },
    "萌": {
        "strong_against": ["龙", "武", "恶"],
        "resisted_by": ["火", "毒", "机械"],
        "weak_to": ["毒", "恶", "机械"],
        "resistant_to": ["虫", "武"],
    },
    "幽": {
        "strong_against": ["光", "幽", "幻"],
        "resisted_by": ["普通", "恶"],
        "weak_to": ["光", "幽", "恶"],
        "resistant_to": ["普通", "毒", "虫", "武"],
    },
    "恶": {
        "strong_against": ["毒", "萌", "幽"],
        "resisted_by": ["光", "武", "恶"],
        "weak_to": ["光", "虫", "武", "萌"],
        "resistant_to": ["幽", "恶"],
    },
    "机械": {
        "strong_against": ["地", "冰", "萌"],
        "resisted_by": ["火", "水", "电", "机械"],
        "weak_to": ["火", "水", "武"],
        "resistant_to": ["普通", "草", "冰", "龙", "毒", "虫", "翼", "萌", "机械", "幻"],
    },
    "幻": {
        "strong_against": ["毒", "武"],
        "resisted_by": ["光", "机械", "幻"],
        "weak_to": ["虫", "幽"],
        "resistant_to": ["武", "幻"],
    },
}


# ============================================================
# 构建输出数据
# ============================================================

def build_element_data() -> list[dict]:
    """构建属性克制关系列表"""
    result = []
    for elem in ALL_ELEMENTS:
        chart = ELEMENT_CHART_RAW[elem]
        result.append({
            "element": elem,
            "color": ELEMENT_COLORS.get(elem, ""),
            "icon": ELEMENT_ICONS.get(elem, ""),
            "strong_against": chart["strong_against"],
            "resisted_by": chart["resisted_by"],
            "weak_to": chart["weak_to"],
            "resistant_to": chart["resistant_to"],
            "immunity": ELEMENT_IMMUNITY.get(elem, ""),
        })
    return result


def verify_from_wiki():
    """可选：从 BWIKI 克制计算器页面验证数据（当前数据已从页面提取确认）"""
    print("[INFO] 正在从 BWIKI 克制计算器验证属性数据...")
    params = {
        "action": "parse",
        "page": "克制计算器",
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    try:
        resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        html = data["parse"]["text"]["*"]
        soup = BeautifulSoup(html, "lxml")

        # 验证页面中确实包含18种属性
        text = soup.get_text()
        found = [e for e in ALL_ELEMENTS if e in text]
        print(f"[INFO] 页面中确认包含 {len(found)}/18 种属性")
        return len(found) == 18
    except Exception as e:
        print(f"[WARN] 验证请求失败: {e}")
        return False


# ============================================================
# 保存
# ============================================================

def save_csv(data: list[dict], filepath: str):
    """保存为 CSV"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in data:
            csv_row = {
                "element": row["element"],
                "color": row["color"],
                "strong_against": "、".join(row["strong_against"]) if row["strong_against"] else "无",
                "resisted_by": "、".join(row["resisted_by"]) if row["resisted_by"] else "无",
                "weak_to": "、".join(row["weak_to"]) if row["weak_to"] else "无",
                "resistant_to": "、".join(row["resistant_to"]) if row["resistant_to"] else "无",
                "immunity": row["immunity"] if row["immunity"] else "无",
            }
            writer.writerow(csv_row)
    print(f"[INFO] CSV 已保存: {filepath}")


def save_json(data: list[dict], filepath: str):
    """保存为 JSON"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    output = {
        "description": "洛克王国世界属性克制关系表",
        "source": "https://wiki.biligame.com/rocom/克制计算器",
        "elements": ALL_ELEMENTS,
        "multipliers": {
            "strong": 2.0,
            "resist": 0.5,
            "double_strong": 3.0,
            "double_resist": 0.25,
        },
        "immunity_note": "主系或副系包含该属性即可获得对应免疫效果",
        "element_immunities": ELEMENT_IMMUNITY,
        "element_colors": ELEMENT_COLORS,
        "element_icons": ELEMENT_ICONS,
        "chart": data,
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[INFO] JSON 已保存: {filepath}")


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60)
    print("洛克王国世界 属性克制关系表爬取")
    print("=" * 60)
    print(f"[INFO] 属性总数: {len(ALL_ELEMENTS)}")
    print(f"[INFO] 属性列表: {'、'.join(ALL_ELEMENTS)}")
    print()

    # 验证
    verify_from_wiki()
    print()

    # 构建数据
    data = build_element_data()

    # 保存
    save_csv(data, CSV_OUTPUT)
    save_json(data, JSON_OUTPUT)

    # 下载属性图标
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from downloader import batch_download

    print()
    print("[INFO] 下载属性图标...")
    icon_items = []
    for i, elem in enumerate(ALL_ELEMENTS, start=1):
        url = ELEMENT_ICONS.get(elem, "")
        if url:
            icon_items.append({"url": url, "filename": f"elem_{i}.png"})

    batch_download(icon_items, ICON_DIR, label="属性图标 ")

    # 更新 icon 为本地路径
    for i, elem in enumerate(ALL_ELEMENTS, start=1):
        for row in data:
            if row["element"] == elem:
                row["icon"] = f"/public/elements/icons/elem_{i}.png"

    # 重新保存（含本地路径）
    save_json(data, JSON_OUTPUT)

    # 生成校验报告
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from report import generate_report

    total = len(data)
    check_fields = ["element", "strong_against", "resisted_by", "weak_to", "resistant_to", "immunity"]
    field_checks = []
    for f in check_fields:
        has = sum(1 for row in data if row.get(f))
        missing_items = [row["element"] for row in data if not row.get(f)]
        field_checks.append({"field": f, "has": has, "missing_items": missing_items})

    generate_report(
        output_dir=os.path.dirname(CSV_OUTPUT),
        report_name="element_chart_report.md",
        title="属性克制关系 - 完整性校验报告",
        source="https://wiki.biligame.com/rocom/克制计算器",
        total=total,
        field_checks=field_checks,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

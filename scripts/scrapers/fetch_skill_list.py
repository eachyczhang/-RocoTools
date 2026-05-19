"""
洛克王国世界 BWIKI 技能筛选列表爬取

数据来源：https://wiki.biligame.com/rocom/技能筛选
爬取所有技能的图标、属性、分类、能耗、威力、效果等信息。

输出：
  - data/skills/skill_list.csv
  - data/skills/skill_list.json
  - data/public/skills/icons/  （技能图标）
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
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "skills")
ICON_DIR = os.path.join(PROJECT_ROOT, "data", "public", "skills", "icons")
ELEMENT_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "elements", "element_chart_structured.json")

CSV_OUTPUT = os.path.join(OUTPUT_DIR, "skill_list.csv")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "skill_list.json")

HEADERS = {
    "User-Agent": "RocoDataBot/1.0 (personal data collection)"
}

CSV_FIELDS = [
    "uid", "name", "element", "category", "cost", "power", "description", "version", "icon_url",
]


# ============================================================
# 爬取与解析
# ============================================================

def fetch_page_html(page_title: str) -> str:
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    print(f"[INFO] 正在获取页面: {page_title}")
    resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    return data["parse"]["text"]["*"]


def parse_skill_list(html: str) -> list[dict]:
    """解析技能筛选页面表格"""
    soup = BeautifulSoup(html, "lxml")

    # 找目标表格
    target_table = None
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "技能名称" in headers:
            target_table = table
            break

    if not target_table:
        print("[ERROR] 未找到技能数据表格")
        return []

    skills = []
    rows = target_table.find_all("tr")[1:]

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 7:
            continue

        # col[0]: 技能图标
        img_el = cells[0].find("img")
        icon_url = ""
        if img_el:
            src = img_el.get("src", "")
            # 去掉 thumb 尺寸后缀，获取原图
            if "/thumb/" in src:
                src = re.sub(r"/thumb/(.*?)/\d+px-.*$", r"/\1", src)
            icon_url = _fix_url(src)

        # col[1]: 技能名称
        name = cells[1].get_text(strip=True)

        # col[2]: 技能属性（从 img alt）
        attr_img = cells[2].find("img")
        element = ""
        if attr_img:
            match = re.search(r"属性\s+(.+?)\.png", attr_img.get("alt", ""))
            if match:
                element = match.group(1).strip()

        # col[3]: 技能分类（从 img alt）
        type_img = cells[3].find("img")
        category = ""
        if type_img:
            match = re.search(r"技能分类\s+(.+?)\.png", type_img.get("alt", ""))
            if match:
                category = match.group(1).strip()

        # col[4]: 能耗
        cost = _safe_int(cells[4].get_text(strip=True))

        # col[5]: 威力
        power = _safe_int(cells[5].get_text(strip=True))

        # col[6]: 效果描述
        description = cells[6].get_text(strip=True)

        # col[7]: 版本（可能不存在）
        version = cells[7].get_text(strip=True) if len(cells) > 7 else ""

        if name:
            skills.append({
                "name": name,
                "element": element,
                "category": category,
                "cost": cost,
                "power": power,
                "description": description,
                "version": version,
                "icon_url": icon_url,
            })

    return skills


# ============================================================
# 工具
# ============================================================

def _safe_int(val) -> int:
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return 0


def _fix_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return "https://wiki.biligame.com" + url
    return url


def _make_uid(name: str, idx: int) -> str:
    """生成技能 uid: skill_{序号}"""
    return f"skill_{idx}"


# ============================================================
# 保存
# ============================================================

def save_csv(skills: list[dict], filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for skill in skills:
            row = dict(skill)
            if isinstance(row.get("element"), dict):
                row["element"] = row["element"].get("name", "")
            writer.writerow(row)
    print(f"[INFO] CSV 已保存: {filepath} ({len(skills)} 条)")


def save_json(skills: list[dict], filepath: str):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(skills, f, ensure_ascii=False, indent=2)
    print(f"[INFO] JSON 已保存: {filepath} ({len(skills)} 条)")


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60)
    print("洛克王国世界 BWIKI 技能筛选列表爬取")
    print("=" * 60)
    print()

    html = fetch_page_html("技能筛选")
    skills = parse_skill_list(html)

    if not skills:
        print("[ERROR] 未解析到数据")
        sys.exit(1)

    print(f"[INFO] 共解析 {len(skills)} 条技能数据")
    print()

    # 分配 uid
    for i, skill in enumerate(skills, start=1):
        skill["uid"] = _make_uid(skill["name"], i)

    # 加载属性结构化映射
    if os.path.exists(ELEMENT_DATA_PATH):
        with open(ELEMENT_DATA_PATH, "r", encoding="utf-8") as f:
            elem_data = json.load(f)
        elem_lookup = {}
        for key, obj in elem_data["elements"].items():
            elem_lookup[obj["name"]] = {
                "id": obj["id"],
                "key": obj["key"],
                "name": obj["name"],
                "color": obj.get("color", ""),
                "icon": obj.get("icon", ""),
            }
        for skill in skills:
            name = skill.get("element", "")
            if isinstance(name, str) and name in elem_lookup:
                skill["element"] = elem_lookup[name]
            elif isinstance(name, str):
                skill["element"] = {"id": None, "key": None, "name": name, "color": "", "icon": ""}
        print(f"[INFO] element 已映射为结构化引用")
    else:
        print("[WARN] 未找到属性结构化数据")

    # 保存数据
    save_csv(skills, CSV_OUTPUT)
    save_json(skills, JSON_OUTPUT)

    # 下载技能图标
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from downloader import batch_download

    print()
    print("[INFO] 下载技能图标...")
    icon_items = []
    for skill in skills:
        url = skill.get("icon_url", "")
        if url:
            icon_items.append({"url": url, "filename": f"{skill['uid']}.png"})
    batch_download(icon_items, ICON_DIR, label="技能图标 ")

    # 更新 icon_url 为本地路径
    for skill in skills:
        if skill.get("icon_url"):
            skill["icon_url"] = f"/public/skills/icons/{skill['uid']}.png"
        else:
            skill["icon_url"] = None

    # 重新保存（含本地路径）
    save_json(skills, JSON_OUTPUT)

    # 生成校验报告
    from report import generate_report

    total = len(skills)
    check_fields = ["uid", "name", "element", "category", "cost", "power", "description", "version", "icon_url"]
    field_checks = []
    for f in check_fields:
        has = sum(1 for s in skills if s.get(f))
        missing_items = [f"{s['name']}({s['uid']})" for s in skills if not s.get(f)]
        field_checks.append({"field": f, "has": has, "missing_items": missing_items})

    generate_report(
        output_dir=OUTPUT_DIR,
        report_name="skill_list_report.md",
        title="技能筛选列表 - 完整性校验报告",
        source="https://wiki.biligame.com/rocom/技能筛选",
        total=total,
        field_checks=field_checks,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

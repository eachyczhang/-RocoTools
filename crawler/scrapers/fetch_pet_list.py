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

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "pets")

CSV_OUTPUT = os.path.join(OUTPUT_DIR, "pet_list.csv")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "pet_list.json")
THUMB_DIR = os.path.join(PROJECT_ROOT, "data", "public", "pets", "thumbnails")
ELEMENT_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "elements", "element_chart_structured.json")

HEADERS = {
    "User-Agent": "RocoDataBot/1.0 (personal data collection)"
}

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
    import time
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    print(f"[INFO] 正在获取页面: {page_title}")
    for attempt in range(1, 4):
        resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=30)
        if resp.status_code in (567, 429):
            wait = 30 * attempt
            print(f"  [RATE] 被限流({resp.status_code})，等待 {wait}s 后重试 ({attempt}/3)")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        break
    data = resp.json()
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
        if len(cells) < 13:
            continue

        # col[0]: 精灵图片 + 链接
        img_el = cells[0].find("img")
        image_url = _fix_url(img_el.get("src", "")) if img_el else ""

        link_el = cells[0].find("a")
        name_from_link = link_el.get("title", "").strip() if link_el else ""

        # col[1]: 精灵名称
        name = cells[1].get_text(strip=True) or name_from_link

        # col[2]: 属性（从 img alt 提取，支持多属性）
        attr_imgs = cells[2].find_all("img")
        elements_raw = []
        for attr_img in attr_imgs:
            alt = attr_img.get("alt", "")
            match = re.search(r"属性\s+(.+?)\.png", alt)
            if match:
                elements_raw.append(match.group(1).strip())
        element = elements_raw[0] if elements_raw else ""
        sub_element = elements_raw[1] if len(elements_raw) > 1 else None

        # col[3]: 精灵编号
        pet_id = cells[3].get_text(strip=True)

        # col[4]: 特性
        ability_full = cells[4].get_text(strip=True)
        ability_name, ability_desc = _split_ability(ability_full)

        # col[5-11]: 六维 + 总种族值
        hp = _safe_int(cells[5].get_text(strip=True))
        speed = _safe_int(cells[6].get_text(strip=True))
        atk = _safe_int(cells[7].get_text(strip=True))
        matk = _safe_int(cells[8].get_text(strip=True))
        def_ = _safe_int(cells[9].get_text(strip=True))
        mdef = _safe_int(cells[10].get_text(strip=True))
        total = _safe_int(cells[11].get_text(strip=True))

        # col[12]: 更新版本
        version = cells[12].get_text(strip=True)

        pets.append({
            "pet_id": pet_id,
            "name": name,
            "element": element,
            "sub_element": sub_element,
            "ability_name": ability_name,
            "ability_desc": ability_desc,
            "hp": hp,
            "speed": speed,
            "atk": atk,
            "matk": matk,
            "def": def_,
            "mdef": mdef,
            "total": total,
            "version": version,
            "image_url": image_url,
        })

    # 分配 uid
    from collections import Counter
    id_counter = Counter()
    id_total = Counter(p["pet_id"] for p in pets)

    for pet in pets:
        pid = pet["pet_id"]
        if id_total[pid] == 1:
            pet["uid"] = f"pet_{pid}"
        else:
            id_counter[pid] += 1
            pet["uid"] = f"pet_{pid}_{id_counter[pid]}"

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

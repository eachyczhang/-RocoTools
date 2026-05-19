"""
洛克王国世界 BWIKI 精灵详情爬取（单结构）

每个形态独立存储为完整对象，通过唯一 uid 索引。
同时生成 variants_map 记录同 pet_id 下的多形态归属关系。

uid 规则：
  - 单形态：pet_{pet_id}  如 pet_002
  - 多形态：pet_{pet_id}_{序号}  如 pet_011_1, pet_011_2

输出：
  - data/pets/pet_detail.json

结构：
{
  "pets": {
    "pet_002": { ... 完整精灵对象 ... },
    "pet_011_1": { ... },
    "pet_011_2": { ... },
  },
  "variants_map": {
    "011": ["pet_011_1", "pet_011_2", "pet_011_3", ...]
  }
}
"""

import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"
BASE_URL = "https://wiki.biligame.com"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "pets")

LIST_INPUT = os.path.join(OUTPUT_DIR, "pet_list.json")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "pet_detail.json")
ELEMENT_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "elements", "element_chart_structured.json")
SKILL_DATA_PATH = os.path.join(PROJECT_ROOT, "data", "skills", "skill_list.json")

PUBLIC_DIR = os.path.join(PROJECT_ROOT, "data", "public", "pets")
IMG_DIRS = {
    "image_default": os.path.join(PUBLIC_DIR, "default"),
    "image_shiny":   os.path.join(PUBLIC_DIR, "shiny"),
    "image_fruit":   os.path.join(PUBLIC_DIR, "fruit"),
    "image_egg":     os.path.join(PUBLIC_DIR, "egg"),
}
ABILITY_ICON_DIR = os.path.join(PUBLIC_DIR, "abilities")

HEADERS = {
    "User-Agent": "RocoDataBot/1.0 (personal data collection)"
}

REQUEST_DELAY = 2.0
MAX_RETRIES = 5
RETRY_WAIT = 90
CONCURRENCY = 2  # 并发线程数

session = requests.Session()
session.headers.update(HEADERS)


# ============================================================
# 网络请求
# ============================================================

def fetch_page_html(page_title: str) -> str:
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    for attempt in range(1, MAX_RETRIES + 1):
        resp = session.get(API_URL, params=params, timeout=30)
        if resp.status_code == 567 or resp.status_code == 429:
            if attempt < MAX_RETRIES:
                wait = RETRY_WAIT * attempt
                print(f"    [RATE] 被限流，等待 {wait}s 后重试 ({attempt}/{MAX_RETRIES})")
                time.sleep(wait)
                continue
        resp.raise_for_status()
        break
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"API error: {data['error']}")
    return data["parse"]["text"]["*"]


# ============================================================
# 详情页解析
# ============================================================

# 已知属性名列表（按长度降序，优先匹配长的）
_KNOWN_ELEMENTS = [
    "普通", "草", "火", "水", "冰", "电", "光", "暗", "恶",
    "翼", "地", "毒", "龙", "虫", "岩", "机械", "萌", "武", "幻", "幽",
]
_KNOWN_ELEMENTS_SORTED = sorted(_KNOWN_ELEMENTS, key=len, reverse=True)


def _split_elements(text: str) -> tuple:
    """
    从拼接的属性文本中拆分主副属性。
    例如 "光地" → ("光", "地"), "机械火" → ("机械", "火"), "草" → ("草", None)
    """
    text = text.strip()
    if not text:
        return (text, None)

    # 尝试从头匹配第一个属性
    for elem in _KNOWN_ELEMENTS_SORTED:
        if text.startswith(elem):
            rest = text[len(elem):]
            if not rest:
                return (elem, None)
            # 剩余部分尝试匹配第二个属性
            for elem2 in _KNOWN_ELEMENTS_SORTED:
                if rest == elem2:
                    return (elem, elem2)
            # 剩余部分无法匹配，但可能就是副属性名
            if rest in _KNOWN_ELEMENTS:
                return (elem, rest)
            # 无法拆分，整体作为主属性
            return (text, None)

    return (text, None)




def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    detail = {}

    # 属性（支持双属性）
    attr_el = soup.select_one(".rocom_sprite_grament_attributes")
    if attr_el:
        attr_imgs = attr_el.find_all("img")
        if attr_imgs:
            elements_raw = []
            for img in attr_imgs:
                alt = img.get("alt", "")
                match = re.search(r"属性\s+(.+?)\.png", alt)
                if match:
                    elements_raw.append(match.group(1).strip())
            if elements_raw:
                detail["element"] = elements_raw[0]
                detail["sub_element"] = elements_raw[1] if len(elements_raw) > 1 else None
            else:
                # fallback: 从文本拆分双属性
                raw_text = attr_el.get_text(strip=True)
                detail["element"], detail["sub_element"] = _split_elements(raw_text)
        else:
            raw_text = attr_el.get_text(strip=True)
            detail["element"], detail["sub_element"] = _split_elements(raw_text)

    # 特性图标
    ability_icon_el = soup.select_one(".rocom_sprite_info_characteristic_content_icon img")
    if ability_icon_el:
        src = ability_icon_el.get("src", "")
        detail["ability_icon"] = _fix_url(src) if src else None
    else:
        detail["ability_icon"] = None

    # 立绘图片（4个 li 顺序固定：本体、异色、果实、宠物蛋）
    img_section = soup.select_one(".rocom_sprite_grament_img")
    if img_section:
        items = img_section.find_all("li")
        img_keys = ["image_default", "image_shiny", "image_fruit", "image_egg"]
        for i, key in enumerate(img_keys):
            if i < len(items):
                img = items[i].find("img")
                src = img.get("src", "") if img else ""
                detail[key] = _fix_url(src) if src else None
            else:
                detail[key] = None

    # 身高/体重
    physique = soup.select_one(".rocom_sprite_info_physique")
    if physique:
        text = physique.get_text()
        h = re.search(r"([\d.~]+)\s*[Mm]", text)
        w = re.search(r"([\d.~]+)\s*[Kk][Gg]", text)
        if h:
            detail["height"] = h.group(1)
        if w:
            detail["weight"] = w.group(1)

    # 分布
    location_el = soup.find(string=re.compile(r"精灵分布"))
    if location_el:
        parent = location_el.find_parent()
        if parent:
            loc = parent.get_text(strip=True).replace("精灵分布", "").strip().lstrip("：:").strip()
            if loc:
                detail["location"] = loc

    # 进化链
    evo_box = soup.select_one(".rocom_spirit_evolution_box")
    if evo_box:
        evo_names = []
        for link in evo_box.find_all("a"):
            title = link.get("title", "").strip()
            if title and title not in evo_names:
                evo_names.append(title)
        if evo_names:
            detail["evolution_chain"] = evo_names

    # 精灵技能
    sprite_tab = soup.select_one('.tabbertab[title="精灵技能"]')
    if sprite_tab:
        detail["skills"] = _parse_skill_boxes(sprite_tab)

    # 血脉技能
    bloodline_tab = soup.select_one('.tabbertab[title="血脉技能"]')
    if bloodline_tab:
        detail["bloodline_skills"] = _parse_skill_boxes(bloodline_tab)

    # 可学技能石
    stone_tab = soup.select_one('.tabbertab[title="可学技能石"]')
    if stone_tab:
        detail["learnable_stones"] = _parse_skill_boxes(stone_tab)

    return detail


def _parse_skill_boxes(container) -> list[dict]:
    skills = []
    for box in container.select(".rocom_sprite_skill_box"):
        skill = {}

        level_el = box.select_one(".rocom_sprite_skill_level")
        if level_el:
            skill["level"] = level_el.get_text(strip=True)

        name_el = box.select_one(".rocom_sprite_skillName")
        if name_el:
            skill["name"] = name_el.get_text(strip=True)

        cost_el = box.select_one(".rocom_sprite_skillDamage")
        if cost_el:
            skill["cost"] = cost_el.get_text(strip=True).count("★")

        for img in box.select("img"):
            alt = img.get("alt", "")
            if "类别" in alt:
                match = re.search(r"类别\s+(.+?)\.png", alt)
                if match:
                    skill["type"] = match.group(1).strip()
                break
        if "type" not in skill:
            type_el = box.select_one(".rocom_sprite_skillType")
            if type_el:
                skill["type"] = type_el.get_text(strip=True)

        power_el = box.select_one(".rocom_sprite_skill_power")
        if power_el:
            skill["power"] = _safe_int(power_el.get_text(strip=True))

        desc_el = box.select_one(".rocom_sprite_skillContent")
        if desc_el:
            skill["description"] = desc_el.get_text(strip=True)

        for img in box.select("img"):
            match = re.search(r"属性\s+(.+?)\.png", img.get("alt", ""))
            if match:
                skill["element"] = match.group(1).strip()
                break

        if skill.get("name"):
            skills.append(skill)

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
        return BASE_URL + url
    return url


# ============================================================
# 主流程
# ============================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--filter", help="增量更新：仅处理指定 uid 列表的 JSON 文件路径")
    args = parser.parse_args()

    # 增量过滤列表
    filter_uids = None
    if args.filter and os.path.exists(args.filter):
        with open(args.filter, "r", encoding="utf-8") as f:
            filter_uids = set(json.load(f))
        print(f"[INFO] 增量模式：仅更新 {len(filter_uids)} 个 uid")

    print("=" * 60)
    print("洛克王国世界 BWIKI 精灵详情爬取（单结构）")
    print("=" * 60)
    print()

    # 读取列表
    with open(LIST_INPUT, "r", encoding="utf-8") as f:
        pet_list = json.load(f)

    print(f"[INFO] 列表共 {len(pet_list)} 条")

    # 按 pet_id 分组，确定 uid
    from collections import OrderedDict
    groups = OrderedDict()
    for pet in pet_list:
        pid = pet["pet_id"]
        if pid not in groups:
            groups[pid] = []
        groups[pid].append(pet)

    # 分配 uid
    uid_assignments = []  # [(uid, pet_dict)]
    variants_map = {}     # pet_id -> [uid1, uid2, ...]

    # 加载属性结构化映射
    elem_lookup = {}
    if os.path.exists(ELEMENT_DATA_PATH):
        with open(ELEMENT_DATA_PATH, "r", encoding="utf-8") as f:
            elem_struct = json.load(f)
        for key, obj in elem_struct["elements"].items():
            elem_lookup[obj["name"]] = {
                "id": obj["id"],
                "key": obj["key"],
                "name": obj["name"],
                "color": obj.get("color", ""),
                "icon": obj.get("icon", ""),
            }
        print(f"[INFO] 属性结构化映射已加载（{len(elem_lookup)} 种）")
    else:
        print("[WARN] 未找到属性结构化数据")

    # 加载技能数据映射（name -> skill 引用）
    skill_lookup = {}
    if os.path.exists(SKILL_DATA_PATH):
        with open(SKILL_DATA_PATH, "r", encoding="utf-8") as f:
            skill_list = json.load(f)
        for skill in skill_list:
            sname = skill.get("name", "")
            if sname and sname not in skill_lookup:
                skill_lookup[sname] = {
                    "uid": skill["uid"],
                    "name": sname,
                    "icon_url": skill.get("icon_url", ""),
                }
        print(f"[INFO] 技能映射已加载（{len(skill_lookup)} 个技能）")
    else:
        print("[WARN] 未找到技能数据")

    # 加载蛋组数据映射（pet_id -> [蛋组名称]）
    EGG_GROUP_PATH = os.path.join(PROJECT_ROOT, "data", "eggs", "egg_group.json")
    egg_group_lookup = {}
    if os.path.exists(EGG_GROUP_PATH):
        with open(EGG_GROUP_PATH, "r", encoding="utf-8") as f:
            egg_data = json.load(f)
        egg_group_lookup = egg_data.get("pet_egg_groups", {})
        print(f"[INFO] 蛋组映射已加载（{len(egg_group_lookup)} 个 pet_id）")
    else:
        print("[WARN] 未找到蛋组数据")

    for pid, members in groups.items():
        if len(members) == 1:
            uid = f"pet_{pid}"
            uid_assignments.append((uid, members[0]))
        else:
            uids = []
            for i, member in enumerate(members, start=1):
                uid = f"pet_{pid}_{i}"
                uid_assignments.append((uid, member))
                uids.append(uid)
            variants_map[pid] = uids

    total = len(uid_assignments)
    print(f"[INFO] 唯一 uid: {total}")
    print(f"[INFO] 多形态组: {len(variants_map)}")
    print(f"[INFO] 请求间隔: {REQUEST_DELAY}s")

    # 增量模式：加载已有详情数据
    old_pets = {}
    if filter_uids and os.path.exists(JSON_OUTPUT):
        with open(JSON_OUTPUT, "r", encoding="utf-8") as f:
            old_data = json.load(f)
        old_pets = old_data.get("pets", {})
        need_fetch = sum(1 for uid, _ in uid_assignments if uid in filter_uids)
        print(f"[INFO] 增量更新: 需获取 {need_fetch}, 复用 {total - need_fetch}")
    else:
        print(f"[INFO] 预计耗时: ~{total * REQUEST_DELAY / 60:.1f} 分钟")

    print()

    # 并发获取详情
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import threading

    detail_cache = {}
    detail_lock = threading.Lock()
    pets_result = {}

    # 收集需要爬取的唯一名称
    names_to_fetch = []
    for uid, pet in uid_assignments:
        if filter_uids and uid not in filter_uids and uid in old_pets:
            continue
        name = pet["name"]
        if name not in detail_cache:
            detail_cache[name] = None  # 占位
            names_to_fetch.append(name)

    print(f"[INFO] 需要请求详情页: {len(names_to_fetch)} 个（并发={CONCURRENCY}）")

    def _fetch_one(name):
        """线程内爬取单个详情页"""
        try:
            html = fetch_page_html(name)
            detail = parse_detail(html)
            time.sleep(REQUEST_DELAY)
            return name, detail
        except Exception as e:
            time.sleep(REQUEST_DELAY)
            return name, {"_error": str(e)}

    # 并发爬取
    fetched = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(_fetch_one, name): name for name in names_to_fetch}
        for future in as_completed(futures):
            name, result = future.result()
            fetched += 1
            if "_error" in result:
                print(f"  [{fetched}/{len(names_to_fetch)}] [WARN] {name}: {result['_error']}")
                with detail_lock:
                    detail_cache[name] = {}
            else:
                print(f"  [{fetched}/{len(names_to_fetch)}] OK: {name}")
                with detail_lock:
                    detail_cache[name] = result

    # 组装结果
    for uid, pet in uid_assignments:
        name = pet["name"]

        if filter_uids and uid not in filter_uids and uid in old_pets:
            # 复用旧详情数据，但刷新映射关系
            pet_obj = old_pets[uid]
            pet_obj["element"] = pet["element"]
            pet_obj["egg_groups"] = egg_group_lookup.get(pet["pet_id"], [])
            # 刷新 detail 内的映射
            if pet_obj.get("detail"):
                if elem_lookup:
                    elem_name = pet_obj["detail"].get("element", "")
                    if elem_name and isinstance(elem_name, str):
                        pet_obj["detail"]["element"] = elem_lookup.get(elem_name, {"id": None, "key": None, "name": elem_name, "color": "", "icon": ""})
                if skill_lookup:
                    for skill_key in ("skills", "bloodline_skills", "learnable_stones"):
                        for skill in pet_obj["detail"].get(skill_key, []):
                            sname = skill.get("name", "")
                            if sname in skill_lookup:
                                skill["skill_ref"] = skill_lookup[sname]
                            else:
                                skill["skill_ref"] = None
            pets_result[uid] = pet_obj
            continue

        pet_obj = {
            "uid": uid,
            "pet_id": pet["pet_id"],
            "name": name,
            "element": pet["element"],
            "egg_groups": egg_group_lookup.get(pet["pet_id"], []),
            "ability_name": pet["ability_name"],
            "ability_desc": pet["ability_desc"],
            "hp": pet["hp"],
            "speed": pet["speed"],
            "atk": pet["atk"],
            "matk": pet["matk"],
            "def": pet["def"],
            "mdef": pet["mdef"],
            "total": pet["total"],
            "version": pet["version"],
            "image_url": pet["image_url"],
            "detail": None,
        }

        pet_obj["detail"] = detail_cache.get(name) or None

        # 将 detail 内的 element/sub_element 字符串映射为结构化引用
        if pet_obj["detail"] and elem_lookup:
            elem_name = pet_obj["detail"].get("element", "")
            if elem_name and isinstance(elem_name, str):
                pet_obj["detail"]["element"] = elem_lookup.get(elem_name, {"id": None, "key": None, "name": elem_name, "color": "", "icon": ""})
            sub_name = pet_obj["detail"].get("sub_element")
            if sub_name and isinstance(sub_name, str):
                pet_obj["detail"]["sub_element"] = elem_lookup.get(sub_name, {"id": None, "key": None, "name": sub_name, "color": "", "icon": ""})

        # 同步 detail 的属性到顶层 sub_element（如果顶层没有的话）
        if pet_obj["detail"] and pet_obj["detail"].get("sub_element") and not pet_obj.get("sub_element"):
            pet_obj["sub_element"] = pet_obj["detail"]["sub_element"]

        # 将 detail 内的技能关联到 skill_list（添加 skill_ref）
        if pet_obj["detail"] and skill_lookup:
            for skill_key in ("skills", "bloodline_skills", "learnable_stones"):
                skill_list = pet_obj["detail"].get(skill_key, [])
                for skill in skill_list:
                    sname = skill.get("name", "")
                    if sname in skill_lookup:
                        skill["skill_ref"] = skill_lookup[sname]
                    else:
                        skill["skill_ref"] = None

        pets_result[uid] = pet_obj

    # 保存
    output = {
        "description": "洛克王国世界精灵详情数据（每形态独立存储）",
        "total": len(pets_result),
        "variants_map": variants_map,
        "pets": pets_result,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print()
    print(f"[INFO] JSON 已保存: {JSON_OUTPUT}")
    print(f"[INFO] 共 {len(pets_result)} 个独立形态对象")
    print(f"[INFO] 多形态组: {len(variants_map)} 组")

    # 下载立绘图片
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from downloader import batch_download

    img_type_labels = {
        "image_default": "本体立绘",
        "image_shiny": "异色立绘",
        "image_fruit": "果实图片",
        "image_egg": "精灵蛋图片",
    }

    for img_key, save_dir in IMG_DIRS.items():
        label = img_type_labels.get(img_key, img_key)
        # 收集有该图片的精灵
        items = []
        for uid, pet in pets_result.items():
            detail = pet.get("detail") or {}
            url = detail.get(img_key)
            if url:
                # 命名：uid_类型后缀.png，如 pet_002_default.png
                suffix = img_key.replace("image_", "")
                items.append({"url": url, "filename": f"{uid}_{suffix}.png"})

        if items:
            print()
            print(f"[INFO] 下载{label}（{len(items)} 张）...")
            batch_download(items, save_dir, label=f"{label} ")

    # 下载特性图标
    ability_items = []
    for uid, pet in pets_result.items():
        detail = pet.get("detail") or {}
        url = detail.get("ability_icon")
        if url:
            ability_items.append({"url": url, "filename": f"{uid}_ability.png"})
    if ability_items:
        print()
        print(f"[INFO] 下载特性图标（{len(ability_items)} 张）...")
        batch_download(ability_items, ABILITY_ICON_DIR, label="特性图标 ")

    # 更新所有图片 URL 为本地路径
    for uid, pet in pets_result.items():
        # 顶层缩略图
        if pet.get("image_url"):
            pet["image_url"] = f"/public/pets/thumbnails/{uid}.png"
        # detail 内的立绘 + 特性图标
        detail = pet.get("detail") or {}
        for img_key in ("image_default", "image_shiny", "image_fruit", "image_egg"):
            if detail.get(img_key):
                suffix = img_key.replace("image_", "")
                detail[img_key] = f"/public/pets/{suffix}/{uid}_{suffix}.png"
        if detail.get("ability_icon"):
            detail["ability_icon"] = f"/public/pets/abilities/{uid}_ability.png"

    # 重新保存（含本地路径）
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("[INFO] 图片路径已更新为本地路径")

    # 生成校验报告
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from report import generate_report

    total = len(pets_result)

    # 顶层字段
    top_fields = ["uid", "pet_id", "name", "element", "egg_groups", "ability_name", "ability_desc",
                   "hp", "speed", "atk", "matk", "def", "mdef", "total", "version", "image_url", "detail"]
    # detail 内字段
    detail_fields = ["element", "image_default", "image_shiny", "image_fruit", "image_egg",
                      "height", "weight", "location", "evolution_chain",
                      "skills", "bloodline_skills", "learnable_stones"]

    field_checks = []
    for f in top_fields:
        has = sum(1 for p in pets_result.values() if p.get(f))
        missing_items = [f"{p['name']}({p['uid']})" for p in pets_result.values() if not p.get(f)]
        field_checks.append({"field": f"[顶层] {f}", "has": has, "missing_items": missing_items})

    for f in detail_fields:
        has = sum(1 for p in pets_result.values() if p.get("detail") and p["detail"].get(f))
        missing_items = [f"{p['name']}({p['uid']})" for p in pets_result.values()
                         if not (p.get("detail") and p["detail"].get(f))]
        field_checks.append({"field": f"[detail] {f}", "has": has, "missing_items": missing_items})

    # 技能统计
    skill_counts = [len(p["detail"].get("skills", [])) for p in pets_result.values() if p.get("detail")]
    bl_counts = [len(p["detail"].get("bloodline_skills", [])) for p in pets_result.values() if p.get("detail")]
    st_counts = [len(p["detail"].get("learnable_stones", [])) for p in pets_result.values() if p.get("detail")]

    extra = []
    if skill_counts:
        extra.append({
            "title": "技能数量统计",
            "content": (
                f"| 类别 | 最小 | 最大 | 平均 |\n"
                f"|------|------|------|------|\n"
                f"| skills | {min(skill_counts)} | {max(skill_counts)} | {sum(skill_counts)/len(skill_counts):.1f} |\n"
                f"| bloodline_skills | {min(bl_counts)} | {max(bl_counts)} | {sum(bl_counts)/len(bl_counts):.1f} |\n"
                f"| learnable_stones | {min(st_counts)} | {max(st_counts)} | {sum(st_counts)/len(st_counts):.1f} |"
            ),
        })

    generate_report(
        output_dir=OUTPUT_DIR,
        report_name="pet_detail_report.md",
        title="精灵详情 - 完整性校验报告",
        source="https://wiki.biligame.com/rocom/{精灵名}",
        total=total,
        field_checks=field_checks,
        extra_sections=extra,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

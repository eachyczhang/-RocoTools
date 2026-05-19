"""
属性克制关系数据 - 二次处理脚本

读取原始数据：data/elements/element_chart.json
生成结构化数据：data/elements/element_chart_structured.json
                data/elements/element_chart_structured.csv

处理内容：
  1. 为每个属性分配唯一 id（从 1 开始）
  2. 克制/抵抗关系用 id 数组表示，方便前端直接映射
  3. 将 element_immunities 整合到对应属性对象内
  4. 属性对象用字典包裹，key 为 id
"""

import csv
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "elements")

INPUT_FILE = os.path.join(DATA_DIR, "element_chart.json")
JSON_OUTPUT = os.path.join(DATA_DIR, "element_chart_structured.json")
CSV_OUTPUT = os.path.join(DATA_DIR, "element_chart_structured.csv")


def main():
    print("=" * 60)
    print("属性克制关系 - 二次结构化处理")
    print("=" * 60)

    # 读取原始数据
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)

    elements_list = raw["elements"]
    multipliers = raw["multipliers"]
    chart = raw["chart"]

    # 构建 name -> id 映射（id 从 1 开始）
    name_to_id = {}
    for i, name in enumerate(elements_list, start=1):
        name_to_id[name] = i

    print(f"[INFO] 属性总数: {len(elements_list)}")
    print(f"[INFO] ID 映射: {name_to_id}")
    print()

    # 构建结构化属性对象
    elements_map = {}
    elements_array = []

    def make_key(eid):
        """生成属性对象的 key，格式 elem_1"""
        return f"elem_{eid}"

    def ref(name):
        """生成属性引用对象 {id, key, name}"""
        eid = name_to_id[name]
        return {"id": eid, "key": make_key(eid), "name": name}

    for item in chart:
        name = item["element"]
        eid = name_to_id[name]
        key = make_key(eid)

        element_obj = {
            "id": eid,
            "key": key,
            "name": name,
            "color": item.get("color", ""),
            "icon": item.get("icon", ""),
            "immunity": item.get("immunity", "") or None,
            "strong_against": [ref(n) for n in item["strong_against"]],
            "resisted_by": [ref(n) for n in item["resisted_by"]],
            "weak_to": [ref(n) for n in item["weak_to"]],
            "resistant_to": [ref(n) for n in item["resistant_to"]],
        }

        elements_map[key] = element_obj
        elements_array.append(element_obj)

    # 保存 JSON
    output = {
        "description": "洛克王国世界属性克制关系表（结构化版本，含ID映射）",
        "source": raw["source"],
        "multipliers": multipliers,
        "id_map": {v: k for k, v in name_to_id.items()},
        "elements": elements_map,
    }

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[INFO] JSON 已保存: {JSON_OUTPUT}")

    # 保存 CSV
    csv_fields = [
        "id", "name", "immunity",
        "strong_against", "resisted_by", "weak_to", "resistant_to",
    ]
    with open(CSV_OUTPUT, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for elem in elements_array:
            row = {
                "id": elem["id"],
                "name": elem["name"],
                "immunity": elem["immunity"] or "",
                "strong_against": "、".join(r["name"] for r in elem["strong_against"]) or "无",
                "resisted_by": "、".join(r["name"] for r in elem["resisted_by"]) or "无",
                "weak_to": "、".join(r["name"] for r in elem["weak_to"]) or "无",
                "resistant_to": "、".join(r["name"] for r in elem["resistant_to"]) or "无",
            }
            writer.writerow(row)
    print(f"[INFO] CSV 已保存: {CSV_OUTPUT}")

    # 生成校验报告
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "..", "utils"))
    from report import generate_report

    total = len(elements_array)
    check_fields = ["id", "key", "name", "immunity", "strong_against", "resisted_by", "weak_to", "resistant_to"]
    field_checks = []
    for f in check_fields:
        has = sum(1 for e in elements_array if e.get(f))
        missing_items = [e["name"] for e in elements_array if not e.get(f)]
        field_checks.append({"field": f, "has": has, "missing_items": missing_items})

    generate_report(
        output_dir=DATA_DIR,
        report_name="element_chart_structured_report.md",
        title="属性克制关系（结构化版本）- 完整性校验报告",
        source=raw["source"],
        total=total,
        field_checks=field_checks,
    )

    print()
    print("[DONE] 完成！")


if __name__ == "__main__":
    main()

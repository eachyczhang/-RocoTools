"""
洛克王国世界 BWIKI 性格数据爬取

数据来源：https://wiki.biligame.com/rocom/性格
爬取所有性格的属性增减和子性格信息。

性格共 30 种，按属性增加分为 6 大类（物攻/物防/魔攻/魔防/速度/生命），每类 5 种。

输出：
  - data/natures/nature_list.json
"""

import json
import os
import sys

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"
PAGE_TITLE = "性格"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "natures")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "nature_list.json")
REPORT_OUTPUT = os.path.join(OUTPUT_DIR, "nature_report.md")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
}

# ============================================================
# 爬取
# ============================================================


def fetch_page_html():
    """通过 MediaWiki API 获取页面渲染后的 HTML"""
    params = {
        "action": "parse",
        "page": PAGE_TITLE,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["parse"]["text"]["*"]


def parse_natures(html):
    """解析性格表格数据"""
    soup = BeautifulSoup(html, "html.parser")
    natures = []

    # 查找所有表格
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 4:
                continue

            # 尝试解析：主性格 | 属性增加 | 属性减少 | 子性格
            cell_texts = [cell.get_text(strip=True) for cell in cells]

            # 跳过表头
            if "主性格" in cell_texts[0] or "性格" == cell_texts[0]:
                continue

            name = cell_texts[0]
            # 过滤无效行
            if not name or len(name) > 5:
                continue

            # 属性增加/减少可能带有 ▲/▼ 标记
            stat_up = cell_texts[1].replace("▲", "").replace("↑", "").strip()
            stat_down = cell_texts[2].replace("▼", "").replace("↓", "").strip()

            # 验证是否为有效属性
            valid_stats = ["物攻", "物防", "魔攻", "魔防", "速度", "生命"]
            if stat_up not in valid_stats or stat_down not in valid_stats:
                continue

            # 子性格：可能在第4列，以换行/逗号分隔
            sub_natures_raw = cell_texts[3] if len(cell_texts) > 3 else ""
            sub_natures = []
            if sub_natures_raw:
                # 尝试多种分隔方式
                for sep in ["、", "，", ",", "\n"]:
                    if sep in sub_natures_raw:
                        sub_natures = [s.strip() for s in sub_natures_raw.split(sep) if s.strip()]
                        break
                if not sub_natures and sub_natures_raw:
                    sub_natures = [sub_natures_raw]

            nature = {
                "id": len(natures) + 1,
                "name": name,
                "stat_up": stat_up,
                "stat_down": stat_down,
                "sub_natures": sub_natures,
            }
            natures.append(nature)

    return natures


def generate_report(natures, up_counter):
    """生成完整性校验报告"""
    from datetime import datetime

    # 字段完整性检查
    fields = ["name", "stat_up", "stat_down", "sub_natures"]
    field_stats = {}
    for field in fields:
        filled = sum(1 for n in natures if n.get(field))
        missing = len(natures) - filled
        field_stats[field] = (filled, missing)

    # 子性格数量检查
    sub_counts = [len(n["sub_natures"]) for n in natures]
    sub_missing = [n["name"] for n in natures if len(n["sub_natures"]) < 5]

    lines = [
        "# 性格数据 - 完整性校验报告\n",
        f"- 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- 数据来源：https://wiki.biligame.com/rocom/性格",
        f"- 总记录数：{len(natures)}",
        f"- 预期总数：30（6属性 x 5种）",
        "",
        "## 字段完整性\n",
        "| 字段 | 有值 | 缺失 | 缺失率 | 状态 |",
        "|------|------|------|--------|------|",
    ]

    for field in fields:
        filled, missing = field_stats[field]
        rate = f"{missing / len(natures) * 100:.1f}%"
        status = "OK" if missing == 0 else "!"
        lines.append(f"| {field} | {filled} | {missing} | {rate} | {status} |")

    # 子性格完整性
    lines.append(f"| sub_natures(=5个) | {len(natures) - len(sub_missing)} | {len(sub_missing)} | {len(sub_missing) / len(natures) * 100:.1f}% | {'OK' if not sub_missing else '!'} |")

    if sub_missing:
        lines.append(f"\n### 子性格不足5个的性格\n")
        for name in sub_missing:
            lines.append(f"- {name}")

    # 属性分布
    lines.append("\n## 属性增加分布\n")
    lines.append("| 属性 | 性格数 | 状态 |")
    lines.append("|------|--------|------|")
    for stat in ["物攻", "物防", "魔攻", "魔防", "速度", "生命"]:
        count = up_counter.get(stat, 0)
        status = "OK" if count == 5 else "!"
        lines.append(f"| {stat} | {count} | {status} |")

    # 属性减少分布
    from collections import Counter
    down_counter = Counter(n["stat_down"] for n in natures)
    lines.append("\n## 属性减少分布\n")
    lines.append("| 属性 | 性格数 | 状态 |")
    lines.append("|------|--------|------|")
    for stat in ["物攻", "物防", "魔攻", "魔防", "速度", "生命"]:
        count = down_counter.get(stat, 0)
        status = "OK" if count == 5 else "!"
        lines.append(f"| {stat} | {count} | {status} |")

    # 完整性格列表
    lines.append("\n## 完整性格列表\n")
    lines.append("| ID | 名称 | 增加 | 减少 | 子性格数 |")
    lines.append("|-----|------|------|------|----------|")
    for n in natures:
        lines.append(f"| {n['id']} | {n['name']} | {n['stat_up']} | {n['stat_down']} | {len(n['sub_natures'])} |")

    report = "\n".join(lines)
    with open(REPORT_OUTPUT, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"[性格] 报告已生成 -> {REPORT_OUTPUT}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"[性格] 获取页面: {PAGE_TITLE}")
    html = fetch_page_html()

    print("[性格] 解析数据...")
    natures = parse_natures(html)

    if not natures:
        print("[性格] WARNING: 未解析到数据，尝试备用解析...")
        # 备用：直接按文本行解析
        soup = BeautifulSoup(html, "html.parser")
        # 打印前 500 字符用于调试
        text = soup.get_text()[:500]
        print(f"[性格] 页面文本预览:\n{text}")
        sys.exit(1)

    # 输出
    output = {
        "total": len(natures),
        "natures": natures,
    }

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[性格] 完成: {len(natures)} 种性格 -> {JSON_OUTPUT}")

    # 按属性增加分组统计
    from collections import Counter
    up_counter = Counter(n["stat_up"] for n in natures)
    print(f"[性格] 按属性增加分布: {dict(up_counter)}")

    # 生成完整性报告
    generate_report(natures, up_counter)


if __name__ == "__main__":
    main()

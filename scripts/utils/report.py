"""
数据完整性校验报告生成工具
每个爬虫脚本跑完后调用，自动在数据目录生成 _report.md
"""

import os
from datetime import datetime


def generate_report(
    output_dir: str,
    report_name: str,
    title: str,
    source: str,
    total: int,
    field_checks: list[dict],
    extra_sections: list[dict] | None = None,
):
    """
    生成完整性校验报告

    Args:
        output_dir: 报告输出目录
        report_name: 报告文件名（如 pet_list_report.md）
        title: 报告标题
        source: 数据来源
        total: 总记录数
        field_checks: 字段检查列表，每项 {"field": str, "has": int, "missing_items": list[str] | None}
        extra_sections: 额外报告段落 [{"title": str, "content": str}]
    """
    filepath = os.path.join(output_dir, report_name)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"- 生成时间：{now}")
    lines.append(f"- 数据来源：{source}")
    lines.append(f"- 总记录数：{total}")
    lines.append("")

    # 字段完整性表格
    lines.append("## 字段完整性")
    lines.append("")
    lines.append("| 字段 | 有值 | 缺失 | 缺失率 | 状态 |")
    lines.append("|------|------|------|--------|------|")

    missing_details = []

    for check in field_checks:
        field = check["field"]
        has = check["has"]
        miss = total - has
        rate = miss / total * 100 if total > 0 else 0
        status = "✓" if miss == 0 else "!"
        lines.append(f"| {field} | {has} | {miss} | {rate:.1f}% | {status} |")

        # 收集缺失详情
        items = check.get("missing_items")
        if items and miss > 0:
            missing_details.append((field, miss, items))

    # 缺失详情
    if missing_details:
        lines.append("")
        lines.append("## 缺失详情")
        for field, miss, items in missing_details:
            lines.append("")
            lines.append(f"### {field}（缺失 {miss} 条）")
            lines.append("")
            show = items[:30]
            for item in show:
                lines.append(f"- {item}")
            if len(items) > 30:
                lines.append(f"- ... 等共 {len(items)} 条")

    # 额外段落
    if extra_sections:
        for section in extra_sections:
            lines.append("")
            lines.append(f"## {section['title']}")
            lines.append("")
            lines.append(section["content"])

    lines.append("")

    os.makedirs(output_dir, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[INFO] 校验报告已生成: {filepath}")

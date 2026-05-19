"""
图片下载工具

统一下载图片到 data/public/ 下的分类目录。
文件名使用可唯一映射的命名方式，如 elem_1.png、pet_002_default.png。
"""

import os
import time
from urllib.parse import urlparse

import requests

HEADERS = {
    "User-Agent": "RocoDataBot/1.0 (personal data collection)"
}

_session = requests.Session()
_session.headers.update(HEADERS)


def download_image(
    url: str,
    save_dir: str,
    filename: str,
    delay: float = 0.2,
    skip_existing: bool = True,
) -> str | None:
    """
    下载单张图片

    Args:
        url: 图片 URL
        save_dir: 保存目录（绝对路径）
        filename: 文件名（如 elem_1.png）
        delay: 下载间隔（秒）
        skip_existing: 文件已存在时跳过

    Returns:
        保存的相对路径（相对于 data/public/），失败返回 None
    """
    if not url:
        return None

    os.makedirs(save_dir, exist_ok=True)
    filepath = os.path.join(save_dir, filename)

    if skip_existing and os.path.exists(filepath):
        return filepath

    try:
        if url.startswith("//"):
            url = "https:" + url

        for attempt in range(3):
            resp = _session.get(url, timeout=15)
            if resp.status_code in (567, 429) and attempt < 2:
                time.sleep(10 * (attempt + 1))
                continue
            resp.raise_for_status()
            break

        with open(filepath, "wb") as f:
            f.write(resp.content)

        if delay > 0:
            time.sleep(delay)

        return filepath
    except Exception as e:
        print(f"  [WARN] 下载失败 {filename}: {e}")
        return None


def get_ext(url: str) -> str:
    """从 URL 提取文件扩展名，默认 .png"""
    parsed = urlparse(url)
    path = parsed.path
    # wiki 的 thumb URL 可能有 /80px-xxx.png 格式
    if "/thumb/" in path:
        # 取最后一段的扩展名
        last = path.split("/")[-1]
        if "." in last:
            return "." + last.rsplit(".", 1)[-1].lower()
    if "." in path:
        ext = "." + path.rsplit(".", 1)[-1].lower()
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
            return ext
    return ".png"


def batch_download(
    items: list[dict],
    save_dir: str,
    url_key: str = "url",
    name_key: str = "filename",
    delay: float = 0.2,
    skip_existing: bool = True,
    label: str = "",
) -> int:
    """
    批量下载图片

    Args:
        items: [{"url": "...", "filename": "elem_1.png"}, ...]
        save_dir: 保存目录
        url_key: URL 字段名
        name_key: 文件名字段名
        delay: 下载间隔
        skip_existing: 跳过已存在
        label: 进度标签

    Returns:
        成功下载数量
    """
    total = len(items)
    success = 0
    skipped = 0

    for i, item in enumerate(items, start=1):
        url = item.get(url_key, "")
        filename = item.get(name_key, "")
        if not url or not filename:
            continue

        filepath = os.path.join(save_dir, filename)
        if skip_existing and os.path.exists(filepath):
            skipped += 1
            continue

        prefix = f"  [{i}/{total}]" if label else f"  [{i}/{total}]"
        print(f"{prefix} 下载: {filename}")

        result = download_image(url, save_dir, filename, delay=delay, skip_existing=False)
        if result:
            success += 1

    print(f"[INFO] {label}下载完成: 成功 {success}, 跳过 {skipped}, 失败 {total - success - skipped}")
    return success

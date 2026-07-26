"""BWIKI 的保守 HTTP 请求策略。

目标是降低请求压力并在服务端拒绝访问时及时停止，而不是伪装浏览器或绕过限制。
"""

from __future__ import annotations

import os
import random
import threading
import time
from email.utils import parsedate_to_datetime

import requests


DEFAULT_USER_AGENT = "RocoTools-BWIKI-Sync/1.0 (respectful MediaWiki client)"
DEFAULT_DELAY_RANGE = (4.0, 8.0)
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_BASE_WAIT = 5.0
DEFAULT_TIMEOUT = 30

BLOCKED_STATUS_CODES = {403, 429, 567}
TRANSIENT_STATUS_CODES = {500, 502, 503, 504}

_request_lock = threading.Lock()
_last_request_started = 0.0


class AccessBlockedError(RuntimeError):
    """服务端已经限流或拒绝访问；调用方不应继续自动重试。"""

    stop_retry = True


def _env_float(name: str, fallback: float) -> float:
    value = os.getenv(name)
    if value is None:
        return fallback
    try:
        return max(0.0, float(value))
    except ValueError:
        raise RuntimeError(f"{name} 必须是非负数字，当前值：{value!r}") from None


def delay_range() -> tuple[float, float]:
    low = max(2.0, _env_float("ROCO_CRAWLER_MIN_DELAY", DEFAULT_DELAY_RANGE[0]))
    high = max(low, _env_float("ROCO_CRAWLER_MAX_DELAY", DEFAULT_DELAY_RANGE[1]))
    return low, high


def create_session() -> requests.Session:
    """创建带稳定、可识别请求头的会话。"""
    user_agent = os.getenv("ROCO_CRAWLER_USER_AGENT", DEFAULT_USER_AGENT).strip()
    if not user_agent:
        raise RuntimeError("ROCO_CRAWLER_USER_AGENT 不能为空")

    session = requests.Session()
    session.headers.update({
        "User-Agent": user_agent,
        "Api-User-Agent": user_agent,
        "Accept": "application/json,text/plain;q=0.9,*/*;q=0.5",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": "https://wiki.biligame.com/rocom/",
        "Connection": "keep-alive",
    })
    return session


def _retry_after_seconds(response: requests.Response) -> float | None:
    value = response.headers.get("Retry-After")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
            return max(0.0, retry_at.timestamp() - time.time())
        except (TypeError, ValueError, OverflowError):
            return None


def _blocked_message(response: requests.Response) -> str:
    retry_after = _retry_after_seconds(response)
    suffix = f"，服务端建议至少等待 {retry_after:.0f} 秒" if retry_after is not None else ""
    return (
        f"BWIKI 拒绝或限制访问（HTTP {response.status_code}{suffix}）。"
        "已停止自动请求；请等待访问恢复，或改用 fetch-html 离线导入。"
    )


def request_with_retry(
    session: requests.Session,
    url: str,
    params: dict | None = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
    retry_base_wait: float = DEFAULT_RETRY_BASE_WAIT,
    timeout: int = DEFAULT_TIMEOUT,
) -> requests.Response:
    """串行、限速地发送 GET；封禁类响应立即熔断，瞬时故障有限退避。"""
    global _last_request_started

    attempts = max(1, int(max_retries))
    for attempt in range(1, attempts + 1):
        try:
            with _request_lock:
                low, high = delay_range()
                target_gap = random.uniform(low, high)
                remaining = target_gap - (time.monotonic() - _last_request_started)
                if remaining > 0:
                    time.sleep(remaining)
                _last_request_started = time.monotonic()
                response = session.get(url, params=params, timeout=timeout)
        except requests.exceptions.RequestException as error:
            if attempt >= attempts:
                raise
            wait = min(60.0, retry_base_wait * (2 ** (attempt - 1))) + random.uniform(0, 1)
            print(f"    [NET] 瞬时网络错误，{wait:.1f}s 后重试 ({attempt}/{attempts})：{error}")
            time.sleep(wait)
            continue

        if response.status_code in BLOCKED_STATUS_CODES:
            message = _blocked_message(response)
            response.close()
            raise AccessBlockedError(message)

        if response.status_code in TRANSIENT_STATUS_CODES and attempt < attempts:
            retry_after = _retry_after_seconds(response)
            wait = retry_after if retry_after is not None else retry_base_wait * (2 ** (attempt - 1))
            wait = min(120.0, wait) + random.uniform(0, 1)
            print(f"    [SERVER] HTTP {response.status_code}，{wait:.1f}s 后重试 ({attempt}/{attempts})")
            response.close()
            time.sleep(wait)
            continue

        return response

    raise RuntimeError("请求重试耗尽")


def fetch_json(
    session: requests.Session,
    url: str,
    params: dict | None = None,
    **kwargs,
) -> dict:
    """请求 JSON，并拒绝把拦截页 HTML 当成正常 API 数据。"""
    response = request_with_retry(session, url, params=params, **kwargs)
    response.raise_for_status()
    content_type = response.headers.get("Content-Type", "").lower()
    if "json" not in content_type:
        sample = response.text.lstrip()[:80].lower()
        if sample.startswith("<!doctype") or sample.startswith("<html"):
            raise AccessBlockedError(
                "BWIKI 返回了 HTML 页面而不是 API JSON，可能是验证页或拦截页；"
                "已停止自动请求，请改用 fetch-html。"
            )
    return response.json()

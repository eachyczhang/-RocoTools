"""
旧请求工具兼容入口。

实际策略由 polite_request 提供：稳定项目标识、串行节流、有限退避，
并在 403/429/567 或验证页出现时停止。保留本文件是为了兼容旧导入路径。
"""

import random
import time

import requests

# 主流浏览器 UA 池
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
]

# 默认配置
DEFAULT_DELAY_RANGE = (2.0, 5.0)  # 随机间隔范围（秒）
DEFAULT_MAX_RETRIES = 5
DEFAULT_RETRY_BASE_WAIT = 60      # 首次重试等待秒数（后续指数递增）
DEFAULT_TIMEOUT = 30

# 限流状态码
RATE_LIMIT_CODES = {429, 567, 503}


def _random_ua() -> str:
    return random.choice(_USER_AGENTS)


def create_session() -> requests.Session:
    """创建带随机 UA 的 session"""
    s = requests.Session()
    s.headers.update({
        "User-Agent": _random_ua(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })
    return s


def random_delay(delay_range: tuple = None):
    """随机等待，模拟人类浏览"""
    lo, hi = delay_range or DEFAULT_DELAY_RANGE
    wait = random.uniform(lo, hi)
    time.sleep(wait)


def request_with_retry(
    session: requests.Session,
    url: str,
    params: dict = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
    retry_base_wait: int = DEFAULT_RETRY_BASE_WAIT,
    timeout: int = DEFAULT_TIMEOUT,
) -> requests.Response:
    """
    带限流重试的 GET 请求

    遇到限流状态码时自动等待并重试（指数退避）。
    每次重试随机更换 UA。
    """
    for attempt in range(1, max_retries + 1):
        # 每次请求随机切换 UA
        session.headers["User-Agent"] = _random_ua()

        try:
            resp = session.get(url, params=params, timeout=timeout)
        except requests.exceptions.RequestException as e:
            if attempt < max_retries:
                wait = retry_base_wait * attempt
                print(f"    [NET] 网络错误，等待 {wait}s 后重试 ({attempt}/{max_retries}): {e}")
                time.sleep(wait)
                continue
            raise

        if resp.status_code in RATE_LIMIT_CODES:
            if attempt < max_retries:
                # 指数退避 + 随机抖动
                wait = retry_base_wait * attempt + random.uniform(5, 15)
                print(f"    [RATE] 被限流({resp.status_code})，等待 {wait:.0f}s 后重试 ({attempt}/{max_retries})")
                time.sleep(wait)
                continue
            else:
                print(f"    [RATE] 重试 {max_retries} 次仍被限流，跳过")
                resp.raise_for_status()

        return resp

    # 不应到达这里
    raise RuntimeError("请求重试耗尽")


def fetch_json(session: requests.Session, url: str, params: dict = None, **kwargs) -> dict:
    """请求并解析 JSON"""
    resp = request_with_retry(session, url, params=params, **kwargs)
    resp.raise_for_status()
    return resp.json()

# 兼容旧的 ``from request import ...``；下列安全实现覆盖上方历史定义。
from polite_request import (  # noqa: E402,F401
    AccessBlockedError,
    create_session,
    fetch_json,
    request_with_retry,
)

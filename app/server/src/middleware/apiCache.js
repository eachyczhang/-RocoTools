/**
 * 简单内存缓存中间件
 * 对 GET 请求按 URL（含 query）缓存响应，TTL 过期自动失效
 */

const cache = new Map()

function apiCache(ttlSeconds = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    const key = req.originalUrl
    const cached = cache.get(key)

    if (cached && Date.now() - cached.time < ttlSeconds * 1000) {
      res.set('X-Cache', 'HIT')
      return res.json(cached.data)
    }

    // 拦截 res.json 捕获响应数据
    const originalJson = res.json.bind(res)
    res.json = (data) => {
      cache.set(key, { data, time: Date.now() })
      res.set('X-Cache', 'MISS')
      return originalJson(data)
    }

    next()
  }
}

// 手动清除缓存（数据更新时调用）
function clearCache() {
  cache.clear()
}

module.exports = { apiCache, clearCache }

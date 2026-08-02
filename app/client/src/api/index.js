const BASE = '/api'
const MAX_RETRIES = 2
const RETRY_DELAY = 500
const REQUEST_TIMEOUT = 20000 // 20s timeout for user-facing API
const REFERENCE_CACHE_TTL = 10 * 60 * 1000

// 仅缓存稳定的公共只读数据。缓存只存在于当前页面内存中，刷新页面即清空。
const responseCache = new Map()
const inflightRequests = new Map()

function requestKey(path, params) {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

async function cachedRequest(path, params, ttl = REFERENCE_CACHE_TTL) {
  const key = requestKey(path, params)
  const cached = responseCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (cached) responseCache.delete(key)

  const inflight = inflightRequests.get(key)
  if (inflight) return inflight

  const pending = request(path, params)
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttl })
      return value
    })
    .finally(() => {
      inflightRequests.delete(key)
    })

  inflightRequests.set(key, pending)
  return pending
}

async function request(path, params, retries = MAX_RETRIES) {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接')
    }
    if (retries > 0 && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      await new Promise(r => setTimeout(r, RETRY_DELAY))
      return request(path, params, retries - 1)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const elementsApi = {
  list: () => cachedRequest(`${BASE}/elements`),
  get: (id) => cachedRequest(`${BASE}/elements/${id}`),
  multipliers: () => cachedRequest(`${BASE}/elements/multipliers`),
}

export const skillsApi = {
  list: (params) => request(`${BASE}/skills`, params),
  get: (uid) => request(`${BASE}/skills/${uid}`),
}

export const eggsApi = {
  list: () => request(`${BASE}/eggs`),
  get: (id) => request(`${BASE}/eggs/${id}`),
}

export const petsApi = {
  list: (params) => request(`${BASE}/pets`, params),
  get: (uid) => request(`${BASE}/pets/${uid}`),
  neighbors: (uid) => request(`${BASE}/pets/${uid}/neighbors`),
  shiny: () => request(`${BASE}/pets/shiny`),
  coverage: (elements) => request(`${BASE}/pets/coverage`, { elements: elements.join(',') }),
  counterPicks: (uid, nature) => request(`${BASE}/pets/counter-picks/${uid}`, nature ? { nature } : {}),
}

export const naturesApi = {
  list: () => cachedRequest(`${BASE}/natures`),
}

export const seasonsApi = {
  list: () => request(`${BASE}/seasons`),
  current: () => request(`${BASE}/seasons/current`),
}

export { adminApi } from './admin.js'

export const eventsApi = {
  list: (seasonId, all) => {
    const params = {}
    if (seasonId) params.season_id = seasonId
    if (all) {
      params.all = '1'
      params._t = Date.now() // 管理端强制刷新，绕过缓存
    }
    return request(`${BASE}/events`, params)
  },
}

export const statsApi = {
  get: () => request(`${BASE}/stats`),
}

export const pikaApi = {
  list: () => request(`${BASE}/pika-monthlies`),
  getFateFlowerSkills: (petUid) => request(`${BASE}/pika-monthlies/fate-flower-skills/${petUid}`),
}

export const settingsApi = {
  getPublic: () => request(`${BASE}/admin/settings/public`),
}

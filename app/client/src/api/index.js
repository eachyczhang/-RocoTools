const BASE = '/api'
const MAX_RETRIES = 2
const RETRY_DELAY = 500
const REQUEST_TIMEOUT = 20000 // 20s timeout for user-facing API

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
  list: () => request(`${BASE}/elements`),
  get: (id) => request(`${BASE}/elements/${id}`),
  multipliers: () => request(`${BASE}/elements/multipliers`),
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
  shiny: () => request(`${BASE}/pets/shiny`),
  coverage: (elements) => request(`${BASE}/pets/coverage`, { elements: elements.join(',') }),
  counterPicks: (uid, nature) => request(`${BASE}/pets/counter-picks/${uid}`, nature ? { nature } : {}),
}

export const naturesApi = {
  list: () => request(`${BASE}/natures`),
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

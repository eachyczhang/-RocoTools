const BASE = '/api'
const MAX_RETRIES = 2
const RETRY_DELAY = 500

async function request(path, params, retries = MAX_RETRIES) {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API Error: ${res.status}`)
    return res.json()
  } catch (err) {
    if (retries > 0 && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      await new Promise(r => setTimeout(r, RETRY_DELAY))
      return request(path, params, retries - 1)
    }
    throw err
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
}

export const naturesApi = {
  list: () => request(`${BASE}/natures`),
}

export const seasonsApi = {
  list: () => request(`${BASE}/seasons`),
  current: () => request(`${BASE}/seasons/current`),
}

export const eventsApi = {
  list: (seasonId) => request(`${BASE}/events`, seasonId ? { season_id: seasonId } : {}),
}

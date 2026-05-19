const BASE = '/api'

async function request(path, params) {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
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
}

const BASE = '/api/admin'

function getToken() {
  return localStorage.getItem('admin_token')
}

export function setToken(token) {
  localStorage.setItem('admin_token', token)
}

export function clearToken() {
  localStorage.removeItem('admin_token')
}

export function isLoggedIn() {
  return !!getToken()
}

async function adminRequest(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    throw new Error('未登录或 token 已过期')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `请求失败: ${res.status}`)
  }
  return res.json()
}

export const adminApi = {
  // 登录
  login: (password) => adminRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),

  // 表结构
  tables: () => adminRequest('/tables'),

  // CRUD
  list: (table, params) => {
    const query = new URLSearchParams(params).toString()
    return adminRequest(`/data/${table}?${query}`)
  },
  get: (table, id) => adminRequest(`/data/${table}/${id}`),
  update: (table, id, data) => adminRequest(`/data/${table}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  create: (table, data) => adminRequest(`/data/${table}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (table, id) => adminRequest(`/data/${table}/${id}`, {
    method: 'DELETE',
  }),

  // 图片上传
  upload: (file, type, uid) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    form.append('uid', uid)
    return adminRequest('/upload', { method: 'POST', body: form })
  },

  // 备份
  backups: () => adminRequest('/backups'),
  backup: () => adminRequest('/backup', { method: 'POST' }),
  backupSeason: (label, note) => adminRequest('/backup/season', {
    method: 'POST', body: JSON.stringify({ label, note }),
  }),
  restore: (name, type, save_current, save_label) => adminRequest('/restore', {
    method: 'POST', body: JSON.stringify({ name, type, save_current, save_label }),
  }),
  deleteBackup: (name) => adminRequest(`/backups/${name}`, { method: 'DELETE' }),
  deleteSnapshot: (name) => adminRequest(`/backups/snapshots/${name}`, { method: 'DELETE' }),
  deleteSeasonBackup: (name, confirm_token) => adminRequest(`/backups/season/${name}`, {
    method: 'DELETE', body: JSON.stringify({ confirm_token }),
  }),
}

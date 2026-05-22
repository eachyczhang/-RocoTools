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
  const token = getToken()
  if (!token) return false
  // 检查 JWT 是否过期
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearToken()
      return false
    }
    return true
  } catch {
    clearToken()
    return false
  }
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
  
  // 皮卡月刊专用接口
  createPikaMonthly: (data) => adminRequest('/pika-monthlies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePikaMonthly: (id, data) => adminRequest(`/pika-monthlies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePikaMonthly: (id) => adminRequest(`/pika-monthlies/${id}`, {
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

  // 数据审查
  conflicts: () => adminRequest('/conflicts'),
  acceptConflict: (index) => adminRequest(`/conflicts/${index}/accept`, { method: 'POST' }),
  rejectConflict: (index) => adminRequest(`/conflicts/${index}/reject`, { method: 'POST' }),
  acceptAllConflicts: () => adminRequest('/conflicts/accept-all', { method: 'POST' }),
  rejectAllConflicts: () => adminRequest('/conflicts/reject-all', { method: 'POST' }),

  // 批量更新
  batchUpdate: (table, updates) => adminRequest(`/data/${table}/batch`, {
    method: 'POST',
    body: JSON.stringify({ updates }),
  }),

  // 导航标签管理
  navTabs: () => adminRequest('/nav-tabs'),
  updateNavTab: (id, data) => adminRequest(`/nav-tabs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  createNavTab: (data) => adminRequest('/nav-tabs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteNavTab: (id) => adminRequest(`/nav-tabs/${id}`, {
    method: 'DELETE',
  }),
  saveNavTabDefaults: () => adminRequest('/nav-tabs/save-defaults', {
    method: 'POST',
  }),

  // 素材库
  libraryList: () => adminRequest('/library'),
  libraryUpload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return adminRequest('/library/upload', { method: 'POST', body: form })
  },
  libraryDelete: (filename) => adminRequest(`/library/${filename}`, { method: 'DELETE' }),

  // 统一素材管理
  mediaList: () => adminRequest('/media'),
  mediaDelete: (filePath) => adminRequest('/media', {
    method: 'DELETE',
    body: JSON.stringify({ path: filePath }),
  }),
  mediaCopyToBusiness: (source, type, uid) => adminRequest('/media/copy-to-business', {
    method: 'POST',
    body: JSON.stringify({ source, type, uid }),
  }),
}

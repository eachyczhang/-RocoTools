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

const REQUEST_TIMEOUT = 30000 // 30s default timeout for API requests

async function adminRequest(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // Setup AbortController for timeout (skip if caller already provides signal)
  let controller = null
  let timer = null
  if (!options.signal) {
    controller = new AbortController()
    timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || (controller ? controller.signal : undefined),
    })
    if (res.status === 401) {
      clearToken()
      throw new Error('未登录或 token 已过期')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error || `请求失败: ${res.status}`)
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试')
    }
    throw err
  } finally {
    if (timer) clearTimeout(timer)
  }
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
  libraryList: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return adminRequest('/library' + (query ? '?' + query : ''))
  },
  libraryUpload: (file, folder, signal) => {
    const form = new FormData()
    form.append('file', file)
    if (folder) form.append('folder', folder)
    return adminRequest('/library/upload', { method: 'POST', body: form, signal })
  },
  libraryDelete: (filename) => adminRequest(`/library/${filename}`, { method: 'DELETE' }),

  // 统一素材管理
  mediaList: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return adminRequest('/media' + (query ? '?' + query : ''))
  },
  mediaDelete: (filePath) => adminRequest('/media', {
    method: 'DELETE',
    body: JSON.stringify({ path: filePath }),
  }),
  mediaCopyToBusiness: (source, type, uid) => adminRequest('/media/copy-to-business', {
    method: 'POST',
    body: JSON.stringify({ source, type, uid }),
  }),

  // 蛋组精灵管理（路由在 /api/eggs 下，但需要 admin token）
  addPetToEggGroup: (groupId, petUid) => {
    const token = getToken()
    return fetch(`/api/eggs/${groupId}/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pet_uid: petUid }),
    }).then(async res => {
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed') }
      return res.json()
    })
  },
  removePetFromEggGroup: (groupId, petId) => {
    const token = getToken()
    return fetch(`/api/eggs/${groupId}/pets/${petId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed') }
      return res.json()
    })
  },

  // 导出 Excel
  exportExcel: () => {
    const token = getToken()
    return fetch(`${BASE}/export-excel`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(async res => {
      if (res.status === 401) { clearToken(); throw new Error('未登录或 token 已过期') }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Export failed') }
      return res.blob()
    })
  },

  // 特性聚合（智能提示）
  abilities: () => adminRequest('/abilities'),

  // 精灵技能管理
  getPetSkills: (uid) => adminRequest(`/pet-skills/${uid}`),
  savePetSkills: (uid, data) => adminRequest(`/pet-skills/${uid}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  searchSkills: (q) => adminRequest(`/skills-search?q=${encodeURIComponent(q)}`),
  getNextSkillUid: () => adminRequest('/skills-next-uid'),

  // 精灵蛋组管理
  getPetEggGroups: (uid) => adminRequest(`/pet-egg-groups/${uid}`),
  savePetEggGroups: (uid, eggGroupIds) => adminRequest(`/pet-egg-groups/${uid}`, {
    method: 'PUT',
    body: JSON.stringify({ egg_group_ids: eggGroupIds }),
  }),

  // 素材库目录管理
  libraryDirectories: () => adminRequest('/library/directories'),
  createLibraryDirectory: (dirPath) => adminRequest('/library/directories', {
    method: 'POST',
    body: JSON.stringify({ path: dirPath }),
  }),
  renameLibraryDirectory: (oldPath, newName) => adminRequest('/library/directories', {
    method: 'PUT',
    body: JSON.stringify({ oldPath, newName }),
  }),
  deleteLibraryDirectory: (dirPath) => adminRequest('/library/directories/delete', {
    method: 'POST',
    body: JSON.stringify({ path: dirPath }),
  }),

  // 素材库批量重命名
  batchRenameFiles: (operations) => adminRequest('/library/batch-rename', {
    method: 'POST',
    body: JSON.stringify({ operations }),
  }),
}

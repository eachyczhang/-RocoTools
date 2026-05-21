<template>
  <div>
    <!-- 未登录：登录表单 -->
    <div v-if="!loggedIn" class="max-w-sm mx-auto mt-20">
      <h1 class="font-roco text-2xl text-primary-500 mb-6 text-center">管理后台</h1>
      <div class="card">
        <input v-model="password" type="password" placeholder="管理员密码" class="input w-full mb-3"
          @keyup.enter="handleLogin" />
        <button @click="handleLogin" class="btn w-full" :disabled="logging">
          {{ logging ? '登录中...' : '登录' }}
        </button>
        <p v-if="loginError" class="text-red-500 text-xs mt-2">{{ loginError }}</p>
      </div>
    </div>

    <!-- 已登录：管理面板 -->
    <div v-else>
      <div class="flex items-center justify-between mb-4">
        <h1 class="font-roco text-xl md:text-2xl text-primary-500">数据管理</h1>
        <button @click="handleLogout" class="text-xs text-muted hover:text-red-500">退出登录</button>
      </div>

      <!-- Tab 切换 -->
      <div class="flex items-center gap-1.5 mb-4 overflow-x-auto">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeTab === tab.key
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          {{ tab.label }}
        </button>
        <button @click="activeTab = 'upload'"
          class="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeTab === 'upload'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          图片上传
        </button>
        <button @click="activeTab = 'backup'"
          class="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeTab === 'backup'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          备份管理
        </button>
      </div>

      <!-- 数据表 CRUD -->
      <div v-if="activeTab !== 'upload' && activeTab !== 'backup'" class="card">
        <!-- 搜索 + 新增 -->
        <div class="flex items-center gap-2 mb-3">
          <input v-model="searchQuery" placeholder="搜索..." class="input flex-1" @input="debouncedSearch" />
          <button @click="showCreateModal = true" class="btn text-xs">+ 新增</button>
        </div>

        <!-- 表格 -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs md:text-sm">
            <thead>
              <tr class="border-b dark:border-white/10">
                <th v-for="col in displayColumns" :key="col" class="text-left py-2 px-2 font-medium text-muted">{{ col }}</th>
                <th class="text-right py-2 px-2 font-medium text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row[currentPK]"
                class="border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                <td v-for="col in displayColumns" :key="col" class="py-2 px-2 max-w-[200px] truncate">
                  {{ row[col] }}
                </td>
                <td class="py-2 px-2 text-right whitespace-nowrap">
                  <button @click="editRow(row)" class="text-primary-500 hover:underline mr-2">编辑</button>
                  <button @click="deleteRow(row)" class="text-red-500 hover:underline">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="flex justify-center items-center gap-3 mt-4" v-if="total > pageSize">
          <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost text-xs">← 上一页</button>
          <span class="text-xs text-muted">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
          <button @click="page < Math.ceil(total / pageSize) && (page++, fetchData())"
            :disabled="page >= Math.ceil(total / pageSize)" class="btn-ghost text-xs">下一页 →</button>
        </div>
      </div>

      <!-- 图片上传 -->
      <div v-if="activeTab === 'upload'" class="card">
        <h2 class="font-roco text-base text-primary-500 mb-3">图片上传</h2>
        <div class="space-y-3">
          <select v-model="uploadType" class="select w-full">
            <option value="">选择图片类型</option>
            <option value="pet_default">精灵立绘</option>
            <option value="pet_shiny">异色立绘</option>
            <option value="pet_fruit">果实图片</option>
            <option value="pet_egg">精灵蛋</option>
            <option value="pet_thumb">缩略图</option>
            <option value="skill_icon">技能图标</option>
            <option value="element_icon">属性图标</option>
          </select>
          <input v-model="uploadUid" placeholder="UID（如 pet_001）" class="input w-full" />
          <input type="file" ref="fileInput" accept="image/*" class="text-sm" />
          <button @click="handleUpload" class="btn" :disabled="uploading">
            {{ uploading ? '上传中...' : '上传' }}
          </button>
          <p v-if="uploadResult" class="text-xs text-green-600">{{ uploadResult }}</p>
          <p v-if="uploadError" class="text-xs text-red-500">{{ uploadError }}</p>
        </div>
      </div>

      <!-- 备份管理 -->
      <div v-if="activeTab === 'backup'" class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-roco text-base text-primary-500">备份管理</h2>
          <button @click="createBackup" class="btn text-xs" :disabled="backingUp">
            {{ backingUp ? '备份中...' : '创建备份' }}
          </button>
        </div>
        <div v-if="backups.length === 0" class="text-muted text-sm">暂无备份</div>
        <div v-else class="space-y-2">
          <div v-for="b in backups" :key="b.name"
            class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/5">
            <div>
              <div class="text-sm font-medium">{{ b.name }}</div>
              <div class="text-xs text-muted">{{ formatSize(b.size) }} · {{ formatTime(b.time) }}</div>
            </div>
            <div class="flex gap-2">
              <button @click="restoreBackup(b.name)" class="text-xs text-primary-500 hover:underline">恢复</button>
              <button @click="deleteBackup(b.name)" class="text-xs text-red-500 hover:underline">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑/新增 Modal -->
      <div v-if="showEditModal || showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto">
          <h3 class="font-roco text-lg text-primary-500 mb-4">{{ showCreateModal ? '新增记录' : '编辑记录' }}</h3>
          <div class="space-y-3">
            <div v-if="showCreateModal">
              <label class="text-xs text-muted">{{ currentPK }}</label>
              <input v-model="editData[currentPK]" class="input w-full" />
            </div>
            <div v-for="field in currentFields" :key="field">
              <label class="text-xs text-muted">{{ field }}</label>
              <textarea v-if="field.includes('desc') || field.includes('chain') || field.includes('against') || field.includes('weak') || field.includes('resist')"
                v-model="editData[field]" class="input w-full h-20 resize-y" />
              <input v-else v-model="editData[field]" class="input w-full" />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button @click="closeModal" class="btn-ghost text-sm">取消</button>
            <button @click="saveRecord" class="btn text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi, setToken, clearToken, isLoggedIn } from '@/api/admin'

// 登录状态
const loggedIn = ref(isLoggedIn())
const password = ref('')
const logging = ref(false)
const loginError = ref('')

async function handleLogin() {
  logging.value = true
  loginError.value = ''
  try {
    const { token } = await adminApi.login(password.value)
    setToken(token)
    loggedIn.value = true
    password.value = ''
    loadTables()
  } catch (err) {
    loginError.value = err.message
  } finally {
    logging.value = false
  }
}

function handleLogout() {
  clearToken()
  loggedIn.value = false
}

// 表管理
const tabs = ref([])
const activeTab = ref('')
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 50
const searchQuery = ref('')

const currentConfig = computed(() => tabs.value.find(t => t.key === activeTab.value))
const currentPK = computed(() => currentConfig.value?.primaryKey || 'id')
const currentFields = computed(() => currentConfig.value?.editableFields || [])
const displayColumns = computed(() => {
  if (!currentConfig.value) return []
  return [currentConfig.value.primaryKey, ...currentConfig.value.editableFields.slice(0, 5)]
})

let debounceTimer = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

async function loadTables() {
  try {
    const { tables } = await adminApi.tables()
    tabs.value = tables
    if (tables.length) {
      activeTab.value = tables[0].key
      fetchData()
    }
  } catch (err) {
    if (err.message.includes('未登录')) handleLogout()
  }
}

async function fetchData() {
  if (!activeTab.value || activeTab.value === 'upload' || activeTab.value === 'backup') return
  try {
    const res = await adminApi.list(activeTab.value, { page: page.value, limit: pageSize, search: searchQuery.value })
    rows.value = res.rows
    total.value = res.total
  } catch (err) {
    if (err.message.includes('未登录')) handleLogout()
  }
}

// 切换 tab 时重新加载
import { watch } from 'vue'
watch(activeTab, (val) => {
  if (val !== 'upload' && val !== 'backup') {
    page.value = 1
    searchQuery.value = ''
    fetchData()
  } else if (val === 'backup') {
    loadBackups()
  }
})

// 编辑/新增
const showEditModal = ref(false)
const showCreateModal = ref(false)
const editData = ref({})

function editRow(row) {
  editData.value = { ...row }
  showEditModal.value = true
}

function closeModal() {
  showEditModal.value = false
  showCreateModal.value = false
  editData.value = {}
}

async function saveRecord() {
  try {
    if (showCreateModal.value) {
      await adminApi.create(activeTab.value, editData.value)
    } else {
      const id = editData.value[currentPK.value]
      await adminApi.update(activeTab.value, id, editData.value)
    }
    closeModal()
    fetchData()
  } catch (err) {
    alert(err.message)
  }
}

async function deleteRow(row) {
  if (!confirm(`确定删除 ${row[currentPK.value]} ?`)) return
  try {
    await adminApi.delete(activeTab.value, row[currentPK.value])
    fetchData()
  } catch (err) {
    alert(err.message)
  }
}

// 图片上传
const uploadType = ref('')
const uploadUid = ref('')
const fileInput = ref(null)
const uploading = ref(false)
const uploadResult = ref('')
const uploadError = ref('')

async function handleUpload() {
  uploadResult.value = ''
  uploadError.value = ''
  const file = fileInput.value?.files?.[0]
  if (!file) return (uploadError.value = '请选择文件')
  if (!uploadType.value) return (uploadError.value = '请选择图片类型')
  if (!uploadUid.value) return (uploadError.value = '请输入 UID')

  uploading.value = true
  try {
    const res = await adminApi.upload(file, uploadType.value, uploadUid.value)
    uploadResult.value = `上传成功: ${res.path}`
  } catch (err) {
    uploadError.value = err.message
  } finally {
    uploading.value = false
  }
}

// 备份
const backups = ref([])
const backingUp = ref(false)

async function loadBackups() {
  try {
    const res = await adminApi.backups()
    backups.value = res.backups
  } catch (err) {
    if (err.message.includes('未登录')) handleLogout()
  }
}

async function createBackup() {
  backingUp.value = true
  try {
    await adminApi.backup()
    loadBackups()
  } catch (err) {
    alert(err.message)
  } finally {
    backingUp.value = false
  }
}

async function restoreBackup(name) {
  if (!confirm(`确定恢复到 ${name}？当前数据会自动备份`)) return
  try {
    const res = await adminApi.restore(name)
    alert(res.message)
    loadBackups()
  } catch (err) {
    alert(err.message)
  }
}

async function deleteBackup(name) {
  if (!confirm(`确定删除备份 ${name}？`)) return
  try {
    await adminApi.deleteBackup(name)
    loadBackups()
  } catch (err) {
    alert(err.message)
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

function formatTime(ms) {
  return new Date(ms).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  if (loggedIn.value) loadTables()
})
</script>

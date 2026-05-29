<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">用户反馈</h1>
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Cooldown Config -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-muted">冷却</span>
          <input v-model.number="cooldownSeconds" type="number" min="0" max="3600" step="10"
            class="input w-16 text-xs text-center py-1" />
          <span class="text-xs text-muted">秒</span>
          <button @click="saveCooldown" class="text-xs text-primary-500 hover:underline"
            :disabled="cooldownSeconds === savedCooldown">保存</button>
        </div>
        <!-- Feature Toggle -->
        <label class="flex items-center gap-2 cursor-pointer">
          <span class="text-xs text-muted">{{ feedbackEnabled ? '已开启' : '已关闭' }}</span>
          <button @click="toggleEnabled"
            class="relative w-10 h-5 rounded-full transition-colors duration-200"
            :class="feedbackEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              :class="feedbackEnabled ? 'translate-x-5' : ''"></span>
          </button>
        </label>
        <span class="text-xs text-muted">共 {{ total }} 条</span>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="flex gap-1 mb-4 overflow-x-auto pb-1">
      <button v-for="tab in statusTabs" :key="tab.value"
        @click="currentStatus = tab.value; loadList()"
        class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
        :class="currentStatus === tab.value
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-white/5 text-muted hover:bg-gray-200 dark:hover:bg-white/10'">
        {{ tab.label }}({{ tab.count }})
      </button>
    </div>

    <!-- Type Filter -->
    <div class="flex gap-2 mb-4">
      <select v-model="currentType" @change="loadList()" class="input text-xs py-1.5">
        <option value="all">全部类型</option>
        <option value="bug">🐛 Bug</option>
        <option value="suggestion">💡 建议</option>
        <option value="other">📝 其他</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-8 text-muted text-sm">加载中...</div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="text-center py-12 text-muted">
      <div class="text-3xl mb-2">📭</div>
      <p class="text-sm">暂无反馈</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div v-for="item in items" :key="item.id"
        class="card cursor-pointer transition-all hover:shadow-md"
        @click="toggleExpand(item.id)">
        <!-- Summary Row -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="text-sm">{{ typeIcon(item.type) }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded font-medium"
                :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
              <span class="text-xs text-muted">{{ formatTime(item.created_at) }}</span>
            </div>
            <p class="text-sm truncate">{{ item.content }}</p>
            <div class="flex items-center gap-3 mt-1.5 text-xs text-muted">
              <span>📍 {{ item.page_url || '/' }}</span>
              <span>{{ deviceIcon(item.device_type) }} {{ item.device_type }}</span>
              <span v-if="item.screen_size">{{ item.screen_size }}</span>
              <span v-if="parseImages(item.images).length">📷 {{ parseImages(item.images).length }}张</span>
              <span v-if="item.contact">📧 {{ item.contact }}</span>
            </div>
          </div>
          <span class="text-xs text-muted flex-shrink-0">{{ expandedId === item.id ? '▲' : '▼' }}</span>
        </div>

        <!-- Expanded Detail -->
        <Transition name="expand">
          <div v-if="expandedId === item.id" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" @click.stop>
            <!-- Full content -->
            <div class="mb-4">
              <label class="text-xs text-muted mb-1 block">反馈内容</label>
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 text-sm whitespace-pre-wrap">{{ item.content }}</div>
            </div>

            <!-- Images -->
            <div v-if="parseImages(item.images).length" class="mb-4">
              <label class="text-xs text-muted mb-2 block">截图</label>
              <div class="flex gap-2 flex-wrap">
                <div v-for="(img, idx) in parseImages(item.images)" :key="idx"
                  class="w-[120px] h-[120px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                  @click.stop="previewImage(img)">
                  <img :src="getImageUrl(img)" class="w-full h-full object-cover" loading="lazy" />
                </div>
              </div>
            </div>

            <!-- Environment Info -->
            <div class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <label class="text-xs text-muted mb-2 block font-medium">环境信息</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div><span class="text-muted">页面：</span>{{ item.page_url }} {{ item.page_title ? `(${item.page_title})` : '' }}</div>
                <div><span class="text-muted">设备：</span>{{ deviceIcon(item.device_type) }} {{ item.device_type }} · {{ item.screen_size }}</div>
                <div class="sm:col-span-2"><span class="text-muted">UA：</span><span class="break-all">{{ item.user_agent }}</span></div>
                <div><span class="text-muted">IP：</span>{{ item.ip }}</div>
                <div><span class="text-muted">暗色模式：</span>{{ item.dark_mode ? '是' : '否' }}</div>
                <div v-if="item.contact"><span class="text-muted">联系方式：</span>{{ item.contact }}</div>
              </div>
            </div>

            <!-- Admin Actions -->
            <div class="space-y-3">
              <!-- Status change -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-muted">状态：</span>
                <button v-for="s in allStatuses" :key="s.value"
                  @click.stop="updateStatus(item, s.value)"
                  class="px-2 py-1 rounded text-xs font-medium transition-colors"
                  :class="item.status === s.value
                    ? statusClass(s.value) + ' ring-1 ring-offset-1'
                    : 'bg-gray-100 dark:bg-white/5 text-muted hover:bg-gray-200 dark:hover:bg-white/10'">
                  {{ s.label }}
                </button>
              </div>

              <!-- Admin note -->
              <div>
                <label class="text-xs text-muted mb-1 block">管理员备注</label>
                <div class="flex gap-2">
                  <input v-model="item._note" class="input flex-1 text-sm" placeholder="添加备注..."
                    @click.stop />
                  <button @click.stop="saveNote(item)"
                    class="btn text-xs px-3"
                    :disabled="item._note === (item.admin_note || '')">
                    保存
                  </button>
                </div>
              </div>

              <!-- Delete -->
              <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button @click.stop="deleteFeedback(item)"
                  class="text-xs text-red-500 hover:text-red-600 hover:underline">
                  ⚠️ 删除此反馈
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
      <button @click="goPage(currentPage - 1)" :disabled="currentPage <= 1"
        class="btn text-xs px-3 disabled:opacity-30">上一页</button>
      <span class="text-xs text-muted">第 {{ currentPage }}/{{ totalPages }} 页</span>
      <button @click="goPage(currentPage + 1)" :disabled="currentPage >= totalPages"
        class="btn text-xs px-3 disabled:opacity-30">下一页</button>
    </div>

    <!-- Image Preview Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="previewVisible" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80"
          @click="previewVisible = false">
          <img :src="previewSrc" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'

const modal = useModal()

// ============================================================
// State
// ============================================================
const loading = ref(false)
const items = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10
const currentStatus = ref('all')
const currentType = ref('all')
const expandedId = ref(null)
const feedbackEnabled = ref(true)
const cooldownSeconds = ref(60)
const savedCooldown = ref(60)
const previewVisible = ref(false)
const previewSrc = ref('')

const statusCounts = reactive({ pending: 0, read: 0, resolved: 0, ignored: 0 })

const allStatuses = [
  { value: 'pending', label: '待处理' },
  { value: 'read', label: '已读' },
  { value: 'resolved', label: '已解决' },
  { value: 'ignored', label: '忽略' },
]

const statusTabs = computed(() => [
  { value: 'all', label: '全部', count: total.value },
  { value: 'pending', label: '待处理', count: statusCounts.pending },
  { value: 'read', label: '已读', count: statusCounts.read },
  { value: 'resolved', label: '已解决', count: statusCounts.resolved },
  { value: 'ignored', label: '已忽略', count: statusCounts.ignored },
])

const totalPages = computed(() => Math.ceil(total.value / pageSize))

// ============================================================
// Methods
// ============================================================
async function loadList() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      page_size: pageSize,
    })
    if (currentStatus.value !== 'all') params.set('status', currentStatus.value)
    if (currentType.value !== 'all') params.set('type', currentType.value)

    const res = await adminApi.request(`/feedbacks?${params}`)
    items.value = res.items.map(item => ({ ...item, _note: item.admin_note || '' }))
    total.value = res.total
    Object.assign(statusCounts, res.status_counts)
  } catch (err) {
    console.error('[Feedbacks] Load error:', err)
  } finally {
    loading.value = false
  }
}

async function loadSettings() {
  try {
    const settings = await adminApi.getSettings()
    const enabledSetting = settings.find(s => s.key === 'feedback_enabled')
    feedbackEnabled.value = !enabledSetting || enabledSetting.value !== '0'
    const cooldownSetting = settings.find(s => s.key === 'feedback_cooldown')
    if (cooldownSetting) {
      cooldownSeconds.value = parseInt(cooldownSetting.value) || 60
      savedCooldown.value = cooldownSeconds.value
    }
  } catch {}
}

async function saveCooldown() {
  try {
    await adminApi.updateSetting('feedback_cooldown', String(cooldownSeconds.value), '用户反馈提交冷却时间（秒）')
    savedCooldown.value = cooldownSeconds.value
  } catch (err) {
    await modal.alert('保存失败', err.message)
  }
}

async function toggleEnabled() {
  const newValue = feedbackEnabled.value ? '0' : '1'
  try {
    await adminApi.updateSetting('feedback_enabled', newValue, '用户反馈功能开关')
    feedbackEnabled.value = newValue === '1'
  } catch (err) {
    await modal.alert('操作失败', err.message)
  }
}

async function updateStatus(item, status) {
  if (item.status === status) return
  try {
    await adminApi.request(`/feedbacks/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    item.status = status
    // Update counts
    loadList()
  } catch (err) {
    await modal.alert('更新失败', err.message)
  }
}

async function saveNote(item) {
  try {
    await adminApi.request(`/feedbacks/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_note: item._note }),
    })
    item.admin_note = item._note
  } catch (err) {
    await modal.alert('保存失败', err.message)
  }
}

async function deleteFeedback(item) {
  const ok = await modal.danger('删除反馈', `确定删除这条反馈吗？关联的图片也会被删除。`)
  if (!ok) return
  try {
    await adminApi.request(`/feedbacks/${item.id}`, { method: 'DELETE' })
    loadList()
    expandedId.value = null
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  loadList()
}

function parseImages(imagesStr) {
  try { return JSON.parse(imagesStr || '[]') } catch { return [] }
}

function getImageUrl(relativePath) {
  return `/uploads/feedbacks/${relativePath}`
}

function previewImage(img) {
  previewSrc.value = getImageUrl(img)
  previewVisible.value = true
}

function typeIcon(type) {
  return { bug: '🐛', suggestion: '💡', other: '📝' }[type] || '📝'
}

function deviceIcon(type) {
  return { mobile: '📱', tablet: '📱', desktop: '🖥️' }[type] || '🖥️'
}

function statusLabel(status) {
  return { pending: '待处理', read: '已读', resolved: '已解决', ignored: '已忽略' }[status] || status
}

function statusClass(status) {
  return {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    read: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    ignored: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400',
  }[status] || ''
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN')
}

// ============================================================
// Lifecycle
// ============================================================
onMounted(() => {
  loadList()
  loadSettings()
})
</script>

<style scoped>
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 2000px;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>

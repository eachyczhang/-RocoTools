<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">活动管理</h1>

    <p class="text-xs sm:text-sm text-muted mb-4">管理当前赛季的活动日历数据</p>

    <!-- 当前赛季信息 -->
    <div v-if="currentSeason" class="card mb-4 !p-3">
      <span class="text-sm">当前赛季：<strong class="text-primary-500">{{ currentSeason.name }}</strong> ({{ currentSeason.id }})</span>
    </div>

    <!-- Tab 切换 -->
    <div class="card mb-4 !p-0">
      <div class="flex border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light dark:bg-surface-dark">
        <button v-for="tab in tabs" :key="tab.value"
          @click="activeTab = tab.value"
          class="flex-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.value
            ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white dark:bg-gray-800'
            : 'text-muted hover:text-foreground'">
          {{ tab.label }}
          <span class="ml-1 text-xs font-normal">({{ getCategoryCount(tab.value) }})</span>
        </button>
      </div>
      <div class="px-4 py-3">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-roco text-base text-primary-500">{{ tabs.find(t => t.value === activeTab)?.label }}</h2>
          <button @click="openAddModal" class="btn-primary text-sm">+ 新增活动</button>
        </div>

        <!-- 活动列表（支持拖拽排序） -->
        <div class="drag-hint text-xs text-muted mb-2">拖拽活动可调整排序</div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted text-xs bg-gray-50 dark:bg-white/3">
              <th class="py-2.5 px-3 w-8"></th>
              <th class="py-2.5 px-3">名称</th>
              <th class="py-2.5 px-3">详情</th>
              <th class="py-2.5 px-3">时间</th>
              <th class="py-2.5 px-3 w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(event, index) in filteredEvents"
              :key="event.id"
              class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent
              @drop="onDrop($event, index)"
            >
              <td class="py-2.5 px-3">
                <div class="drag-handle cursor-grab text-muted text-xl">⋮⋮</div>
              </td>
              <td class="py-2.5 px-3 font-medium">{{ event.name }}</td>
              <td class="py-2.5 px-3 text-xs">
                <template v-if="activeTab === 'mass_outbreak' && event.pet_name">
                  <div class="flex items-center gap-1">
                    <div 
                      v-if="event.pet_icon" 
                      class="w-8 h-8 rounded cursor-zoom-in hover:rounded-none transition-rounded flex items-center justify-center"
                      @click="openPreview(event.pet_icon)"
                    >
                      <img :src="event.pet_icon" class="w-5 h-5 rounded" />
                    </div>
                    <span>{{ event.pet_name }}</span>
                  </div>
                </template>
                <template v-else-if="activeTab === 'routine' && event.sub_type">
                  <span class="text-muted text-xs">{{ subTypeLabel(event.sub_type) }}</span>
                </template>
                <template v-else>-</template>
              </td>
              <td class="py-2.5 px-3 text-xs text-muted">
                <template v-if="activeTab !== 'routine'">{{ event.start_date }} ~ {{ event.end_date }}</template>
                <template v-else>{{ event.periods?.length || 0 }} 段</template>
              </td>
              <td class="py-2.5 px-3 flex gap-2">
                <button @click="openEdit(event)" class="text-xs text-primary-500 hover:underline">编辑</button>
                <button @click="deleteEvent(event)" class="text-xs text-red-500 hover:underline">删除</button>
              </td>
            </tr>
            <tr v-if="filteredEvents.length === 0">
              <td colspan="5" class="py-8 text-center text-muted text-sm">暂无活动数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeAdd">
      <div class="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">新增活动</h3>
          <button @click="closeAdd" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted">活动名称 <span class="text-red-500">*</span></label>
              <input v-model="form.name" class="input w-full" placeholder="如 呱呱上学记" />
            </div>
            <div>
              <label class="text-xs text-muted">类型 <span class="text-red-500">*</span></label>
              <select v-model="form.category" class="select w-full">
                <option value="version">版本活动</option>
                <option value="mass_outbreak">大量出没</option>
                <option value="routine">常驻课题</option>
              </select>
            </div>
          </div>

          <!-- 版本活动：单段日期 + 图片 -->
          <div v-if="form.category === 'version'" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
                <input v-model="form.start_date" type="date" class="input w-full" />
              </div>
              <div>
                <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
                <input v-model="form.end_date" type="date" class="input w-full" />
              </div>
            </div>
            <div>
              <label class="text-xs text-muted">活动图片（可选）</label>
              <div class="flex items-center gap-2">
                <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleFileSelect" />
                <button @click="$refs.fileInput.click()" class="btn text-xs">
                  {{ form.image ? '已选择' : '选择图片' }}
                </button>
                <span v-if="form.image" class="text-xs text-green-600 truncate max-w-[120px]">{{ form.imageName }}</span>
              </div>
              <img v-if="form.imagePreview" :src="form.imagePreview" class="mt-2 h-12 rounded" />
            </div>
          </div>

          <!-- 大量出没：日期 + 精灵选择 -->
          <div v-if="form.category === 'mass_outbreak'" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
                <input v-model="form.start_date" type="date" class="input w-full" />
              </div>
              <div>
                <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
                <input v-model="form.end_date" type="date" class="input w-full" />
              </div>
            </div>
            <div>
              <label class="text-xs text-muted">出没精灵 <span class="text-red-500">*</span></label>
              <PetPicker v-model="form.pet_uid" />
            </div>
          </div>

          <!-- 常驻课题：子类型 + 多段日期 -->
          <div v-if="form.category === 'routine'" class="space-y-3">
            <div>
              <label class="text-xs text-muted">课题类型 <span class="text-red-500">*</span></label>
              <select v-model="form.sub_type" class="select w-full">
                <option value="">请选择</option>
                <option v-for="st in ROUTINE_SUB_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted mb-2 block">时间段列表</label>
              <div v-for="(p, i) in form.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
                <input v-model="p.start" type="date" class="input flex-1" />
                <span class="text-muted text-sm">~</span>
                <input v-model="p.end" type="date" class="input flex-1" />
                <button @click="form.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
              </div>
              <button @click="form.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
            </div>
          </div>

          <!-- 版本活动：子类型选择 -->
          <div v-if="form.category === 'version'" class="space-y-3">
            <div>
              <label class="text-xs text-muted">活动类型</label>
              <select v-model="form.sub_type" class="select w-full">
                <option value="">不分类</option>
                <option v-for="st in VERSION_SUB_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <span v-if="addMsg" class="text-sm" :class="addMsgOk ? 'text-green-600' : 'text-red-500'">{{ addMsg }}</span>
          <div class="flex gap-2 ml-auto">
            <button @click="closeAdd" class="btn text-sm">取消</button>
            <button @click="createEvent" class="btn-primary text-sm" :disabled="saving">
              {{ saving ? '保存中...' : '添加' }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeEdit">
      <div class="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">编辑活动</h3>
          <button @click="closeEdit" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted">活动名称 <span class="text-red-500">*</span></label>
              <input v-model="editForm.name" class="input w-full" placeholder="如 呱呱上学记" />
            </div>
            <div>
              <label class="text-xs text-muted">类型 <span class="text-red-500">*</span></label>
              <select v-model="editForm.category" class="select w-full" @change="onEditCategoryChange">
                <option value="version">版本活动</option>
                <option value="mass_outbreak">大量出没</option>
                <option value="routine">常驻课题</option>
              </select>
            </div>
          </div>

          <!-- 版本活动：单段日期 -->
          <div v-if="editForm.category === 'version'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
              <input v-model="editForm.start_date" type="date" class="input w-full" />
            </div>
            <div>
              <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
              <input v-model="editForm.end_date" type="date" class="input w-full" />
            </div>
          </div>

          <!-- 大量出没：日期 + 精灵选择 -->
          <div v-if="editForm.category === 'mass_outbreak'" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-muted">开始日期 <span class="text-red-500">*</span></label>
                <input v-model="editForm.start_date" type="date" class="input w-full" />
              </div>
              <div>
                <label class="text-xs text-muted">结束日期 <span class="text-red-500">*</span></label>
                <input v-model="editForm.end_date" type="date" class="input w-full" />
              </div>
            </div>
            <div>
              <label class="text-xs text-muted">出没精灵 <span class="text-red-500">*</span></label>
              <PetPicker v-model="editForm.pet_uid" />
            </div>
          </div>

          <!-- 常驻课题：子类型 + 多段日期 -->
          <div v-if="editForm.category === 'routine'" class="space-y-3">
            <div>
              <label class="text-xs text-muted">课题类型 <span class="text-red-500">*</span></label>
              <select v-model="editForm.sub_type" class="select w-full">
                <option value="">请选择</option>
                <option v-for="st in ROUTINE_SUB_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted mb-2 block">时间段列表</label>
              <div v-for="(p, i) in editForm.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
                <input v-model="p.start" type="date" class="input flex-1" />
                <span class="text-muted text-sm">~</span>
                <input v-model="p.end" type="date" class="input flex-1" />
                <button @click="editForm.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
              </div>
              <button @click="editForm.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
            </div>
          </div>

          <!-- 版本活动子类型 -->
          <div v-if="editForm.category === 'version'" class="space-y-3">
            <div>
              <label class="text-xs text-muted">活动类型</label>
              <select v-model="editForm.sub_type" class="select w-full">
                <option value="">不分类</option>
                <option v-for="st in VERSION_SUB_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
              </select>
            </div>
          </div>

          <!-- 图片（仅版本活动） -->
          <div v-if="editForm.category === 'version'">
            <label class="text-xs text-muted">活动图片</label>
            <div v-if="editForm.image && !editForm.imageFile" class="mb-2">
              <img 
                :src="`/uploads/events/event_${editForm.id}.png`" 
                class="h-12 rounded cursor-zoom-in hover:rounded-none transition-rounded"
                @click="openPreview(`/uploads/events/event_${editForm.id}.png`)"
              />
            </div>
            <div class="flex items-center gap-2">
              <input type="file" ref="editFileInput" accept="image/*" class="hidden" @change="handleEditFileSelect" />
              <button @click="$refs.editFileInput.click()" class="btn text-xs">
                {{ editForm.imageFile ? '已选择新图片' : '更换图片' }}
              </button>
              <span v-if="editForm.imageFile" class="text-xs text-green-600 truncate max-w-[120px]">{{ editForm.imageName }}</span>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <span v-if="editMsg" class="text-sm" :class="editMsgOk ? 'text-green-600' : 'text-red-500'">{{ editMsg }}</span>
          <div class="flex gap-2 ml-auto">
            <button @click="closeEdit" class="btn text-sm">取消</button>
            <button @click="updateEvent" class="btn-primary text-sm" :disabled="editSaving">
              {{ editSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { adminApi } from '@/api/admin'
import { seasonsApi, eventsApi, petsApi } from '@/api'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'
import PetPicker from '@/components/shared/PetPicker.vue'

const modal = useModal()
const currentSeason = ref(null)
const activeTab = ref('all')
const saving = ref(false)
const msg = ref('')
const msgOk = ref(false)
const fileInput = ref(null)

const tabs = [
  { value: 'all', label: '全部活动' },
  { value: 'version', label: '版本活动' },
  { value: 'mass_outbreak', label: '大量出没' },
  { value: 'routine', label: '常驻课题' },
]

// 编辑弹窗状态
const showEditModal = ref(false)
const editSaving = ref(false)
const editMsg = ref('')
const editMsgOk = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  category: 'version',
  sub_type: '',
  start_date: '',
  end_date: '',
  pet_uid: '',
  image: '',
  imageName: '',
  imageFile: null,
  periodsArr: [],
})

// 新增弹窗状态
const showAddModal = ref(false)
const addMsg = ref('')
const addMsgOk = ref(false)
const form = ref({
  name: '',
  category: 'version',
  sub_type: '',
  start_date: '',
  end_date: '',
  image: null,
  imageName: '',
  imagePreview: '',
  imageFile: null,
  pet_uid: '',
  periodsArr: [{ start: '', end: '' }],
})

const SUB_TYPE_LABELS = {
  // 版本活动子类型
  main: '主推活动',
  territory: '领地试炼',
  hug: '精灵抱抱团',
  diary: '大世界观察日记',
  // 常驻课题子类型
  fate_flower: '命定花种',
  star_battle: '星光对决',
  pika_photo: '皮卡摄影委托',
  // 兼容旧数据
  starlight: '星光对决',
  destiny: '命定花种',
  pika: '皮卡摄影委托',
}

const VERSION_SUB_TYPES = [
  { value: 'main', label: '主推活动' },
  { value: 'territory', label: '领地试炼' },
  { value: 'hug', label: '精灵抱抱团' },
  { value: 'diary', label: '大世界观察日记' },
]

const ROUTINE_SUB_TYPES = [
  { value: 'fate_flower', label: '命定花种' },
  { value: 'star_battle', label: '星光对决' },
  { value: 'pika_photo', label: '皮卡摄影委托' },
]

const { openPreview } = useImagePreview()

// 按 Tab 过滤后的活动列表（双向绑定用）
const events = ref([])
const filteredEvents = computed({
  get: () => {
    if (activeTab.value === 'all') return events.value
    return events.value.filter(e => e.category === activeTab.value)
  },
  set: (val) => {
    // 拖拽时会触发 set，但我们需要更新原始 events
    if (activeTab.value === 'all') {
      events.value = val
    } else {
      // 找到原始数组中对应分类的元素，按新顺序重排
      const otherCategories = events.value.filter(e => e.category !== activeTab.value)
      const reordered = val
      events.value = [...otherCategories, ...reordered]
    }
  },
})

// 拖拽状态
const draggedIndex = ref(-1)

function onDragStart(event, index) {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', '') // 需要设置数据才能拖拽
}

function onDrop(event, targetIndex) {
  if (draggedIndex.value === -1 || draggedIndex.value === targetIndex) {
    draggedIndex.value = -1
    return
  }

  // 只在 all tab 时允许拖拽排序
  if (activeTab.value !== 'all') {
    draggedIndex.value = -1
    return
  }

  const newEvents = [...events.value]
  const [dragged] = newEvents.splice(draggedIndex.value, 1)
  newEvents.splice(targetIndex, 0, dragged)
  events.value = newEvents

  draggedIndex.value = -1
  saveOrder()
}

function getCategoryCount(cat) {
  if (cat === 'all') return events.value.length
  return events.value.filter(e => e.category === cat).length
}

function subTypeLabel(st) { return SUB_TYPE_LABELS[st] || st }

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.imageFile = file
  form.value.imageName = file.name
  // 释放旧的 ObjectURL 防止内存泄漏
  if (form.value.imagePreview && form.value.imagePreview.startsWith('blob:')) {
    URL.revokeObjectURL(form.value.imagePreview)
  }
  form.value.imagePreview = URL.createObjectURL(file)
  form.value.image = true
}

async function uploadEventImage(eventId) {
  if (!form.value.imageFile) return ''
  const res = await adminApi.upload(form.value.imageFile, 'event_image', `event_${eventId}`)
  return res.path || ''
}

async function loadEvents() {
  if (!currentSeason.value) return
  try {
    const res = await eventsApi.list(currentSeason.value.id, true)
    events.value = res.events || []
  } catch (err) {
    console.error('加载活动失败:', err)
  }
}

function validateForm(f) {
  if (!f.name?.trim()) return '请填写活动名称'
  if (f.category === 'version' || f.category === 'mass_outbreak') {
    if (!f.start_date || !f.end_date) return '请填写开始日期和结束日期'
    if (f.start_date > f.end_date) return '开始日期不能晚于结束日期'
  }
  if (f.category === 'mass_outbreak' && !f.pet_uid) return '请选择出没精灵'
  if (f.category === 'routine') {
    if (!f.sub_type) return '请选择课题类型'
    const validPeriods = (f.periodsArr || []).filter(p => p.start && p.end)
    if (validPeriods.length === 0) return '请至少添加一个有效的时间段'
  }
  return null
}

// 根据 pet_uid 解析精灵名称和图标
async function resolvePetInfo(uid) {
  if (!uid) return { pet_name: '', pet_icon: '' }
  try {
    const pet = await petsApi.get(uid)
    return {
      pet_name: pet.name || '',
      pet_icon: pet.thumb_url || pet.image_url || '',
    }
  } catch {
    return { pet_name: '', pet_icon: '' }
  }
}

// 拖拽排序保存
async function saveOrder() {
  const newOrder = events.value.map((e, i) => ({ id: e.id, row_order: i }))
  try {
    await adminApi.batchUpdate('season_events', newOrder)
  } catch (err) {
    console.error('保存排序失败:', err)
  }
}

async function openAddModal() {
  addMsg.value = ''
  addMsgOk.value = false
  form.value = {
    name: '',
    category: activeTab.value === 'all' ? 'version' : activeTab.value,
    sub_type: '',
    start_date: '',
    end_date: '',
    image: null,
    imageName: '',
    imagePreview: '',
    imageFile: null,
    pet_uid: '',
    periodsArr: [{ start: '', end: '' }],
  }
  showAddModal.value = true
}

function closeAdd() {
  showAddModal.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function createEvent() {
  const err = validateForm(form.value)
  if (err) {
    addMsg.value = err
    addMsgOk.value = false
    return
  }
  if (!currentSeason.value) {
    addMsg.value = '当前赛季信息缺失'
    addMsgOk.value = false
    return
  }

  saving.value = true
  const data = {
    season_id: currentSeason.value.id,
    category: form.value.category,
    name: form.value.name,
    sub_type: form.value.sub_type || '',
    pet_uid: form.value.category === 'mass_outbreak' ? form.value.pet_uid : '',
    row_order: events.value.length, // 新增放最后
    start_date: (form.value.category === 'version' || form.value.category === 'mass_outbreak') ? form.value.start_date : '',
    end_date: (form.value.category === 'version' || form.value.category === 'mass_outbreak') ? form.value.end_date : '',
    periods: form.value.category === 'routine'
      ? JSON.stringify(form.value.periodsArr.filter(p => p.start && p.end))
      : '[]',
    image: '',
  }

  // 大量出没：解析精灵名称和图标
  if (form.value.category === 'mass_outbreak' && form.value.pet_uid) {
    const { pet_name, pet_icon } = await resolvePetInfo(form.value.pet_uid)
    data.pet_name = pet_name
    data.pet_icon = pet_icon
  }

  try {
    const res = await adminApi.create('season_events', data)
    const newId = res.id || res.lastInsertRowid

    if (form.value.imageFile && newId && form.value.category === 'version') {
      const imgPath = await uploadEventImage(newId)
      if (imgPath) {
        await adminApi.update('season_events', newId, { image: imgPath })
      }
    }

    closeAdd()
    await loadEvents()
    addMsg.value = '活动添加成功'
    addMsgOk.value = true
    setTimeout(() => { addMsg.value = '' }, 3000)
  } catch (err) {
    addMsg.value = '创建失败: ' + (err.message || '未知错误')
    addMsgOk.value = false
  }
  saving.value = false
}

async function deleteEvent(event) {
  const confirmed = await modal.danger('删除活动', `确认删除「${event.name}」？`)
  if (!confirmed) return
  try {
    await adminApi.delete('season_events', event.id)
    await loadEvents()
    msg.value = `「${event.name}」已删除`
    msgOk.value = true
    setTimeout(() => { msg.value = '' }, 3000)
  } catch (err) {
    msg.value = '删除失败: ' + (err.message || '未知错误')
    msgOk.value = false
  }
}

// ===== 编辑功能 =====
function onEditCategoryChange() {
  if (editForm.category === 'routine' && !editForm.periodsArr.length) {
    editForm.periodsArr = [{ start: '', end: '' }]
  }
  if (editForm.category !== 'mass_outbreak') editForm.pet_uid = ''
  if (editForm.category !== 'routine') editForm.sub_type = ''
}

function handleEditFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  editForm.imageFile = file
  editForm.imageName = file.name
}

async function openEdit(event) {
  editMsg.value = ''
  editMsgOk.value = false
  editForm.id = event.id
  editForm.name = event.name
  editForm.category = event.category
  editForm.sub_type = event.sub_type || ''
  editForm.start_date = event.start_date || ''
  editForm.end_date = event.end_date || ''
  editForm.pet_uid = event.pet_uid || ''
  editForm.image = event.image || ''
  editForm.imageFile = null
  editForm.imageName = ''
  try {
    const periods = typeof event.periods === 'string' ? JSON.parse(event.periods) : (event.periods || [])
    editForm.periodsArr = periods.length ? periods : [{ start: '', end: '' }]
  } catch {
    editForm.periodsArr = [{ start: '', end: '' }]
  }
  // 使用 nextTick 确保 category 设置后 DOM 更新，v-if 条件满足时再打开弹窗
  await nextTick()
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editForm.id = null
}

async function updateEvent() {
  const err = validateForm(editForm)
  if (err) {
    editMsg.value = err
    editMsgOk.value = false
    return
  }

  editSaving.value = true
  try {
    const data = {
      name: editForm.name,
      category: editForm.category,
      sub_type: editForm.sub_type || '',
      pet_uid: editForm.category === 'mass_outbreak' ? editForm.pet_uid : '',
      start_date: (editForm.category === 'version' || editForm.category === 'mass_outbreak') ? editForm.start_date : '',
      end_date: (editForm.category === 'version' || editForm.category === 'mass_outbreak') ? editForm.end_date : '',
      periods: editForm.category === 'routine'
        ? JSON.stringify(editForm.periodsArr.filter(p => p.start && p.end))
        : '[]',
    }

    // 大量出没：解析精灵名称和图标
    if (editForm.category === 'mass_outbreak' && editForm.pet_uid) {
      const { pet_name, pet_icon } = await resolvePetInfo(editForm.pet_uid)
      data.pet_name = pet_name
      data.pet_icon = pet_icon
    } else {
      data.pet_name = ''
      data.pet_icon = ''
    }

    await adminApi.update('season_events', editForm.id, data)

    if (editForm.imageFile && editForm.category === 'version') {
      const res = await adminApi.upload(editForm.imageFile, 'event_image', `event_${editForm.id}`)
      if (res.path) {
        await adminApi.update('season_events', editForm.id, { image: res.path })
      }
    }

    editMsg.value = '保存成功'
    editMsgOk.value = true
    await loadEvents()
    setTimeout(() => closeEdit(), 600)
  } catch (err) {
    editMsg.value = '保存失败: ' + (err.message || '未知错误')
    editMsgOk.value = false
  }
  editSaving.value = false
}

onMounted(async () => {
  const res = await seasonsApi.current()
  if (res.season) {
    currentSeason.value = res.season
    await loadEvents()
  }
})
</script>

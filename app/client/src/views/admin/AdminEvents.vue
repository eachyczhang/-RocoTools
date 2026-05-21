<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">活动管理</h1>

    <p class="text-xs sm:text-sm text-muted mb-4">管理当前赛季的活动日历数据（仅展示当前赛季活动）</p>

    <!-- 当前赛季信息 -->
    <div v-if="currentSeason" class="card mb-4 !p-3">
      <span class="text-sm">当前赛季：<strong class="text-primary-500">{{ currentSeason.name }}</strong> ({{ currentSeason.id }})</span>
    </div>

    <!-- 新增活动 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">新增活动</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs text-muted">活动名称 <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input w-full" placeholder="如 呱呱上学记" />
        </div>
        <div>
          <label class="text-xs text-muted">类型 <span class="text-red-500">*</span></label>
          <select v-model="form.category" class="select w-full">
            <option value="version">版本活动</option>
            <option value="routine">常驻课题</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-muted">排序</label>
          <input v-model.number="form.row_order" type="number" class="input w-full" placeholder="数字越小越靠上" />
        </div>
      </div>

      <!-- 版本活动：单段日期 -->
      <div v-if="form.category === 'version'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs text-muted">开始日期</label>
          <input v-model="form.start_date" type="date" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">结束日期</label>
          <input v-model="form.end_date" type="date" class="input w-full" />
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

      <!-- 常驻课题：多段日期 -->
      <div v-if="form.category === 'routine'" class="mb-3">
        <label class="text-xs text-muted mb-2 block">时间段列表</label>
        <div v-for="(p, i) in form.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
          <input v-model="p.start" type="date" class="input flex-1" />
          <span class="text-muted text-sm">~</span>
          <input v-model="p.end" type="date" class="input flex-1" />
          <button @click="form.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
        </div>
        <button @click="form.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
      </div>

      <button @click="createEvent" class="btn-primary text-sm" :disabled="saving">
        {{ saving ? '保存中...' : '添加活动' }}
      </button>
      <span v-if="msg" class="ml-3 text-sm" :class="msgOk ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>

    <!-- 活动列表 -->
    <div class="card !p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted text-xs bg-gray-50 dark:bg-white/3">
            <th class="py-2.5 px-3">名称</th>
            <th class="py-2.5 px-3">类型</th>
            <th class="py-2.5 px-3">时间</th>
            <th class="py-2.5 px-3">排序</th>
            <th class="py-2.5 px-3 w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id"
            class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
            <td class="py-2.5 px-3 font-medium">{{ event.name }}</td>
            <td class="py-2.5 px-3">
              <span class="badge" :class="event.category === 'version' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'">
                {{ event.category === 'version' ? '版本' : '常驻' }}
              </span>
            </td>
            <td class="py-2.5 px-3 text-xs text-muted">
              <template v-if="event.category === 'version'">{{ event.start_date }} ~ {{ event.end_date }}</template>
              <template v-else>{{ event.periods.length }} 段</template>
            </td>
            <td class="py-2.5 px-3">{{ event.row_order }}</td>
            <td class="py-2.5 px-3 flex gap-2">
              <button @click="openEdit(event)" class="text-xs text-primary-500 hover:underline">编辑</button>
              <button @click="deleteEvent(event)" class="text-xs text-red-500 hover:underline">删除</button>
            </td>
          </tr>
          <tr v-if="!events.length">
            <td colspan="5" class="py-8 text-center text-muted text-sm">暂无活动数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeEdit">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
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
                <option value="routine">常驻课题</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-muted">排序 <span class="text-red-500">*</span></label>
              <input v-model.number="editForm.row_order" type="number" class="input w-full" placeholder="数字越小越靠上" />
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

          <!-- 常驻课题：多段日期 -->
          <div v-if="editForm.category === 'routine'">
            <label class="text-xs text-muted mb-2 block">时间段列表</label>
            <div v-for="(p, i) in editForm.periodsArr" :key="i" class="flex items-center gap-2 mb-2">
              <input v-model="p.start" type="date" class="input flex-1" />
              <span class="text-muted text-sm">~</span>
              <input v-model="p.end" type="date" class="input flex-1" />
              <button @click="editForm.periodsArr.splice(i, 1)" class="text-red-500 text-xs hover:underline">删除</button>
            </div>
            <button @click="editForm.periodsArr.push({ start: '', end: '' })" class="text-xs text-primary-500 hover:underline">+ 添加时间段</button>
          </div>

          <!-- 图片 -->
          <div>
            <label class="text-xs text-muted">活动图片</label>
            <div v-if="editForm.image && !editForm.imageFile" class="mb-2">
              <img :src="`/uploads/events/event_${editForm.id}.png`" class="h-12 rounded" />
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
import { ref, reactive, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { seasonsApi, eventsApi } from '@/api'
import { useModal } from '@/composables/useModal'

const modal = useModal()
const currentSeason = ref(null)
const events = ref([])
const saving = ref(false)
const msg = ref('')
const msgOk = ref(false)

// 编辑弹窗状态
const showEditModal = ref(false)
const editSaving = ref(false)
const editMsg = ref('')
const editMsgOk = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  category: 'version',
  start_date: '',
  end_date: '',
  row_order: 0,
  image: '',
  imageName: '',
  imageFile: null,
  periodsArr: [],
})

const form = ref({
  name: '',
  category: 'version',
  start_date: '',
  end_date: '',
  image: null,
  imageName: '',
  imagePreview: '',
  imageFile: null,
  row_order: 0,
  periodsArr: [{ start: '', end: '' }],
})

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.imageFile = file
  form.value.imageName = file.name
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

async function createEvent() {
  // 必填项检测
  if (!form.value.name?.trim()) {
    msg.value = '请填写活动名称'
    msgOk.value = false
    return
  }
  if (!currentSeason.value) {
    msg.value = '当前赛季信息缺失'
    msgOk.value = false
    return
  }
  
  // 版本活动：检测起止时间
  if (form.value.category === 'version') {
    if (!form.value.start_date || !form.value.end_date) {
      msg.value = '请填写开始日期和结束日期'
      msgOk.value = false
      return
    }
    if (form.value.start_date > form.value.end_date) {
      msg.value = '开始日期不能晚于结束日期'
      msgOk.value = false
      return
    }
  }
  
  // 常驻课题：检测时间段
  if (form.value.category === 'routine') {
    const validPeriods = form.value.periodsArr.filter(p => p.start && p.end)
    if (validPeriods.length === 0) {
      msg.value = '请至少添加一个有效的时间段'
      msgOk.value = false
      return
    }
  }
  
  // 检测排序（必须是有效数字）
  if (form.value.row_order === null || form.value.row_order === '') {
    msg.value = '请填写排序值'
    msgOk.value = false
    return
  }
  
  saving.value = true

  const data = {
    season_id: currentSeason.value.id,
    category: form.value.category,
    name: form.value.name,
    row_order: form.value.row_order || 0,
    start_date: form.value.category === 'version' ? form.value.start_date : '',
    end_date: form.value.category === 'version' ? form.value.end_date : '',
    periods: form.value.category === 'routine'
      ? JSON.stringify(form.value.periodsArr.filter(p => p.start && p.end))
      : '[]',
    image: '',
  }

  try {
    const res = await adminApi.create('season_events', data)
    const newId = res.id || res.lastInsertRowid

    // 上传图片并更新记录
    if (form.value.imageFile && newId) {
      const imgPath = await uploadEventImage(newId)
      if (imgPath) {
        await adminApi.update('season_events', newId, { image: imgPath })
      }
    }

    // 重置表单
    form.value.name = ''
    form.value.start_date = ''
    form.value.end_date = ''
    form.value.image = null
    form.value.imageName = ''
    form.value.imagePreview = ''
    form.value.imageFile = null
    form.value.row_order = 0
    form.value.periodsArr = [{ start: '', end: '' }]
    await loadEvents()
    msg.value = '活动添加成功'
    msgOk.value = true
  } catch (err) {
    msg.value = '创建失败: ' + (err.message || '未知错误')
    msgOk.value = false
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
  editForm.start_date = event.start_date || ''
  editForm.end_date = event.end_date || ''
  editForm.row_order = event.row_order ?? 0
  editForm.image = event.image || ''
  editForm.imageFile = null
  editForm.imageName = ''
  // 解析 periods（已有数据存的是 JSON 字符串）
  try {
    const periods = typeof event.periods === 'string' ? JSON.parse(event.periods) : (event.periods || [])
    editForm.periodsArr = periods.length ? periods : [{ start: '', end: '' }]
  } catch {
    editForm.periodsArr = [{ start: '', end: '' }]
  }
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editForm.id = null
}

async function updateEvent() {
  // 必填项检测（复用创建时的逻辑）
  if (!editForm.name?.trim()) {
    editMsg.value = '请填写活动名称'
    editMsgOk.value = false
    return
  }
  if (editForm.category === 'version') {
    if (!editForm.start_date || !editForm.end_date) {
      editMsg.value = '请填写开始日期和结束日期'
      editMsgOk.value = false
      return
    }
    if (editForm.start_date > editForm.end_date) {
      editMsg.value = '开始日期不能晚于结束日期'
      editMsgOk.value = false
      return
    }
  }
  if (editForm.category === 'routine') {
    const validPeriods = editForm.periodsArr.filter(p => p.start && p.end)
    if (validPeriods.length === 0) {
      editMsg.value = '请至少添加一个有效的时间段'
      editMsgOk.value = false
      return
    }
  }
  if (editForm.row_order === null || editForm.row_order === '') {
    editMsg.value = '请填写排序值'
    editMsgOk.value = false
    return
  }

  editSaving.value = true
  try {
    const data = {
      name: editForm.name,
      category: editForm.category,
      row_order: editForm.row_order,
      start_date: editForm.category === 'version' ? editForm.start_date : '',
      end_date: editForm.category === 'version' ? editForm.end_date : '',
      periods: editForm.category === 'routine'
        ? JSON.stringify(editForm.periodsArr.filter(p => p.start && p.end))
        : '[]',
    }
    await adminApi.update('season_events', editForm.id, data)

    // 上传新图片
    if (editForm.imageFile) {
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

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
            <th class="py-2.5 px-3 w-20">操作</th>
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
            <td class="py-2.5 px-3">
              <button @click="deleteEvent(event)" class="text-xs text-red-500 hover:underline">删除</button>
            </td>
          </tr>
          <tr v-if="!events.length">
            <td colspan="5" class="py-8 text-center text-muted text-sm">暂无活动数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { seasonsApi, eventsApi } from '@/api'

const currentSeason = ref(null)
const events = ref([])
const saving = ref(false)

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
  const res = await eventsApi.list(currentSeason.value.id, true)
  events.value = res.events || []
}

async function createEvent() {
  if (!form.value.name || !currentSeason.value) return
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
  } catch (err) {
    alert('创建失败: ' + (err.message || '未知错误'))
  }
  saving.value = false
}

async function deleteEvent(event) {
  if (!confirm(`确认删除「${event.name}」？`)) return
  try {
    await adminApi.delete('season_events', event.id)
    await loadEvents()
  } catch (err) {
    alert('删除失败: ' + (err.message || '未知错误'))
  }
}

onMounted(async () => {
  const res = await seasonsApi.current()
  if (res.season) {
    currentSeason.value = res.season
    await loadEvents()
  }
})
</script>

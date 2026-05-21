<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">皮卡月刊管理</h1>

    <p class="text-xs sm:text-sm text-muted mb-4">管理皮卡月刊（角色时装），每期可配置多个精灵，每期有男女两张概念图</p>

    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button @click="openAddModal" class="btn-primary text-sm">+ 新增期数</button>
        <button @click="loadList" :disabled="loading" class="text-sm text-muted hover:text-foreground bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg">刷新</button>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <input v-model="searchKeyword" placeholder="搜索期数/名称..." class="input w-32 sm:w-48" />
      </div>
    </div>

    <!-- 月刊列表 -->
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-muted text-xs bg-surface-light dark:bg-surface-dark">
          <th class="py-3 px-4">期数</th>
          <th class="py-3 px-4">时装名称</th>
          <th class="py-3 px-4">绑定精灵</th>
          <th class="py-3 px-4">概念图</th>
          <th class="py-3 px-4">时间</th>
          <th class="py-3 px-4 w-40">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredList" :key="item.id" class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
          <td class="py-3 px-4 font-medium">{{ item.period }}</td>
          <td class="py-3 px-4">{{ item.name }}</td>
          <td class="py-3 px-4">
            <div v-for="pet in item.pets || []" :key="pet.pet_uid" class="flex items-center gap-1 text-xs">
              <div 
                v-if="pet.pet_icon" 
                class="w-6 h-6 rounded cursor-zoom-in hover:rounded-none transition-rounded flex items-center justify-center"
                @click="openPreview(pet.pet_icon)"
              >
                <img :src="pet.pet_icon" class="w-4 h-4 rounded" />
              </div>
              <span>{{ pet.pet_name }}</span>
            </div>
            <span v-if="!item.pets?.length" class="text-muted text-xs">-</span>
          </td>
          <td class="py-3 px-4">
            <div class="flex gap-1">
              <!-- 男概念图 -->
              <div v-if="item.concept_male" class="w-16 h-16 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded flex items-center justify-center" @click="openPreview(item.concept_male)">
                <img :src="item.concept_male" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-16 h-16 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无男图</div>
              
              <!-- 女概念图 -->
              <div v-if="item.concept_female" class="w-16 h-16 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded flex items-center justify-center" @click="openPreview(item.concept_female)">
                <img :src="item.concept_female" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-16 h-16 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无女图</div>
            </div>
            <span v-if="!item.concept_male && !item.concept_female" class="text-muted text-xs">-</span>
          </td>
          <td class="py-3 px-4 text-xs text-muted">{{ item.start_date }} ~ {{ item.end_date }}</td>
          <td class="py-3 px-4 flex gap-2">
            <button @click="openEdit(item)" class="text-xs text-primary-500 hover:underline">编辑</button>
            <button @click="deleteItem(item)" class="text-xs text-red-500 hover:underline">删除</button>
          </td>
        </tr>
        <tr v-if="filteredList.length === 0">
          <td colspan="7" class="py-8 text-center text-muted text-sm">暂无数据</td>
        </tr>
      </tbody>
    </table>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeModal">
      <div class="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">{{ isEdit ? '编辑皮卡月刊' : '新增皮卡月刊' }}</h3>
          <button @click="closeModal" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-4">
          <!-- 基本信息 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted block mb-1">期数 <span class="text-red-500">*</span></label>
              <input v-model="form.period" class="input w-full" placeholder="如 202605" />
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">时装名称 <span class="text-red-500">*</span></label>
              <input v-model="form.name" class="input w-full" placeholder="如 森林守护者" />
            </div>
          </div>

          <!-- 时间 -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted block mb-1">上架日期</label>
              <div class="relative">
                <input 
                  v-model="form.start_date" 
                  class="input w-full cursor-pointer" 
                  placeholder="选择上架日期" 
                  readonly
                  @click="openDatePicker('start')"
                />
                <div v-if="datePickerOpen && datePickerMode === 'start'" v-click-outside="closeDatePicker" class="absolute z-50 mt-1 w-full bg-surface-light dark:bg-surface-dark border border-surface-light-border dark:border-surface-dark-border rounded-lg shadow-lg p-1">
                  <div class="flex items-center justify-between px-2 py-1 text-xs text-muted border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                    <button @click="changeMonth(-1)" class="text-xs">◀</button>
                    <span>{{ datePickerYear }}年{{ datePickerMonth }}月</span>
                    <button @click="changeMonth(1)" class="text-xs">▶</button>
                  </div>
                  <div class="grid grid-cols-7 gap-0.5 p-1">
                    <div v-for="d in datePickerDays" :key="d" class="w-5 h-5 flex items-center justify-center text-[10px] text-muted">{{ d }}</div>
                    <div 
                      v-for="day in datePickerCells" 
                      :key="day.date" 
                      class="w-5 h-5 flex items-center justify-center text-xs hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                      :class="{ 
                        'text-primary-500 font-bold': day.date === datePickerSelected && isCurrentMonth(day),
                        'text-muted': !isCurrentMonth(day),
                        'text-sm': isToday(day.date)
                      }"
                      @click="selectDate(day.date)"
                    >
                      {{ day.day }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">下架日期</label>
              <div class="relative">
                <input 
                  v-model="form.end_date" 
                  class="input w-full cursor-pointer" 
                  placeholder="选择下架日期" 
                  readonly
                  @click="openDatePicker('end')"
                />
                <div v-if="datePickerOpen && datePickerMode === 'end'" v-click-outside="closeDatePicker" class="absolute z-50 mt-1 w-full bg-surface-light dark:bg-surface-dark border border-surface-light-border dark:border-surface-dark-border rounded-lg shadow-lg p-1">
                  <div class="flex items-center justify-between px-2 py-1 text-xs text-muted border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                    <button @click="changeMonth(-1)" class="text-xs">◀</button>
                    <span>{{ datePickerYear }}年{{ datePickerMonth }}月</span>
                    <button @click="changeMonth(1)" class="text-xs">▶</button>
                  </div>
                  <div class="grid grid-cols-7 gap-0.5 p-1">
                    <div v-for="d in datePickerDays" :key="d" class="w-5 h-5 flex items-center justify-center text-[10px] text-muted">{{ d }}</div>
                    <div 
                      v-for="day in datePickerCells" 
                      :key="day.date" 
                      class="w-5 h-5 flex items-center justify-center text-xs hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                      :class="{ 
                        'text-primary-500 font-bold': day.date === datePickerSelectedEnd && isCurrentMonth(day),
                        'text-muted': !isCurrentMonth(day),
                        'text-sm': isToday(day.date)
                      }"
                      @click="selectDateEnd(day.date)"
                    >
                      {{ day.day }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 概念图（整期共用） -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted block mb-1">男概念图</label>
              <div class="flex items-center gap-2">
                <img 
                  v-if="form.concept_male" 
                  :src="form.concept_male" 
                  class="w-16 h-16 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded"
                  @click="openPreview(form.concept_male)"
                />
                <div v-else class="w-16 h-16 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无</div>
                <label class="btn-primary text-xs px-2 py-1 cursor-pointer" for="upload-concept-male">
                  <input id="upload-concept-male" type="file" accept="image/*" class="hidden" @change="handleUploadConceptMale" />
                  上传
                </label>
              </div>
            </div>
            <div>
              <label class="text-xs text-muted block mb-1">女概念图</label>
              <div class="flex items-center gap-2">
                <img 
                  v-if="form.concept_female" 
                  :src="form.concept_female" 
                  class="w-16 h-16 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded"
                  @click="openPreview(form.concept_female)"
                />
                <div v-else class="w-16 h-16 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无</div>
                <label class="btn-primary text-xs px-2 py-1 cursor-pointer" for="upload-concept-female">
                  <input id="upload-concept-female" type="file" accept="image/*" class="hidden" @change="handleUploadConceptFemale" />
                  上传
                </label>
              </div>
            </div>
          </div>

          <!-- 精灵-时装绑定列表（可添加多个） -->
          <div>
            <label class="text-xs text-muted block mb-2">精灵-时装绑定 <span class="text-red-500">*</span></label>
            <div class="space-y-3">
              <div 
                v-for="(pet, idx) in form.pets" 
                :key="idx" 
                class="border border-surface-light-border dark:border-surface-dark-border rounded-lg p-3 bg-surface-light dark:bg-surface-dark/30"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-muted">#{{ idx + 1 }}</span>
                    <span v-if="pet.pet_name" class="text-sm">{{ pet.pet_name }}</span>
                    <span v-else class="text-xs text-muted">未选择精灵</span>
                  </div>
                  <button v-if="form.pets.length > 1" @click="removePet(idx)" class="text-xs text-red-500 hover:text-red-600">移除</button>
                </div>
                
                <!-- 精灵选择 -->
                <div>
                  <label class="text-xs text-muted block mb-1">选择精灵</label>
                  <PetPicker v-model="pet.pet_uid" placeholder="点击选择精灵" @change="(uid) => onPetChange(uid, idx)" />
                </div>

                <!-- 时装上传（选择精灵后显示） -->
                <template v-if="pet.pet_uid">
                  <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
                    <div>
                      <label class="text-xs text-muted block mb-1">男洛克时装</label>
                      <div class="flex items-center gap-2">
                        <img 
                          v-if="pet.locke_male" 
                          :src="pet.locke_male" 
                          class="w-12 h-12 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded"
                          @click="openPreview(pet.locke_male)"
                        />
                        <div v-else class="w-12 h-12 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无</div>
                        <label class="btn-primary text-xs px-2 py-1 cursor-pointer" :for="'upload-locke-male-' + idx">上传</label>
                        <input 
                          :id="'upload-locke-male-' + idx" 
                          type="file" 
                          accept="image/*" 
                          class="hidden" 
                          @change="(e) => handleUploadLockeMale(e, idx)" 
                        />
                      </div>
                    </div>
                    <div>
                      <label class="text-xs text-muted block mb-1">女洛克时装</label>
                      <div class="flex items-center gap-2">
                        <img 
                          v-if="pet.locke_female" 
                          :src="pet.locke_female" 
                          class="w-12 h-12 rounded object-cover cursor-zoom-in hover:rounded-none transition-rounded"
                          @click="openPreview(pet.locke_female)"
                        />
                        <div v-else class="w-12 h-12 rounded border-2 border-dashed border-surface-light-border dark:border-surface-dark-border flex items-center justify-center text-xs text-muted">无</div>
                        <label class="btn-primary text-xs px-2 py-1 cursor-pointer" :for="'upload-locke-female-' + idx">上传</label>
                        <input 
                          :id="'upload-locke-female-' + idx" 
                          type="file" 
                          accept="image/*" 
                          class="hidden" 
                          @change="(e) => handleUploadLockeFemale(e, idx)" 
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              
              <button @click="addPet" class="text-xs text-primary-500 hover:underline flex items-center gap-1">
                + 添加精灵-时装绑定
              </button>
            </div>
          </div>

          <!-- 排序 -->
          <div>
            <label class="text-xs text-muted block mb-1">排序</label>
            <input v-model.number="form.row_order" type="number" class="input w-full" placeholder="0" />
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-2 pt-2 border-t border-surface-light-border dark:border-surface-dark-border">
            <button @click="closeModal" class="px-4 py-2 text-sm text-muted hover:text-foreground">取消</button>
            <button @click="saveForm" :disabled="saving" class="btn-primary px-6 py-2 text-sm">保存</button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { adminApi, petsApi } from '@/api'
import { useImagePreview } from '@/composables/useImagePreview'
import { useModal } from '@/composables/useModal'
import PetPicker from '@/components/shared/PetPicker.vue'

const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const list = ref([])

// 图片预览（使用全局 composable）
const { openPreview } = useImagePreview()

// 全局弹窗
const modal = useModal()

// 日期选择器状态
const datePickerOpen = ref(false)
const datePickerMode = ref('start') // 'start' | 'end'
const datePickerYear = ref(new Date().getFullYear())
const datePickerMonth = ref(new Date().getMonth() + 1)
const datePickerDays = ['日', '一', '二', '三', '四', '五', '六']

// 解析日期字符串为年月日
function parseDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) }
}

// 生成当月日历单元格
function generateCalendarCells(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDay = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const daysBefore = []
  for (let i = startDay - 1; i >= 0; i--) {
    const prevMonthLast = new Date(year, month - 1, 0).getDate()
    daysBefore.push({ day: prevMonthLast - i, date: null, isCurrentMonth: false })
  }
  const daysInCurrentMonth = []
  for (let d = 1; d <= daysInMonth; d++) {
    daysInCurrentMonth.push({ day: d, date: `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`, isCurrentMonth: true })
  }
  return [...daysBefore, ...daysInCurrentMonth]
}

const datePickerCells = computed(() => generateCalendarCells(datePickerYear.value, datePickerMonth.value))

function openDatePicker(mode) {
  datePickerMode.value = mode
  datePickerOpen.value = true
  // 如果已有日期，定位到该日期的月份
  if (mode === 'start' && form.value.start_date) {
    const d = parseDate(form.value.start_date)
    if (d) { datePickerYear.value = d.year; datePickerMonth.value = d.month; }
  } else if (mode === 'end' && form.value.end_date) {
    const d = parseDate(form.value.end_date)
    if (d) { datePickerYear.value = d.year; datePickerMonth.value = d.month; }
  } else {
    datePickerYear.value = new Date().getFullYear()
    datePickerMonth.value = new Date().getMonth() + 1
  }
}

function closeDatePicker() {
  datePickerOpen.value = false
}

function changeMonth(offset) {
  const newMonth = datePickerMonth.value + offset
  if (newMonth <= 0) {
    datePickerYear.value--
    datePickerMonth.value = 12
  } else if (newMonth > 12) {
    datePickerYear.value++
    datePickerMonth.value = 1
  } else {
    datePickerMonth.value = newMonth
  }
}

function isCurrentMonth(day) {
  return day.isCurrentMonth
}

function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

function selectDate(dateStr) {
  form.value.start_date = dateStr
  datePickerOpen.value = false
}

function selectDateEnd(dateStr) {
  form.value.end_date = dateStr
  datePickerOpen.value = false
}

// 点击外部关闭
const handleClickOutside = (e) => {
  if (!e.target.closest('.relative')) {
    datePickerOpen.value = false
  }
}

onMounted(() => {
  loadList()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 表单：pets 数组中每个元素对应一个精灵
const form = ref({
  period: '',
  name: '',
  start_date: '',
  end_date: '',
  row_order: 0,
  concept_male: '',
  concept_female: '',
  pets: [{ pet_uid: '', locke_male: '', locke_female: '' }],
})

const filteredList = computed(() => {
  if (!searchKeyword.value) return list.value
  const kw = searchKeyword.value.toLowerCase()
  return list.value.filter(item =>
    item.period?.toLowerCase().includes(kw) ||
    item.name?.toLowerCase().includes(kw)
  )
})

async function loadList() {
  loading.value = true
  try {
    const res = await adminApi.list('pika_monthlies')
    list.value = (res.rows || []).map(row => ({
      ...row,
      pets: row.pets ? JSON.parse(row.pets) : [],
    }))
  } catch (err) { console.error("[Page] 加载失败:", err) }
  loading.value = false
}

function openAddModal() {
  isEdit.value = false
  form.value = {
    period: '',
    name: '',
    start_date: '',
    end_date: '',
    row_order: list.value.length,
    concept_male: '',
    concept_female: '',
    pets: [{ pet_uid: '', locke_male: '', locke_female: '' }],
  }
  loadPetsList()
  showModal.value = true
}

function openEdit(item) {
  isEdit.value = true
  form.value = {
    id: item.id,
    period: item.period,
    name: item.name,
    start_date: item.start_date || '',
    end_date: item.end_date || '',
    row_order: item.row_order || 0,
    concept_male: item.concept_male || '',
    concept_female: item.concept_female || '',
    pets: (item.pets || []).map((p, i) => ({
      pet_uid: p.pet_uid || '',
      locke_male: p.locke_male || '',
      locke_female: p.locke_female || '',
      _pet_name: p.pet_name || '',
      _pet_icon: p.pet_icon || '',
    })),
  }
  // 确保至少有一个精灵
  if (form.value.pets.length === 0) {
    form.value.pets.push({ pet_uid: '', locke_male: '', locke_female: '' })
  }
  loadPetsList()
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  document.querySelectorAll('input[type="file"]').forEach(el => el.value = '')
}

function addPet() {
  form.value.pets.push({ pet_uid: '', locke_male: '', locke_female: '' })
}

function removePet(idx) {
  form.value.pets.splice(idx, 1)
}

// 精灵选择后更新名称显示
function onPetChange(uid, idx) {
  if (!uid) return
  // 从 pets 列表中查找精灵名称
  const petInfo = petsList.value?.find(p => p.uid === uid)
  if (petInfo) {
    form.value.pets[idx]._pet_name = petInfo.name
    form.value.pets[idx]._pet_icon = petInfo.thumb_url || petInfo.image_url || ''
  }
}

// 加载精灵列表用于显示名称
const petsList = ref([])
async function loadPetsList() {
  try {
    const res = await petsApi.list({ limit: 1000 })
    petsList.value = res.rows || []
  } catch (err) { console.error("[Page] 加载失败:", err) }
}

async function saveForm() {
  // 验证：至少填了期数和名称
  if (!form.value.period || !form.value.name) {
    await modal.warning('提示', '请填写期数和时装名称')
    return
  }
  // 验证：至少有一个有效精灵
  const validPets = form.value.pets.filter(p => p.pet_uid)
  if (validPets.length === 0) {
    await modal.warning('提示', '请至少绑定一个精灵')
    return
  }

  saving.value = true
  try {
    // 构建 pets 数据
    const petsData = validPets.map((p, i) => ({
      pet_uid: p.pet_uid,
      locke_male: p.locke_male || '',
      locke_female: p.locke_female || '',
      sort_order: i,
    }))

    const data = {
      period: form.value.period,
      name: form.value.name,
      start_date: form.value.start_date || '',
      end_date: form.value.end_date || '',
      row_order: form.value.row_order,
      pets: JSON.stringify(petsData),
    }
    if (form.value.concept_male) {
      data.concept_male = form.value.concept_male
    }
    if (form.value.concept_female) {
      data.concept_female = form.value.concept_female
    }

    if (isEdit.value) {
      await adminApi.updatePikaMonthly(form.value.id, data)
      await modal.success('成功', '保存成功')
    } else {
      await adminApi.createPikaMonthly(data)
      await modal.success('成功', '新增成功')
    }
    closeModal()
    loadList()
  } catch (e) {
    await modal.alert('失败', '操作失败: ' + e.message)
  }
  saving.value = false
}

async function deleteItem(item) {
  const ok = await modal.danger('删除确认', `确定删除「${item.name}」？此操作不可恢复！`)
  if (!ok) return
  
  try {
    await adminApi.deletePikaMonthly(item.id)
    await modal.success('成功', '删除成功')
    loadList()
  } catch (e) {
    await modal.alert('失败', '删除失败: ' + e.message)
  }
}

// 图片上传
async function uploadImage(file, type, uid) {
  try {
    const res = await adminApi.upload(file, type, uid || 'temp')
    return res.path
  } catch (e) {
    await modal.alert('上传失败', e.message)
    return null
  }
}

async function handleUploadLockeMale(e, idx) {
  const file = e.target.files?.[0]
  if (!file) return
  const pet = form.value.pets[idx]
  // 用 period_petUid 作为唯一标识，避免不同精灵覆盖
  const uid = `${form.value.period}_${pet.pet_uid}`
  const path = await uploadImage(file, 'pika_locke_male', uid)
  if (path) pet.locke_male = path
}

async function handleUploadLockeFemale(e, idx) {
  const file = e.target.files?.[0]
  if (!file) return
  const pet = form.value.pets[idx]
  // 用 period_petUid 作为唯一标识，避免不同精灵覆盖
  const uid = `${form.value.period}_${pet.pet_uid}`
  const path = await uploadImage(file, 'pika_locke_female', uid)
  if (path) pet.locke_female = path
}

async function handleUploadConceptMale(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const path = await uploadImage(file, 'pika_concept_male', form.value.period)
  if (path) form.value.concept_male = path
}

async function handleUploadConceptFemale(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const path = await uploadImage(file, 'pika_concept_female', form.value.period)
  if (path) form.value.concept_female = path
}
</script>

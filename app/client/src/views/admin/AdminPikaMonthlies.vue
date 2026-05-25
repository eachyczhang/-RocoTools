<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">皮卡月刊管理</h1>

    <p class="text-xs sm:text-sm text-muted mb-4">管理皮卡月刊（角色时装），每期可配置多个精灵，每期有男女两张概念图</p>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex gap-2">
        <button @click="openAddModal" class="btn-primary text-sm">+ 新增期数</button>
        <button @click="loadList" :disabled="loading" class="text-sm text-muted hover:text-foreground bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg border border-surface-light-border dark:border-surface-dark-border transition-colors">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input v-model="searchKeyword" placeholder="搜索期数/名称..." class="input w-36 sm:w-52 text-sm" />
      </div>
    </div>

    <!-- 月刊卡片列表 -->
    <div class="space-y-4">
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="card !p-0 overflow-hidden hover:shadow-lg transition-shadow duration-200"
      >
        <div class="flex flex-col sm:flex-row">
          <!-- 左侧：概念图预览 -->
          <div class="sm:w-56 flex-shrink-0 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 p-3 flex items-center justify-center gap-2">
            <div v-if="item.concept_male" class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-sm cursor-zoom-in hover:scale-105 transition-transform" @click="openPreview(item.concept_male)">
              <img :src="item.concept_male" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed border-pink-200 dark:border-pink-800 flex items-center justify-center">
              <span class="text-xs text-muted">♂ 无图</span>
            </div>
            <div v-if="item.concept_female" class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-sm cursor-zoom-in hover:scale-105 transition-transform" @click="openPreview(item.concept_female)">
              <img :src="item.concept_female" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <span class="text-xs text-muted">♀ 无图</span>
            </div>
          </div>

          <!-- 右侧：信息区 -->
          <div class="flex-1 p-4 flex flex-col justify-between">
            <div>
              <!-- 标题行 -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded">{{ item.period }}</span>
                  <h3 class="font-medium text-base">{{ item.name }}</h3>
                </div>
                <div class="flex items-center gap-2">
                  <router-link to="/admin/fate-flower" class="text-xs text-pink-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 px-2 py-1 rounded transition-colors">🌸 配置技能</router-link>
                  <button @click="openEdit(item)" class="text-xs text-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-1 rounded transition-colors">编辑</button>
                  <button @click="deleteItem(item)" class="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors">删除</button>
                </div>
              </div>

              <!-- 精灵列表 -->
              <div class="flex items-center gap-3 flex-wrap mt-2">
                <div v-for="pet in item.pets || []" :key="pet.pet_uid" class="flex items-center gap-1.5 bg-surface-light dark:bg-surface-dark px-2 py-1 rounded-full border border-surface-light-border/50 dark:border-surface-dark-border/50">
                  <img v-if="pet.pet_icon" :src="pet.pet_icon" class="w-5 h-5 rounded-full cursor-zoom-in hover:scale-125 transition-transform" @click="openPreview(pet.pet_icon)" />
                  <span class="text-xs font-medium">{{ pet.pet_name }}</span>
                </div>
                <span v-if="!item.pets?.length" class="text-muted text-xs italic">未绑定精灵</span>
              </div>
            </div>

            <!-- 底部时间 -->
            <div class="mt-3 pt-2 border-t border-surface-light-border/30 dark:border-surface-dark-border/30 flex items-center justify-between">
              <span class="text-xs text-muted">
                <template v-if="item.start_date || item.end_date">📅 {{ item.start_date || '?' }} ~ {{ item.end_date || '?' }}</template>
                <template v-else>未设置时间</template>
              </span>
              <span class="text-xs text-muted">排序: {{ item.row_order || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredList.length === 0" class="card text-center py-12">
        <div class="text-4xl mb-3">📰</div>
        <p class="text-muted text-sm">暂无月刊数据</p>
        <button @click="openAddModal" class="btn-primary text-sm mt-4">+ 新增第一期</button>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="closeModal">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-gray-800">
            <!-- 顶部色条 -->
            <div class="h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>

            <!-- 头部 -->
            <div class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
              <h3 class="font-roco text-lg text-primary-500 font-bold">{{ isEdit ? '编辑皮卡月刊' : '新增皮卡月刊' }}</h3>
              <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-muted hover:text-foreground transition-colors text-xl leading-none">&times;</button>
            </div>

            <div class="p-5 space-y-5">
              <!-- 基本信息区 -->
              <section>
                <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">基本信息</h4>
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
              </section>

              <!-- 时间区 -->
              <section>
                <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">时间配置</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-muted block mb-1">上架日期</label>
                    <DatePicker v-model="form.start_date" />
                  </div>
                  <div>
                    <label class="text-xs text-muted block mb-1">下架日期</label>
                    <DatePicker v-model="form.end_date" />
                  </div>
                </div>
              </section>

              <!-- 自动同步活动 -->
              <section>
                <div class="flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/60 dark:border-purple-700/40">
                  <input v-model="form.sync_events" type="checkbox" id="sync_events" class="w-4 h-4 accent-purple-500 rounded" />
                  <label for="sync_events" class="text-sm text-purple-700 dark:text-purple-300 cursor-pointer select-none">
                    自动同步「命定花种」和「皮卡摄影委托」活动到当前赛季
                  </label>
                </div>
              </section>

              <!-- 概念图区 -->
              <section>
                <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">概念图（整期共用）</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <label class="text-xs text-muted block mb-2">♂ 男洛克概念图</label>
                    <div class="relative group mx-auto w-28 h-28 rounded-xl overflow-hidden border-2 border-dashed border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/10">
                      <img
                        v-if="form.concept_male"
                        :src="form.concept_male"
                        class="w-full h-full object-cover cursor-zoom-in"
                        @click="openPreview(form.concept_male)"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-pink-300 dark:text-pink-700 text-2xl">♂</div>
                    </div>
                    <div class="mt-2">
                      <ImageUploader
                        upload-type="pika_concept_male"
                        :upload-uid="form.period"
                        upload-label="更换"
                        btn-class="text-xs text-primary-500 hover:text-primary-600 hover:underline cursor-pointer"
                        @uploaded="(path) => form.concept_male = path"
                      />
                    </div>
                  </div>
                  <div class="text-center">
                    <label class="text-xs text-muted block mb-2">♀ 女洛克概念图</label>
                    <div class="relative group mx-auto w-28 h-28 rounded-xl overflow-hidden border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                      <img
                        v-if="form.concept_female"
                        :src="form.concept_female"
                        class="w-full h-full object-cover cursor-zoom-in"
                        @click="openPreview(form.concept_female)"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-purple-300 dark:text-purple-700 text-2xl">♀</div>
                    </div>
                    <div class="mt-2">
                      <ImageUploader
                        upload-type="pika_concept_female"
                        :upload-uid="form.period"
                        upload-label="更换"
                        btn-class="text-xs text-primary-500 hover:text-primary-600 hover:underline cursor-pointer"
                        @uploaded="(path) => form.concept_female = path"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <!-- 精灵-时装绑定区 -->
              <section>
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-semibold text-muted uppercase tracking-wider">精灵-时装绑定 <span class="text-red-500">*</span></h4>
                  <button @click="addPet" class="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-1 rounded transition-colors">
                    + 添加精灵
                  </button>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="(pet, idx) in form.pets"
                    :key="idx"
                    class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <!-- 精灵卡片头部 -->
                    <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50">
                      <div class="flex items-center gap-2">
                        <span class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center">{{ idx + 1 }}</span>
                        <span class="text-xs text-muted">精灵绑定</span>
                      </div>
                      <button v-if="form.pets.length > 1" @click="removePet(idx)" class="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors">移除</button>
                    </div>

                    <!-- 精灵卡片内容 -->
                    <div class="p-4">
                      <!-- 精灵选择 -->
                      <div class="mb-3">
                        <label class="text-xs text-muted block mb-1">选择精灵</label>
                        <PetPicker v-model="pet.pet_uid" placeholder="点击选择精灵" @change="(uid) => onPetChange(uid, idx)" />
                      </div>

                      <!-- 时装上传（选择精灵后显示） -->
                      <template v-if="pet.pet_uid">
                        <div class="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div class="text-center">
                            <label class="text-xs text-muted block mb-2">♂ 男装</label>
                            <div class="mx-auto w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                              <img
                                v-if="pet.locke_male"
                                :src="pet.locke_male"
                                class="w-full h-full object-cover cursor-zoom-in"
                                @click="openPreview(pet.locke_male)"
                              />
                              <div v-else class="w-full h-full flex items-center justify-center text-blue-300 dark:text-blue-700 text-lg">♂</div>
                            </div>
                            <div class="mt-1.5">
                              <ImageUploader
                                upload-type="pika_locke_male"
                                :upload-uid="form.period + '_' + pet.pet_uid"
                                upload-label="更换"
                                btn-class="text-xs text-primary-500 hover:underline cursor-pointer"
                                @uploaded="(path) => pet.locke_male = path"
                              />
                            </div>
                          </div>
                          <div class="text-center">
                            <label class="text-xs text-muted block mb-2">♀ 女装</label>
                            <div class="mx-auto w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-pink-200 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-900/10">
                              <img
                                v-if="pet.locke_female"
                                :src="pet.locke_female"
                                class="w-full h-full object-cover cursor-zoom-in"
                                @click="openPreview(pet.locke_female)"
                              />
                              <div v-else class="w-full h-full flex items-center justify-center text-pink-300 dark:text-pink-700 text-lg">♀</div>
                            </div>
                            <div class="mt-1.5">
                              <ImageUploader
                                upload-type="pika_locke_female"
                                :upload-uid="form.period + '_' + pet.pet_uid"
                                upload-label="更换"
                                btn-class="text-xs text-primary-500 hover:underline cursor-pointer"
                                @uploaded="(path) => pet.locke_female = path"
                              />
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </section>

              <!-- 排序 -->
              <section>
                <h4 class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">其他</h4>
                <div class="w-32">
                  <label class="text-xs text-muted block mb-1">排序权重</label>
                  <input v-model.number="form.row_order" type="number" class="input w-full" placeholder="0" />
                </div>
              </section>

              <!-- 操作按钮 -->
              <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button @click="closeModal" class="px-5 py-2 text-sm text-muted hover:text-foreground rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">取消</button>
                <button @click="saveForm" :disabled="saving" class="btn-primary px-6 py-2 text-sm font-medium shadow-sm">
                  {{ saving ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi, petsApi } from '@/api'
import { useImagePreview } from '@/composables/useImagePreview'
import { useModal } from '@/composables/useModal'
import PetPicker from '@/components/shared/PetPicker.vue'
import DatePicker from '@/components/shared/DatePicker.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'

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

onMounted(() => {
  loadList()
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
  sync_events: true,  // 自动同步命定花种+皮卡摄影委托
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
    sync_events: true,
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
      pet_name: p._pet_name || '',
      pet_icon: p._pet_icon || '',
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
      sync_events: form.value.sync_events,
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
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-active > div:last-child, .modal-leave-active > div:last-child { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
</style>

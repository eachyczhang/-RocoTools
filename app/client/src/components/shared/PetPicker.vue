<template>
  <div class="relative">
    <!-- 已选中 -->
    <div v-if="selectedPet" class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
      <img :src="selectedPet.thumb_url || selectedPet.image_url" class="w-10 h-10 object-contain rounded" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{{ selectedPet.name }}</div>
        <div class="text-xs text-muted">{{ selectedPet.uid }}</div>
      </div>
      <button @click="clear" class="text-xs text-red-500 hover:underline flex-shrink-0">移除</button>
    </div>

    <!-- 未选中：搜索 + 浏览 -->
    <div v-else>
      <div class="flex gap-2">
        <input v-model="query" :placeholder="placeholder" class="input flex-1"
          @input="searchDebounced" @focus="onFocus" />
        <button @click="openBrowser" class="btn-ghost text-xs whitespace-nowrap px-3" title="浏览选取">
          📋 浏览
        </button>
      </div>

      <!-- 搜索下拉结果 -->
      <div v-if="showDropdown && results.length > 0"
        class="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-lg border"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        <div v-for="pet in results" :key="pet.uid" @click="select(pet)"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
          :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'">
          <img :src="pet.thumb_url || pet.image_url" class="w-8 h-8 object-contain rounded flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ pet.name }}</div>
            <div class="text-xs text-muted">{{ pet.uid }} · {{ pet.element_name || '' }}</div>
          </div>
          <div class="flex gap-0.5 flex-shrink-0">
            <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4" />
            <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-4 h-4" />
          </div>
        </div>
      </div>

      <!-- 无结果 -->
      <div v-if="showDropdown && query.length >= 1 && results.length === 0 && !loading"
        class="absolute z-50 top-full left-0 right-0 mt-1 px-3 py-2 rounded-lg shadow-lg border text-sm text-muted"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        未找到精灵
      </div>

      <!-- 点击外部关闭搜索下拉 -->
      <div v-if="showDropdown" class="fixed inset-0 z-40" @click="showDropdown = false"></div>
    </div>

    <!-- 浏览弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showBrowser" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showBrowser = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-3xl h-[75vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            :class="isDark ? 'bg-gray-800' : 'bg-white'">
            <div class="h-1 bg-primary-500"></div>

            <!-- 头部：搜索 + 属性筛选 -->
            <div class="p-4 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <div class="flex gap-2 mb-3">
                <input v-model="browseQuery" placeholder="搜索名称/编号..." class="input flex-1" @input="browseFetch" />
                <button @click="showBrowser = false" class="btn-ghost text-sm">关闭</button>
              </div>
              <div class="flex items-center gap-1 flex-wrap">
                <button @click="browseElement = ''; browseFetch()"
                  class="px-2 py-1 rounded text-xs transition-colors"
                  :class="!browseElement ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
                  全部
                </button>
                <button v-for="e in elements" :key="e.id" @click="browseElement = e.id; browseFetch()"
                  class="p-1 rounded-lg transition-all"
                  :class="browseElement == e.id ? 'bg-primary-100 dark:bg-primary-500/20 ring-1 ring-primary-400' : 'opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/5'">
                  <img :src="e.icon" class="w-5 h-5" :alt="e.name" :title="e.name" />
                </button>
              </div>
            </div>

            <!-- 网格列表 -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                <div v-for="pet in browsePets" :key="pet.uid" @click="selectFromBrowser(pet)"
                  class="flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors"
                  :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'">
                  <img :src="pet.thumb_url || pet.image_url" class="w-14 h-14 object-contain mb-1" loading="lazy" />
                  <div class="text-xs text-center truncate w-full">{{ pet.name }}</div>
                  <div class="flex gap-0.5 mt-0.5">
                    <img v-if="pet.element_icon" :src="pet.element_icon" class="w-3 h-3" />
                    <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-3 h-3" />
                  </div>
                </div>
              </div>
              <!-- 加载更多 -->
              <div v-if="browseTotal > browsePets.length" class="text-center mt-4">
                <button @click="browseMore" class="btn-ghost text-xs">加载更多 ({{ browsePets.length }}/{{ browseTotal }})</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { petsApi, elementsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索精灵（名称/编号）' },
})

const emit = defineEmits(['update:modelValue'])

// === 搜索模式 ===
const query = ref('')
const results = ref([])
const selectedPet = ref(null)
const showDropdown = ref(false)
const loading = ref(false)

let timer = null
function searchDebounced() {
  clearTimeout(timer)
  if (!query.value.trim()) { results.value = []; return }
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await petsApi.list({ search: query.value.trim(), limit: 20 })
      results.value = res.pets || []
    } catch { results.value = [] }
    loading.value = false
  }, 200)
}

function onFocus() {
  if (query.value.trim() && results.value.length) showDropdown.value = true
}

function select(pet) {
  selectedPet.value = pet
  showDropdown.value = false
  query.value = ''
  results.value = []
  emit('update:modelValue', pet.uid)
}

function clear() {
  selectedPet.value = null
  emit('update:modelValue', '')
}

// === 浏览模式 ===
const showBrowser = ref(false)
const browseQuery = ref('')
const browseElement = ref('')
const browsePets = ref([])
const browseTotal = ref(0)
const browsePage = ref(1)
const elements = ref([])

async function openBrowser() {
  showBrowser.value = true
  if (elements.value.length === 0) {
    try {
      const res = await elementsApi.list()
      elements.value = res.elements || []
    } catch (err) { console.error("[PetPicker]", err) }
  }
  browsePage.value = 1
  browsePets.value = []
  browseFetch()
}

async function browseFetch() {
  browsePage.value = 1
  try {
    const res = await petsApi.list({
      search: browseQuery.value.trim(),
      element_id: browseElement.value,
      limit: 60, page: 1,
    })
    browsePets.value = res.pets || []
    browseTotal.value = res.total || 0
  } catch (err) { console.error("[PetPicker]", err) }
}

async function browseMore() {
  browsePage.value++
  try {
    const res = await petsApi.list({
      search: browseQuery.value.trim(),
      element_id: browseElement.value,
      limit: 60, page: browsePage.value,
    })
    browsePets.value.push(...(res.pets || []))
  } catch (err) { console.error("[PetPicker]", err) }
}

function selectFromBrowser(pet) {
  selectedPet.value = pet
  showBrowser.value = false
  emit('update:modelValue', pet.uid)
}

// === 初始化 ===
async function loadInitial() {
  if (!props.modelValue) return
  try {
    const pet = await petsApi.get(props.modelValue)
    if (pet) selectedPet.value = pet
  } catch (err) { console.error("[PetPicker]", err) }
}

// 使用 immediate: true 的 watch 来处理初始值和后续变化
watch(() => props.modelValue, (val) => {
  if (!val) {
    selectedPet.value = null
  } else if (!selectedPet.value || selectedPet.value.uid !== val) {
    loadInitial()
  }
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="close">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          :class="isDark ? 'bg-gray-800' : 'bg-white'">
          <div class="h-1 bg-primary-500"></div>

          <!-- 头部：搜索 + 筛选 -->
          <div class="p-4 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <div class="flex items-center gap-2 mb-3">
              <h3 class="font-roco text-lg text-primary-500">选择技能</h3>
              <span class="text-xs text-muted ml-auto">共 {{ total }} 个技能</span>
              <button @click="close" class="btn-ghost text-sm ml-2">关闭</button>
            </div>

            <!-- 搜索框 -->
            <div class="relative mb-3">
              <input v-model="query" placeholder="搜索技能名称..." class="input w-full pl-8"
                @input="debouncedSearch" />
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>

            <!-- 属性筛选 -->
            <div class="flex items-center gap-1 flex-wrap mb-2">
              <button @click="filterElement = ''; fetchSkills()"
                class="px-2 py-1 rounded text-xs transition-colors"
                :class="!filterElement ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
                全部
              </button>
              <button v-for="e in elements" :key="e.id" @click="filterElement = e.id; fetchSkills()"
                class="p-1 rounded-lg transition-all"
                :class="filterElement == e.id ? 'bg-primary-100 dark:bg-primary-500/20 ring-1 ring-primary-400' : 'opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/5'">
                <img :src="e.icon" class="w-5 h-5" :alt="e.name" :title="e.name" />
              </button>
            </div>

            <!-- 分类筛选 -->
            <div class="flex items-center gap-1.5">
              <button v-for="cat in categories" :key="cat.value" @click="filterCategory = cat.value; fetchSkills()"
                class="text-xs px-2.5 py-1 rounded-full transition-colors"
                :class="filterCategory === cat.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-white/5 text-muted hover:bg-gray-200 dark:hover:bg-white/10'">
                {{ cat.label }}
              </button>
            </div>
          </div>

          <!-- 技能列表 -->
          <div class="flex-1 overflow-y-auto">
            <div v-for="sk in skills" :key="sk.uid"
              @click="selectSkill(sk)"
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b"
              :class="[
                isDark ? 'border-gray-700/50 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50',
                selectedUid === sk.uid ? (isDark ? 'bg-green-500/10' : 'bg-green-50') : ''
              ]">
              <!-- 图标 -->
              <img v-if="sk.icon_url" :src="sk.icon_url" class="w-8 h-8 rounded object-contain flex-shrink-0" />
              <div v-else class="w-8 h-8 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
              <!-- 信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm font-medium">{{ sk.name }}</span>
                  <span v-if="sk.element_name" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                    :style="{ background: (sk.element_color || '#999') + '15', color: sk.element_color || '#999' }">
                    <img v-if="sk.element_icon" :src="sk.element_icon" class="w-3 h-3" />
                    {{ sk.element_name }}
                  </span>
                  <span v-if="sk.category" class="text-[10px] px-1.5 py-0.5 rounded" :class="categoryClass(sk.category)">
                    {{ sk.category }}
                  </span>
                </div>
                <div v-if="sk.description" class="text-[10px] text-muted mt-0.5 line-clamp-1">{{ sk.description }}</div>
              </div>
              <!-- 数值 -->
              <div class="flex items-center gap-3 flex-shrink-0 text-xs text-center">
                <div class="w-10">
                  <div class="text-[9px] text-muted">能耗</div>
                  <div class="font-medium">{{ sk.cost || '-' }}</div>
                </div>
                <div class="w-10">
                  <div class="text-[9px] text-muted">威力</div>
                  <div class="font-medium">{{ sk.power || '-' }}</div>
                </div>
              </div>
              <!-- 选中 -->
              <span v-if="selectedUid === sk.uid" class="text-green-500 text-sm flex-shrink-0">✓</span>
            </div>

            <!-- 加载更多 -->
            <div v-if="skills.length < total" class="text-center py-3">
              <button @click="loadMore" class="btn-ghost text-xs">加载更多 ({{ skills.length }}/{{ total }})</button>
            </div>

            <!-- 空状态 -->
            <div v-if="!skills.length && !loading" class="text-center py-10 text-muted text-sm">
              未找到匹配技能
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { skillsApi, elementsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'update:visible'])

const query = ref('')
const filterElement = ref('')
const filterCategory = ref('')
const skills = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const elements = ref([])
const selectedUid = ref('')

const categories = [
  { label: '全部', value: '' },
  { label: '物攻', value: '物攻' },
  { label: '魔攻', value: '魔攻' },
  { label: '防御', value: '防御' },
  { label: '状态', value: '状态' },
]

function categoryClass(cat) {
  const map = {
    '物攻': 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    '魔攻': 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    '防御': 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    '状态': 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  }
  return map[cat] || 'bg-gray-100 text-gray-600'
}

let timer = null
function debouncedSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; fetchSkills() }, 200)
}

async function fetchSkills() {
  page.value = 1
  loading.value = true
  try {
    const res = await skillsApi.list({
      search: query.value.trim(),
      element_id: filterElement.value,
      category: filterCategory.value,
      limit: 50,
      page: 1,
    })
    skills.value = res.skills || []
    total.value = res.total || 0
  } catch {}
  loading.value = false
}

async function loadMore() {
  page.value++
  try {
    const res = await skillsApi.list({
      search: query.value.trim(),
      element_id: filterElement.value,
      category: filterCategory.value,
      limit: 50,
      page: page.value,
    })
    skills.value.push(...(res.skills || []))
  } catch {}
}

function selectSkill(sk) {
  selectedUid.value = sk.uid
  emit('select', {
    skill_ref_uid: sk.uid,
    skill_name: sk.name,
    skill_element: sk.element_name || '',
    skill_type: sk.category || '',
    skill_cost: sk.cost,
    skill_power: sk.power,
    skill_icon: sk.icon_url || '',
    skill_element_icon: sk.element_icon || '',
    skill_element_color: sk.element_color || '',
  })
  close()
}

function close() {
  emit('update:visible', false)
}

onMounted(async () => {
  try {
    const res = await elementsApi.list()
    elements.value = res.elements || []
  } catch {}
  fetchSkills()
})
</script>

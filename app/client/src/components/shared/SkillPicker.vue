<template>
  <div class="relative">
    <!-- Selected -->
    <div v-if="selectedSkill" class="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 dark:bg-white/5">
      <img v-if="selectedSkill.icon_url" :src="selectedSkill.icon_url" class="w-6 h-6 object-contain flex-shrink-0" />
      <img v-else-if="selectedSkill.element_icon" :src="selectedSkill.element_icon" class="w-6 h-6 object-contain flex-shrink-0" />
      <img v-if="selectedSkill.element_icon" :src="selectedSkill.element_icon" class="w-4 h-4 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium truncate">{{ selectedSkill.name }}</div>
      </div>
      <span class="text-[10px] text-muted flex-shrink-0">{{ selectedSkill.category }} {{ selectedSkill.power ? 'P' + selectedSkill.power : '' }}</span>
      <button @click="clear" class="text-[10px] text-primary-500 hover:underline flex-shrink-0">更换</button>
    </div>

    <!-- Not selected: search + browse -->
    <div v-else>
      <div class="flex gap-1.5">
        <input v-model="query" :placeholder="placeholder" class="input flex-1 text-xs"
          @input="searchDebounced" @focus="onFocus" />
        <button @click="openBrowser" class="btn-ghost text-xs whitespace-nowrap px-2" title="浏览选取">
          📋
        </button>
      </div>

      <!-- Search dropdown -->
      <div v-if="showDropdown && results.length > 0"
        class="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg shadow-lg border"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        <div v-for="skill in results" :key="skill.uid" @click="selectSkill(skill)"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
          :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'">
          <img v-if="skill.icon_url" :src="skill.icon_url" class="w-5 h-5 object-contain flex-shrink-0" />
          <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-5 h-5 object-contain flex-shrink-0" />
          <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-xs truncate">{{ skill.name }}</div>
          </div>
          <span class="text-[10px] text-muted flex-shrink-0">{{ skill.category }} {{ skill.power ? 'P' + skill.power : '' }}</span>
        </div>
      </div>

      <!-- No results -->
      <div v-if="showDropdown && query.length >= 1 && results.length === 0 && !loading"
        class="absolute z-50 top-full left-0 right-0 mt-1 px-3 py-2 rounded-lg shadow-lg border text-xs text-muted"
        :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'">
        未找到技能
      </div>

      <!-- Click outside to close -->
      <div v-if="showDropdown" class="fixed inset-0 z-40" @click="showDropdown = false"></div>
    </div>

    <!-- Browse modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showBrowser" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showBrowser = false">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            :class="isDark ? 'bg-gray-900' : 'bg-white'">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <h3 class="font-roco text-base text-primary-500">选择技能</h3>
              <button @click="showBrowser = false" class="text-muted hover:text-foreground text-lg">✕</button>
            </div>

            <!-- Filters -->
            <div class="px-5 py-3 border-b space-y-3" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <div class="flex flex-wrap gap-2">
                <input v-model="browseSearch" placeholder="搜索技能名称..." @input="debouncedBrowseFetch" class="input w-full sm:w-52 text-sm" />
                <select v-model="browseCategory" @change="browseFilterChanged" class="select text-sm">
                  <option value="">分类：全部</option>
                  <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
                </select>
                <select v-model="browseCounter" @change="browseFilterChanged" class="select text-sm">
                  <option value="">应对：不限</option>
                  <option value="none">应对：无</option>
                  <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
                </select>
                <select v-model="browseKeyword" @change="browseFilterChanged" class="select text-sm">
                  <option value="">效果：不限</option>
                  <option v-for="k in keywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
                </select>
                <span class="text-muted text-xs self-center ml-auto">共 {{ browseTotal }} 条</span>
              </div>
              <!-- Element filter icons -->
              <div class="flex flex-wrap gap-1.5">
                <button @click="browseElementId = ''; browseFilterChanged()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium transition-colors"
                  :class="!browseElementId ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
                  全
                </button>
                <button v-for="elem in elemList" :key="elem.id"
                  @click="browseElementId = elem.id; browseFilterChanged()"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  :class="browseElementId === elem.id ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
                  :title="elem.name">
                  <img :src="elem.icon" class="w-5 h-5" :alt="elem.name" />
                </button>
              </div>
            </div>

            <!-- Skill list -->
            <div class="flex-1 overflow-y-auto px-5 py-3">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-muted text-xs">
                    <th class="py-2 px-2 w-10">图标</th>
                    <th class="py-2 px-2">名称</th>
                    <th class="py-2 px-2">属性</th>
                    <th class="py-2 px-2">分类</th>
                    <th class="py-2 px-2 w-12">能耗</th>
                    <th class="py-2 px-2 w-12">威力</th>
                    <th class="py-2 px-2">效果</th>
                    <th class="py-2 px-2 w-12">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="skill in browseSkills" :key="skill.uid"
                    class="border-t transition-colors cursor-pointer"
                    :class="isDark ? 'border-gray-700 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'"
                    @click="selectFromBrowser(skill)">
                    <td class="py-2 px-2">
                      <img v-if="skill.icon_url" :src="skill.icon_url" class="w-6 h-6 object-contain" />
                      <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-6 h-6 object-contain" />
                      <span v-else class="w-6 h-6 inline-block"></span>
                    </td>
                    <td class="py-2 px-2 font-medium text-xs">{{ skill.name }}</td>
                    <td class="py-2 px-2">
                      <span class="flex items-center gap-1">
                        <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4" />
                        <span class="text-xs" :style="{ color: skill.element_color }">{{ skill.element_name }}</span>
                      </span>
                    </td>
                    <td class="py-2 px-2">
                      <span class="text-xs font-medium" :style="{ color: getCategoryColor(skill.category) }">{{ skill.category }}</span>
                    </td>
                    <td class="py-2 px-2 text-center text-xs">{{ skill.cost }}</td>
                    <td class="py-2 px-2 text-center text-xs">{{ skill.power }}</td>
                    <td class="py-2 px-2 text-xs text-muted max-w-[200px] truncate" :title="skill.description">{{ skill.description }}</td>
                    <td class="py-2 px-2 text-center">
                      <button @click.stop="selectFromBrowser(skill)" class="text-primary-500 hover:text-primary-600 text-xs font-medium">选择</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!browseSkills.length && !browseLoading" class="text-center text-muted text-xs py-8">无匹配技能</div>
              <div v-if="browseLoading" class="text-center text-muted text-xs py-8">加载中...</div>
            </div>

            <!-- Pagination -->
            <div v-if="browseTotal > browseLimit" class="flex justify-center items-center gap-3 px-5 py-3 border-t" :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <button @click="browsePage > 1 && (browsePage--, fetchBrowseSkills())" :disabled="browsePage <= 1" class="btn-ghost text-xs">← 上一页</button>
              <span class="text-xs text-muted">{{ browsePage }} / {{ Math.ceil(browseTotal / browseLimit) }}</span>
              <button @click="browsePage < Math.ceil(browseTotal / browseLimit) && (browsePage++, fetchBrowseSkills())"
                :disabled="browsePage >= Math.ceil(browseTotal / browseLimit)" class="btn-ghost text-xs">下一页 →</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { skillsApi, elementsApi } from '@/api'
import { categoryColor as getCategoryColor } from '@/constants/categoryColors'

const { isDark } = useTheme()

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索技能名称...' },
})

const emit = defineEmits(['update:modelValue', 'selected'])

// === Quick search mode ===
const query = ref('')
const results = ref([])
const selectedSkill = ref(null)
const showDropdown = ref(false)
const loading = ref(false)

let timer = null
function searchDebounced() {
  clearTimeout(timer)
  if (!query.value.trim()) { results.value = []; showDropdown.value = false; return }
  showDropdown.value = true
  timer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await skillsApi.list({ search: query.value.trim(), limit: 20 })
      results.value = res.skills || []
    } catch { results.value = [] }
    loading.value = false
  }, 200)
}

function onFocus() {
  if (query.value.trim() && results.value.length) showDropdown.value = true
}

function selectSkill(skill) {
  selectedSkill.value = skill
  showDropdown.value = false
  query.value = ''
  results.value = []
  emit('update:modelValue', skill.uid)
  emit('selected', skill)
}

function clear() {
  selectedSkill.value = null
  emit('update:modelValue', '')
  emit('selected', null)
}

// === Browse modal mode ===
const showBrowser = ref(false)
const browseSkills = ref([])
const browseTotal = ref(0)
const browsePage = ref(1)
const browseLimit = ref(30)
const browseSearch = ref('')
const browseCategory = ref('')
const browseCounter = ref('')
const browseElementId = ref('')
const browseKeyword = ref('')
const browseLoading = ref(false)
const elemList = ref([])

const keywordOptions = [
  { value: '连击', label: '连击' },
  { value: '回复', label: '回复' },
  { value: '吸血', label: '吸血' },
  { value: '永久', label: '永久增益' },
  { value: '印记', label: '印记' },
  { value: '驱散', label: '驱散' },
  { value: '打断', label: '打断' },
  { value: '脱离', label: '脱离' },
  { value: '更换', label: '更换精灵' },
  { value: '先手', label: '先手' },
  { value: '迸发', label: '迸发' },
  { value: '迅捷', label: '迅捷' },
  { value: '蓄力', label: '蓄力' },
  { value: '中毒', label: '中毒' },
  { value: '灼烧', label: '灼烧' },
  { value: '冻结', label: '冻结' },
  { value: '萌化', label: '萌化' },
  { value: '奉献', label: '奉献' },
]

async function openBrowser() {
  showBrowser.value = true
  if (elemList.value.length === 0) {
    try {
      const res = await elementsApi.list()
      elemList.value = res.elements || []
    } catch (err) { console.error('[SkillPicker]', err) }
  }
  browsePage.value = 1
  fetchBrowseSkills()
}

let browseDebounceTimer = null
function debouncedBrowseFetch() {
  clearTimeout(browseDebounceTimer)
  browseDebounceTimer = setTimeout(() => { browsePage.value = 1; fetchBrowseSkills() }, 300)
}

function browseFilterChanged() {
  browsePage.value = 1
  fetchBrowseSkills()
}

async function fetchBrowseSkills() {
  browseLoading.value = true
  try {
    const res = await skillsApi.list({
      page: browsePage.value,
      limit: browseLimit.value,
      search: browseSearch.value,
      category: browseCategory.value,
      counter: browseCounter.value,
      element_id: browseElementId.value,
      keyword: browseKeyword.value,
    })
    browseSkills.value = res.skills || []
    browseTotal.value = res.total || 0
  } catch (err) {
    console.error('[SkillPicker]', err)
    browseSkills.value = []
  }
  browseLoading.value = false
}

function selectFromBrowser(skill) {
  selectedSkill.value = skill
  showBrowser.value = false
  emit('update:modelValue', skill.uid)
  emit('selected', skill)
}

// === Initial load ===
async function loadInitial() {
  if (!props.modelValue) return
  try {
    const skill = await skillsApi.get(props.modelValue)
    if (skill) selectedSkill.value = skill
  } catch (err) {
    console.error('[SkillPicker]', err)
  }
}

watch(() => props.modelValue, (val) => {
  if (!val) {
    selectedSkill.value = null
  } else if (!selectedSkill.value || selectedSkill.value.uid !== val) {
    loadInitial()
  }
}, { immediate: true })
</script>

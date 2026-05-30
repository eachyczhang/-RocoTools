<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <router-link to="/admin/dashboard" class="text-muted hover:text-primary-500 text-sm">← 返回</router-link>
        <h1 class="font-roco text-xl md:text-2xl text-primary-500">图鉴课题管理</h1>
      </div>
      <div class="text-muted text-sm">共 {{ total }} 只</div>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <input v-model="searchInput" @input="debouncedSearch" placeholder="搜索精灵名称/UID..."
          class="input flex-1 min-w-[160px]" />
        <select v-model="filters.element_id" @change="loadList(1)" class="input w-auto">
          <option value="">全部属性</option>
          <option v-for="el in elements" :key="el.id" :value="el.id">{{ el.name }}</option>
        </select>
        <select v-model="filters.achievement_filter" @change="loadList(1)" class="input w-auto">
          <option value="all">全部状态</option>
          <option value="default_only">仅默认课题</option>
          <option value="has_custom">有自定义课题</option>
          <option value="no_achievements">无课题</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-muted">加载中...</div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div v-for="pet in pets" :key="pet.uid" class="card">
        <!-- Pet header -->
        <div class="flex items-center gap-3 mb-2">
          <img :src="pet.thumb_url" :alt="pet.name"
            class="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-white/5 flex-shrink-0"
            @error="e => e.target.style.display='none'" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-sm">{{ pet.name }}</span>
              <span class="text-xs text-muted">({{ pet.uid }})</span>
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4" />
              <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-4 h-4" />
              <span v-if="pet.is_final_form" class="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">⭐最终形态</span>
              <span v-if="pet.is_boss_form" class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">👑首领形态</span>
              <span v-if="pet.has_boss_form && !pet.is_boss_form" class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">有首领形态</span>
            </div>
          </div>
        </div>

        <!-- Boss form notice -->
        <div v-if="pet.is_boss_form" class="text-sm text-muted italic pl-13">
          ⚠️ 首领形态，不展示图鉴课题
        </div>

        <!-- Achievement summary -->
        <template v-else>
          <div class="pl-13 text-xs space-y-1" v-if="editingUid !== pet.uid">
            <div class="text-muted">
              <span class="font-medium">默认({{ pet.default_count }})：</span>
              <span v-if="pet.default_count > 0">
                {{ getDefaultTitles(pet) }}
              </span>
              <span v-else class="italic">无</span>
              <span v-if="pet.hidden_count > 0" class="ml-1 text-orange-500">（{{ pet.hidden_count }}项已隐藏）</span>
            </div>
            <div class="text-muted">
              <span class="font-medium">自定义({{ pet.custom_count }})：</span>
              <span v-if="pet.custom_count > 0">
                {{ getCustomTitles(pet) }}
              </span>
              <span v-else class="italic">暂无</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="pl-13 mt-2 flex gap-2" v-if="editingUid !== pet.uid">
            <button @click="startEdit(pet)" class="text-xs text-primary-500 hover:underline">编辑课题</button>
            <router-link :to="`/admin/pets/${pet.uid}`" class="text-xs text-muted hover:text-primary-500">跳转详情</router-link>
          </div>

          <!-- Inline editor -->
          <div v-if="editingUid === pet.uid" class="pl-13 mt-3 border-t pt-3 dark:border-white/10">
            <!-- Default achievements -->
            <div class="mb-3">
              <div class="text-xs font-medium text-muted mb-2">📋 默认课题：</div>
              <div class="space-y-1.5">
                <div v-for="a in editDefaults" :key="a.id"
                  class="flex items-center justify-between text-sm"
                  :class="a.hidden ? 'line-through opacity-50' : ''">
                  <span>{{ a.title || '(无标题)' }}</span>
                  <button @click="toggleHidden(a)" class="text-xs px-2 py-0.5 rounded"
                    :class="a.hidden ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'">
                    {{ a.hidden ? '已隐藏' : '显示中' }}
                  </button>
                </div>
                <div v-if="editDefaults.length === 0" class="text-xs text-muted italic">无默认课题</div>
              </div>
            </div>

            <!-- Custom achievements -->
            <div class="mb-3">
              <div class="text-xs font-medium text-muted mb-2">✏️ 自定义课题：</div>
              <div class="space-y-2">
                <div v-for="(a, idx) in editCustoms" :key="idx"
                  class="flex items-center gap-2 text-sm">
                  <span v-if="a.type === 'skill'" class="text-xs">🎯</span>
                  <span v-else class="text-xs">📝</span>
                  <span class="flex-1">
                    <template v-if="a.type === 'skill'">
                      使用{{ a.use_count }}次{{ a.skill_name }}
                      <span v-if="a.reward_desc" class="text-muted text-xs ml-1">[{{ a.reward_desc }}]</span>
                    </template>
                    <template v-else>{{ a.title }}</template>
                  </span>
                  <button @click="editCustoms.splice(idx, 1)" class="text-xs text-red-500 hover:underline">删除</button>
                </div>
                <div v-if="editCustoms.length === 0" class="text-xs text-muted italic">暂无自定义课题</div>
              </div>
            </div>

            <!-- Add buttons -->
            <div class="flex flex-wrap gap-2 mb-3">
              <button @click="addTextAchievement" class="text-xs btn-outline">+ 添加文本课题</button>
              <button @click="addSkillAchievement" class="text-xs btn-outline">+ 添加技能课题</button>
            </div>

            <!-- Add form (text) -->
            <div v-if="showAddText" class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3 space-y-2">
              <input v-model="newText.title" placeholder="课题标题" class="input w-full text-sm" />
              <input v-model="newText.reward_desc" placeholder="奖励描述（可选）" class="input w-full text-sm" />
              <div class="flex gap-2">
                <button @click="confirmAddText" class="btn text-xs">确认添加</button>
                <button @click="showAddText = false" class="text-xs text-muted hover:underline">取消</button>
              </div>
            </div>

            <!-- Add form (skill) -->
            <div v-if="showAddSkill" class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3 space-y-2">
              <input v-model="skillSearchQuery" @input="searchSkills" placeholder="搜索技能名称..." class="input w-full text-sm" />
              <div v-if="skillResults.length > 0" class="max-h-32 overflow-y-auto space-y-1">
                <button v-for="sk in skillResults" :key="sk.uid" @click="selectSkill(sk)"
                  class="block w-full text-left text-sm px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-500/10">
                  {{ sk.name }} <span class="text-xs text-muted">({{ sk.element_name }})</span>
                </button>
              </div>
              <div v-if="selectedSkill" class="text-sm">
                已选：<span class="font-medium">{{ selectedSkill.name }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <label class="text-xs text-muted">使用次数：</label>
                  <input v-model.number="newSkill.use_count" type="number" min="1" max="99" class="input w-16 text-sm" />
                </div>
                <input v-model="newSkill.reward_desc" placeholder="奖励描述（可选，如：「技能名」技能石）" class="input w-full text-sm mt-1" />
              </div>
              <div class="flex gap-2">
                <button @click="confirmAddSkill" :disabled="!selectedSkill" class="btn text-xs">确认添加</button>
                <button @click="showAddSkill = false" class="text-xs text-muted hover:underline">取消</button>
              </div>
            </div>

            <!-- Save/Cancel -->
            <div class="flex justify-end gap-2 pt-2 border-t dark:border-white/10">
              <button @click="cancelEdit" class="text-xs text-muted hover:underline">取消</button>
              <button @click="saveEdit(pet.uid)" :disabled="saving" class="btn text-xs">
                {{ saving ? '保存中...' : '💾 保存课题' }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && pets.length === 0" class="text-center py-12 text-muted">
        没有找到匹配的精灵
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 mt-6">
      <button @click="loadList(page - 1)" :disabled="page <= 1" class="btn text-sm">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ totalPages }}</span>
      <button @click="loadList(page + 1)" :disabled="page >= totalPages" class="btn text-sm">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { elementsApi } from '@/api'
import { useModal } from '@/composables/useModal'

const modal = useModal()

const loading = ref(false)
const saving = ref(false)
const pets = ref([])
const total = ref(0)
const page = ref(1)
const perPage = 20
const totalPages = computed(() => Math.ceil(total.value / perPage))
const elements = ref([])
const searchInput = ref('')

const filters = reactive({
  element_id: '',
  achievement_filter: 'all',
})

// Debounced search
let searchTimer = null
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(1), 300)
}

// Editing state
const editingUid = ref(null)
const editDefaults = ref([])
const editCustoms = ref([])

// Add text achievement
const showAddText = ref(false)
const newText = reactive({ title: '', reward_desc: '' })

// Add skill achievement
const showAddSkill = ref(false)
const skillSearchQuery = ref('')
const skillResults = ref([])
const selectedSkill = ref(null)
const newSkill = reactive({ use_count: 2, reward_desc: '' })

async function loadList(p = 1) {
  loading.value = true
  page.value = p
  try {
    const params = { page: p, limit: perPage }
    if (searchInput.value) params.search = searchInput.value
    if (filters.element_id) params.element_id = filters.element_id
    if (filters.achievement_filter !== 'all') params.achievement_filter = filters.achievement_filter

    const res = await adminApi.getAchievementsList(params)
    pets.value = res.pets || []
    total.value = res.total || 0
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    loading.value = false
  }
}

function getDefaultTitles(pet) {
  const defaults = (pet.achievements || []).filter(a => a.is_default)
  if (defaults.length === 0) return ''
  if (defaults.length <= 3) return defaults.map(a => a.title).join(' | ')
  return defaults.slice(0, 2).map(a => a.title).join(' | ') + ` | ...共${defaults.length}项`
}

function getCustomTitles(pet) {
  const customs = (pet.achievements || []).filter(a => !a.is_default)
  return customs.map(a => {
    if (a.type === 'skill') return `🎯 使用${a.use_count}次${a.skill_name}`
    return `📝 ${a.title}`
  }).join(' | ')
}

function startEdit(pet) {
  editingUid.value = pet.uid
  const achievements = pet.achievements || []
  editDefaults.value = achievements.filter(a => a.is_default).map(a => ({ ...a }))
  editCustoms.value = achievements.filter(a => !a.is_default).map(a => ({ ...a }))
  showAddText.value = false
  showAddSkill.value = false
}

function cancelEdit() {
  editingUid.value = null
  editDefaults.value = []
  editCustoms.value = []
  showAddText.value = false
  showAddSkill.value = false
}

async function toggleHidden(achievement) {
  try {
    const res = await adminApi.toggleAchievementHidden(achievement.id)
    achievement.hidden = res.hidden
    // Update the pet in list
    const pet = pets.value.find(p => p.uid === editingUid.value)
    if (pet) {
      const a = pet.achievements.find(x => x.id === achievement.id)
      if (a) a.hidden = res.hidden
      pet.hidden_count = pet.achievements.filter(x => x.hidden).length
    }
  } catch (err) {
    await modal.alert('操作失败', err.message)
  }
}

function addTextAchievement() {
  showAddText.value = true
  showAddSkill.value = false
  newText.title = ''
  newText.reward_desc = ''
}

function confirmAddText() {
  if (!newText.title.trim()) return
  editCustoms.value.push({
    type: 'text',
    title: newText.title.trim(),
    reward_desc: newText.reward_desc.trim() || null,
    skill_ref_uid: null,
    skill_name: null,
    use_count: 0,
  })
  showAddText.value = false
}

function addSkillAchievement() {
  showAddSkill.value = true
  showAddText.value = false
  skillSearchQuery.value = ''
  skillResults.value = []
  selectedSkill.value = null
  newSkill.use_count = 2
  newSkill.reward_desc = ''
}

let skillSearchTimer = null
function searchSkills() {
  clearTimeout(skillSearchTimer)
  skillSearchTimer = setTimeout(async () => {
    if (!skillSearchQuery.value.trim()) { skillResults.value = []; return }
    try {
      skillResults.value = await adminApi.searchSkills(skillSearchQuery.value)
    } catch { skillResults.value = [] }
  }, 200)
}

function selectSkill(sk) {
  selectedSkill.value = sk
  skillResults.value = []
  skillSearchQuery.value = sk.name
  newSkill.reward_desc = `「${sk.name}」技能石`
}

function confirmAddSkill() {
  if (!selectedSkill.value) return
  editCustoms.value.push({
    type: 'skill',
    title: null,
    skill_ref_uid: selectedSkill.value.uid,
    skill_name: selectedSkill.value.name,
    use_count: newSkill.use_count || 2,
    reward_desc: newSkill.reward_desc.trim() || null,
  })
  showAddSkill.value = false
  selectedSkill.value = null
}

async function saveEdit(uid) {
  saving.value = true
  try {
    await adminApi.savePetAchievements(uid, editCustoms.value)
    await modal.success('保存成功', '自定义课题已更新')
    cancelEdit()
    loadList(page.value)
  } catch (err) {
    await modal.alert('保存失败', err.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await elementsApi.list()
    elements.value = res.elements || res.data || []
  } catch { elements.value = [] }
  loadList(1)
})
</script>

<style scoped>
.pl-13 {
  padding-left: 3.25rem;
}

.btn-outline {
  @apply px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors;
  @apply border-primary-300 text-primary-600 hover:bg-primary-50;
}

.dark .btn-outline {
  @apply border-primary-500/30 text-primary-400 hover:bg-primary-500/10;
}
</style>

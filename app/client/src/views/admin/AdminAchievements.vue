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
    <div v-else class="space-y-4">
      <div v-for="pet in pets" :key="pet.uid" class="card">
        <!-- Pet header -->
        <div class="flex items-start sm:items-center gap-3 sm:gap-4">
          <img :src="pet.thumb_url" :alt="pet.name"
            class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover bg-gray-100 dark:bg-white/5 flex-shrink-0"
            @error="e => e.target.style.display='none'" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-medium text-sm sm:text-base">{{ pet.name }}</span>
              <span class="text-[11px] sm:text-xs text-muted font-mono">({{ pet.uid }})</span>
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 sm:w-5 sm:h-5" />
              <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-4 h-4 sm:w-5 sm:h-5" />
              <span v-if="pet.is_final_form" class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">⭐最终形态</span>
              <span v-if="pet.is_boss_form" class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">👑首领形态</span>
              <span v-if="pet.has_boss_form && !pet.is_boss_form" class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">有首领形态</span>
            </div>
            <!-- Quick actions (mobile: below info) -->
            <div v-if="!pet.is_boss_form && editingUid !== pet.uid" class="flex gap-3 mt-1.5 sm:hidden">
              <button @click="startEdit(pet)" class="text-xs text-primary-500 hover:underline font-medium">编辑课题</button>
              <router-link :to="`/admin/pets/${pet.uid}`" class="text-xs text-muted hover:text-primary-500">跳转详情</router-link>
            </div>
          </div>
          <!-- Quick actions (tablet+: right side) -->
          <div v-if="!pet.is_boss_form && editingUid !== pet.uid" class="hidden sm:flex gap-3 flex-shrink-0">
            <button @click="startEdit(pet)" class="text-sm text-primary-500 hover:underline font-medium">编辑课题</button>
            <router-link :to="`/admin/pets/${pet.uid}`" class="text-sm text-muted hover:text-primary-500">跳转详情</router-link>
          </div>
        </div>

        <!-- Boss form notice -->
        <div v-if="pet.is_boss_form" class="text-sm text-muted italic mt-3 pl-[3.75rem] sm:pl-[4.5rem] md:pl-20">
          ⚠️ 首领形态，不展示图鉴课题
        </div>

        <!-- Achievement cards (summary mode) -->
        <template v-else-if="editingUid !== pet.uid">
          <div class="mt-3 space-y-2 pl-0 sm:pl-[4.5rem] md:pl-20">
            <div v-for="a in pet.achievements" :key="a.id"
              class="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg text-sm"
              :class="[a.hidden ? 'bg-gray-100/50 dark:bg-white/[0.02] opacity-50' : 'bg-gray-50 dark:bg-white/5']">
              <!-- Type badge -->
              <span class="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                :class="a.is_default ? 'bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400' : (a.type === 'skill' ? 'bg-primary-500/15 text-primary-500' : 'bg-gray-200 dark:bg-white/10 text-muted')">
                {{ a.is_default ? '默认' : (a.type === 'skill' ? '技能' : '文本') }}
              </span>
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <template v-if="a.type === 'skill' && !a.is_default">
                  <div class="flex items-center gap-2">
                    <img v-if="a.skill_icon" :src="a.skill_icon" class="w-5 h-5 rounded object-contain flex-shrink-0" />
                    <span class="font-medium" :class="a.hidden ? 'line-through' : ''">使用{{ a.use_count }}次{{ a.skill_name }}</span>
                    <span v-if="a.reward_desc" class="text-muted ml-1">[{{ a.reward_desc }}]</span>
                  </div>
                </template>
                <template v-else>
                  <span :class="a.hidden ? 'line-through text-muted' : ''">{{ a.title }}</span>
                  <span v-if="!a.is_default && a.reward_desc" class="text-muted ml-1">[{{ a.reward_desc }}]</span>
                </template>
              </div>
              <!-- Hidden indicator -->
              <span v-if="a.hidden" class="text-[10px] text-red-400 flex-shrink-0">已隐藏</span>
            </div>
            <!-- Empty state -->
            <div v-if="!pet.achievements || pet.achievements.length === 0" class="text-xs text-muted italic py-2">
              暂无课题配置
            </div>
          </div>
        </template>

        <!-- ========== Inline Editor ========== -->
        <template v-else>
          <div class="mt-4 pl-0 sm:pl-[4.5rem] md:pl-20 border-t pt-4 dark:border-white/10">
            <!-- All achievements in card style -->
            <div class="space-y-2 mb-3">
              <!-- Default achievements -->
              <div v-for="a in editDefaults" :key="'d-' + a.id"
                class="flex items-center gap-2 p-3 rounded-lg"
                :class="[a.hidden ? 'bg-gray-100/50 dark:bg-white/[0.02] opacity-60' : 'bg-gray-50 dark:bg-white/5']">
                <span class="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400">默认</span>
                <div class="flex-1 min-w-0">
                  <div class="text-xs" :class="a.hidden ? 'line-through text-muted' : ''">{{ a.title }}</div>
                </div>
                <button @click="toggleHidden(a)" class="text-sm flex-shrink-0" :title="a.hidden ? '点击显示' : '点击隐藏'">
                  {{ a.hidden ? '👁️‍🗨️' : '👁️' }}
                </button>
              </div>

              <!-- Custom achievements -->
              <div v-for="(a, idx) in editCustoms" :key="'c-' + idx"
                class="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                <!-- Type badge -->
                <span class="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                  :class="a.type === 'skill' ? 'bg-primary-500/15 text-primary-500' : 'bg-gray-200 dark:bg-white/10 text-muted'">
                  {{ a.type === 'skill' ? '技能' : '文本' }}
                </span>
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <template v-if="a.type === 'skill'">
                    <div class="flex items-center gap-2">
                      <img v-if="a.skill_icon" :src="a.skill_icon" class="w-6 h-6 rounded object-contain flex-shrink-0" />
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-medium">使用{{ a.use_count }}次{{ a.skill_name }}</div>
                        <div v-if="a.reward_desc" class="text-[10px] text-muted">奖励：{{ a.reward_desc }}</div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-xs font-medium">{{ a.title }}</div>
                    <div v-if="a.reward_desc" class="text-[10px] text-muted">奖励：{{ a.reward_desc }}</div>
                  </template>
                </div>
                <!-- Actions -->
                <button @click="editCustoms.splice(idx, 1)" class="text-red-400 hover:text-red-600 text-xs flex-shrink-0" title="删除">✕</button>
              </div>

              <div v-if="editDefaults.length === 0 && editCustoms.length === 0" class="text-center text-xs text-muted py-4">暂无课题</div>
            </div>

            <!-- Add buttons -->
            <div class="flex gap-2 mb-3 flex-wrap">
              <button @click="addSkillAchievement" class="text-xs text-primary-500 hover:underline">+ 添加技能课题</button>
              <button @click="addTextAchievement" class="text-xs text-primary-500 hover:underline">+ 添加文本课题</button>
              <button @click="loadSiblings(pet)" class="text-xs text-blue-500 hover:underline" :disabled="loadingSiblings">
                {{ loadingSiblings ? '加载中...' : '📋 从其他形态复制' }}
              </button>
            </div>

            <!-- Sibling copy panel -->
            <div v-if="showSiblingPanel && siblings.length > 0" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 mb-3">
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">选择要复制课题的形态：</div>
              <div class="space-y-2">
                <div v-for="sib in siblings" :key="sib.uid"
                  class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-white/5">
                  <img :src="sib.thumb_url" class="w-8 h-8 rounded-full object-cover flex-shrink-0" @error="e => e.target.style.display='none'" />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium">{{ sib.name }} <span class="text-muted">({{ sib.uid }})</span></div>
                    <div class="text-[10px] text-muted">
                      {{ sib.achievements.length > 0 ? sib.achievements.map(a => a.type === 'skill' ? `🎯${a.skill_name}` : `📝${a.title}`).join(' | ') : '暂无自定义课题' }}
                    </div>
                  </div>
                  <button v-if="sib.achievements.length > 0" @click="copySiblingAchievements(sib)"
                    class="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 flex-shrink-0">
                    复制({{ sib.achievements.length }})
                  </button>
                  <span v-else class="text-[10px] text-muted flex-shrink-0">无课题</span>
                </div>
              </div>
              <div class="flex justify-end mt-2">
                <button @click="showSiblingPanel = false" class="text-xs text-muted hover:underline">关闭</button>
              </div>
            </div>
            <div v-if="showSiblingPanel && siblings.length === 0 && !loadingSiblings" class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3 text-xs text-muted text-center">
              该精灵没有其他形态
            </div>

            <!-- Add text form -->
            <div v-if="showAddText" class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3 space-y-2">
              <div class="text-xs font-medium text-muted mb-1">添加文本课题</div>
              <input v-model="newText.title" placeholder="课题描述（如：累计登录7天）" class="input w-full text-xs" />
              <input v-model="newText.reward_desc" placeholder="奖励描述（可选）" class="input w-full text-xs" />
              <div class="flex gap-2 pt-1">
                <button @click="confirmAddText" class="btn text-xs">确认添加</button>
                <button @click="showAddText = false" class="text-xs text-muted hover:underline">取消</button>
              </div>
            </div>

            <!-- Add skill form -->
            <div v-if="showAddSkill" class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3">
              <div class="text-xs font-medium text-muted mb-2">添加技能课题</div>
              <!-- Skill search -->
              <div class="relative mb-2">
                <input v-model="skillSearchQuery" @input="searchSkills" placeholder="搜索技能名称..."
                  class="input w-full text-xs" />
                <!-- Skill dropdown results -->
                <div v-if="skillResults.length > 0"
                  class="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div v-for="sk in skillResults" :key="sk.uid"
                    @click="selectSkill(sk)"
                    class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <img v-if="sk.element_icon" :src="sk.element_icon" class="w-5 h-5 object-contain flex-shrink-0 rounded" />
                    <div v-else class="w-5 h-5 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-medium truncate">{{ sk.name }}</div>
                      <div class="text-[10px] text-muted">{{ sk.element_name || '无属性' }} · {{ sk.category || '-' }} · 威力 {{ sk.power || '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Selected skill display -->
              <div v-if="selectedSkill" class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 mb-2">
                <img v-if="selectedSkill.element_icon" :src="selectedSkill.element_icon" class="w-6 h-6 object-contain flex-shrink-0 rounded" />
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium truncate">{{ selectedSkill.name }}</div>
                  <div class="text-[10px] text-muted">{{ selectedSkill.element_name || '无属性' }} · {{ selectedSkill.category || '-' }} · 威力 {{ selectedSkill.power || '-' }}</div>
                </div>
                <button @click="selectedSkill = null" class="text-[10px] text-muted hover:text-red-500 flex-shrink-0">✕</button>
              </div>
              <!-- Use count & reward -->
              <div v-if="selectedSkill" class="space-y-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted">使用次数</span>
                  <input v-model.number="newSkill.use_count" type="number" min="1" max="99" class="input text-xs w-16 text-center" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted">奖励描述</span>
                  <input v-model="newSkill.reward_desc" class="input text-xs flex-1" placeholder="如：「技能名」技能石" />
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="confirmAddSkill" :disabled="!selectedSkill" class="btn text-xs">确认添加</button>
                <button @click="showAddSkill = false" class="text-xs text-muted hover:underline">取消</button>
              </div>
            </div>

            <!-- Save/Cancel -->
            <div class="flex justify-end gap-3 pt-2 border-t dark:border-white/10">
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

    <!-- Pagination (sticky bottom) -->
    <div v-if="totalPages > 1"
      class="sticky bottom-0 z-10 flex items-center justify-center gap-4 py-3 mt-4 -mx-4 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
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
const perPage = 10
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

// Sibling copy
const showSiblingPanel = ref(false)
const siblings = ref([])
const loadingSiblings = ref(false)

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

function startEdit(pet) {
  editingUid.value = pet.uid
  const achievements = pet.achievements || []
  editDefaults.value = achievements.filter(a => a.is_default).map(a => ({ ...a }))
  editCustoms.value = achievements.filter(a => !a.is_default).map(a => ({ ...a }))
  showAddText.value = false
  showAddSkill.value = false
  showSiblingPanel.value = false
  siblings.value = []
}

function cancelEdit() {
  editingUid.value = null
  editDefaults.value = []
  editCustoms.value = []
  showAddText.value = false
  showAddSkill.value = false
  showSiblingPanel.value = false
  siblings.value = []
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
    skill_icon: null,
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
    skill_icon: selectedSkill.value.element_icon || null,
  })
  showAddSkill.value = false
  selectedSkill.value = null
}

async function loadSiblings(pet) {
  if (showSiblingPanel.value) { showSiblingPanel.value = false; return }
  loadingSiblings.value = true
  try {
    const res = await adminApi.getPetSiblings(pet.uid)
    siblings.value = res.siblings || []
    showSiblingPanel.value = true
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    loadingSiblings.value = false
  }
}

function copySiblingAchievements(sib) {
  const copied = sib.achievements.map(a => ({
    type: a.type,
    title: a.title || null,
    skill_ref_uid: a.skill_ref_uid || null,
    skill_name: a.skill_name || null,
    use_count: a.use_count || 0,
    reward_desc: a.reward_desc || null,
    skill_icon: a.skill_icon || a.skill_element_icon || null,
  }))
  // Append to existing customs (avoid duplicates by skill_ref_uid)
  for (const c of copied) {
    if (c.type === 'skill' && c.skill_ref_uid) {
      const exists = editCustoms.value.some(e => e.type === 'skill' && e.skill_ref_uid === c.skill_ref_uid)
      if (exists) continue
    }
    editCustoms.value.push(c)
  }
  showSiblingPanel.value = false
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
</style>

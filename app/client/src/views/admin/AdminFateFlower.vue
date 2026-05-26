
<template>
  <div>
    <router-link to="/admin/pika" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回皮卡月刊</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-pink-500 mb-4">🌸 命定花种技能配置</h1>

    <!-- Counter-picks toggle -->
    <div class="flex items-center gap-3 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="counterPicksEnabled" @change="toggleCounterPicks" class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer" />
        <span class="text-sm font-medium">启用反制推荐模块</span>
      </label>
      <span class="text-xs text-muted">（开启后用户端命定花种页面将显示反制推荐）</span>
    </div>

    <!-- Loading -->
    <div v-if="!loaded" class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!allPets.length" class="text-center mt-20">
      <div class="text-4xl mb-3">🌸</div>
      <p class="text-muted">暂无命定花种精灵数据</p>
      <p class="text-xs text-muted mt-2">请先在皮卡月刊中配置精灵并同步活动</p>
    </div>

    <template v-else>
      <!-- Pet selector tabs with avatars (same as user page) -->
      <div class="border-b border-surface-light-border dark:border-surface-dark-border mb-5">
        <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-1 pt-1">
          <button
            v-for="pet in allPets"
            :key="pet.uid"
            @click="selectPet(pet)"
            class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer flex-shrink-0"
            :class="selectedPet && selectedPet.uid === pet.uid
              ? 'bg-pink-100 dark:bg-pink-500/20 ring-2 ring-pink-400 dark:ring-pink-500/50'
              : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 opacity-70 hover:opacity-100'"
          >
            <img :src="pet.icon" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" :alt="pet.name" />
            <span class="text-xs sm:text-sm font-medium whitespace-nowrap mt-1">{{ pet.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selected pet detail + skill config -->
      <div v-if="selectedPet && petDetail" class="space-y-5">
        <!-- Pet info card (compact) -->
        <div class="card">
          <div class="flex items-center gap-4">
            <img :src="petDetail.detail?.image_default || petDetail.image_url" class="w-20 h-20 object-contain flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h2 class="font-roco text-lg">{{ petDetail.name }}</h2>
                <div class="flex items-center gap-1">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-4 h-4" />
                  <span class="text-xs">{{ petDetail.element_name }}</span>
                </div>
                <span class="text-muted text-xs">|</span>
                <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-3 h-3" />
                  <span class="text-[10px] font-medium text-purple-600 dark:text-purple-400">血脉：{{ petDetail.element_name }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5 text-xs">
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">种族值 <strong class="text-primary-500">{{ petDetail.total }}</strong></span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">生命 {{ petDetail.hp }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">物攻 {{ petDetail.atk }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">魔攻 {{ petDetail.matk }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">物防 {{ petDetail.def }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">魔防 {{ petDetail.mdef }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">速度 {{ petDetail.speed }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Nature configuration -->
        <div class="card">
          <h3 class="font-roco text-base text-pink-500 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            固定性格
          </h3>
          <div class="flex items-center gap-3">
            <select v-model="selectedNature" class="input text-sm w-48">
              <option value="">未配置</option>
              <option v-for="n in naturesList" :key="n.id" :value="n.name">
                {{ n.name }}（+{{ n.stat_up }} -{{ n.stat_down }}）
              </option>
            </select>
            <button @click="saveNature" :disabled="savingNature" class="btn-primary px-4 py-1.5 text-xs font-medium">
              {{ savingNature ? '保存中...' : '保存性格' }}
            </button>
            <span v-if="selectedNature" class="text-xs text-muted">
              当前：<strong class="text-foreground">{{ selectedNature }}</strong>
            </span>
          </div>
        </div>

        <!-- Skill configuration -->
        <div class="card">
          <h3 class="font-roco text-base text-pink-500 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            技能配置
            <span class="text-xs font-normal text-muted">（最多 3 个，愿力冲击为固定技能无需配置）</span>
          </h3>

          <!-- 固定技能：愿力冲击 -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 mb-4">
            <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-8 h-8 object-contain rounded" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">愿力冲击</span>
                <span v-if="elemMap[petDetail.element_name]" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                  :style="{ background: elemMap[petDetail.element_name].color + '18', color: elemMap[petDetail.element_name].color }">
                  <img :src="elemMap[petDetail.element_name].icon" class="w-3.5 h-3.5" />
                  {{ petDetail.element_name }}
                </span>
              </div>
            </div>
            <span class="text-xs text-pink-500 font-medium px-2 py-1 rounded bg-pink-100 dark:bg-pink-500/20">固定技能</span>
          </div>

          <!-- 3 skill slots -->
          <div class="space-y-4">
            <div v-for="(slot, idx) in skillSlots" :key="idx" class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <!-- Slot header -->
              <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                    :class="slot.skill_ref_uid ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-gray-200 dark:bg-gray-600 text-muted'">{{ idx + 1 }}</span>
                  <span class="text-sm font-medium">技能槽 {{ idx + 1 }}</span>
                  <span v-if="slot.skill_source" class="text-[10px] px-1.5 py-0.5 rounded-full"
                    :class="sourceTagClass(slot.skill_source)">{{ sourceLabel(slot.skill_source) }}</span>
                </div>
                <button v-if="slot.skill_ref_uid" @click="clearSlot(idx)" class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded cursor-pointer">清除</button>
              </div>

              <div class="p-4">
                <!-- Source selector -->
                <div class="flex items-center gap-3 mb-3">
                  <label class="text-xs text-muted flex-shrink-0">来源：</label>
                  <div class="flex gap-1.5">
                    <button v-for="src in ['skills', 'bloodline_skills', 'learnable_stones']" :key="src"
                      @click="setSource(idx, src)"
                      class="text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                      :class="slot.skill_source === src ? sourceTagClass(src) + ' ring-1 ring-current' : 'bg-gray-100 dark:bg-white/5 text-muted hover:bg-gray-200'">
                      {{ sourceLabel(src) }}
                    </button>
                  </div>
                </div>

                <!-- Skill search & select -->
                <div v-if="slot.skill_source">
                  <div class="relative mb-2">
                    <input
                      v-model="slot._search"
                      class="input w-full text-sm pl-8"
                      placeholder="搜索技能名称..."
                      @focus="slot._showList = true"
                      @blur="hideListDelayed(idx)"
                    />
                    <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>

                  <!-- Skill list -->
                  <div v-if="slot._showList || !slot.skill_ref_uid" class="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700" @mousedown.prevent>
                    <div
                      v-for="sk in getFilteredSkills(slot.skill_source, slot._search)"
                      :key="sk.skill_ref_uid || sk.uid || sk.name"
                      @click="pickSkill(idx, sk)"
                      class="flex items-center gap-2.5 px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-500/10 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                      :class="slot.skill_ref_uid === (sk.skill_ref_uid || sk.uid) ? 'bg-green-50 dark:bg-green-500/10' : ''"
                    >
                      <!-- Skill icon -->
                      <img v-if="sk.skill_icon" :src="sk.skill_icon" class="w-7 h-7 rounded object-contain flex-shrink-0" />
                      <img v-else-if="elemMap[sk.element]?.icon" :src="elemMap[sk.element].icon" class="w-7 h-7 rounded object-contain flex-shrink-0" />
                      <div v-else class="w-7 h-7 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                      <!-- Skill info -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-sm font-medium">{{ sk.name }}</span>
                          <span v-if="elemMap[sk.element]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                            :style="{ background: elemMap[sk.element].color + '15', color: elemMap[sk.element].color }">
                            <img :src="elemMap[sk.element].icon" class="w-3 h-3" />
                            {{ sk.element }}
                          </span>
                          <span v-if="sk.type" class="text-[10px] text-muted px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10">{{ sk.type }}</span>
                        </div>
                        <div v-if="sk.description" class="text-[10px] text-muted mt-0.5 truncate">{{ sk.description }}</div>
                      </div>
                      <!-- Power & cost -->
                      <div class="flex items-center gap-2 flex-shrink-0 text-xs text-center">
                        <div class="w-10">
                          <div class="text-[9px] text-muted">能耗</div>
                          <div class="font-medium">{{ sk.cost || '-' }}</div>
                        </div>
                        <div class="w-10">
                          <div class="text-[9px] text-muted">威力</div>
                          <div class="font-medium">{{ sk.power || '-' }}</div>
                        </div>
                      </div>
                      <!-- Selected indicator -->
                      <span v-if="slot.skill_ref_uid === (sk.skill_ref_uid || sk.uid)" class="text-green-500 text-sm">✓</span>
                    </div>
                    <div v-if="!getFilteredSkills(slot.skill_source, slot._search).length" class="text-center py-4 text-muted text-xs">
                      无匹配技能
                    </div>
                  </div>

                  <!-- Selected skill preview -->
                  <div v-if="slot.skill_ref_uid && !slot._showList" class="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
                    <div class="flex items-center gap-2.5">
                      <img v-if="slot.skill_icon" :src="slot.skill_icon" class="w-7 h-7 rounded object-contain flex-shrink-0" />
                      <img v-else-if="elemMap[slot.skill_element]?.icon" :src="elemMap[slot.skill_element].icon" class="w-7 h-7 rounded object-contain flex-shrink-0" />
                      <div v-else class="w-7 h-7 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="text-green-500 text-sm">✓</span>
                          <span class="font-medium text-sm">{{ slot.skill_name }}</span>
                          <span v-if="elemMap[slot.skill_element]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                            :style="{ background: elemMap[slot.skill_element].color + '15', color: elemMap[slot.skill_element].color }">
                            <img :src="elemMap[slot.skill_element].icon" class="w-3 h-3" />
                            {{ slot.skill_element }}
                          </span>
                          <span v-if="slot.skill_type" class="text-[10px] text-muted px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10">{{ slot.skill_type }}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0 text-xs text-center">
                        <div class="w-10">
                          <div class="text-[9px] text-muted">能耗</div>
                          <div class="font-medium">{{ slot.skill_cost != null ? slot.skill_cost : '-' }}</div>
                        </div>
                        <div class="w-10">
                          <div class="text-[9px] text-muted">威力</div>
                          <div class="font-medium">{{ slot.skill_power || '-' }}</div>
                        </div>
                      </div>
                      <button @click="slot._showList = true" class="text-xs text-primary-500 hover:underline flex-shrink-0 cursor-pointer">重新选择</button>
                    </div>
                  </div>
                </div>

                <div v-else class="text-center py-4 text-muted text-xs">请先选择技能来源</div>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <div class="flex justify-end mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button @click="saveSkillConfig" :disabled="saving" class="btn-primary px-6 py-2.5 text-sm font-medium">
              {{ saving ? '保存中...' : '💾 保存技能配置' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading pet detail -->
      <div v-else-if="selectedPet && !petDetail" class="text-muted text-center mt-10">
        <div class="animate-pulse">加载精灵信息...</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi, petsApi, elementsApi, eventsApi, naturesApi } from '@/api'
import { useModal } from '@/composables/useModal'

const modal = useModal()

const loaded = ref(false)
const events = ref([])
const selectedPet = ref(null)
const petDetail = ref(null)
const elemMap = ref({})
const saving = ref(false)
const currentMonthlyPetId = ref(null)
const naturesList = ref([])
const selectedNature = ref('')
const savingNature = ref(false)
const counterPicksEnabled = ref(false)

const skillSlots = ref([
  { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
  { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
  { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
])

// Pet skills cache
const petSkillsCache = ref({})

// Extract all unique pets from fate_flower events
const allPets = computed(() => {
  const petMap = new Map()
  for (const event of events.value) {
    const pets = parsePetIcons(event.pet_icon)
    for (const p of pets) {
      if (p.uid && !petMap.has(p.uid)) {
        petMap.set(p.uid, p)
      }
    }
  }
  return Array.from(petMap.values())
})

function parsePetIcons(petIcon) {
  if (!petIcon || !petIcon.startsWith('[')) return []
  try { return JSON.parse(petIcon) } catch { return [] }
}

function sourceLabel(source) {
  const map = { skills: '升级技能', bloodline_skills: '血脉技能', learnable_stones: '技能石' }
  return map[source] || source
}

function sourceTagClass(source) {
  const map = {
    skills: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    bloodline_skills: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    learnable_stones: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  }
  return map[source] || 'bg-gray-100 text-gray-600'
}

function getFilteredSkills(source, search) {
  if (!selectedPet.value) return []
  const cache = petSkillsCache.value[selectedPet.value.uid]
  if (!cache) return []
  const list = cache[source] || []
  if (!search) return list
  const kw = search.toLowerCase()
  return list.filter(s => s.name?.toLowerCase().includes(kw) || s.element?.toLowerCase().includes(kw))
}

function setSource(idx, source) {
  skillSlots.value[idx].skill_source = source
  skillSlots.value[idx].skill_ref_uid = ''
  skillSlots.value[idx].skill_name = ''
  skillSlots.value[idx]._search = ''
  skillSlots.value[idx]._showList = true
}

function hideListDelayed(idx) {
  // Delay hiding to allow click events on list items to fire first
  setTimeout(() => {
    if (skillSlots.value[idx]) {
      skillSlots.value[idx]._showList = false
    }
  }, 200)
}

function pickSkill(idx, sk) {
  const uid = sk.skill_ref_uid || sk.uid
  skillSlots.value[idx].skill_ref_uid = uid
  skillSlots.value[idx].skill_name = sk.name
  skillSlots.value[idx].skill_element = sk.element || ''
  skillSlots.value[idx].skill_type = sk.type || ''
  skillSlots.value[idx].skill_cost = sk.cost
  skillSlots.value[idx].skill_power = sk.power
  skillSlots.value[idx].skill_icon = sk.skill_icon || ''
  skillSlots.value[idx]._showList = false
  skillSlots.value[idx]._search = ''
}

function clearSlot(idx) {
  skillSlots.value[idx] = { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false }
}

async function selectPet(pet) {
  selectedPet.value = pet
  petDetail.value = null
  currentMonthlyPetId.value = null

  try {
    const detail = await petsApi.get(pet.uid)
    petDetail.value = detail

    // Cache pet skills
    if (!petSkillsCache.value[pet.uid]) {
      petSkillsCache.value[pet.uid] = {
        skills: detail.skills || [],
        bloodline_skills: detail.bloodline_skills || [],
        learnable_stones: detail.learnable_stones || [],
      }
    }

    // Load existing fate flower skill config
    // Find the monthly_pet_id for this pet
    await loadExistingConfig(pet.uid)
  } catch (err) {
    console.error('[AdminFateFlower] Load pet failed:', err)
  }
}

async function loadExistingConfig(petUid) {
  // Reset slots
  skillSlots.value = [
    { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
    { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
    { skill_ref_uid: '', skill_name: '', skill_source: '', _search: '', _showList: false },
  ]

  try {
    // Find monthly that contains this pet
    const evtList = events.value
    // We need to find the monthly_pet_id from the admin API
    // Use the events to find the monthly_id, then get skills
    // Actually, let's query all monthlies to find the one with this pet
    const pikaRes = await adminApi.list('pika_monthlies')
    const monthlies = (pikaRes.rows || []).map(r => ({ ...r, pets: r.pets ? JSON.parse(r.pets) : [] }))

    // Find latest monthly containing this pet
    let monthlyId = null
    for (const m of monthlies) {
      if (m.pets.some(p => p.pet_uid === petUid)) {
        monthlyId = m.id
        break
      }
    }

    if (!monthlyId) return

    // Get fate flower skills for this monthly
    const skillRes = await adminApi.getFateFlowerSkills(monthlyId)
    const petConfig = (skillRes.pets || []).find(p => p.pet_uid === petUid)
    if (petConfig) {
      currentMonthlyPetId.value = petConfig.monthly_pet_id
      selectedNature.value = petConfig.fate_nature || ''
      const saved = petConfig.skills || []
      for (let i = 0; i < Math.min(saved.length, 3); i++) {
        // Find full skill info from cache
        const cache = petSkillsCache.value[petUid]
        let skillInfo = null
        if (cache && saved[i].skill_source) {
          const list = cache[saved[i].skill_source] || []
          skillInfo = list.find(s => (s.skill_ref_uid || s.uid) === saved[i].skill_ref_uid)
        }
        skillSlots.value[i] = {
          skill_ref_uid: saved[i].skill_ref_uid,
          skill_name: saved[i].skill_name,
          skill_source: saved[i].skill_source,
          skill_element: skillInfo?.element || '',
          skill_type: skillInfo?.type || '',
          skill_cost: skillInfo?.cost ?? null,
          skill_power: skillInfo?.power ?? null,
          skill_icon: skillInfo?.skill_icon || '',
          _search: '',
          _showList: false,
        }
      }
    }
  } catch (err) {
    console.error('[AdminFateFlower] Load config failed:', err)
  }
}

async function saveNature() {
  if (!currentMonthlyPetId.value) {
    await modal.warning('提示', '未找到该精灵的月刊关联记录，请先在皮卡月刊中配置精灵')
    return
  }
  savingNature.value = true
  try {
    await adminApi.saveFateFlowerNature(currentMonthlyPetId.value, selectedNature.value)
    await modal.success('成功', '固定性格已保存')
  } catch (e) {
    await modal.alert('失败', '保存失败: ' + e.message)
  }
  savingNature.value = false
}

async function saveSkillConfig() {
  if (!currentMonthlyPetId.value) {
    await modal.warning('提示', '未找到该精灵的月刊关联记录，请先在皮卡月刊中配置精灵')
    return
  }

  const validSkills = skillSlots.value
    .filter(s => s.skill_ref_uid && s.skill_source)
    .map((s, i) => ({
      skill_ref_uid: s.skill_ref_uid,
      skill_name: s.skill_name,
      skill_source: s.skill_source,
      sort_order: i,
    }))

  saving.value = true
  try {
    await adminApi.saveFateFlowerSkills(currentMonthlyPetId.value, validSkills)
    await modal.success('成功', '技能配置已保存')
  } catch (e) {
    await modal.alert('失败', '保存失败: ' + e.message)
  }
  saving.value = false
}

onMounted(async () => {
  try {
    // Load counter-picks setting
    const settings = await adminApi.getSettings()
    const cpSetting = settings.find(s => s.key === 'counter_picks_enabled')
    counterPicksEnabled.value = cpSetting?.value === '1'
  } catch (e) {
    // Non-critical
  }

  try {
    // Load elements
    const elemRes = await elementsApi.list()
    const map = {}
    for (const e of (elemRes.elements || elemRes || [])) {
      map[e.name] = { icon: e.icon, color: e.color, name: e.name }
    }
    elemMap.value = map

    // Load natures
    const natRes = await naturesApi.list()
    naturesList.value = natRes.natures || []

    // Load fate_flower events
    const res = await eventsApi.list(null, true)
    events.value = (res.events || []).filter(
      e => e.category === 'routine' && (e.sub_type === 'fate_flower' || e.sub_type === 'destiny')
    )
  } catch (err) {
    console.error('[AdminFateFlower] Load failed:', err)
  }
  loaded.value = true

  // Auto-select first pet
  if (allPets.value.length) {
    selectPet(allPets.value[0])
  }
})

async function toggleCounterPicks() {
  try {
    await adminApi.updateSetting('counter_picks_enabled', counterPicksEnabled.value ? '1' : '0', '反制推荐模块开关')
  } catch (e) {
    await modal.alert('失败', '保存设置失败: ' + e.message)
    counterPicksEnabled.value = !counterPicksEnabled.value // Revert
  }
}
</script>

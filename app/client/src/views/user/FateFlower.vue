
<template>
  <div>
    <!-- Loading -->
    <div v-if="!loaded" class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!allPets.length" class="text-center mt-20">
      <div class="text-4xl mb-3">🌸</div>
      <p class="text-muted">暂无命定花种数据</p>
      <router-link to="/events" class="text-sm text-primary-500 hover:underline mt-2 inline-block">← 返回活动日历</router-link>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <button @click="goBack" class="text-sm text-muted hover:text-primary-500 cursor-pointer">← 返回</button>
        <h1 class="font-roco text-xl sm:text-2xl text-primary-500">命定花种</h1>
        <span v-if="currentEvent" class="text-xs text-muted">
          {{ formatDateRange(currentEvent) }}
        </span>
      </div>

      <!-- Pet selector tabs with avatars -->
      <div class="pet-tabs-container mb-5">
        <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
          <button
            v-for="pet in allPets"
            :key="pet.uid"
            @click="selectPet(pet)"
            class="pet-tab-btn"
            :class="selectedPet && selectedPet.uid === pet.uid ? 'pet-tab-active' : 'pet-tab-inactive'"
          >
            <img :src="pet.icon" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" :alt="pet.name" />
            <span class="text-xs sm:text-sm font-medium whitespace-nowrap mt-1">{{ pet.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selected pet detail -->
      <div v-if="selectedPet && petDetail" class="space-y-4">
        <!-- Pet card -->
        <div class="card">
          <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center">
            <!-- Pet image -->
            <div class="flex-shrink-0">
              <img :src="petDetail.detail?.image_default || petDetail.image_url" class="w-32 h-32 sm:w-40 sm:h-40 object-contain" />
            </div>
            <!-- Pet info -->
            <div class="flex-1 text-center sm:text-left">
              <h2 class="font-roco text-lg sm:text-xl mb-2">{{ petDetail.name }}</h2>
              <!-- Element + Bloodline element -->
              <div class="flex items-center gap-2 justify-center sm:justify-start mb-2 flex-wrap">
                <div class="flex items-center gap-1">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-5 h-5" />
                  <span class="text-sm font-medium">{{ petDetail.element_name }}</span>
                </div>
                <template v-if="petDetail.sub_element_icon">
                  <span class="text-muted text-xs">/</span>
                  <div class="flex items-center gap-1">
                    <img :src="petDetail.sub_element_icon" class="w-5 h-5" />
                    <span class="text-sm">{{ petDetail.sub_element_name }}</span>
                  </div>
                </template>
                <!-- Bloodline element (same as main element) -->
                <span class="text-muted text-xs mx-1">|</span>
                <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-4 h-4" />
                  <span class="text-xs font-medium text-purple-600 dark:text-purple-400">血脉：{{ petDetail.element_name }}</span>
                </div>
                <!-- Fate nature -->
                <template v-if="fateNature">
                  <span class="text-muted text-xs mx-1">|</span>
                  <div class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20">
                    <span class="text-xs font-medium text-green-600 dark:text-green-400">性格：{{ fateNature }}</span>
                  </div>
                </template>
              </div>
              <!-- Ability -->
              <div v-if="petDetail.ability_name" class="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] mb-2">
                <img v-if="petDetail.detail?.ability_icon" :src="petDetail.detail.ability_icon" class="w-8 h-8 rounded object-contain flex-shrink-0" />
                <div class="text-left">
                  <div class="font-medium text-sm">{{ petDetail.ability_name }}</div>
                  <div class="text-xs text-muted">{{ petDetail.ability_desc }}</div>
                </div>
              </div>
              <!-- Stats -->
              <div class="flex flex-wrap gap-2 justify-center sm:justify-start text-xs">
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">
                  种族值 <strong class="text-primary-500">{{ petDetail.total }}</strong>
                </span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">生命 {{ petDetail.hp }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">物攻 {{ petDetail.atk }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">魔攻 {{ petDetail.matk }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">物防 {{ petDetail.def }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">魔防 {{ petDetail.mdef }}</span>
                <span class="px-2 py-1 rounded bg-gray-100 dark:bg-white/5">速度 {{ petDetail.speed }}</span>
              </div>
              <!-- Link to full detail -->
              <router-link :to="'/pets/' + petDetail.uid" class="inline-block mt-3 text-sm text-primary-500 hover:underline">
                查看完整详情 →
              </router-link>
            </div>
          </div>
        </div>

        <!-- Fate Flower fixed skills -->
        <div class="card">
          <h3 class="font-roco text-sm sm:text-base mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            命定技能
          </h3>

          <!-- 愿力冲击 (fixed skill for all fate flower pets) -->
          <div class="mb-4">
            <div class="flex items-start gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg bg-gray-50 dark:bg-white/5">
              <!-- Element icon as skill icon (bloodline element) -->
              <img v-if="petDetail.element_icon" :src="petDetail.element_icon"
                class="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded flex-shrink-0 mt-0.5" />
              <div v-else class="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                  <span class="font-medium text-sm sm:text-base">愿力冲击</span>
                  <span v-if="elemMap[petDetail.element_name]" class="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded text-xs sm:text-sm"
                    :style="{ background: elemMap[petDetail.element_name].color + '18', color: elemMap[petDetail.element_name].color }">
                    <img :src="elemMap[petDetail.element_name].icon" class="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{{ petDetail.element_name }}</span>
                  </span>
                  <span class="text-xs sm:text-sm font-medium px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400">固定技能</span>
                </div>
                <p class="text-xs sm:text-sm text-muted mt-1 sm:mt-1.5">
                  攻击属性 = 精灵血脉属性（{{ petDetail.element_name }}）；自动适配物攻/魔攻更高的一项；可应对状态技能，应对成功后威力 ×1.5
                </p>
              </div>
            </div>
          </div>

          <!-- Configured skills from admin (grouped by source) -->
          <template v-if="groupedFateSkills">
            <div v-if="groupedFateSkills.skills.length" class="mb-3">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                升级技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.skills" :elem-map="elemMap" />
            </div>
            <div v-if="groupedFateSkills.bloodline_skills.length" class="mb-3">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                血脉技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.bloodline_skills" :elem-map="elemMap" />
            </div>
            <div v-if="groupedFateSkills.learnable_stones.length">
              <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                技能石技能
              </div>
              <SkillTable title="" :skills="groupedFateSkills.learnable_stones" :elem-map="elemMap" />
            </div>
          </template>

          <!-- Fallback: Bloodline skills matching main element (no admin config) -->
          <div v-else-if="bloodlineElementSkills.length">
            <div class="text-xs text-muted mb-2 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              血脉技能（{{ petDetail.element_name }}系）
            </div>
            <SkillTable title="" :skills="bloodlineElementSkills" :elem-map="elemMap" />
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
import { useRouter, useRoute } from 'vue-router'
import { eventsApi, petsApi, elementsApi, pikaApi } from '@/api'
import SkillTable from '@/components/user/SkillTable.vue'

const router = useRouter()
const route = useRoute()

const loaded = ref(false)
const events = ref([])
const selectedPet = ref(null)
const petDetail = ref(null)
const elemMap = ref({})
const fateFlowerSkills = ref([])
const fateNature = ref('')

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

// Find the currently active event (for date display)
const currentEvent = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return events.value.find(e => {
    const periods = e.periods || []
    return periods.some(p => p.start <= today && p.end >= today)
  }) || events.value[0] || null
})

// Configured fate flower skills (from admin config)
// Grouped by source for display
const groupedFateSkills = computed(() => {
  if (!fateFlowerSkills.value.length) return null
  const groups = { skills: [], bloodline_skills: [], learnable_stones: [] }
  for (const s of fateFlowerSkills.value) {
    const source = s.skill_source || 'skills'
    if (groups[source]) groups[source].push(s)
    else groups.skills.push(s)
  }
  return groups
})

// Fallback: bloodline skills matching main element (if no admin config)
const bloodlineElementSkills = computed(() => {
  if (fateFlowerSkills.value.length) return [] // Use configured skills instead
  if (!petDetail.value || !petDetail.value.bloodline_skills) return []
  const mainElement = petDetail.value.element_name
  if (!mainElement) return []
  return petDetail.value.bloodline_skills.filter(s => s.element === mainElement)
})

function parsePetIcons(petIcon) {
  if (!petIcon || !petIcon.startsWith('[')) return []
  try { return JSON.parse(petIcon) } catch { return [] }
}

function formatDateRange(event) {
  if (!event) return ''
  const today = new Date().toISOString().slice(0, 10)
  const periods = event.periods || []
  const active = periods.find(p => p.start <= today && p.end >= today)
  if (active) {
    return `${active.start.slice(5).replace('-', '.')} ~ ${active.end.slice(5).replace('-', '.')} (进行中)`
  }
  if (event.start_date && event.end_date) {
    return `${event.start_date.slice(5).replace('-', '.')} ~ ${event.end_date.slice(5).replace('-', '.')}`
  }
  return ''
}

async function selectPet(pet) {
  selectedPet.value = pet
  petDetail.value = null
  fateFlowerSkills.value = []
  fateNature.value = ''
  try {
    const [detail, skillRes] = await Promise.all([
      petsApi.get(pet.uid),
      pikaApi.getFateFlowerSkills(pet.uid),
    ])
    petDetail.value = detail
    fateFlowerSkills.value = skillRes.skills || []
    fateNature.value = skillRes.fate_nature || ''
  } catch (err) {
    console.error('[FateFlower] Load pet failed:', err)
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/events')
  }
}

onMounted(async () => {
  try {
    // Load elements for SkillTable
    const elemRes = await elementsApi.list()
    const map = {}
    for (const e of (elemRes.elements || elemRes || [])) {
      map[e.name] = { icon: e.icon, color: e.color, name: e.name }
    }
    elemMap.value = map

    const res = await eventsApi.list(null, true)
    // Filter fate_flower events
    events.value = (res.events || []).filter(
      e => e.category === 'routine' && (e.sub_type === 'fate_flower' || e.sub_type === 'destiny')
    )
  } catch (err) {
    console.error('[FateFlower] Load events failed:', err)
  }
  loaded.value = true

  // Auto-select first pet, or pet from route query
  if (allPets.value.length) {
    const targetUid = route.query.pet
    const target = targetUid ? allPets.value.find(p => p.uid === targetUid) : null
    selectPet(target || allPets.value[0])
  }
})
</script>

<style scoped>
.pet-tabs-container {
  @apply border-b border-surface-light-border dark:border-surface-dark-border;
}

.pet-tab-btn {
  @apply flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer flex-shrink-0;
}

.pet-tab-active {
  @apply bg-primary-100 dark:bg-primary-500/20 ring-2 ring-primary-400 dark:ring-primary-500/50;
}

.pet-tab-inactive {
  @apply bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 opacity-70 hover:opacity-100;
}
</style>

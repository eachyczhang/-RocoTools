<template>
  <div v-if="pet">
    <!-- 返回 -->
    <router-link to="/pets" class="text-sm sm:text-base text-muted hover:text-primary-500 mb-3 sm:mb-4 inline-block">← 返回列表</router-link>

    <!-- 形态切换 -->
    <div class="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 flex-wrap" v-if="pet.variants && pet.variants.length > 1">
      <span class="text-xs sm:text-sm text-muted mr-1">形态：</span>
      <button v-for="v in pet.variants" :key="v.pet_uid"
        @click="switchVariant(v.pet_uid)"
        class="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm transition-colors"
        :class="v.pet_uid === pet.uid
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'">
        {{ v.name }}
      </button>
    </div>

    <!-- 精灵介绍 -->
    <div class="card mb-4 sm:mb-5 lg:mb-6">
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-5 lg:gap-6 items-center">
        <!-- 立绘区域（Tab切换） -->
        <div class="flex flex-col items-center flex-shrink-0">
          <img :src="currentImage" class="w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 object-contain mb-2 sm:mb-3" loading="lazy" />
          <!-- 切换按钮 -->
          <div class="flex items-center gap-3 sm:gap-4">
            <button @click="imageTab = 'default'"
              class="flex flex-col items-center gap-0.5 sm:gap-1 transition-opacity"
              :class="imageTab === 'default' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail?.image_default || pet.image_url" class="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">精灵</span>
            </button>
            <button v-if="pet.detail?.image_shiny" @click="imageTab = 'shiny'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'shiny' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_shiny" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">异色</span>
            </button>
            <button v-if="pet.detail?.image_fruit" @click="imageTab = 'fruit'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'fruit' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_fruit" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">果实</span>
            </button>
            <button v-if="pet.detail?.image_egg" @click="imageTab = 'egg'"
              class="flex flex-col items-center gap-0.5 md:gap-1 transition-opacity"
              :class="imageTab === 'egg' ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
              <img :src="pet.detail.image_egg" class="w-8 h-8 md:w-10 md:h-10 object-contain" loading="lazy" />
              <span class="text-[10px] text-muted">精灵蛋</span>
            </button>
          </div>
        </div>

        <!-- 信息 -->
        <div class="flex-1 text-center md:text-left w-full">
          <!-- 名称 + 属性 -->
          <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 justify-center md:justify-start flex-wrap">
            <h1 class="font-roco text-2xl md:text-3xl text-primary-500">{{ pet.name }}</h1>
            <span class="badge flex items-center gap-1 md:gap-1.5 text-xs md:text-sm" :style="{ background: pet.element_color + '18', color: pet.element_color }">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5 md:w-6 md:h-6" />
              {{ pet.element_name }}
            </span>
            <span v-if="pet.sub_element_name" class="badge flex items-center gap-1 md:gap-1.5 text-xs md:text-sm" :style="{ background: pet.sub_element_color + '18', color: pet.sub_element_color }">
              <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-5 h-5 md:w-6 md:h-6" />
              {{ pet.sub_element_name }}
            </span>
          </div>

          <!-- 蛋组 -->
          <div class="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3 justify-center md:justify-start">
            <router-link v-for="eg in pet.egg_groups" :key="eg.id"
              :to="{ path: '/eggs', query: { group: eg.id } }"
              class="badge text-xs md:text-sm hover:opacity-80 transition-opacity"
              :style="{ background: getEggGroupColor(eg.name) + '18', color: getEggGroupColor(eg.name) }">
              {{ eg.name }}
            </router-link>
          </div>

          <!-- 特性 -->
          <div class="flex items-center gap-2 mb-2 md:mb-3 justify-center md:justify-start">
            <img v-if="pet.detail?.ability_icon" :src="pet.detail.ability_icon"
              class="w-7 h-7 md:w-9 md:h-9 rounded object-contain flex-shrink-0" loading="lazy" />
            <div class="text-left">
              <div class="font-medium text-xs md:text-sm">{{ pet.ability_name }}</div>
              <div class="text-xs text-muted">{{ pet.ability_desc }}</div>
            </div>
          </div>

          <!-- 身高/体重/分布 -->
          <div class="flex gap-3 md:gap-6 text-xs md:text-sm justify-center md:justify-start flex-wrap">
            <div v-if="pet.detail?.height"><span class="text-muted">身高</span> {{ pet.detail.height }}m</div>
            <div v-if="pet.detail?.weight"><span class="text-muted">体重</span> {{ pet.detail.weight }}kg</div>
            <div v-if="pet.detail?.location"><span class="text-muted">分布</span> {{ pet.detail.location }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 种族值 -->
    <div class="card mb-4 md:mb-6">
      <h3 class="font-roco text-sm md:text-base mb-3 md:mb-4">种族值 <span class="text-primary-500 font-bold ml-2">{{ pet.total }}</span></h3>
      <div class="flex flex-col md:flex-row items-center gap-4 md:gap-6">
        <div class="flex-1 w-full space-y-2 md:space-y-3">
          <div v-for="s in statsBarList" :key="s.key" class="flex items-center gap-2 md:gap-3">
            <span class="text-xs md:text-sm text-muted w-8 md:w-10 text-right">{{ s.label }}</span>
            <div class="flex-1 h-3 md:h-4 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 bg-primary-500/70"
                :style="{ width: (s.value / 200 * 100) + '%' }"></div>
            </div>
            <span class="text-xs md:text-sm font-medium w-7 md:w-8">{{ s.value }}</span>
          </div>
        </div>
        <StatsRadar v-if="pet" :values="{ hp: pet.hp, atk: pet.atk, matk: pet.matk, def: pet.def, mdef: pet.mdef, speed: pet.speed }" :size="radarSize" />
      </div>
    </div>

    <!-- 属性克制关系（实时计算） -->
    <ElementMatchup v-if="petElementIds.length" :element-ids="petElementIds" :elements="elemList" :multipliers="multipliers" />

    <!-- 打击面分析 -->
    <CoverageAnalysis v-if="allSkills.length"
      :all-skills="allSkills" :all-skills-with-bloodline="allSkillsWithBloodline"
      :elements="elemList" :multipliers="multipliers"
      :initial-coverage="initialCoverage" :initial-bloodline="initialBloodline" />

    <!-- 技能区域（Tab 切换） -->
    <div class="card" v-if="pet.skills?.length || pet.bloodline_skills?.length || pet.learnable_stones?.length">
      <div class="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4 border-b border-surface-light-border dark:border-surface-dark-border pb-2 md:pb-3 overflow-x-auto">
        <button v-for="tab in skillTabs" :key="tab.key"
          @click="activeSkillTab = tab.key"
          class="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeSkillTab === tab.key
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          {{ tab.label }}
          <span class="ml-1 text-xs opacity-60">({{ tab.count }})</span>
        </button>
      </div>

      <!-- 技能筛选 -->
      <div class="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
        <select v-model="skillCategory" class="select text-xs md:text-sm">
          <option value="">分类：全部</option>
          <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
        </select>
        <select v-model="skillCounter" class="select text-xs md:text-sm">
          <option value="">应对：不限</option>
          <option value="none">应对：无</option>
          <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
        </select>
        <select v-model="skillKeyword" class="select text-xs md:text-sm">
          <option value="">效果：不限</option>
          <option v-for="k in skillKeywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
        <span class="text-xs text-muted self-center ml-auto">{{ filteredSkills.length }} 条</span>
      </div>

      <!-- 属性筛选 -->
      <div class="flex flex-wrap gap-1 md:gap-1.5 mb-3 md:mb-4">
        <button @click="skillElement = ''"
          class="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
          :class="!skillElement ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
          全
        </button>
        <button v-for="elem in availableSkillElements" :key="elem.name"
          @click="skillElement = elem.name"
          class="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition-colors"
          :class="skillElement === elem.name ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
          :title="elem.name">
          <img :src="elem.icon" class="w-5 h-5 md:w-7 md:h-7" :alt="elem.name" />
        </button>
      </div>

      <SkillTable :title="''" :skills="filteredSkills" :elem-map="elemMap" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi } from '@/api'
import SkillTable from '@/components/user/SkillTable.vue'
import ElementMatchup from '@/components/shared/ElementMatchup.vue'
import CoverageAnalysis from '@/components/user/CoverageAnalysis.vue'
import StatsRadar from '@/components/shared/StatsRadar.vue'
import { getEggGroupColor } from '@/constants/eggGroupColors'

const route = useRoute()
const router = useRouter()
const pet = ref(null)
const elemMap = ref({})
const elemList = ref([])
const multipliers = ref({})
const activeSkillTab = ref('skills')
const skillCategory = ref('')
const skillCounter = ref('')
const skillKeyword = ref('')
const skillElement = ref('')
const imageTab = ref('default')

// 响应式雷达图尺寸
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const radarSize = computed(() => windowWidth.value < 768 ? 160 : 200)

const currentImage = computed(() => {
  if (!pet.value) return ''
  const d = pet.value.detail
  if (imageTab.value === 'shiny' && d?.image_shiny) return d.image_shiny
  if (imageTab.value === 'fruit' && d?.image_fruit) return d.image_fruit
  if (imageTab.value === 'egg' && d?.image_egg) return d.image_egg
  return d?.image_default || pet.value.image_url
})

const skillKeywordOptions = [
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

// 从 URL query 读取打击面预设（只消费一次）
const initialCoverage = ref(route.query.coverage ? route.query.coverage.split(',') : [])
const initialBloodline = ref(route.query.bloodline || '')

// 精灵的主副属性 ID 列表
const petElementIds = computed(() => {
  if (!pet.value) return []
  const ids = []
  if (pet.value.element_id) ids.push(pet.value.element_id)
  if (pet.value.sub_element_id) ids.push(pet.value.sub_element_id)
  return ids
})

const skillTabs = computed(() => {
  if (!pet.value) return []
  const tabs = []
  if (pet.value.skills?.length) tabs.push({ key: 'skills', label: '精灵技能', count: pet.value.skills.length })
  if (pet.value.bloodline_skills?.length) tabs.push({ key: 'bloodline', label: '血脉技能', count: pet.value.bloodline_skills.length })
  if (pet.value.learnable_stones?.length) tabs.push({ key: 'stones', label: '可学技能石', count: pet.value.learnable_stones.length })
  return tabs
})

const currentSkills = computed(() => {
  if (!pet.value) return []
  if (activeSkillTab.value === 'skills') return pet.value.skills || []
  if (activeSkillTab.value === 'bloodline') return pet.value.bloodline_skills || []
  if (activeSkillTab.value === 'stones') return pet.value.learnable_stones || []
  return []
})

// 当前 Tab 技能中出现的属性（用于属性筛选按钮）
const availableSkillElements = computed(() => {
  const names = new Set()
  for (const s of currentSkills.value) {
    if (s.element) names.add(s.element)
  }
  return elemList.value.filter(e => names.has(e.name))
})

const filteredSkills = computed(() => {
  let list = currentSkills.value
  if (skillElement.value) {
    list = list.filter(s => s.element === skillElement.value)
  }
  if (skillCategory.value) {
    list = list.filter(s => s.type === skillCategory.value)
  }
  if (skillCounter.value) {
    if (skillCounter.value === 'none') {
      list = list.filter(s => !s.description || !s.description.includes('应对'))
    } else {
      list = list.filter(s => s.description && s.description.includes(`应对${skillCounter.value}`))
    }
  }
  if (skillKeyword.value) {
    list = list.filter(s => s.description && s.description.includes(skillKeyword.value))
  }
  return list
})

// 合并所有技能来源（用于打击面分析，不含血脉技能）
const allSkills = computed(() => {
  if (!pet.value) return []
  return [
    ...(pet.value.skills || []),
    ...(pet.value.learnable_stones || []),
  ]
})

// 包含血脉技能
const allSkillsWithBloodline = computed(() => {
  if (!pet.value) return []
  return [
    ...(pet.value.skills || []),
    ...(pet.value.bloodline_skills || []),
    ...(pet.value.learnable_stones || []),
  ]
})

async function loadPet(uid) {
  const [petData, elemData, multData] = await Promise.all([
    petsApi.get(uid),
    elementsApi.list(),
    elementsApi.multipliers(),
  ])
  pet.value = petData
  elemList.value = elemData.elements
  multipliers.value = multData
  const map = {}
  for (const e of elemData.elements) {
    map[e.name] = { icon: e.icon, color: e.color }
  }
  elemMap.value = map
  activeSkillTab.value = 'skills'
}

function switchVariant(uid) {
  initialCoverage.value = []
  initialBloodline.value = ''
  router.replace(`/pets/${uid}`)
  loadPet(uid)
}

const statsList = [
  { key: 'hp', label: '生命' },
  { key: 'atk', label: '物攻' },
  { key: 'matk', label: '魔攻' },
  { key: 'def', label: '物防' },
  { key: 'mdef', label: '魔防' },
  { key: 'speed', label: '速度' },
  { key: 'total', label: '总计' },
]

const statsBarList = computed(() => {
  if (!pet.value) return []
  return [
    { key: 'hp', label: '生命', value: pet.value.hp },
    { key: 'atk', label: '物攻', value: pet.value.atk },
    { key: 'matk', label: '魔攻', value: pet.value.matk },
    { key: 'def', label: '物防', value: pet.value.def },
    { key: 'mdef', label: '魔防', value: pet.value.mdef },
    { key: 'speed', label: '速度', value: pet.value.speed },
  ]
})

onMounted(() => loadPet(route.params.uid))
</script>

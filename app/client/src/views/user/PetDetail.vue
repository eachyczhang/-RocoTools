<template>
  <div v-if="pet">
    <!-- 返回 -->
    <button @click="goBack" class="text-sm sm:text-base text-muted hover:text-primary-500 mb-3 sm:mb-4 inline-block cursor-pointer">← 返回</button>

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
            <button v-if="pet.detail?.image_shiny && pet.show_shiny" @click="imageTab = 'shiny'"
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
          <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 justify-center sm:justify-start flex-wrap">
            <h1 class="font-roco text-2xl sm:text-3xl text-primary-500">{{ pet.name }}</h1>
            <span class="badge flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm" :style="{ background: pet.element_color + '18', color: pet.element_color }">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5 sm:w-6 sm:h-6" />
              {{ pet.element_name }}
            </span>
            <span v-if="pet.sub_element_name" class="badge flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm" :style="{ background: pet.sub_element_color + '18', color: pet.sub_element_color }">
              <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-5 h-5 sm:w-6 sm:h-6" />
              {{ pet.sub_element_name }}
            </span>
          </div>

          <!-- 蛋组 -->
          <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 justify-center sm:justify-start">
            <router-link v-for="eg in pet.egg_groups" :key="eg.id"
              :to="{ path: '/eggs', query: { group: eg.id } }"
              class="badge text-xs md:text-sm hover:opacity-80 transition-opacity"
              :style="{ background: getEggGroupColor(eg.name) + '18', color: getEggGroupColor(eg.name) }">
              {{ eg.name }}
            </router-link>
          </div>

          <!-- 精灵标记 -->
          <div v-if="petTags.length" class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 justify-center sm:justify-start">
            <span v-for="tag in petTags" :key="tag.key"
              class="badge text-xs md:text-sm"
              :style="{ background: tag.color + '18', color: tag.color }">
              {{ tag.label }}
            </span>
          </div>

          <!-- 特性 -->
          <div class="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4 justify-center sm:justify-start p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
            <img v-if="pet.detail?.ability_icon" :src="pet.detail.ability_icon"
              class="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-contain flex-shrink-0 mt-0.5" loading="lazy" />
            <div class="text-left flex-1 min-w-0">
              <div class="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">{{ pet.ability_name }}</div>
              <SkillDescription :text="pet.ability_desc" class="text-xs sm:text-sm leading-relaxed text-muted" />
            </div>
          </div>

          <!-- 身高/体重/分布 -->
          <div class="flex gap-3 sm:gap-6 text-xs sm:text-sm justify-center sm:justify-start flex-wrap">
            <div v-if="pet.detail?.height"><span class="text-muted">身高</span> {{ formatRange(pet.detail.height, 'm') }}</div>
            <div v-if="pet.detail?.weight"><span class="text-muted">体重</span> {{ formatRange(pet.detail.weight, 'kg') }}</div>
            <div v-if="pet.detail?.location"><span class="text-muted">分布</span> {{ pet.detail.location }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 进化链 -->
    <div class="card mb-4 sm:mb-6" v-if="pet.detail?.evolution_chain?.some(r => r.length > 1)">
      <h3 class="font-roco text-sm sm:text-base mb-2 sm:mb-3">进化链</h3>
      <div class="space-y-3">
        <div v-for="(route, rIdx) in pet.detail.evolution_chain" :key="rIdx">
          <div v-if="pet.detail.evolution_chain.length > 1" class="text-[10px] text-muted mb-1 pl-1">路线 {{ rIdx + 1 }}</div>
          <div class="flex items-center justify-center flex-wrap gap-0">
            <template v-for="(stage, idx) in route" :key="idx">
              <!-- Evolution level arrow -->
              <div v-if="idx > 0" class="flex flex-col items-center mx-1 sm:mx-2">
                <span v-if="stage.evolve_level" class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">Lv.{{ stage.evolve_level }}</span>
                <span v-else-if="!stage.evolve_condition" class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">特殊</span>
                <!-- Rich condition display (when no level, or as sub-text when level exists) -->
                <EvoConditionTag v-if="!stage.evolve_level && stage.evolve_condition" :condition="stage.evolve_condition" :elem-map="elemMap" />
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <EvoConditionTag v-if="stage.evolve_level && stage.evolve_condition" :condition="stage.evolve_condition" :elem-map="elemMap" small />
              </div>
              <!-- Pet stage card -->
              <router-link v-if="stage.uid && stage.uid !== pet.uid"
                :to="'/pets/' + stage.uid"
                class="flex flex-col items-center px-3 py-2 rounded-xl transition-all hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:scale-105 cursor-pointer group">
                <img v-if="stage.thumb_url" :src="stage.thumb_url"
                  class="w-16 h-16 sm:w-20 sm:h-20 object-contain" loading="lazy" />
                <div v-else class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <span class="text-base text-gray-400">?</span>
                </div>
                <span class="text-xs sm:text-sm text-gray-700 dark:text-gray-200 group-hover:text-primary-500 transition-colors mt-1">{{ stage.name }}</span>
              </router-link>
              <div v-else
                class="flex flex-col items-center px-3 py-2 rounded-xl"
                :class="stage.uid === pet.uid ? 'bg-primary-50 dark:bg-primary-500/10 ring-2 ring-primary-400/60' : ''">
                <img v-if="stage.thumb_url" :src="stage.thumb_url"
                  class="w-16 h-16 sm:w-20 sm:h-20 object-contain" loading="lazy" />
                <div v-else class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <span class="text-base text-gray-400">?</span>
                </div>
                <span class="text-xs sm:text-sm mt-1 font-medium" :class="stage.uid === pet.uid ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-200'">{{ stage.name }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 种族值 -->
    <div class="card mb-4 sm:mb-6">
      <h3 class="font-roco text-sm sm:text-base mb-3 sm:mb-4">种族值 <span class="text-primary-500 font-bold ml-2">{{ pet.total }}</span></h3>
      <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div class="flex-1 w-full space-y-2 sm:space-y-3">
          <div v-for="s in statsBarList" :key="s.key" class="flex items-center gap-2 sm:gap-3">
            <span class="text-xs sm:text-sm text-muted w-8 sm:w-10 text-right">{{ s.label }}</span>
            <div class="flex-1 h-3 md:h-4 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 bg-primary-500/70"
                :style="{ width: (s.value / 200 * 100) + '%' }"></div>
            </div>
              <span class="text-xs sm:text-sm font-medium w-7 sm:w-8">{{ s.value }}</span>
          </div>
        </div>
        <StatsRadar v-if="pet" :values="{ hp: pet.hp, atk: pet.atk, matk: pet.matk, def: pet.def, mdef: pet.mdef, speed: pet.speed }" :size="radarSize" />
      </div>
    </div>

    <!-- 属性克制关系（实时计算） -->
    <ElementMatchup v-if="petElementIds.length" :element-ids="petElementIds" :elements="elemList" :multipliers="multipliers" />

    <!-- 图鉴课题 -->
    <div class="card mb-4 sm:mb-6" v-if="pet.achievements?.length && !pet.is_boss_form">
      <h3 class="font-roco text-sm sm:text-base mb-2 sm:mb-3">图鉴课题</h3>
      <div class="space-y-1.5">
        <div v-for="(ach, idx) in pet.achievements" :key="idx"
          class="px-3 py-2 sm:py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
          <div class="flex items-center gap-2 sm:gap-3 mb-1">
            <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">{{ idx + 1 }}</span>
            <span class="text-xs sm:text-sm flex-1">
              <span v-if="ach.type === 'skill' && ach.skill_name">
                使用{{ ach.use_count || 2 }}次{{ ach.skill_name }}
              </span>
              <span v-else>
                {{ ach.title }}
              </span>
            </span>
            <span v-if="ach.reward_desc" class="text-[10px] sm:text-xs text-muted flex-shrink-0">{{ ach.reward_desc }}</span>
          </div>
          
          <!-- 技能类型课题的详细展示 -->
          <div v-if="ach.type === 'skill' && ach.skill_ref_uid" class="ml-7 sm:ml-9">
            <div class="flex items-center gap-2 sm:gap-3 p-2 bg-white/50 dark:bg-white/5 rounded">
              <!-- 技能图标 -->
              <img v-if="skillIcons[ach.skill_ref_uid]" :src="skillIcons[ach.skill_ref_uid]" 
                   class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded flex-shrink-0" loading="lazy" />
              <img v-else-if="skillElements[ach.skill_ref_uid]?.icon" :src="skillElements[ach.skill_ref_uid].icon" 
                   class="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded flex-shrink-0" loading="lazy" />
              <div v-else class="w-6 h-6 sm:w-8 sm:h-8 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
              
              <!-- 技能名称和属性 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-medium text-xs sm:text-sm">{{ ach.skill_name }}</span>
                  <span v-if="skillElements[ach.skill_ref_uid]" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] sm:text-xs"
                        :style="{ background: skillElements[ach.skill_ref_uid].color + '18', color: skillElements[ach.skill_ref_uid].color }">
                    <img :src="skillElements[ach.skill_ref_uid].icon" class="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{{ skillElements[ach.skill_ref_uid].name }}</span>
                  </span>
                </div>
              </div>
              
              <!-- 技能数据 -->
              <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0 text-[10px] sm:text-xs text-center">
                <div v-if="skillCategories[ach.skill_ref_uid]" class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">类型</div>
                  <div class="font-medium" :style="{ color: categoryColor(skillCategories[ach.skill_ref_uid]) }">{{ skillCategories[ach.skill_ref_uid] }}</div>
                </div>
                <div v-if="skillLevels[ach.skill_ref_uid]" class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">等级</div>
                  <div class="font-medium">{{ skillLevels[ach.skill_ref_uid] }}</div>
                </div>
                <div class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">能耗</div>
                  <div class="font-medium">{{ skillCosts[ach.skill_ref_uid] != null ? skillCosts[ach.skill_ref_uid] : '-' }}</div>
                </div>
                <div class="w-8 sm:w-10">
                  <div class="text-muted text-[8px] sm:text-[10px]">威力</div>
                  <div class="font-medium">{{ skillPowers[ach.skill_ref_uid] || '-' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 打击面分析 -->
    <CoverageAnalysis v-if="allSkills.length"
      :all-skills="allSkills" :all-skills-with-bloodline="allSkillsWithBloodline"
      :elements="elemList" :multipliers="multipliers"
      :initial-coverage="initialCoverage" :initial-bloodline="initialBloodline" />

    <!-- 技能区域（Tab 切换） -->
    <div class="card" v-if="pet.skills?.length || pet.bloodline_skills?.length || pet.learnable_stones?.length">
      <div class="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 border-b border-surface-light-border dark:border-surface-dark-border pb-2 sm:pb-3 overflow-x-auto">
        <button v-for="tab in skillTabs" :key="tab.key"
          @click="activeSkillTab = tab.key"
          class="px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0"
          :class="activeSkillTab === tab.key
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          {{ tab.label }}
          <span class="ml-1 text-xs opacity-60">({{ tab.count }})</span>
        </button>
      </div>

      <!-- 技能筛选 -->
      <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <select v-model="skillCategory" class="select text-xs sm:text-sm">
          <option value="">分类：全部</option>
          <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
        </select>
        <select v-model="skillCounter" class="select text-xs sm:text-sm">
          <option value="">应对：不限</option>
          <option value="none">应对：无</option>
          <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
        </select>
        <select v-model="skillKeyword" class="select text-xs sm:text-sm">
          <option value="">效果：不限</option>
          <option v-for="k in skillKeywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
        <span class="text-xs text-muted self-center ml-auto">{{ filteredSkills.length }} 条</span>
      </div>

      <!-- 属性筛选 -->
      <div class="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
        <button @click="skillElement = ''"
          class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
          :class="!skillElement ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
          全
        </button>
        <button v-for="elem in availableSkillElements" :key="elem.name"
          @click="skillElement = elem.name"
          class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors"
          :class="skillElement === elem.name ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
          :title="elem.name">
          <img :src="elem.icon" class="w-5 h-5 sm:w-7 sm:h-7" :alt="elem.name" />
        </button>
      </div>

      <SkillTable :title="''" :skills="filteredSkills" :elem-map="elemMap" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi, skillsApi } from '@/api'
import SkillTable from '@/components/user/SkillTable.vue'
import ElementMatchup from '@/components/shared/ElementMatchup.vue'
import CoverageAnalysis from '@/components/user/CoverageAnalysis.vue'
import StatsRadar from '@/components/shared/StatsRadar.vue'
import EvoConditionTag from '@/components/user/EvoConditionTag.vue'
import SkillDescription from '@/components/user/SkillDescription.vue'
import { getEggGroupColor } from '@/constants/eggGroupColors'
import { categoryColor } from '@/constants/categoryColors'

const route = useRoute()
const router = useRouter()
const pet = ref(null)

// Format range string "1.50-2.15" to display "1.50~2.15m" or "1.50m" if same
function formatRange(str, unit) {
  if (!str) return ''
  const m = String(str).match(/^([\d.]+)\s*[~\-]\s*([\d.]+)$/)
  if (m) {
    const a = parseFloat(m[1]).toFixed(2)
    const b = parseFloat(m[2]).toFixed(2)
    return a === b ? a + unit : a + '~' + b + unit
  }
  const single = String(str).match(/^([\d.]+)$/)
  if (single) return parseFloat(single[1]).toFixed(2) + unit
  return str + unit
}

// Pet special tags (displayed as badges)
const petTags = computed(() => {
  if (!pet.value) return []
  const tags = []
  if (pet.value.is_final_form) tags.push({ key: 'final', label: '最终形态', color: '#D69F23' })
  if (pet.value.is_legendary) tags.push({ key: 'legendary', label: '传说精灵', color: '#E6A817' })
  if (pet.value.is_season) tags.push({ key: 'season', label: '赛季精灵', color: '#3B82F6' })
  if (pet.value.is_pass) tags.push({ key: 'pass', label: '通行证精灵', color: '#8B5CF6' })
  if (pet.value.is_boss_form) tags.push({ key: 'boss_form', label: '首领形态', color: '#EF4444' })
  if (pet.value.has_boss_form) tags.push({ key: 'has_boss', label: '拥有首领形态', color: '#F97316' })
  if (pet.value.detail?.image_shiny && pet.value.show_shiny && imageTab.value === 'shiny') tags.push({ key: 'shiny', label: '异色精灵', color: '#EC4899' })
  return tags
})

/** Navigate back: if previous route was pets list, go back to preserve state; otherwise navigate to /pets */
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/pets')
  }
}

/** Format evolve_condition object to display text */
function formatEvoCondition(cond) {
  if (!cond) return ''
  if (typeof cond === 'string') return cond // legacy string format
  if (cond.type === 'text') return cond.text || ''
  if (cond.type === 'skill') {
    let s = `使用${cond.skill_count || 1}次${cond.skill_name || '?'}`
    if (cond.need_win) s += '(需战胜)'
    return s
  }
  if (cond.type === 'element') return `击败${cond.element_count || 1}只${cond.element_name || '?'}属性精灵`
  if (cond.type === 'pet') return `击败${cond.pet_count || 1}次${cond.pet_name || '?'}`
  return ''
}
const elemMap = ref({})
const elemList = ref([])
const multipliers = ref({})
const activeSkillTab = ref('skills')
const skillCategory = ref('')
const skillCounter = ref('')
const skillKeyword = ref('')
const skillElement = ref('')
const imageTab = ref('default')

// 技能详情相关数据
const skillIcons = ref({})
const skillElements = ref({})
const skillCategories = ref({})
const skillCosts = ref({})
const skillPowers = ref({})
const skillLevels = ref({})

// 响应式雷达图尺寸
const windowWidth = ref(window.innerWidth)
const onResize = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
const radarSize = computed(() => windowWidth.value < 768 ? 160 : 200)

// 加载技能详情
async function loadSkillDetails(achievements) {
  if (!achievements) return
  
  const skillRefs = achievements
    .filter(ach => ach.type === 'skill' && ach.skill_ref_uid)
    .map(ach => ach.skill_ref_uid)
    .filter((uid, index, array) => array.indexOf(uid) === index) // 去重
  
  if (skillRefs.length === 0) return
  
  try {
    // 并行加载所有技能详情以提高性能
    const skillPromises = skillRefs.map(uid => skillsApi.get(uid).catch(err => {
      console.warn(`Failed to load skill ${uid}:`, err)
      return null
    }))
    
    const skills = await Promise.all(skillPromises)
    
    skills.forEach((skill, index) => {
      if (skill) {
        const uid = skillRefs[index]
        skillIcons.value[uid] = skill.icon_url
        skillElements.value[uid] = {
          name: skill.element_name,
          icon: skill.element_icon,
          color: skill.element_color
        }
        skillCategories.value[uid] = skill.category
        skillCosts.value[uid] = skill.cost
        skillPowers.value[uid] = skill.power
      }
    })
    
    // 从精灵的升级技能列表中获取学习等级（课题技能一定是升级学习）
    if (pet.value && pet.value.skills) {
      for (const uid of skillRefs) {
        const petSkill = pet.value.skills.find(s => s.skill_ref_uid === uid)
        if (petSkill && petSkill.level) {
          skillLevels.value[uid] = petSkill.level
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load skill details:', err)
  }
}

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
  
  // 加载技能详情
  await loadSkillDetails(petData.achievements)
}

function switchVariant(uid) {
  initialCoverage.value = []
  initialBloodline.value = ''
  router.replace(`/pets/${uid}`)
  loadPet(uid)
}

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

// Re-load when route param changes (same-route navigation, e.g. clicking evo chain links)
watch(() => route.params.uid, (newUid, oldUid) => {
  if (newUid && newUid !== oldUid) {
    initialCoverage.value = []
    initialBloodline.value = ''
    loadPet(newUid)
  }
})
</script>

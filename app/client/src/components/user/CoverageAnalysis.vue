<template>
  <div class="card mb-4 md:mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 md:mb-4">
      <h3 class="font-roco text-base md:text-lg text-primary-500">打击面分析</h3>
      <div class="flex items-center gap-1 sm:ml-4">
        <button @click="mode = 'auto'"
          class="px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm transition-colors"
          :class="mode === 'auto'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          理论最大
        </button>
        <button @click="mode = 'custom'"
          class="px-2.5 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm transition-colors"
          :class="mode === 'custom'
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
          自定义组合
        </button>
      </div>
    </div>

    <div v-if="baseElements.length">
      <!-- ========== 理论最大模式 ========== -->
      <div v-if="mode === 'auto'">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 mb-3 flex-wrap">
          <div class="flex items-center gap-1">
            <button @click="includeBloodline = false"
              class="px-2 py-0.5 md:px-3 md:py-1 rounded-md text-xs transition-colors"
              :class="!includeBloodline
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
              不含血脉
            </button>
            <button @click="includeBloodline = true"
              class="px-2 py-0.5 md:px-3 md:py-1 rounded-md text-xs transition-colors"
              :class="includeBloodline
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'"
              :disabled="!bloodlineElements.length">
              含血脉
            </button>
          </div>
          <div class="flex items-center gap-1">
            <button v-for="opt in atkTypeOptions" :key="opt.value" @click="autoAtkType = opt.value"
              class="px-2 py-0.5 md:px-3 md:py-1 rounded-md text-xs transition-colors"
              :class="autoAtkType === opt.value
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
              {{ opt.label }}
            </button>
          </div>
          <div class="flex items-center gap-1 sm:ml-auto">
            <span class="text-xs text-muted">槽位：</span>
            <button v-for="n in 4" :key="n" @click="slotCount = n"
              class="w-5 h-5 md:w-6 md:h-6 rounded text-xs font-medium transition-colors"
              :class="slotCount === n
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'">
              {{ n }}
            </button>
          </div>
        </div>

        <!-- 自动计算结果 -->
        <div v-if="bestCombo">
          <!-- 所需血脉标注 -->
          <div v-if="includeBloodline && bestCombo.bloodlineName" class="flex items-center gap-2 mb-2 md:mb-3 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-orange-50 dark:bg-orange-500/10">
            <span class="text-xs md:text-sm text-orange-600 dark:text-orange-400 font-medium">需修改血脉为：</span>
            <img v-if="bestCombo.bloodlineIcon" :src="bestCombo.bloodlineIcon" class="w-5 h-5 md:w-6 md:h-6" />
            <span class="text-xs md:text-sm font-bold text-orange-600 dark:text-orange-400">{{ bestCombo.bloodlineName }}系</span>
          </div>

          <div class="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 flex-wrap">
            <span v-for="elem in bestCombo.elements" :key="elem.name"
              class="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full"
              :style="{ background: elem.color + '20' }" :title="elem.name">
              <img :src="elem.icon" class="w-5 h-5 md:w-7 md:h-7" />
            </span>
            <span class="text-xs md:text-sm text-muted ml-1 md:ml-2">覆盖 <span class="font-medium text-primary-500">{{ bestCombo.covered.length }}</span>/{{ elements.length }}</span>
          </div>

          <!-- 推荐技能 -->
          <div class="space-y-1 md:space-y-1.5 mb-3 md:mb-4">
            <div v-for="skill in bestCombo.recommendedSkills" :key="skill.name"
              class="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-gray-50 dark:bg-white/5 text-xs md:text-sm">
              <img v-if="skill.skillIcon" :src="skill.skillIcon" class="w-5 h-5 md:w-7 md:h-7 object-contain rounded" />
              <img v-else-if="skill.elemIcon" :src="skill.elemIcon" class="w-5 h-5 md:w-7 md:h-7 object-contain rounded" />
              <span v-if="skill.skillIcon && skill.elemIcon" class="inline-flex items-center px-1 py-0.5 rounded"
                :style="{ background: skill.elemColor + '18' }">
                <img :src="skill.elemIcon" class="w-4 h-4 md:w-5 md:h-5" />
              </span>
              <span class="font-medium flex-1 truncate">{{ skill.name }}</span>
              <span class="text-muted">{{ skill.power }}</span>
              <span v-if="skill.fromBloodline" class="text-[10px] md:text-xs text-orange-500 font-medium">血脉</span>
            </div>
          </div>

          <!-- 可克制 -->
          <div v-if="bestCombo.covered.length" class="flex items-center gap-1 md:gap-1.5 mb-2 flex-wrap">
            <span class="text-xs text-muted mr-1">可克制：</span>
            <span v-for="item in bestCombo.covered" :key="item.name"
              class="inline-flex items-center px-1 py-0.5 rounded-full"
              :style="{ background: item.color + '18' }" :title="item.name">
              <img :src="item.icon" class="w-4 h-4 md:w-5 md:h-5" />
            </span>
          </div>
          <!-- 无法克制 -->
          <div v-if="bestCombo.uncovered.length" class="flex items-center gap-1 md:gap-1.5 flex-wrap">
            <span class="text-xs text-muted mr-1">无法克制：</span>
            <span v-for="item in bestCombo.uncovered" :key="item.name"
              class="inline-flex items-center px-1 py-0.5 rounded-full opacity-50"
              :style="{ background: item.color + '18' }" :title="item.name">
              <img :src="item.icon" class="w-4 h-4 md:w-5 md:h-5" />
            </span>
          </div>
        </div>
      </div>

      <!-- ========== 自定义组合模式 ========== -->
      <div v-if="mode === 'custom'">
        <!-- 物攻/魔攻筛选 -->
        <div class="flex items-center gap-1 mb-2 md:mb-3">
          <button v-for="opt in atkTypeOptions" :key="opt.value" @click="customAtkType = opt.value"
            class="px-2 py-0.5 md:px-3 md:py-1 rounded-md text-xs transition-colors"
            :class="customAtkType === opt.value
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
              : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
            {{ opt.label }}
          </button>
        </div>

        <!-- 血脉选择 -->
        <div v-if="bloodlineElements.length" class="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4 flex-wrap">
          <span class="text-xs text-muted">血脉：</span>
          <button @click="customBloodline = ''"
            class="px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-xs transition-colors"
            :class="!customBloodline ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
            无
          </button>
          <button v-for="elem in bloodlineElements" :key="elem.name"
            @click="customBloodline = elem.name"
            class="w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center transition-colors"
            :class="customBloodline === elem.name ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
            :title="elem.name + '系血脉'">
            <img :src="elem.icon" class="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <!-- 4个技能格子 -->
        <div class="grid grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4">
          <div v-for="(slot, idx) in customSlots" :key="idx"
            class="relative rounded-lg border-2 p-1.5 md:p-2 flex flex-col items-center justify-center min-h-[56px] md:min-h-[72px] transition-all"
            :class="slot ? 'shadow-sm' : 'border-dashed border-gray-300 dark:border-gray-600'"
            :style="slot ? { background: slot.color + '20', borderColor: slot.color } : {}">
            <template v-if="slot">
              <img :src="slot.icon" class="w-6 h-6 md:w-8 md:h-8" />
              <button @click="clearCustomSlot(idx)"
                class="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[9px] md:text-[10px] text-white hover:bg-red-500">✕</button>
            </template>
            <span v-else class="text-base md:text-lg text-muted opacity-30">+</span>
          </div>
        </div>

        <!-- 可选属性 -->
        <div class="flex flex-wrap gap-1 md:gap-1.5 mb-3 md:mb-4">
          <button v-for="elem in customAvailableElements" :key="elem.name"
            @click="addCustomSlot(elem)"
            :disabled="isInCustomSlot(elem)"
            class="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition-colors relative"
            :class="isInCustomSlot(elem)
              ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-500/10'
              : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
            :title="elem.name">
            <img :src="elem.icon" class="w-5 h-5 md:w-6 md:h-6" :class="isInCustomSlot(elem) ? 'opacity-50' : ''" />
            <span v-if="isInCustomSlot(elem)" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 text-white text-[7px] md:text-[8px] flex items-center justify-center">✓</span>
          </button>
        </div>

        <!-- 自定义结果 -->
        <div v-if="customResult">
          <div class="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
            <span class="text-xs md:text-sm font-medium">覆盖 <span class="text-primary-500">{{ customResult.covered.length }}</span> / {{ elements.length }}</span>
          </div>

          <!-- 推荐技能 -->
          <div v-if="customResult.recommendedSkills.length" class="space-y-1 md:space-y-1.5 mb-3 md:mb-4">
            <div v-for="skill in customResult.recommendedSkills" :key="skill.name"
              class="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-gray-50 dark:bg-white/5">
              <img v-if="skill.skillIcon" :src="skill.skillIcon" class="w-5 h-5 md:w-7 md:h-7 object-contain rounded" />
              <img v-else-if="skill.elemIcon" :src="skill.elemIcon" class="w-5 h-5 md:w-7 md:h-7 object-contain rounded" />
              <span v-if="skill.skillIcon && skill.elemIcon" class="inline-flex items-center px-1 py-0.5 rounded"
                :style="{ background: skill.elemColor + '18' }">
                <img :src="skill.elemIcon" class="w-4 h-4 md:w-5 md:h-5" />
              </span>
              <span class="text-xs md:text-sm font-medium flex-1 truncate">{{ skill.name }}</span>
              <span class="text-xs md:text-sm text-muted">{{ skill.power }}</span>
              <span v-if="skill.fromBloodline" class="text-[10px] md:text-xs text-orange-500 font-medium">血脉</span>
            </div>
          </div>

          <!-- 可克制/无法克制 -->
          <div class="flex flex-wrap gap-1 md:gap-1.5 mb-2">
            <span v-for="item in customResult.covered" :key="item.name"
              class="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full"
              :style="{ background: item.color + '18' }" :title="item.name">
              <img :src="item.icon" class="w-4 h-4 md:w-6 md:h-6" />
            </span>
          </div>
          <div v-if="customResult.uncovered.length" class="flex flex-wrap gap-1 md:gap-1.5">
            <span v-for="item in customResult.uncovered" :key="item.name"
              class="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full opacity-40"
              :style="{ background: item.color + '18' }" :title="item.name + '（无法克制）'">
              <img :src="item.icon" class="w-4 h-4 md:w-6 md:h-6" />
            </span>
          </div>
        </div>
      </div>
    </div>

    <p v-else class="text-xs md:text-sm text-muted">无攻击技能数据</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  allSkills: { type: Array, required: true },
  allSkillsWithBloodline: { type: Array, default: () => [] },
  elements: { type: Array, required: true },
  multipliers: { type: Object, required: true },
  /** 初始属性名称列表（从 query 传入） */
  initialCoverage: { type: Array, default: () => [] },
  /** 初始血脉属性名（从 query 传入） */
  initialBloodline: { type: String, default: '' },
})

const mode = ref(props.initialCoverage.length ? 'custom' : 'auto')
const slotCount = ref(4)
const includeBloodline = ref(false)
const autoAtkType = ref('')
const customBloodline = ref(props.initialBloodline)
const customAtkType = ref('')
const customSlots = ref([null, null, null, null])

// 初始填入
watch(() => props.elements, (elems) => {
  if (!elems.length || !props.initialCoverage.length) return
  // 填入自定义格子
  props.initialCoverage.forEach((name, i) => {
    if (i >= 4) return
    const elem = elems.find(e => e.name === name)
    if (elem) customSlots.value[i] = { name: elem.name, icon: elem.icon, color: elem.color, id: elem.id }
  })
}, { immediate: true })

const atkTypeOptions = [
  { value: '', label: '全部' },
  { value: '物攻', label: '物攻' },
  { value: '魔攻', label: '魔攻' },
]

// 不含血脉的攻击属性（通用，不过滤类型）
const baseElements = computed(() => {
  const names = new Set()
  for (const skill of props.allSkills) {
    if (skill.element && skill.power > 0) names.add(skill.element)
  }
  return props.elements.filter(e => names.has(e.name))
})

// 按 atkType 过滤后的攻击属性
function getFilteredElements(skills, atkType) {
  const names = new Set()
  for (const skill of skills) {
    if (skill.element && skill.power > 0) {
      if (!atkType || skill.type === atkType) names.add(skill.element)
    }
  }
  return names
}

// 血脉额外属性（按当前模式的 atkType 过滤）
const bloodlineElements = computed(() => {
  const currentAtkType = mode.value === 'auto' ? autoAtkType.value : customAtkType.value
  const baseNames = new Set()
  for (const skill of props.allSkills) {
    if (skill.element && skill.power > 0) {
      if (!currentAtkType || skill.type === currentAtkType) baseNames.add(skill.element)
    }
  }
  const blNames = new Set()
  for (const skill of props.allSkillsWithBloodline) {
    if (skill.element && skill.power > 0 && !baseNames.has(skill.element)) {
      if (!currentAtkType || skill.type === currentAtkType) blNames.add(skill.element)
    }
  }
  return props.elements.filter(e => blNames.has(e.name))
})

// ========== 理论最大模式（自动计算） ==========
function calcBestForBloodline(bloodlineName, atkType) {
  const allElems = props.elements
  let skills = props.allSkills

  if (bloodlineName) {
    const bloodlineSkills = props.allSkillsWithBloodline.filter(s =>
      s.element === bloodlineName && s.power > 0 &&
      !props.allSkills.some(bs => bs.name === s.name)
    )
    skills = [...props.allSkills, ...bloodlineSkills]
  }

  // 按 atkType 过滤后得到可用属性
  const availNames = getFilteredElements(skills, atkType)
  const available = props.elements.filter(e => availNames.has(e.name))

  const n = Math.min(slotCount.value, available.length)
  if (n === 0) return null

  const coverMap = {}
  for (const atk of available) {
    const atkFull = allElems.find(e => e.name === atk.name)
    if (!atkFull) continue
    const covered = new Set()
    if (atkFull.strong_against) {
      for (const target of atkFull.strong_against) covered.add(target.id)
    }
    coverMap[atk.name] = covered
  }

  const selected = []
  const totalCovered = new Set()
  const remaining = [...available]

  for (let i = 0; i < n; i++) {
    let bestIdx = -1
    let bestNewCount = -1
    for (let j = 0; j < remaining.length; j++) {
      const cov = coverMap[remaining[j].name]
      if (!cov) continue
      let newCount = 0
      for (const id of cov) { if (!totalCovered.has(id)) newCount++ }
      if (newCount > bestNewCount) { bestNewCount = newCount; bestIdx = j }
    }
    if (bestIdx === -1) break
    const chosen = remaining.splice(bestIdx, 1)[0]
    selected.push(chosen)
    const cov = coverMap[chosen.name]
    if (cov) for (const id of cov) totalCovered.add(id)
  }

  const covered = []
  const uncovered = []
  for (const elem of allElems) {
    if (totalCovered.has(elem.id)) covered.push({ name: elem.name, icon: elem.icon, color: elem.color })
    else uncovered.push({ name: elem.name, icon: elem.icon, color: elem.color })
  }

  const recommendedSkills = []
  for (const sel of selected) {
    let best = null
    for (const skill of skills) {
      if (skill.element !== sel.name || !skill.power || skill.power <= 0) continue
      if (atkType && skill.type !== atkType) continue
      if (!best || skill.power > best.power) best = skill
    }
    if (best) {
      const elemInfo = allElems.find(e => e.name === best.element)
      const fromBloodline = !props.allSkills.some(s => s.name === best.name && s.element === best.element)
      recommendedSkills.push({ name: best.name, power: best.power, elemIcon: elemInfo?.icon || '', elemColor: elemInfo?.color || '', skillIcon: best.skill_icon || '', fromBloodline })
    }
  }

  return { elements: selected, covered, uncovered, recommendedSkills, bloodlineName }
}

const bestCombo = computed(() => {
  if (!baseElements.value.length || !props.elements.length) return null

  if (!includeBloodline.value) {
    return calcBestForBloodline(null, autoAtkType.value)
  }

  // 含血脉：遍历每种血脉，找覆盖最大的
  let best = calcBestForBloodline(null, autoAtkType.value)
  for (const bl of bloodlineElements.value) {
    const combo = calcBestForBloodline(bl.name, autoAtkType.value)
    if (combo && combo.covered.length > (best?.covered.length || 0)) {
      best = combo
    }
  }

  if (best && best.bloodlineName) {
    const blElem = props.elements.find(e => e.name === best.bloodlineName)
    best.bloodlineIcon = blElem?.icon || ''
  }

  return best
})

// ========== 自定义组合模式 ==========
const customAvailableElements = computed(() => {
  let skills = [...props.allSkills]
  if (customBloodline.value) {
    const bloodlineSkills = props.allSkillsWithBloodline.filter(s =>
      s.element === customBloodline.value && s.power > 0 &&
      !props.allSkills.some(bs => bs.name === s.name)
    )
    skills = [...skills, ...bloodlineSkills]
  }
  const names = getFilteredElements(skills, customAtkType.value)
  return props.elements.filter(e => names.has(e.name))
})

const customActiveSkills = computed(() => {
  let skills = props.allSkills
  if (customBloodline.value) {
    const bloodlineSkills = props.allSkillsWithBloodline.filter(s =>
      s.element === customBloodline.value && s.power > 0 &&
      !props.allSkills.some(bs => bs.name === s.name)
    )
    skills = [...props.allSkills, ...bloodlineSkills]
  }
  return skills
})

function isInCustomSlot(elem) {
  return customSlots.value.some(s => s && s.name === elem.name)
}

function addCustomSlot(elem) {
  if (isInCustomSlot(elem)) return
  const idx = customSlots.value.findIndex(s => s === null)
  if (idx === -1) return
  customSlots.value[idx] = { name: elem.name, icon: elem.icon, color: elem.color, id: elem.id }
}

function clearCustomSlot(idx) {
  customSlots.value[idx] = null
}

const customResult = computed(() => {
  const selected = customSlots.value.filter(Boolean)
  if (!selected.length || !props.elements.length) return null

  const allElems = props.elements
  const covered = []
  const uncovered = []
  for (const defender of allElems) {
    let hit = false
    for (const atk of selected) {
      const atkFull = allElems.find(e => e.name === atk.name)
      if (atkFull?.strong_against?.some(e => e.id === defender.id || e.name === defender.name)) { hit = true; break }
    }
    if (hit) covered.push({ name: defender.name, icon: defender.icon, color: defender.color })
    else uncovered.push({ name: defender.name, icon: defender.icon, color: defender.color })
  }

  const recommendedSkills = []
  for (const sel of selected) {
    let best = null
    for (const skill of customActiveSkills.value) {
      if (skill.element !== sel.name || !skill.power || skill.power <= 0) continue
      if (customAtkType.value && skill.type !== customAtkType.value) continue
      if (!best || skill.power > best.power) best = skill
    }
    if (best) {
      const elemInfo = allElems.find(e => e.name === best.element)
      const fromBloodline = !props.allSkills.some(s => s.name === best.name && s.element === best.element)
      recommendedSkills.push({ name: best.name, power: best.power, elemIcon: elemInfo?.icon || '', elemColor: elemInfo?.color || '', skillIcon: best.skill_icon || '', fromBloodline })
    }
  }

  return { covered, uncovered, recommendedSkills }
})
</script>

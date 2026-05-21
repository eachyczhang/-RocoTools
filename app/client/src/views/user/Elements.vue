<template>
  <div>
    <h1 class="page-title">属性克制关系</h1>

    <!-- Tab 切换 -->
    <div class="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5 lg:mb-6 overflow-x-auto">
      <button @click="viewMode = 'table'"
        class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        :class="viewMode === 'table' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
        克制表
      </button>
      <button @click="viewMode = 'dual'"
        class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        :class="viewMode === 'dual' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
        双属性表
      </button>
      <button @click="viewMode = 'detail'"
        class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
        :class="viewMode === 'detail' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
        详细查询
      </button>
    </div>

    <!-- ========== 克制表格模式 ========== -->
    <div v-if="viewMode === 'table'" class="card !p-0 overflow-x-auto scroll-x-mobile">
      <table class="text-xs md:text-sm border-collapse w-max min-w-full">
        <!-- 表头：防御方 -->
        <thead>
          <tr>
            <th class="sticky left-0 z-10 p-1 md:p-2 border border-surface-light-border dark:border-surface-dark-border"
              :style="{ backgroundColor: isDark ? '#1E2433' : '#F9FAFB' }">
              <div class="w-8 h-8 md:w-14 md:h-14 flex items-center justify-center">
                <span class="text-[10px] md:text-xs text-muted leading-tight text-center">攻↓ 防→</span>
              </div>
            </th>
            <th v-for="elem in elements" :key="'h-' + elem.id"
              class="p-1 md:p-2 border border-surface-light-border dark:border-surface-dark-border"
              :style="{ background: elem.color + '12' }">
              <div class="w-8 md:w-14 flex flex-col items-center gap-0.5 md:gap-1">
                <img :src="elem.icon" class="w-5 h-5 md:w-7 md:h-7" :title="elem.name" />
                <span class="text-[10px] md:text-xs font-medium hidden md:block" :style="{ color: elem.color }">{{ elem.name }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="attacker in elements" :key="'r-' + attacker.id">
            <td class="sticky left-0 z-10 p-1 md:p-2 border border-surface-light-border dark:border-surface-dark-border"
              :style="{ backgroundColor: isDark ? '#1E2433' : '#F9FAFB', backgroundImage: `linear-gradient(${attacker.color}12, ${attacker.color}12)` }">
              <div class="w-8 md:w-14 flex flex-col items-center gap-0.5 md:gap-1">
                <img :src="attacker.icon" class="w-5 h-5 md:w-7 md:h-7" :title="attacker.name" />
                <span class="text-[10px] md:text-xs font-medium hidden md:block" :style="{ color: attacker.color }">{{ attacker.name }}</span>
              </div>
            </td>
            <td v-for="defender in elements" :key="'c-' + attacker.id + '-' + defender.id"
              class="p-1 md:p-2 border border-surface-light-border dark:border-surface-dark-border text-center w-8 h-8 md:w-14 md:h-12"
              :class="getCellClass(attacker, defender)">
              <span v-if="getMultiplier(attacker, defender) !== 1" class="font-bold text-[10px] md:text-sm">
                {{ formatMult(getMultiplier(attacker, defender)) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs md:text-sm text-muted">
        <span class="flex items-center gap-1"><span class="w-4 h-4 md:w-5 md:h-5 rounded bg-red-200 dark:bg-red-500/30"></span> ×2</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 md:w-5 md:h-5 rounded bg-blue-200 dark:bg-blue-500/30"></span> ½</span>
        <span>空白 = ×1</span>
      </div>
    </div>

    <!-- ========== 双属性克制表 ========== -->
    <div v-if="viewMode === 'dual'" class="card !p-0 overflow-x-auto -mx-3 md:mx-0 rounded-none md:rounded-xl">
      <table class="text-xs border-collapse w-max min-w-full">
        <thead class="sticky top-0 z-20">
          <tr>
            <th class="sticky left-0 z-30 bg-gray-50 dark:bg-surface-dark-card p-1 md:p-2 border border-surface-light-border dark:border-surface-dark-border min-w-[70px] md:min-w-[100px]">
              <span class="text-[10px] md:text-xs text-muted">防御组合 ↓</span>
            </th>
            <th v-for="elem in elements" :key="'dh-' + elem.id"
              class="p-1 md:p-1.5 border border-surface-light-border dark:border-surface-dark-border bg-gray-50 dark:bg-surface-dark-card"
              :style="{ background: elem.color + '12' }">
              <div class="w-8 md:w-12 flex flex-col items-center gap-0.5">
                <img :src="elem.icon" class="w-4 h-4 md:w-6 md:h-6" />
                <span class="text-[9px] md:text-[11px] font-medium hidden md:block" :style="{ color: elem.color }">{{ elem.name }}</span>
              </div>
            </th>
            <th class="p-1 md:p-1.5 border border-surface-light-border dark:border-surface-dark-border bg-gray-50 dark:bg-surface-dark-card">
              <span class="text-[10px] md:text-xs text-muted">弱</span>
            </th>
            <th class="p-1 md:p-1.5 border border-surface-light-border dark:border-surface-dark-border bg-gray-50 dark:bg-surface-dark-card">
              <span class="text-[10px] md:text-xs text-muted">抗</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="combo in dualCombos" :key="combo.key">
            <td class="sticky left-0 z-10 bg-gray-50 dark:bg-surface-dark-card p-1 md:p-1.5 border border-surface-light-border dark:border-surface-dark-border min-w-[70px] md:min-w-[100px]">
              <div class="flex items-center gap-1">
                <img :src="combo.elem1.icon" class="w-4 h-4 md:w-5 md:h-5" />
                <img v-if="combo.elem2" :src="combo.elem2.icon" class="w-4 h-4 md:w-5 md:h-5" />
                <span class="text-[10px] md:text-xs font-medium truncate hidden sm:inline">{{ combo.label }}</span>
              </div>
            </td>
            <td v-for="attacker in elements" :key="'dc-' + combo.key + '-' + attacker.id"
              class="p-0.5 md:p-1 border border-surface-light-border dark:border-surface-dark-border text-center w-8 h-7 md:w-12 md:h-9"
              :class="getDualCellClass(combo.mults[attacker.id])">
              <span v-if="combo.mults[attacker.id] !== 1" class="font-bold text-[10px] md:text-xs">
                {{ formatDualMult(combo.mults[attacker.id]) }}
              </span>
            </td>
            <td class="p-0.5 md:p-1 border border-surface-light-border dark:border-surface-dark-border text-center text-[10px] md:text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/5">
              {{ combo.weakCount }}
            </td>
            <td class="p-0.5 md:p-1 border border-surface-light-border dark:border-surface-dark-border text-center text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/5">
              {{ combo.resistCount }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs text-muted flex-wrap">
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-red-300 dark:bg-red-500/40"></span> ×3</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-red-200 dark:bg-red-500/25"></span> ×2</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-blue-200 dark:bg-blue-500/25"></span> ½</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded bg-blue-300 dark:bg-blue-500/40"></span> ¼</span>
      </div>
    </div>

    <!-- ========== 详细查询模式 ========== -->
    <div v-if="viewMode === 'detail'">
      <!-- 属性网格 -->
      <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-9 gap-2 md:gap-3 mb-6 md:mb-8">
        <button v-for="elem in elements" :key="elem.id"
          class="card text-center !p-2 md:!p-3 cursor-pointer"
          :class="selected?.id === elem.id ? 'ring-2 ring-primary-400' : ''"
          @click="selected = selected?.id === elem.id ? null : elem">
          <img :src="elem.icon" class="w-6 h-6 md:w-7 md:h-7 mx-auto mb-1" :alt="elem.name" />
          <div class="text-[10px] md:text-xs font-medium" :style="{ color: elem.color }">{{ elem.name }}</div>
        </button>
      </div>

      <!-- 选中属性详情 -->
      <div class="card" v-if="selected">
        <div class="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
          <img :src="selected.icon" class="w-6 h-6 md:w-8 md:h-8" />
          <h2 class="text-lg md:text-xl font-medium" :style="{ color: selected.color }">{{ selected.name }}</h2>
          <span v-if="selected.immunity" class="badge bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 ml-auto text-xs">
            免疫：{{ selected.immunity }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <div class="text-muted text-xs mb-2 uppercase tracking-wide">攻击面</div>
            <div class="space-y-2 md:space-y-3">
              <div>
                <span class="text-xs text-green-600 dark:text-green-400">克制 ×2</span>
                <div class="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                  <span v-for="t in selected.strong_against" :key="t.id"
                    class="badge text-xs bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">{{ t.name }}</span>
                  <span v-if="!selected.strong_against?.length" class="text-muted text-xs">无</span>
                </div>
              </div>
              <div>
                <span class="text-xs text-yellow-600 dark:text-yellow-400">被抵抗 ×0.5</span>
                <div class="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                  <span v-for="t in selected.resisted_by" :key="t.id"
                    class="badge text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">{{ t.name }}</span>
                  <span v-if="!selected.resisted_by?.length" class="text-muted text-xs">无</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="text-muted text-xs mb-2 uppercase tracking-wide">防御面</div>
            <div class="space-y-2 md:space-y-3">
              <div>
                <span class="text-xs text-red-600 dark:text-red-400">弱点 ×2</span>
                <div class="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                  <span v-for="t in selected.weak_to" :key="t.id"
                    class="badge text-xs bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{{ t.name }}</span>
                  <span v-if="!selected.weak_to?.length" class="text-muted text-xs">无</span>
                </div>
              </div>
              <div>
                <span class="text-xs text-blue-600 dark:text-blue-400">抗性 ×0.5</span>
                <div class="flex flex-wrap gap-1 md:gap-1.5 mt-1">
                  <span v-for="t in selected.resistant_to" :key="t.id"
                    class="badge text-xs bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{{ t.name }}</span>
                  <span v-if="!selected.resistant_to?.length" class="text-muted text-xs">无</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { elementsApi } from '@/api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()
const elements = ref([])
const selected = ref(null)
const viewMode = ref('table')

onMounted(async () => {
  const res = await elementsApi.list()
  elements.value = res.elements
})

// 单属性克制表
function getMultiplier(attacker, defender) {
  if (attacker.strong_against?.some(e => e.id === defender.id)) return 2
  if (defender.resistant_to?.some(e => e.id === attacker.id)) return 0.5
  return 1
}

function formatMult(mult) {
  if (mult === 2) return '2×'
  if (mult === 0.5) return '½'
  return mult + '×'
}

function getCellClass(attacker, defender) {
  const mult = getMultiplier(attacker, defender)
  if (mult === 2) return 'bg-red-200 dark:bg-red-500/25 text-red-700 dark:text-red-300'
  if (mult === 0.5) return 'bg-blue-200 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300'
  return ''
}

// 双属性克制表
const dualCombos = computed(() => {
  if (!elements.value.length) return []
  const elems = elements.value
  const combos = []

  // 单属性
  for (const e1 of elems) {
    const mults = {}
    let weakCount = 0
    let resistCount = 0
    for (const atk of elems) {
      const m = getSingleDefMult(atk, e1)
      mults[atk.id] = m
      if (m > 1) weakCount++
      if (m < 1) resistCount++
    }
    combos.push({ key: e1.id + '', elem1: e1, elem2: null, label: e1.name, mults, weakCount, resistCount })
  }

  // 双属性组合
  for (let i = 0; i < elems.length; i++) {
    for (let j = i + 1; j < elems.length; j++) {
      const e1 = elems[i]
      const e2 = elems[j]
      const mults = {}
      let weakCount = 0
      let resistCount = 0
      for (const atk of elems) {
        const m1 = getSingleDefMult(atk, e1)
        const m2 = getSingleDefMult(atk, e2)
        let m = m1 * m2
        // 特殊倍率
        if (m === 4) m = 3
        else if (m === 0.25) m = 0.25
        mults[atk.id] = m
        if (m > 1) weakCount++
        if (m < 1) resistCount++
      }
      combos.push({ key: e1.id + '-' + e2.id, elem1: e1, elem2: e2, label: e1.name + '/' + e2.name, mults, weakCount, resistCount })
    }
  }

  return combos
})

// 单防御属性被攻击的倍率
function getSingleDefMult(attacker, defender) {
  if (attacker.strong_against?.some(e => e.id === defender.id)) return 2
  if (defender.resistant_to?.some(e => e.id === attacker.id)) return 0.5
  return 1
}

function formatDualMult(mult) {
  if (mult === 3) return '3×'
  if (mult === 2) return '2×'
  if (mult === 0.5) return '½'
  if (mult === 0.25) return '¼'
  return mult + '×'
}

function getDualCellClass(mult) {
  if (mult === 3) return 'bg-red-300 dark:bg-red-500/35 text-red-800 dark:text-red-200'
  if (mult === 2) return 'bg-red-200 dark:bg-red-500/20 text-red-700 dark:text-red-300'
  if (mult === 0.5) return 'bg-blue-200 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
  if (mult === 0.25) return 'bg-blue-300 dark:bg-blue-500/35 text-blue-800 dark:text-blue-200'
  return ''
}
</script>

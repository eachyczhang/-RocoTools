<template>
  <div class="card section-gap">
    <h3 class="page-title">属性克制关系分析</h3>

    <!-- 属性选择器 -->
    <div class="mb-5 md:mb-6">
      <p class="text-sm md:text-base text-muted mb-3 md:mb-4 font-medium">选择属性组合（最多2个属性）</p>
      <div class="flex flex-wrap gap-2 md:gap-3">
        <button
          v-for="element in elements"
          :key="element.id"
          @click="toggleElement(element.id)"
          class="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border transition-all duration-200"
          :class="[
            selectedElementIds.includes(element.id)
              ? 'border-primary-300 bg-primary-50 dark:bg-primary-500/10 shadow-sm'
              : 'border-surface-light-border dark:border-surface-dark-border hover:border-primary-200 dark:hover:border-primary-500/30',
          ]"
        >
          <img :src="element.icon" class="w-6 h-6 md:w-7 md:h-7" />
          <span class="text-sm md:text-base font-medium" :style="{ color: element.color }">{{ element.name }}</span>
          <span v-if="selectedElementIds.includes(element.id)" class="text-primary-600 dark:text-primary-400">
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
      <p v-if="selectedElementIds.length > 0" class="text-sm text-muted mt-3 flex items-center gap-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
        </svg>
        已选择：<span class="font-medium text-gray-700 dark:text-gray-300">{{ selectedElements.map(e => e.name).join(' + ') }}</span>
      </p>
    </div>

    <!-- 克制关系分析 -->
    <div v-if="analysis" class="space-y-5 md:space-y-6">
      <!-- 总览统计 -->
      <div class="card-flat">
        <h4 class="text-base md:text-lg font-semibold text-primary-600 dark:text-primary-400 mb-3 md:mb-4 flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 00-6 6c0 1.887.454 3.665 1.257 5.234a.75.75 0 00.683.442h8.12a.75.75 0 00.683-.442A5.994 5.994 0 0016 10a6 6 0 00-6-6z" />
          </svg>
          总览统计
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div class="card-flat text-center">
            <div class="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{{ analysis.summary.weakToCount }}</div>
            <div class="text-xs md:text-sm text-muted font-medium">被克制属性</div>
          </div>
          <div class="card-flat text-center">
            <div class="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{{ analysis.summary.resistToCount }}</div>
            <div class="text-xs md:text-sm text-muted font-medium">抵抗属性</div>
          </div>
          <div class="card-flat text-center">
            <div class="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{{ analysis.summary.totalWeakToMultiplier.toFixed(1) }}×</div>
            <div class="text-xs md:text-sm text-muted font-medium">总克制倍率</div>
          </div>
          <div class="card-flat text-center">
            <div class="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{{ analysis.summary.totalResistToMultiplier.toFixed(1) }}×</div>
            <div class="text-xs md:text-sm text-muted font-medium">总抵抗倍率</div>
          </div>
        </div>
      </div>

      <!-- 详细克制关系 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <!-- 被克制 -->
        <div v-if="analysis.weakTo.length" class="card">
          <h4 class="text-base md:text-lg font-semibold text-red-600 dark:text-red-400 mb-3 md:mb-4 flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.965 4.904l9.131 9.131a6.5 6.5 0 00-9.131-9.131zm8.07 10.192L4.904 5.965a6.5 6.5 0 009.131 9.131zM4.343 4.343a8 8 0 1111.314 11.314A8 8 0 014.343 4.343z" clip-rule="evenodd" />
            </svg>
            被克制（受到增伤）
            <span class="text-sm font-medium text-muted ml-auto">×{{ analysis.summary.totalWeakToMultiplier.toFixed(1) }}</span>
          </h4>
          <div class="space-y-2">
            <div v-for="item in analysis.weakTo" :key="item.name" class="flex items-center justify-between card-flat p-3 md:p-3.5">
              <div class="flex items-center gap-3 md:gap-4">
                <img :src="item.icon" class="w-7 h-7 md:w-8 md:h-8" />
                <span class="text-base md:text-lg font-medium" :style="{ color: item.color }">{{ item.name }}</span>
              </div>
              <div class="text-right">
                <div class="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">×{{ item.multiplier }}</div>
                <div class="text-xs text-muted font-medium">{{ getMultiplierType(item.multiplier) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 抵抗 -->
        <div v-if="analysis.resistTo.length" class="card">
          <h4 class="text-base md:text-lg font-semibold text-green-600 dark:text-green-400 mb-3 md:mb-4 flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            抵抗（受到减伤）
            <span class="text-sm font-medium text-muted ml-auto">×{{ analysis.summary.totalResistToMultiplier.toFixed(1) }}</span>
          </h4>
          <div class="space-y-2">
            <div v-for="item in analysis.resistTo" :key="item.name" class="flex items-center justify-between card-flat p-3 md:p-3.5">
              <div class="flex items-center gap-3 md:gap-4">
                <img :src="item.icon" class="w-7 h-7 md:w-8 md:h-8" />
                <span class="text-base md:text-lg font-medium" :style="{ color: item.color }">{{ item.name }}</span>
              </div>
              <div class="text-right">
                <div class="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">×{{ item.multiplier }}</div>
                <div class="text-xs text-muted font-medium">{{ getMultiplierType(item.multiplier) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无克制关系 -->
      <div v-if="!analysis.weakTo.length && !analysis.resistTo.length" class="card text-center py-6 md:py-8">
        <svg class="w-12 h-12 md:w-16 md:h-16 text-muted mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.94 6.94a1.5 1.5 0 11-2.83 2.83 1.5 1.5 0 012.83-2.83zm6.12 0a1.5 1.5 0 11-2.83 2.83 1.5 1.5 0 012.83-2.83z" clip-rule="evenodd" />
        </svg>
        <p class="text-base md:text-lg text-muted font-medium">该属性组合无特殊克制关系</p>
        <p class="text-sm text-muted mt-1">选择其他属性组合试试吧</p>
      </div>
    </div>

    <div v-else-if="selectedElementIds.length === 0" class="card text-center py-8 md:py-10">
      <svg class="w-12 h-12 md:w-16 md:h-16 text-muted mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
      </svg>
      <p class="text-base md:text-lg text-muted font-medium">请选择属性开始分析</p>
      <p class="text-sm text-muted mt-1">点击上方属性按钮选择1-2个属性</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  /** 完整属性列表 */
  elements: { type: Array, required: true },
  /** 倍率配置 */
  multipliers: { type: Object, required: true },
})

const selectedElementIds = ref([])

// 计算属性
const selectedElements = computed(() => {
  return selectedElementIds.value.map(id => props.elements.find(e => e.id === id)).filter(Boolean)
})

const analysis = computed(() => {
  if (selectedElementIds.value.length === 0 || !props.elements.length) return null

  const allElems = props.elements
  const mult = props.multipliers
  const myElems = selectedElements.value

  const weakTo = []   // 被克制
  const resistTo = [] // 抵抗

  // 遍历所有攻击属性，计算克制关系
  for (const attacker of allElems) {
    let totalMult = 1

    for (const myElem of myElems) {
      // 攻击方克制我 → strong(×2)
      if (attacker.strong_against?.some(e => e.id === myElem.id || e.name === myElem.name)) {
        totalMult *= mult.strong
      }
      // 我抵抗攻击方 → resist(×0.5)
      else if (myElem.resistant_to?.some(e => e.id === attacker.id || e.name === attacker.name)) {
        totalMult *= mult.resist
      }
    }

    // 处理特殊倍率：双重克制用 double_strong，双重抵抗用 double_resist
    if (myElems.length === 2) {
      if (totalMult === mult.strong * mult.strong) {
        totalMult = mult.double_strong
      } else if (totalMult === mult.resist * mult.resist) {
        totalMult = mult.double_resist
      }
    }

    if (totalMult > 1) {
      weakTo.push({
        name: attacker.name,
        icon: attacker.icon,
        color: attacker.color,
        multiplier: totalMult,
      })
    } else if (totalMult < 1) {
      resistTo.push({
        name: attacker.name,
        icon: attacker.icon,
        color: attacker.color,
        multiplier: totalMult,
      })
    }
  }

  // 排序：被克制按倍率降序，抵抗按倍率升序
  weakTo.sort((a, b) => b.multiplier - a.multiplier)
  resistTo.sort((a, b) => a.multiplier - b.multiplier)

  // 计算统计信息
  const summary = {
    weakToCount: weakTo.length,
    resistToCount: resistTo.length,
    totalWeakToMultiplier: weakTo.reduce((sum, item) => sum + (item.multiplier - 1), 0) + weakTo.length,
    totalResistToMultiplier: resistTo.reduce((sum, item) => sum + (1 - item.multiplier), 0) + resistTo.length,
  }

  return { weakTo, resistTo, summary }
})

// 方法
const toggleElement = (elementId) => {
  const index = selectedElementIds.value.indexOf(elementId)
  if (index > -1) {
    selectedElementIds.value.splice(index, 1)
  } else if (selectedElementIds.value.length < 2) {
    selectedElementIds.value.push(elementId)
  }
}

const getMultiplierType = (multiplier) => {
  if (multiplier === props.multipliers.double_strong) return '双重克制'
  if (multiplier === props.multipliers.strong) return '单克制'
  if (multiplier === props.multipliers.double_resist) return '双重抵抗'
  if (multiplier === props.multipliers.resist) return '单抵抗'
  return '普通'
}
</script>
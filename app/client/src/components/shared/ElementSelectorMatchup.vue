<template>
  <div class="card section-gap relative overflow-hidden">
    <!-- 装饰性背景元素 -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-500/5 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
    <div class="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary-500/3 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

    <div class="relative z-10">
      <h3 class="page-title flex items-center gap-3">
        <div class="w-2 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
        属性克制关系分析
      </h3>

      <!-- 属性选择器 -->
      <div class="mb-6 md:mb-8">
        <p class="text-sm md:text-base text-muted mb-4 md:mb-5 font-medium">选择属性组合（最多2个属性）</p>
        <div class="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-3 md:gap-4">
          <button
            v-for="element in elements"
            :key="element.id"
            @click="toggleElement(element.id)"
            class="group relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 active:scale-95"
            :class="[
              selectedElementIds.includes(element.id)
                ? 'border-primary-400 bg-primary-50/80 dark:bg-primary-500/15 shadow-lg'
                : 'border-surface-light-border/60 dark:border-surface-dark-border/60 hover:border-primary-300/60 dark:hover:border-primary-500/40',
            ]"
          >
            <!-- 选中状态指示器 -->
            <div v-if="selectedElementIds.includes(element.id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>

            <img :src="element.icon" class="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 group-hover:scale-110" />
            <span class="text-xs md:text-sm font-semibold text-center leading-tight" :style="{ color: element.color }">{{ element.name }}</span>
          </button>
        </div>

        <div v-if="selectedElementIds.length > 0" class="mt-4 p-3 bg-primary-50/50 dark:bg-primary-500/10 rounded-lg border border-primary-200/50 dark:border-primary-500/20">
          <p class="text-sm text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            已选择：<span class="font-bold">{{ selectedElements.map(e => e.name).join(' + ') }}</span>
          </p>
        </div>
      </div>

      <!-- 克制关系分析 -->
      <div v-if="analysis" class="space-y-6 md:space-y-8">
        <!-- 总览统计 -->
        <div class="bg-gradient-to-br from-primary-50/80 to-primary-100/30 dark:from-primary-950/20 dark:to-primary-900/10 rounded-2xl p-5 md:p-6 border border-primary-200/50 dark:border-primary-500/20">
          <h4 class="text-lg md:text-xl font-bold text-primary-700 dark:text-primary-300 mb-4 md:mb-5 flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 00-6 6c0 1.887.454 3.665 1.257 5.234a.75.75 0 00.683.442h8.12a.75.75 0 00.683-.442A5.994 5.994 0 0016 10a6 6 0 00-6-6z" />
              </svg>
            </div>
            总览统计
          </h4>
          <div class="grid grid-cols-2 gap-4 md:gap-5">
            <div class="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 text-center shadow-sm border border-gray-200/50 dark:border-gray-600/50">
              <div class="text-2xl md:text-3xl font-black text-red-500 dark:text-red-400 mb-2">{{ analysis.summary.weakToCount }}</div>
              <div class="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide">被克制属性</div>
            </div>
            <div class="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 text-center shadow-sm border border-gray-200/50 dark:border-gray-600/50">
              <div class="text-2xl md:text-3xl font-black text-green-500 dark:text-green-400 mb-2">{{ analysis.summary.resistToCount }}</div>
              <div class="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide">抵抗属性</div>
            </div>
          </div>
        </div>

        <!-- 详细克制关系 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <!-- 被克制 -->
          <div v-if="analysis.weakTo.length" class="bg-gradient-to-br from-red-50/70 to-red-100/40 dark:from-red-950/25 dark:to-red-900/15 rounded-2xl p-5 md:p-6 border border-red-200/60 dark:border-red-800/40">
            <h4 class="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 mb-4 md:mb-5 flex items-center gap-3">
              <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.965 4.904l9.131 9.131a6.5 6.5 0 00-9.131-9.131zm8.07 10.192L4.904 5.965a6.5 6.5 0 009.131 9.131zM4.343 4.343a8 8 0 1111.314 11.314A8 8 0 014.343 4.343z" clip-rule="evenodd" />
                </svg>
              </div>
              被克制（受到增伤）
            </h4>
            <div class="space-y-3">
              <div v-for="item in analysis.weakTo" :key="item.name" class="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 rounded-xl p-4 shadow-sm border border-red-100/50 dark:border-red-800/30 hover:shadow-md transition-all duration-200">
                <div class="flex items-center gap-4">
                  <img :src="item.icon" class="w-10 h-10 rounded-lg shadow-sm" />
                  <div>
                    <span class="text-lg font-bold block" :style="{ color: item.color }">{{ item.name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ getMultiplierType(item.multiplier) }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black text-red-500 dark:text-red-400">×{{ item.multiplier }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 抵抗 -->
          <div v-if="analysis.resistTo.length" class="bg-gradient-to-br from-green-50/70 to-green-100/40 dark:from-green-950/25 dark:to-green-900/15 rounded-2xl p-5 md:p-6 border border-green-200/60 dark:border-green-800/40">
            <h4 class="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 mb-4 md:mb-5 flex items-center gap-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              抵抗（受到减伤）
            </h4>
            <div class="space-y-3">
              <div v-for="item in analysis.resistTo" :key="item.name" class="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 rounded-xl p-4 shadow-sm border border-green-100/50 dark:border-green-800/30 hover:shadow-md transition-all duration-200">
                <div class="flex items-center gap-4">
                  <img :src="item.icon" class="w-10 h-10 rounded-lg shadow-sm" />
                  <div>
                    <span class="text-lg font-bold block" :style="{ color: item.color }">{{ item.name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ getMultiplierType(item.multiplier) }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black text-green-500 dark:text-green-400">×{{ item.multiplier }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 无克制关系 -->
        <div v-if="!analysis.weakTo.length && !analysis.resistTo.length" class="text-center py-8 md:py-10 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div class="w-16 h-16 md:w-20 md:h-20 bg-gray-200/50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.94 6.94a1.5 1.5 0 11-2.83 2.83 1.5 1.5 0 012.83-2.83zm6.12 0a1.5 1.5 0 11-2.83 2.83 1.5 1.5 0 012.83-2.83z" clip-rule="evenodd" />
            </svg>
          </div>
          <p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-semibold">该属性组合无特殊克制关系</p>
          <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">选择其他属性组合试试吧</p>
        </div>
      </div>

      <div v-else-if="selectedElementIds.length === 0" class="text-center py-10 md:py-12 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div class="w-16 h-16 md:w-20 md:h-20 bg-primary-100/50 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 md:w-10 md:h-10 text-primary-500 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-semibold">请选择属性开始分析</p>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">点击上方属性按钮选择1-2个属性</p>
      </div>
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
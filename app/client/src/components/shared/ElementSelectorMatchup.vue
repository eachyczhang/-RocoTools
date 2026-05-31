<template>
  <div class="card mb-4 md:mb-6">
    <h3 class="text-base md:text-lg font-medium mb-3 md:mb-4">属性克制关系分析</h3>

    <!-- 属性选择器 -->
    <div class="mb-4 md:mb-6">
      <p class="text-xs md:text-sm text-muted mb-2 md:mb-3">选择属性组合（最多2个属性）</p>
      <div class="flex flex-wrap gap-2 md:gap-3">
        <button
          v-for="element in elements"
          :key="element.id"
          @click="toggleElement(element.id)"
          class="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-full border transition-all"
          :class="[
            selectedElementIds.includes(element.id)
              ? 'border-transparent shadow-sm'
              : 'border-gray-200 dark:border-gray-700',
            selectedElementIds.includes(element.id) ? 'opacity-100' : 'opacity-70 hover:opacity-90'
          ]"
          :style="selectedElementIds.includes(element.id)
            ? { backgroundColor: element.color + '20', borderColor: element.color + '40' }
            : {}"
        >
          <img :src="element.icon" class="w-5 h-5 md:w-6 md:h-6" />
          <span class="text-xs md:text-sm font-medium" :style="{ color: element.color }">{{ element.name }}</span>
          <span v-if="selectedElementIds.includes(element.id)" class="ml-1 text-xs">✓</span>
        </button>
      </div>
      <p v-if="selectedElementIds.length > 0" class="text-xs text-muted mt-2">
        已选择：{{ selectedElements.map(e => e.name).join(' + ') }}
      </p>
    </div>

    <!-- 克制关系分析 -->
    <div v-if="analysis" class="space-y-4 md:space-y-6">
      <!-- 总览统计 -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 md:p-4">
        <h4 class="text-sm md:text-base font-medium mb-2 md:mb-3">总览统计</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div class="text-center">
            <div class="text-lg md:text-xl font-bold text-red-500">{{ analysis.summary.weakToCount }}</div>
            <div class="text-xs text-muted">被克制属性</div>
          </div>
          <div class="text-center">
            <div class="text-lg md:text-xl font-bold text-green-500">{{ analysis.summary.resistToCount }}</div>
            <div class="text-xs text-muted">抵抗属性</div>
          </div>
          <div class="text-center">
            <div class="text-lg md:text-xl font-bold text-blue-500">{{ analysis.summary.totalWeakToMultiplier.toFixed(1) }}×</div>
            <div class="text-xs text-muted">总克制倍率</div>
          </div>
          <div class="text-center">
            <div class="text-lg md:text-xl font-bold text-purple-500">{{ analysis.summary.totalResistToMultiplier.toFixed(1) }}×</div>
            <div class="text-xs text-muted">总抵抗倍率</div>
          </div>
        </div>
      </div>

      <!-- 详细克制关系 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <!-- 被克制 -->
        <div v-if="analysis.weakTo.length">
          <h4 class="text-sm md:text-base font-medium mb-2 md:mb-3 text-red-600 dark:text-red-400">
            被克制（受到增伤）
            <span class="text-xs text-muted ml-1">×{{ analysis.summary.totalWeakToMultiplier.toFixed(1) }}</span>
          </h4>
          <div class="space-y-2">
            <div v-for="item in analysis.weakTo" :key="item.name" class="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-lg p-2 md:p-3">
              <div class="flex items-center gap-2 md:gap-3">
                <img :src="item.icon" class="w-6 h-6 md:w-7 md:h-7" />
                <span class="text-sm md:text-base font-medium" :style="{ color: item.color }">{{ item.name }}</span>
              </div>
              <div class="text-right">
                <div class="text-sm md:text-base font-bold text-red-600">×{{ item.multiplier }}</div>
                <div class="text-xs text-muted">{{ getMultiplierType(item.multiplier) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 抵抗 -->
        <div v-if="analysis.resistTo.length">
          <h4 class="text-sm md:text-base font-medium mb-2 md:mb-3 text-green-600 dark:text-green-400">
            抵抗（受到减伤）
            <span class="text-xs text-muted ml-1">×{{ analysis.summary.totalResistToMultiplier.toFixed(1) }}</span>
          </h4>
          <div class="space-y-2">
            <div v-for="item in analysis.resistTo" :key="item.name" class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-2 md:p-3">
              <div class="flex items-center gap-2 md:gap-3">
                <img :src="item.icon" class="w-6 h-6 md:w-7 md:h-7" />
                <span class="text-sm md:text-base font-medium" :style="{ color: item.color }">{{ item.name }}</span>
              </div>
              <div class="text-right">
                <div class="text-sm md:text-base font-bold text-green-600">×{{ item.multiplier }}</div>
                <div class="text-xs text-muted">{{ getMultiplierType(item.multiplier) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无克制关系 -->
      <div v-if="!analysis.weakTo.length && !analysis.resistTo.length" class="text-center py-4 md:py-6">
        <p class="text-sm md:text-base text-muted">该属性组合无特殊克制关系</p>
      </div>
    </div>

    <p v-else-if="selectedElementIds.length === 0" class="text-xs md:text-sm text-muted text-center py-4 md:py-6">
      请选择至少一个属性开始分析
    </p>
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
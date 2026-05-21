<template>
  <div class="card mb-4 md:mb-6">
    <h3 class="text-base md:text-lg font-medium mb-3 md:mb-4">属性克制关系</h3>

    <div v-if="matchup" class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      <!-- 被克制 -->
      <div v-if="matchup.weakTo.length">
        <p class="text-xs md:text-sm text-muted mb-1.5 md:mb-2">被克制（受到增伤）</p>
        <div class="flex flex-wrap gap-1.5 md:gap-2">
          <span v-for="item in matchup.weakTo" :key="item.name"
            class="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full"
            :style="{ background: item.color + '18' }"
            :title="item.name + ' ×' + item.multiplier">
            <img v-if="item.icon" :src="item.icon" class="w-5 h-5 md:w-7 md:h-7" />
            <span class="text-xs md:text-sm font-medium" :style="{ color: item.color }">×{{ item.multiplier }}</span>
          </span>
        </div>
      </div>

      <!-- 抵抗 -->
      <div v-if="matchup.resistTo.length">
        <p class="text-xs md:text-sm text-muted mb-1.5 md:mb-2">抵抗（受到减伤）</p>
        <div class="flex flex-wrap gap-1.5 md:gap-2">
          <span v-for="item in matchup.resistTo" :key="item.name"
            class="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full"
            :style="{ background: item.color + '18' }"
            :title="item.name + ' ×' + item.multiplier">
            <img v-if="item.icon" :src="item.icon" class="w-5 h-5 md:w-7 md:h-7" />
            <span class="text-xs md:text-sm font-medium" :style="{ color: item.color }">×{{ item.multiplier }}</span>
          </span>
        </div>
      </div>
    </div>

    <p v-else class="text-xs md:text-sm text-muted">无属性数据</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 当前精灵的属性ID列表（主+副） */
  elementIds: { type: Array, required: true },
  /** 完整属性列表（从 elementsApi.list() 获得） */
  elements: { type: Array, required: true },
  /** 倍率配置 { strong: 2, resist: 0.5, double_strong: 3, double_resist: 0.25 } */
  multipliers: { type: Object, required: true },
})

const matchup = computed(() => {
  if (!props.elementIds.length || !props.elements.length) return null

  const allElems = props.elements
  const mult = props.multipliers

  // 确保 multipliers 已加载
  if (!mult.strong || !mult.resist) return null

  // 获取精灵的属性对象
  const myElems = props.elementIds
    .map(id => allElems.find(e => e.id === id))
    .filter(Boolean)

  if (!myElems.length) return null

  const weakTo = []   // 被克制
  const resistTo = [] // 抵抗

  // 遍历所有攻击属性，计算打到"我"身上的倍率
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
      // 否则 ×1
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

  return { weakTo, resistTo }
})
</script>

<template>
  <span class="skill-desc" v-html="highlighted"></span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
})

// 只高亮有实际意义的核心机制词，分4大色系
const highlightRules = [
  // 红色系 - 应对触发（最重要的战斗机制）
  { pattern: '应对状态', color: '#E65100' },
  { pattern: '应对防御', color: '#E65100' },
  { pattern: '应对攻击', color: '#E65100' },
  { pattern: '应对成功', color: '#E65100' },
  // 青色系 - 控制/位移
  { pattern: '打断', color: '#0097A7' },
  { pattern: '脱离', color: '#0097A7' },
  { pattern: '返场', color: '#0097A7' },
  { pattern: '先手', color: '#0097A7' },
  { pattern: '迅捷', color: '#0097A7' },
  { pattern: '眩晕', color: '#0097A7' },
  // 紫色系 - 异常状态
  { pattern: '灼烧', color: '#9C27B0' },
  { pattern: '中毒', color: '#9C27B0' },
  { pattern: '冻结', color: '#9C27B0' },
  { pattern: '萌化', color: '#9C27B0' },
  { pattern: '寄生', color: '#9C27B0' },
  // 绿色系 - 特殊增益机制
  { pattern: '永久', color: '#2E7D32' },
  { pattern: '驱散', color: '#2E7D32' },
  { pattern: '吸血', color: '#2E7D32' },
  { pattern: '迸发', color: '#2E7D32' },
  { pattern: '蓄力', color: '#2E7D32' },
]

const highlighted = computed(() => {
  if (!props.text) return ''

  const sorted = [...highlightRules].sort((a, b) => b.pattern.length - a.pattern.length)
  const regex = new RegExp(`(${sorted.map(k => escapeRegex(k.pattern)).join('|')})`, 'g')

  const colorMap = {}
  for (const k of highlightRules) {
    colorMap[k.pattern] = k.color
  }

  return props.text.replace(regex, (match) => {
    const color = colorMap[match]
    if (color) {
      return `<span style="color:${color};font-weight:600">${match}</span>`
    }
    return match
  })
})

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
.skill-desc {
  line-height: 1.6;
}
</style>

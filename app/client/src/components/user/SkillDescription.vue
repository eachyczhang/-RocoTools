<template>
  <span class="skill-desc" v-html="highlighted"></span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
})

// Attribute color reference
const ELEMENT_COLORS = {
  '普通': '#3F89B4', '草': '#4EBC73', '火': '#DB5525', '水': '#6AA9FE',
  '光': '#4FC0FF', '地': '#9A7E3F', '冰': '#5FADDD', '龙': '#ED4962',
  '电': '#E7C506', '毒': '#BA62E0', '虫': '#9ECE21', '武': '#FF9636',
  '翼': '#3EC7CA', '萌': '#FC7CAC', '幽': '#9446EC', '恶': '#CF467A',
  '机械': '#40CBA9', '幻': '#9FA7F8',
}

// Independent colors (not tied to any element)
const INDEPENDENT = {
  '应对': '#E65100',   // Red-orange - counter mechanic
  '脱离': '#00838F',   // Deep teal - unique
  '永久': '#BF8C00',   // Deep gold - unique
  '驱散': '#1565C0',   // Indigo blue - unique
}

// Stats colors (六维属性)
const STATS_COLORS = {
  '生命': '#22A65B',   // Green - vitality
  '物攻': '#E8703A',   // Orange - physical attack
  '魔攻': '#A855F7',   // Purple - magic attack
  '物防': '#5B8FA8',   // Steel blue - physical defense
  '魔防': '#6D9DC5',   // Soft blue - magic defense
  '速度': '#D4A017',   // Gold - speed
}

// Keyword highlight rules (sorted by length desc at runtime)
const highlightRules = [
  // Red-orange - Counter mechanic (应对系)
  { pattern: '应对状态', color: INDEPENDENT['应对'] },
  { pattern: '应对防御', color: INDEPENDENT['应对'] },
  { pattern: '应对攻击', color: INDEPENDENT['应对'] },
  { pattern: '应对成功', color: INDEPENDENT['应对'] },
  { pattern: '应对失败', color: INDEPENDENT['应对'] },
  { pattern: '应对', color: INDEPENDENT['应对'] },

  // Marks (印记系)
  { pattern: '星陨印记', color: ELEMENT_COLORS['幻'] },
  { pattern: '中毒印记', color: ELEMENT_COLORS['毒'] },
  { pattern: '减速印记', color: ELEMENT_COLORS['冰'] },
  { pattern: '龙噬印记', color: ELEMENT_COLORS['龙'] },
  { pattern: '迟缓印记', color: ELEMENT_COLORS['地'] },
  { pattern: '降灵印记', color: ELEMENT_COLORS['幽'] },
  { pattern: '风起印记', color: ELEMENT_COLORS['翼'] },
  { pattern: '蓄电印记', color: ELEMENT_COLORS['电'] },
  { pattern: '湿润印记', color: ELEMENT_COLORS['水'] },
  { pattern: '光合印记', color: ELEMENT_COLORS['草'] },

  // Energy related (幽属性色系)
  { pattern: '偷取能量', color: ELEMENT_COLORS['幽'] },
  { pattern: '吸收能量', color: ELEMENT_COLORS['幽'] },

  // Energy cost reduction (水属性色系)
  { pattern: '能耗减少', color: ELEMENT_COLORS['水'] },
  { pattern: '消耗减少', color: ELEMENT_COLORS['水'] },

  // Control / Movement
  { pattern: '打断', color: ELEMENT_COLORS['普通'] },
  { pattern: '脱离', color: INDEPENDENT['脱离'] },
  { pattern: '返场', color: ELEMENT_COLORS['普通'] },
  { pattern: '先手', color: ELEMENT_COLORS['普通'] },
  { pattern: '连击', color: ELEMENT_COLORS['普通'] },
  { pattern: '迅捷', color: ELEMENT_COLORS['翼'] },
  { pattern: '眩晕', color: ELEMENT_COLORS['地'] },

  // Status effects (mapped to element colors)
  { pattern: '灼烧', color: ELEMENT_COLORS['火'] },
  { pattern: '中毒', color: ELEMENT_COLORS['毒'] },
  { pattern: '冻结', color: ELEMENT_COLORS['冰'] },
  { pattern: '萌化', color: ELEMENT_COLORS['萌'] },
  { pattern: '寄生', color: ELEMENT_COLORS['草'] },

  // Special mechanics
  { pattern: '永久', color: INDEPENDENT['永久'] },
  { pattern: '驱散', color: INDEPENDENT['驱散'] },
  { pattern: '吸血', color: ELEMENT_COLORS['恶'] },
  { pattern: '迸发', color: ELEMENT_COLORS['电'] },
  { pattern: '蓄力', color: ELEMENT_COLORS['龙'] },
  { pattern: '回复', color: ELEMENT_COLORS['草'] },
  { pattern: '奉献', color: ELEMENT_COLORS['虫'] },
  { pattern: '传动', color: ELEMENT_COLORS['机械'] },

  // Stats (六维属性)
  { pattern: '生命', color: STATS_COLORS['生命'] },
  { pattern: '物攻', color: STATS_COLORS['物攻'] },
  { pattern: '魔攻', color: STATS_COLORS['魔攻'] },
  { pattern: '物防', color: STATS_COLORS['物防'] },
  { pattern: '魔防', color: STATS_COLORS['魔防'] },
  { pattern: '速度', color: STATS_COLORS['速度'] },
]

// Element type pattern: "X系" where X is any element name
const ELEMENT_NAMES = Object.keys(ELEMENT_COLORS)
const elementTypeRules = ELEMENT_NAMES.map(name => ({
  pattern: name + '系',
  color: ELEMENT_COLORS[name],
}))

// Merge all rules
const allRules = [...highlightRules, ...elementTypeRules]

const highlighted = computed(() => {
  if (!props.text) return ''

  const sorted = [...allRules].sort((a, b) => b.pattern.length - a.pattern.length)
  const regex = new RegExp(`(${sorted.map(k => escapeRegex(k.pattern)).join('|')})`, 'g')

  const colorMap = {}
  for (const k of allRules) {
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

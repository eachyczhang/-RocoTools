<template>
  <div class="flex items-center justify-center">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--radar-color)" stop-opacity="0.2" />
          <stop offset="100%" stop-color="var(--radar-color)" stop-opacity="0.05" />
        </linearGradient>
      </defs>

      <!-- 背景网格（只保留3层） -->
      <polygon v-for="level in 3" :key="'grid-' + level"
        :points="getGridPoints(level / 3)"
        fill="none"
        :stroke="isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'"
        stroke-width="1" />

      <!-- 数据区域 -->
      <polygon
        :points="dataPoints"
        fill="url(#radarGradient)"
        stroke="var(--radar-color)"
        stroke-width="1.5"
        stroke-linejoin="round"
        opacity="0.85" />

      <!-- 数据点 -->
      <circle v-for="(stat, i) in stats" :key="'dot-' + i"
        :cx="getPoint(i, stat.ratio).x"
        :cy="getPoint(i, stat.ratio).y"
        r="3"
        fill="var(--radar-color)" />

      <!-- 标签 -->
      <text v-for="(stat, i) in stats" :key="'label-' + i"
        :x="getLabelPos(i).x" :y="getLabelPos(i).y"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isDark ? '#6B7280' : '#9CA3AF'"
        font-size="11">
        {{ stat.label }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  values: { type: Object, required: true },
  size: { type: Number, default: 220 },
})

const { isDark } = useTheme()

const maxStat = 200
const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - 30)

const statDefs = [
  { key: 'hp', label: '生命' },     // 顶部
  { key: 'matk', label: '魔攻' },   // 右上
  { key: 'mdef', label: '魔防' },   // 右下
  { key: 'speed', label: '速度' },  // 底部
  { key: 'def', label: '物防' },    // 左下
  { key: 'atk', label: '物攻' },    // 左上
]

const stats = computed(() => {
  return statDefs.map(s => ({
    ...s,
    value: props.values[s.key] || 0,
    ratio: Math.min((props.values[s.key] || 0) / maxStat, 1),
  }))
})

function getPoint(index, ratio) {
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
  return {
    x: center.value + radius.value * ratio * Math.cos(angle),
    y: center.value + radius.value * ratio * Math.sin(angle),
  }
}

function getGridPoints(ratio) {
  return Array.from({ length: 6 }, (_, i) => {
    const p = getPoint(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')
}

const dataPoints = computed(() => {
  return stats.value.map((s, i) => {
    const p = getPoint(i, s.ratio)
    return `${p.x},${p.y}`
  }).join(' ')
})

function getLabelPos(index) {
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
  const dist = radius.value + 18
  return {
    x: center.value + dist * Math.cos(angle),
    y: center.value + dist * Math.sin(angle),
  }
}
</script>

<style scoped>
div {
  --radar-color: #D69F23;
}
</style>

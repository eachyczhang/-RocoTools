<template>
  <div class="stats-radar" :style="{ '--radar-size': `${size}px` }">
    <div class="stats-radar__title">
      <span class="stats-radar__title-mark" aria-hidden="true"></span>
      <span>六维分布</span>
    </div>

    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img" aria-label="精灵六维种族值雷达图">
      <defs>
        <linearGradient id="radarAreaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--pet-detail-accent, #d69f23)" stop-opacity="0.34" />
          <stop offset="100%" stop-color="var(--pet-detail-secondary, #d69f23)" stop-opacity="0.18" />
        </linearGradient>
        <linearGradient id="radarLineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--pet-detail-accent, #d69f23)" />
          <stop offset="100%" stop-color="var(--pet-detail-secondary, #d69f23)" />
        </linearGradient>
      </defs>

      <polygon
        v-for="level in 4"
        :key="`grid-${level}`"
        :points="getGridPoints(level / 4)"
        fill="none"
        stroke="var(--radar-grid)"
        :stroke-width="level === 4 ? 1.3 : 1"
      />

      <line
        v-for="(_, index) in stats"
        :key="`axis-${index}`"
        :x1="center"
        :y1="center"
        :x2="getPoint(index, 1).x"
        :y2="getPoint(index, 1).y"
        stroke="var(--radar-axis)"
        stroke-width="1"
      />

      <polygon
        :points="dataPoints"
        fill="url(#radarAreaGradient)"
        stroke="url(#radarLineGradient)"
        stroke-width="2.2"
        stroke-linejoin="round"
      />

      <circle
        v-for="(stat, index) in stats"
        :key="`dot-${index}`"
        :cx="getPoint(index, stat.ratio).x"
        :cy="getPoint(index, stat.ratio).y"
        r="3.4"
        fill="var(--pet-detail-accent, #d69f23)"
        stroke="var(--radar-dot-ring)"
        stroke-width="1.5"
      >
        <title>{{ stat.label }} {{ stat.value }}</title>
      </circle>

      <text
        v-for="(stat, index) in stats"
        :key="`label-${index}`"
        :x="getLabelPos(index).x"
        :y="getLabelPos(index).y"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="var(--radar-label)"
        :font-size="labelFontSize"
        font-weight="600"
      >
        {{ stat.label }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Object, required: true },
  size: { type: Number, default: 220 },
})

const maxStat = 200
const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - (props.size < 180 ? 25 : 31))
const labelFontSize = computed(() => props.size < 180 ? 10 : 11)

const statDefs = [
  { key: 'hp', label: '生命' },
  { key: 'matk', label: '魔攻' },
  { key: 'mdef', label: '魔防' },
  { key: 'speed', label: '速度' },
  { key: 'def', label: '物防' },
  { key: 'atk', label: '物攻' },
]

const stats = computed(() => statDefs.map(stat => {
  const value = Number(props.values[stat.key]) || 0
  return { ...stat, value, ratio: Math.min(value / maxStat, 1) }
}))

function getPoint(index, ratio) {
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
  return {
    x: center.value + radius.value * ratio * Math.cos(angle),
    y: center.value + radius.value * ratio * Math.sin(angle),
  }
}

function getGridPoints(ratio) {
  return Array.from({ length: 6 }, (_, index) => {
    const point = getPoint(index, ratio)
    return `${point.x},${point.y}`
  }).join(' ')
}

const dataPoints = computed(() => stats.value.map((stat, index) => {
  const point = getPoint(index, stat.ratio)
  return `${point.x},${point.y}`
}).join(' '))

function getLabelPos(index) {
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
  const distance = radius.value + (props.size < 180 ? 14 : 18)
  return {
    x: center.value + distance * Math.cos(angle),
    y: center.value + distance * Math.sin(angle),
  }
}
</script>

<style scoped>
.stats-radar {
  --radar-grid: rgb(31 41 55 / 0.1);
  --radar-axis: rgb(31 41 55 / 0.055);
  --radar-label: #697382;
  --radar-dot-ring: rgb(255 255 255 / 0.88);
  width: calc(var(--radar-size) + 1.1rem);
  flex: none;
  border: 1px solid color-mix(in srgb, var(--pet-detail-accent, #d69f23) 16%, #e5e7eb);
  border-radius: 1.2rem;
  background:
    radial-gradient(circle at 18% 10%, color-mix(in srgb, var(--pet-detail-accent, #d69f23) 8%, transparent), transparent 44%),
    radial-gradient(circle at 86% 92%, color-mix(in srgb, var(--pet-detail-secondary, #d69f23) 7%, transparent), transparent 46%),
    rgb(255 255 255 / 0.5);
  padding: 0.55rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.72);
}

.stats-radar__title {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  color: #4b5563;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.25rem 0;
}

.stats-radar__title-mark {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--pet-detail-accent, #d69f23), var(--pet-detail-secondary, #d69f23));
  box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--pet-detail-accent, #d69f23) 9%, transparent);
}

.stats-radar svg {
  display: block;
  margin: -0.2rem auto -0.1rem;
  overflow: visible;
}

body.dark .stats-radar {
  --radar-grid: rgb(255 255 255 / 0.1);
  --radar-axis: rgb(255 255 255 / 0.055);
  --radar-label: #aeb7c4;
  --radar-dot-ring: #202835;
  border-color: color-mix(in srgb, var(--pet-detail-accent, #d69f23) 22%, #303a48);
  background:
    radial-gradient(circle at 18% 10%, color-mix(in srgb, var(--pet-detail-accent, #d69f23) 10%, transparent), transparent 44%),
    radial-gradient(circle at 86% 92%, color-mix(in srgb, var(--pet-detail-secondary, #d69f23) 9%, transparent), transparent 46%),
    rgb(17 21 28 / 0.38);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.035);
}

body.dark .stats-radar__title {
  color: #c5ccd6;
}
</style>
<template>
  <div v-if="events.length" class="card !p-0 overflow-hidden">
    <h2 class="font-roco text-lg sm:text-xl text-primary-500 px-4 sm:px-5 pt-4 sm:pt-5 pb-2">活动日历</h2>

    <!-- 时间轴头部 -->
    <div class="overflow-x-auto">
      <div class="min-w-[700px]">
        <!-- 月份 + 日期刻度 -->
        <div class="flex items-end px-28 sm:px-32 py-2 border-b border-surface-light-border dark:border-surface-dark-border">
          <div class="flex-1 relative" :style="{ height: '36px' }">
            <!-- 月份标签 -->
            <div v-for="month in months" :key="month.label"
              class="absolute top-0 text-xs sm:text-sm font-medium text-muted"
              :style="{ left: month.startPct + '%' }">
              {{ month.label }}
            </div>
            <!-- 周刻度 -->
            <div class="absolute bottom-0 left-0 right-0 flex">
              <div v-for="(week, i) in weeks" :key="i"
                class="text-[10px] text-muted/60 text-center"
                :style="{ width: week.widthPct + '%' }">
                {{ week.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- 版本活动 -->
        <div v-if="versionEvents.length" class="px-4 sm:px-5 py-3 border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
          <div class="text-xs text-muted mb-2 font-medium">版本活动</div>
          <div class="space-y-2">
            <div v-for="event in versionEvents" :key="event.id" class="relative h-10 sm:h-12 flex items-center">
              <div class="absolute h-full rounded-lg overflow-hidden transition-all"
                :style="{ left: getPosition(event.start_date) + '%', width: getWidth(event.start_date, event.end_date) + '%' }">
                <div class="h-full flex items-center gap-2 px-2 sm:px-3 bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/30 rounded-lg">
                  <img v-if="event.image" :src="event.image" class="h-7 sm:h-9 w-auto rounded object-cover flex-shrink-0" />
                  <span class="text-xs sm:text-sm font-medium truncate">{{ event.name }}</span>
                  <span class="text-[10px] text-muted flex-shrink-0 ml-auto">{{ formatRange(event.start_date, event.end_date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 常驻课题 -->
        <div v-if="routineEvents.length" class="px-4 sm:px-5 py-3">
          <div class="text-xs text-muted mb-2 font-medium">常驻课题</div>
          <div class="space-y-2">
            <div v-for="event in routineEvents" :key="event.id" class="relative h-8 sm:h-9 flex items-center">
              <!-- 名称标签 -->
              <div class="absolute left-0 w-24 sm:w-28 text-xs sm:text-sm font-medium truncate pr-2">{{ event.name }}</div>
              <!-- 多段时间条 -->
              <div class="absolute left-24 sm:left-28 right-0 h-full flex items-center">
                <div class="relative w-full h-full">
                  <div v-for="(period, pi) in event.periods" :key="pi"
                    class="absolute h-6 sm:h-7 top-1/2 -translate-y-1/2 rounded flex items-center justify-center px-1"
                    :style="{ left: getPositionInTrack(period.start) + '%', width: getWidthInTrack(period.start, period.end) + '%' }"
                    :class="pi % 2 === 0 ? 'bg-primary-100 dark:bg-primary-500/15' : 'bg-primary-50 dark:bg-primary-500/10'">
                    <span class="text-[10px] sm:text-xs text-muted whitespace-nowrap">{{ formatRange(period.start, period.end) }}</span>
                  </div>
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
import { computed } from 'vue'

const props = defineProps({
  events: { type: Array, default: () => [] },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
})

const versionEvents = computed(() => props.events.filter(e => e.category === 'version'))
const routineEvents = computed(() => props.events.filter(e => e.category === 'routine'))

// 计算时间轴范围
const timeRange = computed(() => {
  const start = props.startDate ? new Date(props.startDate) : getEarliestDate()
  const end = props.endDate ? new Date(props.endDate) : getLatestDate()
  return { start, end, totalDays: Math.ceil((end - start) / 86400000) + 1 }
})

function getEarliestDate() {
  let min = new Date()
  for (const e of props.events) {
    if (e.start_date && new Date(e.start_date) < min) min = new Date(e.start_date)
    if (e.periods) {
      for (const p of e.periods) {
        if (p.start && new Date(p.start) < min) min = new Date(p.start)
      }
    }
  }
  return min
}

function getLatestDate() {
  let max = new Date()
  for (const e of props.events) {
    if (e.end_date && new Date(e.end_date) > max) max = new Date(e.end_date)
    if (e.periods) {
      for (const p of e.periods) {
        if (p.end && new Date(p.end) > max) max = new Date(p.end)
      }
    }
  }
  return max
}

// 月份标签
const months = computed(() => {
  const { start, end } = timeRange.value
  const result = []
  const cur = new Date(start)
  cur.setDate(1)
  while (cur <= end) {
    const monthStart = new Date(Math.max(cur, start))
    const pct = dateToPct(monthStart)
    result.push({ label: `${cur.getMonth() + 1}月`, startPct: pct })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
})

// 周刻度
const weeks = computed(() => {
  const { totalDays } = timeRange.value
  const weekCount = Math.ceil(totalDays / 7)
  return Array.from({ length: weekCount }, (_, i) => {
    const d = new Date(timeRange.value.start)
    d.setDate(d.getDate() + i * 7)
    return { label: `${d.getMonth() + 1}.${d.getDate()}`, widthPct: 100 / weekCount }
  })
})

function dateToPct(dateStr) {
  const d = new Date(dateStr)
  const { start, totalDays } = timeRange.value
  const diff = Math.max(0, (d - start) / 86400000)
  return (diff / totalDays) * 100
}

function getPosition(dateStr) { return dateToPct(dateStr) }
function getWidth(startStr, endStr) {
  return dateToPct(endStr) - dateToPct(startStr)
}

// 常驻课题的位置计算（相对于去掉左侧名称后的轨道）
function getPositionInTrack(dateStr) { return dateToPct(dateStr) }
function getWidthInTrack(startStr, endStr) { return getWidth(startStr, endStr) }

function formatRange(start, end) {
  if (!start || !end) return ''
  const s = start.slice(5).replace('-', '.')
  const e = end.slice(5).replace('-', '.')
  return `${s}-${e}`
}
</script>

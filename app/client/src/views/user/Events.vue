<template>
  <div>
    <h1 class="page-title">活动日历</h1>

    <div v-if="season" class="text-xs sm:text-sm text-muted mb-4">
      当前赛季：<span class="text-primary-500 font-medium">{{ season.name }}</span>
      <span v-if="season.start_date"> ({{ season.start_date }} ~ {{ season.end_date }})</span>
    </div>

    <EventCalendar v-if="events.length" :events="events" :start-date="season?.start_date" :end-date="season?.end_date" />

    <div v-else-if="loaded" class="text-center mt-20">
      <p class="text-muted">暂无活动数据</p>
    </div>

    <div v-else class="text-muted text-center mt-20">加载中...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { seasonsApi, eventsApi } from '@/api'
import EventCalendar from '@/components/user/EventCalendar.vue'

const season = ref(null)
const events = ref([])
const loaded = ref(false)

onMounted(async () => {
  try {
    const res = await seasonsApi.current()
    if (res.season) {
      season.value = res.season
      const eventsRes = await eventsApi.list(res.season.id)
      events.value = eventsRes.events || []
    }
  } catch {}
  loaded.value = true
})
</script>

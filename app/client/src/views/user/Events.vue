<template>
  <div>
    <h1 class="page-title">活动日历</h1>

    <div v-if="season" class="text-xs sm:text-sm text-muted mb-4">
      当前赛季：<span class="text-primary-500 font-medium">{{ season.name }}</span>
      <span v-if="season.start_date"> ({{ season.start_date }} ~ {{ season.end_date }})</span>
    </div>

    <div v-if="events.length">
      <!-- 分类活动卡片 -->
      <div class="space-y-4 mb-6">
        <!-- 版本活动 -->
        <div v-if="versionEvents.length" class="card">
          <h2 class="font-roco text-base text-primary-500 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-primary-500"></span>
            版本活动
          </h2>
          <div class="space-y-2">
            <EventCard
              v-for="event in versionEvents"
              :key="event.id"
              :event="event"
              type="version"
            />
          </div>
        </div>

        <!-- 大量出没 -->
        <div v-if="massOutbreakEvents.length" class="card">
          <h2 class="font-roco text-base text-orange-500 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-orange-500"></span>
            大量出没
          </h2>
          <div class="space-y-2">
            <EventCard
              v-for="event in massOutbreakEvents"
              :key="event.id"
              :event="event"
              type="mass_outbreak"
              :pet="petMap[event.pet_uid]"
              :shiny-url="shinyMap[event.pet_uid]"
            />
          </div>
        </div>

        <!-- 常驻课题 -->
        <div v-if="routineEvents.length" class="card">
          <h2 class="font-roco text-base text-purple-500 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-purple-500"></span>
            常驻课题
          </h2>
          <div class="space-y-2">
            <EventCard
              v-for="event in routineEvents"
              :key="event.id"
              :event="event"
              type="routine"
            />
          </div>
        </div>
      </div>


    </div>

    <div v-else-if="loaded" class="text-center mt-20">
      <p class="text-muted">暂无活动数据</p>
    </div>

    <div v-else class="text-muted text-center mt-20">加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { seasonsApi, eventsApi, petsApi } from '@/api'
import EventCard from '@/components/user/EventCard.vue'

const season = ref(null)
const events = ref([])
const loaded = ref(false)
const petMap = ref({})
const shinyMap = ref({})

const versionEvents = computed(() => events.value.filter(e => e.category === 'version'))
const massOutbreakEvents = computed(() => events.value.filter(e => e.category === 'mass_outbreak'))
const routineEvents = computed(() => events.value.filter(e => e.category === 'routine'))

async function loadPetsByUids(uids) {
  if (!uids || !uids.length) return {}
  const result = {}
  const settled = await Promise.allSettled(uids.map(uid => petsApi.get(uid)))
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) result[uids[i]] = r.value
  })
  return result
}

onMounted(async () => {
  try {
    const res = await seasonsApi.current()
    if (res.season) {
      season.value = res.season
      const eventsRes = await eventsApi.list(res.season.id)
      events.value = eventsRes.events || []

      // 加载异色映射
      const shinyList = await petsApi.shiny()
      const map = {}
      for (const s of shinyList) map[s.uid] = s.image_shiny
      shinyMap.value = map

      // 加载大量出没精灵数据
      const massOutbreakUids = events.value.filter(e => e.category === 'mass_outbreak' && e.pet_uid).map(e => e.pet_uid)
      if (massOutbreakUids.length) {
        petMap.value = await loadPetsByUids(massOutbreakUids)
      }
    }
  } catch (err) {
    console.error('[Events] 加载失败:', err)
  }
  loaded.value = true
})
</script>

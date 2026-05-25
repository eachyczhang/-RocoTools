<template>
  <div>
    <h1 class="page-title">活动日历</h1>

    <!-- 当前赛季 Banner -->
    <div v-if="season" class="mb-5 rounded-xl overflow-hidden relative" style="aspect-ratio: 16/5;">
      <!-- 背景图 / 渐变占位 -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary-500/30 via-primary-400/15 to-transparent">
        <img v-if="season.image" :src="season.image" class="w-full h-full object-cover object-center" />
      </div>
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
      <!-- 文字内容 -->
      <div class="absolute inset-0 flex items-center gap-4 px-5 sm:px-7">
        <!-- 赛季标识徽章 -->
        <div class="flex-shrink-0 px-4 py-2 rounded-xl bg-primary-500 text-white font-roco font-bold text-xl tracking-widest shadow-lg">
          {{ season.id }}
        </div>
        <!-- 赛季名称 -->
        <div class="flex-1 min-w-0">
          <div class="font-roco text-2xl sm:text-3xl text-white drop-shadow-md leading-tight truncate">
            {{ season.name }}
          </div>
          <div v-if="season.start_date" class="text-xs text-white/70 mt-1">
            {{ season.start_date }} ~ {{ season.end_date || '进行中' }}
          </div>
        </div>
        <!-- 当前赛季标签 -->
        <div class="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-white/80">
          <span class="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>
          当前赛季
        </div>
      </div>
    </div>

    <div v-if="events.length" class="space-y-5">

      <!-- 主推活动（贯穿全赛季） -->
      <div v-if="mainEvents.length" class="card">
        <h2 class="font-roco text-base text-primary-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-primary-500"></span>
          主推活动
        </h2>
        <div class="space-y-2">
          <EventCard v-for="event in mainEvents" :key="event.id" :event="event" type="version" />
        </div>
      </div>

      <!-- 领地试炼 -->
      <div v-if="territoryEvents.length" class="card">
        <h2 class="font-roco text-base text-blue-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          领地试炼
        </h2>
        <div class="space-y-2">
          <EventCard v-for="event in territoryEvents" :key="event.id" :event="event" type="version" />
        </div>
      </div>

      <!-- 精灵抱抱团 / 大世界观察日记 -->
      <div v-if="interactiveEvents.length" class="card">
        <h2 class="font-roco text-base text-green-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          互动活动
        </h2>
        <div class="space-y-2">
          <EventCard v-for="event in interactiveEvents" :key="event.id" :event="event" type="version" show-sub-type />
        </div>
      </div>

      <!-- 其他版本活动（未分类） -->
      <div v-if="otherVersionEvents.length" class="card">
        <h2 class="font-roco text-base text-primary-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-primary-500"></span>
          版本活动
        </h2>
        <div class="space-y-2">
          <EventCard v-for="event in otherVersionEvents" :key="event.id" :event="event" type="version" />
        </div>
      </div>

      <!-- 大量出没 -->
      <div v-if="massOutbreakEvents.length" class="card">
        <h2 class="font-roco text-base text-orange-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500"></span>
          大量出没
          <span class="text-xs font-normal text-muted">每周五~周日</span>
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <EventCard
            v-for="event in massOutbreakEvents"
            :key="event.id"
            :event="event"
            type="mass_outbreak"
            :pet="petMap[event.pet_uid]"
            :shiny-url="shinyMap[event.pet_uid]"
            compact
          />
        </div>
      </div>

      <!-- 常驻课题 -->
      <div v-if="routineEvents.length" class="card">
        <h2 class="font-roco text-base text-purple-500 mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-purple-500"></span>
          常驻课题
        </h2>
        <div class="space-y-3">
          <component :is="isFateFlower(event) ? 'router-link' : 'div'"
            v-for="event in routineEvents" :key="event.id"
            :to="isFateFlower(event) ? '/fate-flower' : undefined"
            class="block border border-surface-light-border dark:border-surface-dark-border rounded-lg p-3"
            :class="{ 'cursor-pointer hover:border-pink-300 dark:hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/5 transition-colors': isFateFlower(event) }">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="routineTagClass(event.sub_type)">
                {{ subTypeLabel(event.sub_type) }}
              </span>
              <span class="text-sm font-medium">{{ event.name }}</span>
              <span v-if="isFateFlower(event)" class="text-[10px] text-pink-500 ml-auto">查看详情 →</span>
            </div>
            <!-- 关联精灵 -->
            <div v-if="event.pet_name" class="flex items-center gap-2 mb-2 flex-wrap">
              <template v-if="parsePetIcons(event.pet_icon).length">
                <img v-for="p in parsePetIcons(event.pet_icon)" :key="p.uid"
                  :src="p.icon" :title="p.name"
                  class="w-7 h-7 rounded" />
              </template>
              <img v-else-if="event.pet_icon && !event.pet_icon.startsWith('[')"
                :src="event.pet_icon" class="w-7 h-7 rounded" />
              <span class="text-xs text-muted">{{ event.pet_name }}</span>
            </div>
            <!-- 多段时间展示 -->
            <div v-if="event.periods && event.periods.length" class="flex flex-wrap gap-2">
              <span v-for="(p, i) in event.periods" :key="i"
                class="text-xs px-2 py-1 rounded bg-surface-light dark:bg-surface-dark"
                :class="isPeriodActive(p) ? 'text-green-600 ring-1 ring-green-300' : 'text-muted'">
                {{ formatDate(p.start) }} ~ {{ formatDate(p.end) }}
                <span v-if="isPeriodActive(p)" class="ml-1 text-green-500">●</span>
              </span>
            </div>
          </component>
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

// 版本活动按子类型分组
const mainEvents = computed(() => events.value.filter(e => e.category === 'version' && e.sub_type === 'main'))
const territoryEvents = computed(() => events.value.filter(e => e.category === 'version' && e.sub_type === 'territory'))
const interactiveEvents = computed(() => events.value.filter(e => e.category === 'version' && (e.sub_type === 'hug' || e.sub_type === 'diary')))
const otherVersionEvents = computed(() => events.value.filter(e => e.category === 'version' && !['main', 'territory', 'hug', 'diary'].includes(e.sub_type)))
const massOutbreakEvents = computed(() => events.value.filter(e => e.category === 'mass_outbreak'))
const routineEvents = computed(() => events.value.filter(e => e.category === 'routine'))

const SUB_TYPE_LABELS = {
  main: '主推活动', territory: '领地试炼', hug: '精灵抱抱团', diary: '大世界观察日记',
  fate_flower: '命定花种', star_battle: '星光对决', pika_photo: '皮卡摄影委托',
  starlight: '星光对决', destiny: '命定花种', pika: '皮卡摄影委托',
}
function subTypeLabel(st) { return SUB_TYPE_LABELS[st] || st || '其他' }

function isFateFlower(event) {
  return event.sub_type === 'fate_flower' || event.sub_type === 'destiny'
}

function parsePetIcons(petIcon) {
  if (!petIcon || !petIcon.startsWith('[')) return []
  try { return JSON.parse(petIcon) } catch { return [] }
}

function routineTagClass(subType) {
  const map = {
    fate_flower: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    destiny: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    star_battle: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    starlight: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    pika_photo: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    pika: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return map[subType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function formatDate(d) {
  if (!d) return ''
  return d.slice(5).replace('-', '.')
}

function isPeriodActive(p) {
  const today = new Date().toISOString().slice(0, 10)
  return p.start <= today && p.end >= today
}

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
      if (Array.isArray(shinyList)) {
        for (const s of shinyList) map[s.uid] = s.image_shiny
      }
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

<template>
  <!-- 紧凑模式：大量出没网格卡片 -->
  <div v-if="compact" class="group bg-white dark:bg-gray-800 rounded-lg border border-surface-light-border dark:border-surface-dark-border p-2 sm:p-3 text-center hover:shadow-md transition-shadow">
    <div v-if="pet" class="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-1">
      <img v-lazy-src="petImage" :alt="pet.name || event.pet_name" class="w-full h-full object-contain transition-opacity duration-300" :class="{ 'group-hover:opacity-0': shinyUrl }" />
      <img v-if="shinyUrl" v-lazy-src="shinyUrl" :alt="`${pet.name || event.pet_name}(异色)`" class="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
    </div>
    <div class="text-xs font-medium truncate">{{ event.pet_name || event.name }}</div>
    <div class="text-[10px] text-muted">{{ formatRange(event.start_date, event.end_date) }}</div>
  </div>

  <!-- 标准模式 -->
  <div v-else class="bg-white dark:bg-gray-800 rounded-lg border border-surface-light-border dark:border-surface-dark-border overflow-hidden hover:shadow-md transition-shadow">
    <div class="p-3 sm:p-4">
      <!-- 图片 -->
      <div v-if="event.image" class="mb-3 rounded-lg overflow-hidden">
        <img :src="event.image" :alt="event.name" class="w-full aspect-[16/6] object-cover" />
      </div>

      <!-- 内容 -->
      <div class="space-y-2">
        <!-- 名称 + 子类型标签 + 时间 -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="showSubType && event.sub_type" class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full"
              :class="event.sub_type === 'hug' ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'">
              {{ subTypeLabel(event.sub_type) }}
            </span>
            <h3 class="font-medium text-sm sm:text-base truncate">{{ event.name }}</h3>
          </div>
          <span class="text-xs text-muted whitespace-nowrap shrink-0">{{ formatRange(event.start_date, event.end_date) }}</span>
        </div>

        <!-- 大量出没精灵展示 -->
        <div v-if="type === 'mass_outbreak' && pet" class="flex items-center gap-3 group relative">
          <div class="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
            <img v-lazy-src="petImage" :alt="pet.name || event.pet_name" class="w-full h-full object-contain transition-opacity duration-300" :class="{ 'group-hover:opacity-0': shinyUrl }" />
            <img v-if="shinyUrl" v-lazy-src="shinyUrl" :alt="`${pet.name || event.pet_name}(异色)`" class="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
          </div>
          <span class="text-xs sm:text-sm text-muted">{{ pet.name || event.pet_name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  event: { type: Object, required: true },
  type: { type: String, default: 'version' },
  pet: { type: Object, default: null },
  shinyUrl: { type: String, default: null },
  compact: { type: Boolean, default: false },
  showSubType: { type: Boolean, default: false },
})

const SUB_TYPE_LABELS = {
  main: '主推', territory: '领地试炼', hug: '抱抱团', diary: '观察日记',
  fate_flower: '命定花种', star_battle: '星光对决', pika_photo: '摄影委托',
  starlight: '星光对决', destiny: '命定花种', pika: '摄影委托',
}

function subTypeLabel(st) { return SUB_TYPE_LABELS[st] || st }

function formatRange(start, end) {
  if (!start || !end) return ''
  const s = start.slice(5).replace('-', '.')
  const e = end.slice(5).replace('-', '.')
  return `${s} ~ ${e}`
}

const petImage = computed(() => {
  if (!props.pet) return ''
  return props.pet.thumb_url || props.pet.image_url || ''
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-surface-light-border dark:border-surface-dark-border overflow-hidden hover:shadow-md transition-shadow">
    <div class="p-3 sm:p-4">
      <!-- 图片 -->
      <div v-if="event.image" class="aspect-[4/3] sm:aspect-[16/9] overflow-hidden">
        <img :src="event.image" alt="event.name" class="w-full h-full object-cover" />
      </div>

      <!-- 内容 -->
      <div class="space-y-2">
        <!-- 名称 + 时间 -->
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-sm sm:text-base truncate">{{ event.name }}</h3>
          <span class="text-xs text-muted whitespace-nowrap">{{ formatRange(event.start_date, event.end_date) }}</span>
        </div>

        <!-- 大量出没精灵展示 -->
        <div v-if="type === 'mass_outbreak' && pet" class="relative">
          <img v-lazy-src="petImage" :alt="pet.pet_name || event.pet_name" class="w-16 h-16 sm:w-20 sm:h-20 object-contain inline-block transition-all duration-300" :class="{ 'group-hover:opacity-0': shinyUrl }" />
          <img v-if="shinyUrl" v-lazy-src="shinyUrl" :alt="`${pet.pet_name || event.pet_name}(异色)`" class="absolute left-0 top-0 w-16 h-16 sm:w-20 sm:h-20 object-contain transition-all duration-300 opacity-0 scale-95 group-hover:opacity-100" />
          <span class="inline-block ml-2 sm:ml-3 text-xs sm:text-sm text-muted">{{ pet.pet_name || event.pet_name }}</span>
        </div>

        <!-- 其他类型详情 -->
        <div v-else-if="detail" class="text-xs text-muted">
          {{ detail }}
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
})

const SUB_TYPE_LABELS = {
  starlight: '星光对决',
  destiny: '命定花种',
  pika: '皮卡摄影委托',
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
  return props.pet.thumb_url || props.pet.pet_icon || ''
})

const detail = computed(() => {
  if (props.type === 'routine' && props.event.sub_type) {
    return subTypeLabel(props.event.sub_type)
  }
  return ''
})
</script>

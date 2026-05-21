<template>
  <router-link :to="`/pets/${pet.uid}`" class="card group relative flex flex-col items-center !py-4 !px-2 sm:!py-5 sm:!px-3 lg:!py-8 lg:!px-4">
    <span v-if="pet.variant_count > 1"
      class="absolute top-2 right-2 sm:top-3 sm:right-3 text-xs bg-primary-500/20 text-primary-500 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
      {{ pet.variant_count }}
    </span>
    <div class="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mb-2 sm:mb-3 lg:mb-4">
      <img v-lazy-src="pet.thumb_url || `/public/pets/default/${pet.uid}_default.png`" :alt="pet.name"
        class="w-full h-full object-contain transition-all duration-300 group-hover:scale-110"
        :class="{ 'group-hover:opacity-0': shinyUrl }" />
      <img v-if="shinyUrl" v-lazy-src="shinyUrl" :alt="`${pet.name}(异色)`"
        class="absolute inset-0 w-full h-full object-contain transition-all duration-300 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-110" />
    </div>
    <div class="text-sm sm:text-base font-medium text-center truncate w-full">{{ pet.name }}</div>
    <div class="text-xs text-muted mt-0.5">NO.{{ pet.pet_id }}</div>
    <div class="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
      <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5 sm:w-6 sm:h-6" :alt="pet.element_name" :title="pet.element_name" />
      <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-5 h-5 sm:w-6 sm:h-6" :alt="pet.sub_element_name" :title="pet.sub_element_name" />
    </div>
    <div class="text-xs sm:text-sm text-muted mt-1.5 sm:mt-2">种族值 {{ pet.total }}</div>
  </router-link>
</template>

<script setup>
defineProps({
  pet: { type: Object, required: true },
  shinyUrl: { type: String, default: null },
})
</script>

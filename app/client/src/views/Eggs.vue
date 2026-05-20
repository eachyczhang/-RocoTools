<template>
  <div>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4 md:mb-5">蛋组</h1>

    <!-- 蛋组选择 -->
    <div class="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
      <button v-for="eg in eggGroups" :key="eg.id"
        @click="selectGroup(eg)"
        class="px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
        :class="selectedGroup?.id === eg.id
          ? 'shadow-sm'
          : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
        :style="selectedGroup?.id === eg.id
          ? { background: getEggGroupColor(eg.name) + '20', color: getEggGroupColor(eg.name), borderColor: getEggGroupColor(eg.name) }
          : {}">
        {{ eg.name }}
        <span class="ml-0.5 md:ml-1 text-[10px] md:text-xs opacity-60">({{ eg.pet_count }})</span>
      </button>
    </div>

    <!-- 精灵列表 -->
    <div class="card" v-if="selectedGroup && pets.length">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">
        {{ selectedGroup.name }}
        <span class="text-xs md:text-sm text-muted font-normal ml-2">({{ pets.length }})</span>
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
        <router-link v-for="pet in pets" :key="pet.uid"
          :to="`/pets/${pet.uid}`"
          class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
          <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
          <div class="min-w-0">
            <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
            <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
              <span class="text-xs md:text-sm" :style="{ color: pet.element_color }">{{ pet.element_name }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <div class="card" v-else-if="selectedGroup">
      <p class="text-xs md:text-sm text-muted">该蛋组暂无精灵</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { eggsApi } from '@/api'
import { getEggGroupColor } from '@/constants/eggGroupColors'

const route = useRoute()
const eggGroups = ref([])
const selectedGroup = ref(null)
const pets = ref([])

async function loadGroups() {
  const data = await eggsApi.list()
  eggGroups.value = data.egg_groups || data
}

async function selectGroup(eg) {
  selectedGroup.value = eg
  const data = await eggsApi.get(eg.id)
  pets.value = data.pets || []
}

onMounted(async () => {
  await loadGroups()
  // 如果 URL 有 query 指定蛋组
  const groupId = route.query.group
  if (groupId && eggGroups.value.length) {
    const eg = eggGroups.value.find(e => e.id === +groupId)
    if (eg) selectGroup(eg)
  } else if (eggGroups.value.length) {
    selectGroup(eggGroups.value[0])
  }
})
</script>

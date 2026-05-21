<template>
  <div v-if="season">
    <!-- 赛季头部 -->
    <div class="relative mb-6 md:mb-8 rounded-2xl overflow-hidden">
      <div class="h-36 sm:h-48 md:h-56 bg-gradient-to-br from-primary-500/20 via-primary-400/10 to-transparent">
        <img v-if="season.image" :src="season.image" class="w-full h-full object-cover" />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-5 sm:p-6 md:p-8">
        <div>
          <div class="text-sm sm:text-base font-medium text-white/80 mb-1">{{ season.id }}</div>
          <h1 class="font-roco text-3xl sm:text-4xl md:text-5xl text-primary-300 drop-shadow-lg">{{ season.name }}</h1>
          <div v-if="season.start_date || season.end_date" class="text-sm sm:text-base text-white/70 mt-2">
            {{ season.start_date || '?' }} ~ {{ season.end_date || '?' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 通行证精灵 -->
    <div v-if="passPetList.length" class="mb-6 md:mb-8">
      <h2 class="font-roco text-lg md:text-xl text-primary-500 mb-3 md:mb-4">通行证精灵</h2>
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <router-link v-for="pet in passPetList" :key="pet.uid" :to="`/pets/${pet.uid}`"
          class="card group flex items-center gap-4 p-4 hover:border-primary-500/30 transition-all">
          <div class="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
            <img :src="pet.thumb_url || pet.image_url" class="w-full h-full object-contain group-hover:scale-105 transition-transform"
              :class="{ 'group-hover:opacity-0': shinyMap[pet.uid] }" />
            <img v-if="shinyMap[pet.uid]" :src="shinyMap[pet.uid]"
              class="absolute inset-0 w-full h-full object-contain transition-all opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-roco text-base md:text-lg group-hover:text-primary-500 transition-colors">{{ pet.name }}</div>
            <div class="flex items-center gap-1.5 mt-2">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5" />
              <span class="text-xs">{{ pet.element_name }}</span>
              <template v-if="pet.sub_element_icon">
                <img :src="pet.sub_element_icon" class="w-5 h-5 ml-1" />
                <span class="text-xs">{{ pet.sub_element_name }}</span>
              </template>
            </div>
            <div class="text-xs text-muted mt-1">种族值 {{ pet.total }}</div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 传说精灵 -->
    <div v-if="legendPet" class="mb-6 md:mb-8">
      <h2 class="font-roco text-lg md:text-xl text-primary-500 mb-3 md:mb-4">传说精灵</h2>
      <router-link :to="`/pets/${legendPet.uid}`"
        class="card group flex flex-col sm:flex-row items-center gap-4 md:gap-6 p-5 md:p-6 hover:border-primary-500/30 transition-all bg-gradient-to-br from-primary-50/30 to-transparent dark:from-primary-500/5">
        <div class="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
          <img :src="legendPet.thumb_url || legendPet.image_url"
            class="w-full h-full object-contain group-hover:scale-105 transition-transform"
            :class="{ 'group-hover:opacity-0': shinyMap[legendPet.uid] }" />
          <img v-if="shinyMap[legendPet.uid]" :src="shinyMap[legendPet.uid]"
            class="absolute inset-0 w-full h-full object-contain transition-all opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105" />
        </div>
        <div class="flex-1 min-w-0 text-center sm:text-left">
          <div class="font-roco text-xl md:text-2xl group-hover:text-primary-500 transition-colors">{{ legendPet.name }}</div>
          <div class="flex items-center gap-2 mt-3 justify-center sm:justify-start">
            <span v-if="legendPet.element_icon" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              :style="{ background: legendPet.element_color + '18', color: legendPet.element_color }">
              <img :src="legendPet.element_icon" class="w-4 h-4" /> {{ legendPet.element_name }}
            </span>
            <span v-if="legendPet.sub_element_icon" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              :style="{ background: legendPet.sub_element_color + '18', color: legendPet.sub_element_color }">
              <img :src="legendPet.sub_element_icon" class="w-4 h-4" /> {{ legendPet.sub_element_name }}
            </span>
          </div>
          <div class="text-sm text-muted mt-2">种族值 <span class="font-bold text-primary-500">{{ legendPet.total }}</span></div>
          <div v-if="legendPet.ability_name" class="text-xs text-muted mt-1">特性：{{ legendPet.ability_name }}</div>
        </div>
      </router-link>
    </div>

    <!-- 赛季限定精灵 -->
    <div v-if="seasonPetList.length" class="mb-6 md:mb-8">
      <h2 class="font-roco text-lg md:text-xl text-primary-500 mb-1 md:mb-2">赛季限定精灵</h2>
      <p class="text-xs text-muted mb-3 md:mb-4">仅当赛季可捕捉，拥有异色版本，赛季结束后异色仅可通过孵蛋获取</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        <PetCard v-for="pet in seasonPetList" :key="pet.uid" :pet="pet" :shiny-url="shinyMap[pet.uid]" />
      </div>
    </div>

    <!-- 赛季异色精灵 -->
    <div v-if="shinyPetList.length">
      <h2 class="font-roco text-lg md:text-xl text-primary-500 mb-1 md:mb-2">赛季异色精灵</h2>
      <p class="text-xs text-muted mb-3 md:mb-4">日常可捕捉的精灵，当赛季可在野外获取其异色版本，赛季结束后异色仅可通过孵蛋获取</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        <PetCard v-for="pet in shinyPetList" :key="pet.uid" :pet="pet" :shiny-url="shinyMap[pet.uid]" />
      </div>
    </div>
  </div>

  <!-- 无赛季 -->
  <div v-else-if="loaded" class="text-center mt-20">
    <div class="text-3xl mb-3">🏖️</div>
    <p class="text-muted">暂无赛季信息</p>
  </div>

  <div v-else class="text-muted text-center mt-20">加载中...</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { petsApi, seasonsApi } from '@/api'
import PetCard from '@/components/shared/PetCard.vue'

const season = ref(null)
const loaded = ref(false)
const legendPet = ref(null)
const passPetList = ref([])
const seasonPetList = ref([])
const shinyPetList = ref([])
const shinyMap = ref({})

async function loadPetsByUids(uids) {
  if (!uids || !uids.length) return []
  const results = await Promise.allSettled(
    uids.filter(Boolean).map(uid => petsApi.get(uid))
  )
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
}

onMounted(async () => {
  try {
    // 先加载异色映射
    const shinyList = await petsApi.shiny()
    const map = {}
    for (const s of shinyList) map[s.uid] = s.image_shiny
    shinyMap.value = map

    const res = await seasonsApi.current()
    if (res.season) {
      season.value = res.season

      const [legend, pass, sPets, shPets] = await Promise.all([
        res.season.legend_pet ? petsApi.get(res.season.legend_pet).catch(() => null) : null,
        loadPetsByUids(res.season.pass_pets || []),
        loadPetsByUids(res.season.season_pets || []),
        loadPetsByUids(res.season.shiny_pets || []),
      ])
      legendPet.value = legend
      passPetList.value = pass
      seasonPetList.value = sPets
      shinyPetList.value = shPets
    }
  } catch {}
  loaded.value = true
})
</script>

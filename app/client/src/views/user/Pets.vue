<template>
  <div>
    <h1 class="page-title">精灵图鉴</h1>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="flex flex-wrap gap-2 sm:gap-3 items-center">
        <input v-model="search" placeholder="搜索精灵名称..." @input="debouncedFetch" class="input w-full sm:w-52 lg:w-64" />
        <select v-model="sortBy" @change="filterChanged" class="select w-full sm:w-auto sm:ml-auto">
          <option value="pet_id">编号</option>
          <option value="total">种族值</option>
          <option value="hp">生命</option>
          <option value="speed">速度</option>
          <option value="atk">物攻</option>
          <option value="matk">魔攻</option>
        </select>
        <span class="text-muted text-xs sm:text-sm self-center">共 {{ total }} 只</span>
      </div>
      <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        <button @click="elementId = ''; filterChanged()"
          class="px-2 py-1 rounded-md text-xs sm:text-sm transition-colors"
          :class="!elementId ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-muted'">
          全部
        </button>
        <button v-for="e in elements" :key="e.id" @click="elementId = e.id; filterChanged()"
          class="p-1 sm:p-1.5 rounded-lg transition-all"
          :class="elementId == e.id ? 'bg-primary-100 dark:bg-primary-500/20 ring-1 ring-primary-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'">
          <img :src="e.icon" class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" :alt="e.name" :title="e.name" />
        </button>
      </div>
    </div>

    <!-- 网格列表：手机2列 → 大手机3列 → 平板4列 → 桌面5列 → 大桌面6列 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
      <PetCard v-for="pet in pets" :key="pet.uid" :pet="pet" :shiny-url="shinyMap[pet.uid]" />
    </div>

    <!-- 分页 -->
    <div class="flex justify-center items-center gap-3 sm:gap-4 mt-6 sm:mt-8 lg:mt-10" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost text-sm sm:text-base">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost text-sm sm:text-base">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { petsApi, elementsApi } from '@/api'
import PetCard from '@/components/shared/PetCard.vue'

const pets = ref([])
const elements = ref([])
const shinyMap = ref({})
const total = ref(0)
const page = ref(1)
const limit = ref(30)
const search = ref('')
const elementId = ref('')
const sortBy = ref('pet_id')

let debounceTimer = null
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

function filterChanged() {
  page.value = 1
  fetchData()
}

async function fetchData() {
  const res = await petsApi.list({
    page: page.value, limit: limit.value,
    search: search.value, element_id: elementId.value,
    sort_by: sortBy.value, order: sortBy.value === 'pet_id' ? 'asc' : 'desc',
  })
  pets.value = res.pets
  total.value = res.total
}

onMounted(async () => {
  const [elemRes, shinyList] = await Promise.all([
    elementsApi.list(),
    petsApi.shiny(),
  ])
  elements.value = elemRes.elements
  const map = {}
  for (const s of shinyList) map[s.uid] = s.image_shiny
  shinyMap.value = map
  fetchData()
})
</script>

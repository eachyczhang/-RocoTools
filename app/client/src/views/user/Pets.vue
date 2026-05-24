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
        <select v-model="tagFilter" @change="filterChanged" class="select text-xs sm:text-sm w-28 sm:w-32">
          <option value="">全部标记</option>
          <option value="is_final_form">最终形态</option>
          <option value="is_legendary">传说精灵</option>
          <option value="is_season">赛季精灵</option>
          <option value="is_pass">通行证精灵</option>
          <option value="is_boss_form">首领形态</option>
          <option value="has_boss_form">拥有首领形态</option>
          <option value="has_shiny">异色精灵</option>
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
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi } from '@/api'
import PetCard from '@/components/shared/PetCard.vue'

const route = useRoute()
const router = useRouter()

const pets = ref([])
const elements = ref([])
const shinyMap = ref({})
const total = ref(0)
const limit = ref(30)

// Initialize state from URL query params (restore on back navigation)
const page = ref(Number(route.query.page) || 1)
const search = ref(route.query.search || '')
const elementId = ref(route.query.element_id || '')
const sortBy = ref(route.query.sort_by || 'pet_id')
const tagFilter = ref(route.query.tag || '')

/** Sync current filter state to URL query (replace, not push) */
function syncQuery() {
  const query = {}
  if (page.value > 1) query.page = page.value
  if (search.value) query.search = search.value
  if (elementId.value) query.element_id = elementId.value
  if (sortBy.value && sortBy.value !== 'pet_id') query.sort_by = sortBy.value
  if (tagFilter.value) query.tag = tagFilter.value
  router.replace({ query })
}

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
  syncQuery()
  const params = {
    page: page.value, limit: limit.value,
    search: search.value, element_id: elementId.value,
    sort_by: sortBy.value, order: sortBy.value === 'pet_id' ? 'asc' : 'desc',
  }
  if (tagFilter.value) params.tag = tagFilter.value
  const res = await petsApi.list(params)
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
  if (Array.isArray(shinyList)) {
    for (const s of shinyList) map[s.uid] = s.image_shiny
  }
  shinyMap.value = map
  fetchData()
})
</script>

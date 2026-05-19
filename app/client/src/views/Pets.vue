<template>
  <div>
    <h1 class="font-roco text-2xl text-primary-500 mb-5">精灵图鉴</h1>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input v-model="search" placeholder="搜索精灵名称..." @input="debouncedFetch" class="input w-52" />
      <div class="flex items-center gap-1 flex-wrap">
        <button @click="elementId = ''; fetchData()"
          class="px-2 py-1 rounded-md text-xs transition-colors"
          :class="!elementId ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-muted'">
          全部
        </button>
        <button v-for="e in elements" :key="e.id" @click="elementId = e.id; fetchData()"
          class="p-1 rounded-md transition-all"
          :class="elementId == e.id ? 'bg-primary-100 dark:bg-primary-500/20 ring-1 ring-primary-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'">
          <img :src="e.icon" class="w-5 h-5" :alt="e.name" :title="e.name" />
        </button>
      </div>
      <select v-model="sortBy" @change="fetchData" class="select ml-auto">
        <option value="pet_id">编号</option>
        <option value="total">种族值</option>
        <option value="hp">生命</option>
        <option value="speed">速度</option>
        <option value="atk">物攻</option>
        <option value="matk">魔攻</option>
      </select>
      <span class="text-muted text-xs self-center">共 {{ total }} 只</span>
    </div>

    <!-- 网格列表 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      <router-link v-for="pet in pets" :key="pet.uid" :to="`/pets/${pet.uid}`" class="card text-center group py-5 relative">
        <span v-if="pet.variant_count > 1"
          class="absolute top-2 right-2 text-[10px] bg-primary-500/20 text-primary-500 rounded-full w-5 h-5 flex items-center justify-center">
          {{ pet.variant_count }}
        </span>
        <img :src="pet.image_url" :alt="pet.name"
          class="w-14 h-14 mx-auto mb-2 object-contain group-hover:scale-110 transition-transform" loading="lazy" />
        <div class="text-sm font-medium truncate">{{ pet.name }}</div>
        <div class="mt-1 flex items-center justify-center gap-1">
          <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4" :alt="pet.element_name" />
          <span class="text-xs" :style="{ color: pet.element_color }">{{ pet.element_name }}</span>
        </div>
        <div class="text-xs text-muted mt-1">{{ pet.total }}</div>
      </router-link>
    </div>

    <!-- 分页 -->
    <div class="flex justify-center items-center gap-4 mt-8" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { petsApi, elementsApi } from '@/api'

const pets = ref([])
const elements = ref([])
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
  const elemRes = await elementsApi.list()
  elements.value = elemRes.elements
  fetchData()
})
</script>

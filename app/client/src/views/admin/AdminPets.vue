<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">精灵管理</h1>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap gap-2 items-center mb-4">
      <input v-model="search" placeholder="搜索精灵名称/UID..." class="input w-full sm:w-52" @input="debouncedFetch" />
      <div class="w-40">
        <SearchSelect
          v-model="elementFilter"
          :options="[{ value: '', label: '全部属性' }, ...elements.map(e => ({ value: String(e.id), label: e.name, icon: e.icon }))]"
          placeholder="筛选属性"
        />
      </div>
      <label class="flex items-center gap-1 text-xs text-muted cursor-pointer select-none">
        <input type="checkbox" v-model="bossFilter" @change="filterChanged" class="accent-primary-500" />
        首领形态
      </label>
      <router-link to="/admin/pets/new" class="btn text-xs">+ 新增精灵</router-link>
      <span class="text-muted text-xs ml-auto">共 {{ total }} 只</span>
    </div>

    <!-- 列表 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <router-link v-for="pet in pets" :key="pet.uid" :to="`/admin/pets/${pet.uid}`"
        class="card group relative flex flex-col items-center py-4 px-2">
        <div class="w-20 h-20 md:w-28 md:h-28 mb-2">
          <img :src="pet.thumb_url || pet.image_url" :alt="pet.name"
            class="w-full h-full object-contain" loading="lazy" />
        </div>
        <div class="text-sm font-medium text-center truncate w-full group-hover:text-primary-500">{{ pet.name }}</div>
        <div class="text-xs text-muted mt-0.5">{{ pet.uid }}</div>
        <div class="mt-1 flex items-center gap-1">
          <img v-if="pet.element_icon" :src="pet.element_icon" class="w-5 h-5" />
          <img v-if="pet.sub_element_icon" :src="pet.sub_element_icon" class="w-5 h-5" />
        </div>
        <span class="absolute top-2 right-2 text-xs bg-primary-500/10 text-primary-500 rounded px-1.5 py-0.5">编辑</span>
      </router-link>
    </div>

    <!-- 分页 - 常驻底部 -->
    <div class="sticky bottom-0 z-30 -mx-4 px-4 py-3 bg-card/95 backdrop-blur-sm border-t border-border flex justify-center items-center gap-3 mt-6" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost text-sm">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost text-sm">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi } from '@/api'
import SearchSelect from '@/components/shared/SearchSelect.vue'

const route = useRoute()
const router = useRouter()

const pets = ref([])
const total = ref(0)
const limit = ref(30)
const elements = ref([])

// Initialize state from URL query params (restore on back navigation)
const page = ref(Number(route.query.page) || 1)
const search = ref(route.query.search || '')
const elementFilter = ref(route.query.element_id || '')
const bossFilter = ref(route.query.boss === '1')

/** Sync current filter state to URL query (replace, not push) */
function syncQuery() {
  const query = {}
  if (page.value > 1) query.page = page.value
  if (search.value) query.search = search.value
  if (elementFilter.value) query.element_id = elementFilter.value
  if (bossFilter.value) query.boss = '1'
  router.replace({ query })
}

let timer = null
function debouncedFetch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

function filterChanged() {
  page.value = 1
  fetchData()
}

watch(elementFilter, () => { page.value = 1; fetchData() })

async function fetchData() {
  syncQuery()
  const params = { page: page.value, limit: limit.value, search: search.value }
  if (elementFilter.value) params.element_id = elementFilter.value
  if (bossFilter.value) params.is_boss_form = '1'
  const res = await petsApi.list(params)
  pets.value = res.pets
  total.value = res.total
}

onMounted(async () => {
  const elemRes = await elementsApi.list()
  elements.value = elemRes.elements
  fetchData()
})
</script>

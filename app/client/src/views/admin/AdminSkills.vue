<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">技能管理</h1>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <input v-model="search" placeholder="搜索技能名称/UID..." class="input flex-1 min-w-[160px]" @input="debouncedFetch" />
        <select v-model="elementFilter" @change="page = 1; fetchData()" class="input w-auto">
          <option value="">全部属性</option>
          <option v-for="el in elements" :key="el.id" :value="el.id">{{ el.name }}</option>
        </select>
        <select v-model="categoryFilter" @change="page = 1; fetchData()" class="input w-auto">
          <option value="">全部类型</option>
          <option value="物攻">物攻</option>
          <option value="魔攻">魔攻</option>
          <option value="属性">属性</option>
        </select>
        <router-link to="/admin/skills/new" class="btn text-xs">+ 新增技能</router-link>
        <span class="text-muted text-xs ml-auto">共 {{ total }} 条</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-muted">加载中...</div>

    <!-- List -->
    <div v-else class="space-y-2.5">
      <router-link v-for="skill in skills" :key="skill.uid" :to="`/admin/skills/${skill.uid}`"
        class="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors group">
        <!-- Icon -->
        <div class="relative flex-shrink-0">
          <img v-if="skill.icon_url" :src="skill.icon_url" class="w-12 h-12 object-contain rounded-lg" loading="lazy" />
          <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-12 h-12 object-contain rounded-lg" loading="lazy" />
          <div v-else class="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10"></div>
        </div>
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium truncate">{{ skill.name }}</span>
            <span class="text-[10px] text-muted">({{ skill.uid }})</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Element badge -->
            <span v-if="skill.element_name" class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: (skill.element_color || '#888') + '20', color: skill.element_color || '#888' }">
              <img v-if="skill.element_icon" :src="skill.element_icon" class="w-3 h-3" />
              {{ skill.element_name }}
            </span>
            <!-- Category badge -->
            <span v-if="skill.category" class="text-[10px] px-1.5 py-0.5 rounded"
              :class="skill.category === '物攻' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                      skill.category === '魔攻' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                      'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'">
              {{ skill.category }}
            </span>
            <!-- Power -->
            <span v-if="skill.power" class="text-[10px] text-muted">威力 {{ skill.power }}</span>
            <!-- Cost -->
            <span v-if="skill.cost" class="text-[10px] text-muted">能耗 {{ skill.cost }}</span>
          </div>
        </div>
        <!-- Arrow -->
        <span class="text-xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">编辑 →</span>
      </router-link>
    </div>

    <!-- Empty -->
    <div v-if="!loading && skills.length === 0" class="text-center py-12 text-muted">
      没有找到匹配的技能
    </div>

    <!-- Pagination -->
    <div class="flex justify-center items-center gap-4 mt-6" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn text-sm">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn text-sm">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { skillsApi, elementsApi } from '@/api'

const skills = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20
const search = ref('')
const elementFilter = ref('')
const categoryFilter = ref('')
const elements = ref([])
const loading = ref(false)

let timer = null
function debouncedFetch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

async function fetchData() {
  loading.value = true
  try {
    const params = { page: page.value, limit, search: search.value }
    if (elementFilter.value) params.element_id = elementFilter.value
    if (categoryFilter.value) params.category = categoryFilter.value
    const res = await skillsApi.list(params)
    skills.value = res.skills
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await elementsApi.list()
    elements.value = res.elements || res.data || []
  } catch { elements.value = [] }
  fetchData()
})
</script>

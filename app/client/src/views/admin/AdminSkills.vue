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
        <router-link to="/admin/skills/new" class="btn text-xs sm:text-sm">+ 新增技能</router-link>
        <span class="text-muted text-xs sm:text-sm ml-auto">共 {{ total }} 条</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-muted">加载中...</div>

    <!-- Column Header (desktop lg+) -->
    <div v-if="!loading && skills.length" class="hidden lg:flex items-center gap-4 px-4 pb-2 text-xs text-muted uppercase tracking-wide">
      <div class="flex-shrink-0 w-12"></div>
      <div class="flex-1 min-w-[120px]">名称</div>
      <div class="flex-shrink-0 w-[100px]">UID</div>
      <div class="flex-shrink-0 w-[90px]">属性</div>
      <div class="flex-shrink-0 w-[64px]">类型</div>
      <div class="flex-shrink-0 w-[56px] text-right">威力</div>
      <div class="flex-shrink-0 w-[48px] text-right">能耗</div>
      <div class="flex-shrink-0 w-[50px]"></div>
    </div>



    <!-- List -->
    <div v-if="!loading" class="space-y-2">
      <router-link v-for="skill in skills" :key="skill.uid" :to="`/admin/skills/${skill.uid}`"
        class="block rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors group">
        <!-- Desktop layout (lg+) -->
        <div class="hidden lg:flex items-center gap-4 px-4 py-3">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <img v-if="skill.icon_url" :src="skill.icon_url" class="w-12 h-12 object-contain rounded-lg" loading="lazy" />
            <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-12 h-12 object-contain rounded-lg" loading="lazy" />
            <div v-else class="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10"></div>
          </div>
          <!-- Name -->
          <div class="flex-1 min-w-[120px] flex items-center">
            <span class="text-base font-medium" :style="{ color: skill.element_color || '' }">{{ skill.name }}</span>
          </div>
          <!-- UID -->
          <div class="flex-shrink-0 w-[100px] flex items-center">
            <span class="text-xs text-muted font-mono">{{ skill.uid }}</span>
          </div>
          <!-- Element badge -->
          <div class="flex-shrink-0 w-[90px] flex items-center">
            <span v-if="skill.element_name" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              :style="{ backgroundColor: (skill.element_color || '#888') + '18', color: skill.element_color || '#888' }">
              <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4" />
              {{ skill.element_name }}
            </span>
          </div>
          <!-- Category badge -->
          <div class="flex-shrink-0 w-[64px] flex items-center">
            <span v-if="skill.category" class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="skill.category === '物攻' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                      skill.category === '魔攻' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                      'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'">
              {{ skill.category }}
            </span>
          </div>
          <!-- Power -->
          <div class="flex-shrink-0 w-[56px] flex items-center justify-end">
            <span v-if="skill.power" class="text-sm font-bold"
              :style="{ color: skill.element_color || '#D69F23' }">
              {{ skill.power }}
            </span>
            <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
          </div>
          <!-- Cost -->
          <div class="flex-shrink-0 w-[48px] flex items-center justify-end">
            <span v-if="skill.cost" class="text-sm text-muted">{{ skill.cost }}</span>
            <span v-else class="text-xs text-gray-300 dark:text-gray-600">—</span>
          </div>
          <!-- Arrow -->
          <div class="flex-shrink-0 w-[50px] text-right">
            <span class="text-xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">编辑 →</span>
          </div>
        </div>

        <!-- Mobile/Tablet layout (<lg) -->
        <div class="lg:hidden flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <img v-if="skill.icon_url" :src="skill.icon_url" class="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg" loading="lazy" />
            <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg" loading="lazy" />
            <div v-else class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-200 dark:bg-white/10"></div>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm sm:text-base font-semibold truncate" :style="{ color: skill.element_color || '' }">{{ skill.name }}</span>
              <span class="text-[10px] sm:text-xs text-muted/60 font-mono flex-shrink-0">{{ skill.uid }}</span>
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2 mt-1">
              <span v-if="skill.element_name" class="inline-flex items-center gap-0.5 text-[11px] sm:text-xs px-1.5 py-0.5 rounded-full"
                :style="{ backgroundColor: (skill.element_color || '#888') + '18', color: skill.element_color || '#888' }">
                <img v-if="skill.element_icon" :src="skill.element_icon" class="w-3.5 h-3.5" />
                {{ skill.element_name }}
              </span>
              <span v-if="skill.category" class="text-[11px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium"
                :class="skill.category === '物攻' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                        skill.category === '魔攻' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                        'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'">
                {{ skill.category }}
              </span>
              <span class="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <span v-if="skill.power" class="text-xs sm:text-sm font-bold"
                  :style="{ color: skill.element_color || '#D69F23' }">
                  {{ skill.power }}
                </span>
                <span v-if="skill.cost" class="text-[11px] sm:text-xs text-muted bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded">
                  ⚡{{ skill.cost }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Empty -->
    <div v-if="!loading && skills.length === 0" class="text-center py-12 text-muted">
      没有找到匹配的技能
    </div>

    <!-- Pagination (sticky bottom) -->
    <div v-if="total > limit"
      class="sticky bottom-0 z-10 flex justify-center items-center gap-4 py-3 mt-4 -mx-4 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
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

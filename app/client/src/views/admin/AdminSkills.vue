<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">技能管理</h1>

    <div class="flex flex-wrap gap-2 items-center mb-4">
      <input v-model="search" placeholder="搜索技能名称/UID..." class="input w-full sm:w-52" @input="debouncedFetch" />
      <router-link to="/admin/skills/new" class="btn text-xs">+ 新增技能</router-link>
      <span class="text-muted text-xs ml-auto">共 {{ total }} 条</span>
    </div>

    <div class="space-y-2">
      <router-link v-for="skill in skills" :key="skill.uid" :to="`/admin/skills/${skill.uid}`"
        class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
        <img v-if="skill.icon_url" :src="skill.icon_url" class="w-10 h-10 object-contain rounded flex-shrink-0" loading="lazy" />
        <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-10 h-10 object-contain rounded flex-shrink-0" loading="lazy" />
        <div v-else class="w-10 h-10 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ skill.name }}</div>
          <div class="text-xs text-muted">{{ skill.uid }} · {{ skill.category || '-' }} · 威力 {{ skill.power || '-' }}</div>
        </div>
        <span class="text-xs text-primary-500">编辑 →</span>
      </router-link>
    </div>

    <div class="flex justify-center items-center gap-3 mt-6" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost text-sm">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost text-sm">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { skillsApi } from '@/api'

const skills = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(50)
const search = ref('')

let timer = null
function debouncedFetch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

async function fetchData() {
  const res = await skillsApi.list({ page: page.value, limit: limit.value, search: search.value })
  skills.value = res.skills
  total.value = res.total
}

onMounted(fetchData)
</script>

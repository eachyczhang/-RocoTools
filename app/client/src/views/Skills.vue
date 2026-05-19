<template>
  <div>
    <h1 class="font-roco text-2xl text-primary-500 mb-5">技能大全</h1>

    <div class="flex flex-wrap gap-3 mb-6">
      <input v-model="search" placeholder="搜索技能名称..." @input="debouncedFetch" class="input w-52" />
      <select v-model="category" @change="fetchData" class="select">
        <option value="">全部分类</option>
        <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">{{ c }}</option>
      </select>
      <span class="text-muted text-xs self-center ml-auto">共 {{ total }} 条</span>
    </div>

    <div class="card overflow-hidden !p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-muted text-xs bg-gray-50 dark:bg-white/3">
            <th class="py-3 px-4 w-20">图标</th>
            <th class="py-3 px-4">名称</th>
            <th class="py-3 px-4">属性</th>
            <th class="py-3 px-4">分类</th>
            <th class="py-3 px-4 w-16">能耗</th>
            <th class="py-3 px-4 w-16">威力</th>
            <th class="py-3 px-4 hidden md:table-cell">效果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="skill in skills" :key="skill.uid"
            class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-gray-50 dark:hover:bg-white/3">
            <td class="py-2.5 px-4">
              <img v-if="skill.icon_url" :src="skill.icon_url" class="w-8 h-8 object-contain" :alt="skill.name" loading="lazy" />
            </td>
            <td class="py-2.5 px-4 font-medium">{{ skill.name }}</td>
            <td class="py-2.5 px-4">
              <span class="flex items-center gap-1">
                <img v-if="skill.element_icon" :src="skill.element_icon" class="w-4 h-4" :alt="skill.element_name" />
                <span class="text-xs" :style="{ color: skill.element_color }">{{ skill.element_name }}</span>
              </span>
            </td>
            <td class="py-2.5 px-4 text-muted">{{ skill.category }}</td>
            <td class="py-2.5 px-4">{{ skill.cost }}</td>
            <td class="py-2.5 px-4">{{ skill.power }}</td>
            <td class="py-2.5 px-4 text-muted text-xs max-w-xs truncate hidden md:table-cell">{{ skill.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-center items-center gap-4 mt-6" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost">下一页 →</button>
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
const category = ref('')

let debounceTimer = null
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

async function fetchData() {
  const res = await skillsApi.list({ page: page.value, limit: limit.value, search: search.value, category: category.value })
  skills.value = res.skills
  total.value = res.total
}

onMounted(fetchData)
</script>

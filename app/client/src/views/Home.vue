<template>
  <div>
    <h1 class="font-roco text-3xl text-primary-500 mb-8">洛克王国世界 数据工具</h1>

    <!-- 数据概览 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      <div class="card text-center" v-for="stat in stats" :key="stat.label">
        <div class="text-3xl font-bold text-primary-500">{{ stat.value }}</div>
        <div class="text-muted text-xs mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 快速导航 -->
    <h2 class="text-lg font-medium mb-4">快速导航</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <router-link v-for="item in navCards" :key="item.path" :to="item.path" class="card group">
        <div class="text-base font-medium group-hover:text-primary-500 transition-colors">{{ item.title }}</div>
        <div class="text-muted text-xs mt-2">{{ item.desc }}</div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { petsApi, skillsApi, elementsApi, eggsApi } from '@/api'

const stats = ref([])
const navCards = [
  { path: '/pets', title: '精灵图鉴', desc: '查看所有精灵数据、种族值、技能、蛋组' },
  { path: '/skills', title: '技能大全', desc: '按属性、分类筛选所有技能' },
  { path: '/elements', title: '属性克制', desc: '18 种属性克制/抵抗关系一览' },
]

onMounted(async () => {
  const [pets, skills, elements, eggs] = await Promise.all([
    petsApi.list({ limit: 1 }),
    skillsApi.list({ limit: 1 }),
    elementsApi.list(),
    eggsApi.list(),
  ])
  stats.value = [
    { label: '精灵', value: pets.total },
    { label: '技能', value: skills.total },
    { label: '属性', value: elements.total },
    { label: '蛋组', value: eggs.total },
  ]
})
</script>

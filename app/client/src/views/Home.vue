<template>
  <div>
    <!-- 标题 -->
    <h1 class="font-roco text-2xl md:text-3xl text-primary-500 mb-4 md:mb-5">洛克王国世界 数据工具</h1>

    <!-- 官方链接 -->
    <div class="flex flex-wrap gap-3 md:gap-4 mb-6 md:mb-8">
      <a href="https://rocom.qq.com/" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 px-4 py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm md:text-base group-hover:text-primary-500 transition-colors">🎮 洛克王国世界官网</span>
      </a>
      <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
        class="card group flex items-center gap-2 px-4 py-3 hover:border-primary-500/30 transition-colors">
        <span class="font-roco text-sm md:text-base group-hover:text-primary-500 transition-colors">📖 BWIKI 百科</span>
      </a>
    </div>

    <!-- 数据概览 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
      <div class="card text-center" v-for="stat in stats" :key="stat.label">
        <div class="font-roco text-2xl md:text-3xl text-primary-500">{{ stat.value }}</div>
        <div class="text-muted text-xs mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 快速导航 -->
    <h2 class="font-roco text-lg md:text-xl text-primary-500 mb-3 md:mb-4">快速导航</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-10">
      <router-link v-for="item in navCards" :key="item.path" :to="item.path" class="card group">
        <div class="font-roco text-sm md:text-base group-hover:text-primary-500 transition-colors">{{ item.title }}</div>
        <div class="text-muted text-xs mt-1.5 md:mt-2">{{ item.desc }}</div>
      </router-link>
    </div>

    <!-- 数据来源与声明 -->
    <div class="card">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">数据来源与声明</h2>

      <div class="space-y-3 md:space-y-4 text-sm md:text-base leading-relaxed">
        <!-- 数据来源 -->
        <div>
          <h3 class="font-medium text-sm md:text-base mb-1">📖 数据来源</h3>
          <p class="text-muted">
            本站数据源自
            <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer"
              class="text-primary-500 hover:text-primary-600 underline underline-offset-2">洛克王国世界 BWIKI</a>，
            由自动化爬虫采集、清洗、结构化后同步至数据库，仅供学习和交流使用。
          </p>
        </div>

        <!-- 二次处理声明 -->
        <div>
          <h3 class="font-medium text-sm md:text-base mb-1">⚠️ 数据准确性</h3>
          <p class="text-muted">
            部分数据经过二次处理（如属性克制倍率计算、打击面分析等），处理过程中可能存在偏差或错误。
            <strong class="text-gray-700 dark:text-gray-200">如发现数据有误，欢迎指正，一切以游戏官方实际数据为准。</strong>
          </p>
        </div>

        <!-- 内容协议 -->
        <div>
          <h3 class="font-medium text-sm md:text-base mb-1">📜 内容协议</h3>
          <p class="text-muted">
            BWIKI 内容遵循
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer"
              class="text-primary-500 hover:text-primary-600 underline underline-offset-2">CC BY-NC-SA 4.0</a>
            协议。本站作为非商业性质的数据展示工具，遵循该协议进行内容引用与再分发。
          </p>
        </div>

        <!-- 版权声明 -->
        <div>
          <h3 class="font-medium text-sm md:text-base mb-1">©️ 版权声明</h3>
          <div class="text-muted space-y-1.5">
            <p>© 2026 <span class="font-roco text-primary-500">Roco Tools</span> Developed by <a href="https://github.com/zycSelf" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">@eachzhang</a></p>
            <p>本项目部分数据与内容引用自 <a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline underline-offset-2">B站洛克王国Wiki</a>，其版权归哔哩哔哩游戏wiki所有。</p>
            <p>洛克王国游戏及相关IP版权归腾讯公司所有。</p>
            <p>本项目仅用于学习交流，非官方应用，无任何商业用途。</p>
          </div>
        </div>
      </div>
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
  { path: '/coverage', title: '打击面分析', desc: '选择属性组合，查找最优打击面精灵' },
  { path: '/eggs', title: '蛋组查询', desc: '查看 15 种蛋组及其精灵成员' },
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

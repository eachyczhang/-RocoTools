<template>
  <div>
    <h1 class="page-title">技能大全</h1>

    <div class="filter-bar">
      <div class="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
        <input v-model="search" placeholder="搜索技能名称..." @input="debouncedFetch" class="input w-full sm:w-52 lg:w-64" />
        <div class="flex flex-wrap gap-2">
          <select v-model="category" @change="filterChanged" class="select text-sm flex-1 sm:flex-none">
            <option value="">分类：全部</option>
            <option v-for="c in ['物攻','魔攻','防御','状态']" :key="c" :value="c">分类：{{ c }}</option>
          </select>
          <select v-model="counter" @change="filterChanged" class="select text-sm flex-1 sm:flex-none">
            <option value="">应对：不限</option>
            <option value="none">应对：无</option>
            <option v-for="c in ['状态','防御','攻击']" :key="c" :value="c">应对：{{ c }}</option>
          </select>
          <select v-model="keyword" @change="filterChanged" class="select text-sm flex-1 sm:flex-none">
            <option value="">效果：不限</option>
            <option v-for="k in keywordOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </div>
        <span class="text-muted text-xs sm:text-sm self-center sm:ml-auto">共 {{ total }} 条</span>
      </div>
    </div>

    <!-- 属性筛选 -->
    <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5 lg:mb-6">
      <button @click="elementId = ''; filterChanged()"
        class="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-colors"
        :class="!elementId ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
        全
      </button>
      <button v-for="elem in elements" :key="elem.id"
        @click="elementId = elem.id; filterChanged()"
        class="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg flex items-center justify-center transition-colors"
        :class="elementId === elem.id ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
        :title="elem.name">
        <img :src="elem.icon" class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" :alt="elem.name" />
      </button>
    </div>

    <!-- 桌面端：表格 -->
    <div class="hidden lg:block card overflow-hidden !p-0">
      <table class="w-full text-base">
        <thead>
          <tr class="text-left text-muted text-sm bg-gray-50 dark:bg-white/3">
            <th class="py-3 px-4 w-16">图标</th>
            <th class="py-3 px-4">名称</th>
            <th class="py-3 px-4">属性</th>
            <th class="py-3 px-4">分类</th>
            <th class="py-3 px-4 w-16">能耗</th>
            <th class="py-3 px-4 w-16">威力</th>
            <th class="py-3 px-4">效果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="skill in skills" :key="skill.uid"
            class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-gray-50 dark:hover:bg-white/3">
            <td class="py-3.5 px-4">
              <img v-if="skill.icon_url" :src="skill.icon_url" class="w-10 h-10 object-contain" :alt="skill.name" loading="lazy" />
              <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-10 h-10 object-contain" :alt="skill.element_name" loading="lazy" />
            </td>
            <td class="py-3.5 px-4 font-medium">
              <router-link :to="`/skills/${skill.uid}`" class="hover:text-primary-500 transition-colors">{{ skill.name }}</router-link>
            </td>
            <td class="py-3.5 px-4">
              <span class="flex items-center gap-1.5">
                <img v-if="skill.element_icon" :src="skill.element_icon" class="w-6 h-6" :alt="skill.element_name" />
                <span class="text-sm" :style="{ color: skill.element_color }">{{ skill.element_name }}</span>
              </span>
            </td>
            <td class="py-3.5 px-4">
              <span class="font-medium" :style="{ color: categoryColor(skill.category) }">{{ skill.category }}</span>
            </td>
            <td class="py-3.5 px-4">{{ skill.cost }}</td>
            <td class="py-3.5 px-4">{{ skill.power }}</td>
            <td class="py-3.5 px-4 text-sm max-w-sm">
              <SkillDescription :text="skill.description" class="text-muted" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端/平板：卡片网格 -->
    <div class="lg:hidden grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
      <router-link v-for="skill in skills" :key="skill.uid" :to="`/skills/${skill.uid}`"
        class="card group relative flex flex-col items-center p-3 sm:p-4 hover:ring-2 hover:ring-primary-500/30 transition-all">
        <!-- Icon -->
        <div class="w-12 h-12 sm:w-14 sm:h-14 mb-2">
          <img v-if="skill.icon_url" :src="skill.icon_url" class="w-full h-full object-contain rounded-lg" loading="lazy" />
          <img v-else-if="skill.element_icon" :src="skill.element_icon" class="w-full h-full object-contain rounded-lg" loading="lazy" />
          <div v-else class="w-full h-full rounded-lg bg-gray-200 dark:bg-white/10"></div>
        </div>
        <!-- Name -->
        <div class="text-sm sm:text-base font-semibold text-center truncate w-full"
          :style="{ color: skill.element_color || '' }">
          {{ skill.name }}
        </div>
        <!-- Badges row -->
        <div class="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          <span v-if="skill.element_name" class="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full"
            :style="{ backgroundColor: (skill.element_color || '#888') + '18', color: skill.element_color || '#888' }">
            <img v-if="skill.element_icon" :src="skill.element_icon" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {{ skill.element_name }}
          </span>
          <span v-if="skill.category" class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-medium"
            :class="skill.category === '物攻' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                    skill.category === '魔攻' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                    'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'">
            {{ skill.category }}
          </span>
        </div>
        <!-- Power & Cost -->
        <div class="flex items-center justify-center gap-3 mt-1.5">
          <span v-if="skill.power" class="text-sm sm:text-base font-bold"
            :style="{ color: skill.element_color || '#D69F23' }">
            威力 {{ skill.power }}
          </span>
          <span class="text-[11px] sm:text-xs text-muted">
            能耗 {{ skill.cost ?? 0 }}
          </span>
        </div>
        <!-- Description -->
        <div v-if="skill.description" class="mt-1.5 text-[10px] sm:text-xs text-muted text-center line-clamp-2 w-full">
          {{ skill.description }}
        </div>
      </router-link>
    </div>

    <div class="flex justify-center items-center gap-3 sm:gap-4 mt-5 sm:mt-6 lg:mt-8" v-if="total > limit">
      <button @click="page > 1 && (page--, fetchData())" :disabled="page <= 1" class="btn-ghost text-sm">← 上一页</button>
      <span class="text-sm text-muted">{{ page }} / {{ Math.ceil(total / limit) }}</span>
      <button @click="page < Math.ceil(total / limit) && (page++, fetchData())"
        :disabled="page >= Math.ceil(total / limit)" class="btn-ghost text-sm">下一页 →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { skillsApi, elementsApi } from '@/api'
import SkillDescription from '@/components/user/SkillDescription.vue'
import { categoryColor } from '@/constants/categoryColors'

const skills = ref([])
const elements = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(50)
const search = ref('')
const category = ref('')
const counter = ref('')
const elementId = ref('')
const keyword = ref('')

const keywordOptions = [
  { value: '连击', label: '连击' },
  { value: '回复', label: '回复' },
  { value: '吸血', label: '吸血' },
  { value: '永久', label: '永久增益' },
  { value: '印记', label: '印记' },
  { value: '驱散', label: '驱散' },
  { value: '打断', label: '打断' },
  { value: '脱离', label: '脱离' },
  { value: '更换', label: '更换精灵' },
  { value: '先手', label: '先手' },
  { value: '迸发', label: '迸发' },
  { value: '迅捷', label: '迅捷' },
  { value: '蓄力', label: '蓄力' },
  { value: '中毒', label: '中毒' },
  { value: '灼烧', label: '灼烧' },
  { value: '冻结', label: '冻结' },
  { value: '萌化', label: '萌化' },
  { value: '奉献', label: '奉献' },
]

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
  const res = await skillsApi.list({ page: page.value, limit: limit.value, search: search.value, category: category.value, counter: counter.value, element_id: elementId.value, keyword: keyword.value })
  skills.value = res.skills
  total.value = res.total
}

onMounted(async () => {
  const elemData = await elementsApi.list()
  elements.value = elemData.elements
  fetchData()
})


</script>

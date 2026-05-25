<template>
  <div>
    <h1 class="page-title">性格</h1>

    <!-- 属性筛选 -->
    <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5 lg:mb-6">
      <button @click="filter = ''"
        class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
        :class="!filter ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
        全部
      </button>
      <button v-for="stat in stats" :key="stat" @click="filter = stat"
        class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
        :class="filter === stat ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5'">
        {{ stat }}↑
      </button>
    </div>

    <!-- 桌面端表格 -->
    <div class="hidden sm:block card overflow-hidden !p-0">
      <table class="w-full">
        <thead>
          <tr class="text-left text-muted text-xs sm:text-sm bg-gray-50 dark:bg-white/3">
            <th class="py-3 px-4">性格</th>
            <th class="py-3 px-4">属性增加</th>
            <th class="py-3 px-4">属性减少</th>
            <th class="py-3 px-4">随机子性格</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="nature in filteredNatures" :key="nature.id"
            class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-gray-50 dark:hover:bg-white/3">
            <td class="py-3 px-4 font-medium">{{ nature.name }}</td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs sm:text-sm font-medium"
                :style="{ background: statColor(nature.stat_up) + '15', color: statColor(nature.stat_up) }">
                ▲ {{ nature.stat_up }}
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs sm:text-sm font-medium"
                :style="{ background: statColor(nature.stat_down) + '15', color: statColor(nature.stat_down) }">
                ▼ {{ nature.stat_down }}
              </span>
            </td>
            <td class="py-3 px-4 text-xs sm:text-sm text-muted">
              {{ nature.sub_natures.join('、') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动端卡片 -->
    <div class="sm:hidden space-y-2">
      <div v-for="nature in filteredNatures" :key="nature.id" class="card !p-3">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">{{ nature.name }}</span>
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ background: statColor(nature.stat_up) + '15', color: statColor(nature.stat_up) }">
              ▲{{ nature.stat_up }}
            </span>
            <span class="px-1.5 py-0.5 rounded text-xs font-medium"
              :style="{ background: statColor(nature.stat_down) + '15', color: statColor(nature.stat_down) }">
              ▼{{ nature.stat_down }}
            </span>
          </div>
        </div>
        <div class="text-xs text-muted">{{ nature.sub_natures.join('、') }}</div>
      </div>
    </div>

    <!-- 统计 -->
    <div class="mt-6 sm:mt-8 text-xs sm:text-sm text-muted text-center">
      共 {{ filteredNatures.length }} 种性格
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { naturesApi } from '@/api'
import { statColor } from '@/constants/categoryColors'

const natures = ref([])
const filter = ref('')
const stats = ['生命', '物攻', '魔攻', '物防', '魔防', '速度']

const filteredNatures = computed(() => {
  if (!filter.value) return natures.value
  return natures.value.filter(n => n.stat_up === filter.value)
})


onMounted(async () => {
  const data = await naturesApi.list()
  natures.value = data.natures
})
</script>

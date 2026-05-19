<template>
  <div>
    <h1 class="font-roco text-2xl text-primary-500 mb-6">属性克制关系</h1>

    <!-- 属性网格 -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3 mb-8">
      <button v-for="elem in elements" :key="elem.id"
        class="card text-center !p-3 cursor-pointer"
        :class="selected?.id === elem.id ? 'ring-2 ring-primary-400' : ''"
        @click="selected = selected?.id === elem.id ? null : elem">
        <img :src="elem.icon" class="w-7 h-7 mx-auto mb-1.5" :alt="elem.name" />
        <div class="text-xs font-medium" :style="{ color: elem.color }">{{ elem.name }}</div>
      </button>
    </div>

    <!-- 选中属性详情 -->
    <div class="card" v-if="selected">
      <div class="flex items-center gap-3 mb-5">
        <img :src="selected.icon" class="w-8 h-8" />
        <h2 class="text-xl font-medium" :style="{ color: selected.color }">{{ selected.name }}</h2>
        <span v-if="selected.immunity" class="badge bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 ml-auto">
          免疫：{{ selected.immunity }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="text-muted text-xs mb-2 uppercase tracking-wide">攻击面</div>
          <div class="space-y-3">
            <div>
              <span class="text-xs text-green-600 dark:text-green-400">克制 ×2</span>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span v-for="t in selected.strong_against" :key="t.id"
                  class="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">{{ t.name }}</span>
                <span v-if="!selected.strong_against?.length" class="text-muted text-xs">无</span>
              </div>
            </div>
            <div>
              <span class="text-xs text-yellow-600 dark:text-yellow-400">被抵抗 ×0.5</span>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span v-for="t in selected.resisted_by" :key="t.id"
                  class="badge bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">{{ t.name }}</span>
                <span v-if="!selected.resisted_by?.length" class="text-muted text-xs">无</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="text-muted text-xs mb-2 uppercase tracking-wide">防御面</div>
          <div class="space-y-3">
            <div>
              <span class="text-xs text-red-600 dark:text-red-400">弱点 ×2</span>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span v-for="t in selected.weak_to" :key="t.id"
                  class="badge bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{{ t.name }}</span>
                <span v-if="!selected.weak_to?.length" class="text-muted text-xs">无</span>
              </div>
            </div>
            <div>
              <span class="text-xs text-blue-600 dark:text-blue-400">抗性 ×0.5</span>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span v-for="t in selected.resistant_to" :key="t.id"
                  class="badge bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{{ t.name }}</span>
                <span v-if="!selected.resistant_to?.length" class="text-muted text-xs">无</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { elementsApi } from '@/api'

const elements = ref([])
const selected = ref(null)

onMounted(async () => {
  const res = await elementsApi.list()
  elements.value = res.elements
})
</script>

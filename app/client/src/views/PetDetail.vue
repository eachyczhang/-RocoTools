<template>
  <div v-if="pet">
    <!-- 返回 -->
    <router-link to="/pets" class="text-sm text-muted hover:text-primary-500 mb-4 inline-block">← 返回列表</router-link>

    <!-- 形态切换 -->
    <div class="flex items-center gap-2 mb-4" v-if="pet.variants && pet.variants.length > 1">
      <span class="text-xs text-muted mr-1">形态：</span>
      <button v-for="v in pet.variants" :key="v.pet_uid"
        @click="switchVariant(v.pet_uid)"
        class="px-3 py-1 rounded-lg text-xs transition-colors"
        :class="v.pet_uid === pet.uid
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'">
        {{ v.name }}
      </button>
    </div>

    <!-- 头部卡片 -->
    <div class="card flex flex-col md:flex-row gap-6 mb-6">
      <img :src="pet.detail?.image_default || pet.image_url"
        class="w-48 h-48 object-contain mx-auto md:mx-0 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <h1 class="font-roco text-2xl text-primary-500">{{ pet.name }}</h1>
          <span class="badge flex items-center gap-1" :style="{ background: pet.element_color + '18', color: pet.element_color }">
            <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4" />
            {{ pet.element_name }}
          </span>
        </div>

        <!-- 蛋组标签 -->
        <div class="flex flex-wrap gap-1.5 mb-3">
          <span v-for="eg in pet.egg_groups" :key="eg.id" class="badge bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {{ eg.name }}
          </span>
        </div>

        <!-- 特性 -->
        <div class="flex items-center gap-2 text-sm mb-4">
          <img v-if="pet.detail?.ability_icon" :src="pet.detail.ability_icon"
            class="w-8 h-8 rounded object-contain flex-shrink-0" />
          <div>
            <span class="font-medium">{{ pet.ability_name }}</span>
            <span class="text-muted ml-2">{{ pet.ability_desc }}</span>
          </div>
        </div>

        <!-- 种族值 -->
        <div class="grid grid-cols-4 gap-3">
          <div v-for="s in statsList" :key="s.key" class="text-center">
            <div class="text-xs text-muted">{{ s.label }}</div>
            <div class="text-lg font-bold" :class="s.key === 'total' ? 'text-primary-500' : ''">{{ pet[s.key] }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 克制关系 -->
    <div class="card mb-6" v-if="pet.detail">
      <h2 class="font-medium text-base mb-3">克制关系</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-muted text-xs mb-1">克制</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="t in pet.detail.restrain_strong" :key="t" class="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">{{ t }}</span>
            <span v-if="!pet.detail.restrain_strong?.length" class="text-muted">无</span>
          </div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">被克制</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="t in pet.detail.restrain_weak" :key="t" class="badge bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">{{ t }}</span>
            <span v-if="!pet.detail.restrain_weak?.length" class="text-muted">无</span>
          </div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">抵抗</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="t in pet.detail.restrain_resist" :key="t" class="badge bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{{ t }}</span>
            <span v-if="!pet.detail.restrain_resist?.length" class="text-muted">无</span>
          </div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">被抵抗</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="t in pet.detail.restrain_resisted" :key="t" class="badge bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">{{ t }}</span>
            <span v-if="!pet.detail.restrain_resisted?.length" class="text-muted">无</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 技能列表 -->
    <div class="card" v-if="pet.skills?.length">
      <h2 class="font-medium text-base mb-3">精灵技能</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-muted text-xs border-b border-surface-light-border dark:border-surface-dark-border">
              <th class="py-2 px-2 w-10"></th>
              <th class="py-2 px-2 w-14">等级</th>
              <th class="py-2 px-2">名称</th>
              <th class="py-2 px-2">属性</th>
              <th class="py-2 px-2">类型</th>
              <th class="py-2 px-2 w-14">能耗</th>
              <th class="py-2 px-2 w-14">威力</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="skill in pet.skills" :key="skill.id"
              class="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-gray-50 dark:hover:bg-white/3">
              <td class="py-1.5 px-2">
                <img v-if="skill.skill_icon" :src="skill.skill_icon" class="w-6 h-6 object-contain" loading="lazy" />
              </td>
              <td class="py-1.5 px-2 text-muted">{{ skill.level }}</td>
              <td class="py-1.5 px-2 font-medium">{{ skill.name }}</td>
              <td class="py-1.5 px-2">
                <span class="flex items-center gap-1" v-if="elemMap[skill.element]">
                  <img :src="elemMap[skill.element].icon" class="w-4 h-4" />
                  <span class="text-xs" :style="{ color: elemMap[skill.element].color }">{{ skill.element }}</span>
                </span>
                <span v-else class="text-muted text-xs">{{ skill.element }}</span>
              </td>
              <td class="py-1.5 px-2 text-muted">{{ skill.type }}</td>
              <td class="py-1.5 px-2">{{ skill.cost }}</td>
              <td class="py-1.5 px-2">{{ skill.power }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi } from '@/api'

const route = useRoute()
const router = useRouter()
const pet = ref(null)
const elemMap = ref({}) // name -> {icon, color}

async function loadPet(uid) {
  const [petData, elemData] = await Promise.all([
    petsApi.get(uid),
    elementsApi.list(),
  ])
  pet.value = petData
  const map = {}
  for (const e of elemData.elements) {
    map[e.name] = { icon: e.icon, color: e.color }
  }
  elemMap.value = map
}

function switchVariant(uid) {
  router.replace(`/pets/${uid}`)
  loadPet(uid)
}

const statsList = [
  { key: 'hp', label: '生命' },
  { key: 'atk', label: '物攻' },
  { key: 'matk', label: '魔攻' },
  { key: 'def', label: '物防' },
  { key: 'mdef', label: '魔防' },
  { key: 'speed', label: '速度' },
  { key: 'total', label: '总计' },
]

onMounted(() => loadPet(route.params.uid))
</script>

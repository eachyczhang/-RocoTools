<template>
  <div v-if="skill">
    <!-- 返回 -->
    <router-link to="/skills" class="text-sm sm:text-base text-muted hover:text-primary-500 mb-3 sm:mb-4 inline-block">← 返回技能列表</router-link>

    <!-- 技能卡片 -->
    <div class="card flex flex-col sm:flex-row gap-4 sm:gap-5 lg:gap-6 mb-4 sm:mb-5 lg:mb-6">
      <img v-if="skill.icon_url" :src="skill.icon_url"
        class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain mx-auto sm:mx-0 flex-shrink-0" loading="lazy" />
      <img v-else-if="skill.element_icon" :src="skill.element_icon"
        class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain mx-auto sm:mx-0 flex-shrink-0" loading="lazy" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 justify-center sm:justify-start flex-wrap">
          <h1 class="font-roco text-2xl sm:text-3xl text-primary-500">{{ skill.name }}</h1>
          <span v-if="skill.element_name" class="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-xs sm:text-sm"
            :style="{ background: skill.element_color + '18', color: skill.element_color }">
            <img v-if="skill.element_icon" :src="skill.element_icon" class="w-5 h-5 sm:w-6 sm:h-6" />
            {{ skill.element_name }}
          </span>
          <span class="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-xs sm:text-sm font-medium"
            :style="{ background: categoryColor(skill.category) + '15', color: categoryColor(skill.category) }">
            {{ skill.category }}
          </span>
        </div>

        <!-- 数值 -->
        <div class="flex items-center gap-4 sm:gap-6 mb-3 sm:mb-4 justify-center sm:justify-start">
          <div class="text-center">
            <div class="text-xs sm:text-sm text-muted">能耗</div>
            <div class="text-lg sm:text-xl font-bold">{{ skill.cost || 0 }}</div>
          </div>
          <div class="text-center">
            <div class="text-xs sm:text-sm text-muted">威力</div>
            <div class="text-lg sm:text-xl font-bold">{{ skill.power || 0 }}</div>
          </div>
          <div v-if="skill.version" class="text-center">
            <div class="text-xs sm:text-sm text-muted">版本</div>
            <div class="text-lg sm:text-xl font-bold">{{ skill.version }}</div>
          </div>
        </div>

        <!-- 描述 -->
        <div class="text-sm sm:text-base leading-relaxed">
          <SkillDescription :text="skill.description" />
        </div>
      </div>
    </div>

    <!-- 可学习精灵（分类展示） -->
    <div class="card" v-if="skill.learners && skill.learners.length">
      <h2 class="font-roco text-base sm:text-lg text-primary-500 mb-3 sm:mb-4">可学习精灵 <span class="text-sm text-muted font-normal">({{ skill.learners.length }})</span></h2>

      <div v-for="group in learnerGroups" :key="group.type" v-show="group.pets.length" class="mb-4 sm:mb-6 last:mb-0">
        <h3 class="font-roco text-sm sm:text-base mb-2 sm:mb-3 text-muted">{{ group.label }} ({{ group.pets.length }})</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          <router-link v-for="pet in group.pets" :key="pet.uid"
            :to="`/pets/${pet.uid}`"
            class="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0" loading="lazy" />
            <div class="min-w-0">
              <div class="text-sm sm:text-base font-medium truncate">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { skillsApi } from '@/api'
import SkillDescription from '@/components/user/SkillDescription.vue'
import { categoryColor } from '@/constants/categoryColors'

const route = useRoute()
const skill = ref(null)

// 将三个分类合并为统一结构，消除重复模板
const learnerGroups = computed(() => {
  if (!skill.value?.learners) return []
  const map = { skills: [], bloodline_skills: [], learnable_stones: [] }
  for (const pet of skill.value.learners) {
    if (map[pet.skill_type]) map[pet.skill_type].push(pet)
  }
  return [
    { type: 'skills', label: '自然升级学习', pets: map.skills },
    { type: 'bloodline_skills', label: '血脉学习', pets: map.bloodline_skills },
    { type: 'learnable_stones', label: '技能石学习', pets: map.learnable_stones },
  ]
})

onMounted(async () => {
  skill.value = await skillsApi.get(route.params.uid)
})
</script>

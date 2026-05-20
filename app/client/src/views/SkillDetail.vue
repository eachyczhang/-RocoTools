<template>
  <div v-if="skill">
    <!-- 返回 -->
    <router-link to="/skills" class="text-sm md:text-base text-muted hover:text-primary-500 mb-3 md:mb-4 inline-block">← 返回技能列表</router-link>

    <!-- 技能卡片 -->
    <div class="card flex flex-col md:flex-row gap-4 md:gap-6 mb-4 md:mb-6">
      <img v-if="skill.icon_url" :src="skill.icon_url"
        class="w-16 h-16 md:w-24 md:h-24 object-contain mx-auto md:mx-0 flex-shrink-0" loading="lazy" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 justify-center md:justify-start flex-wrap">
          <h1 class="font-roco text-2xl md:text-3xl text-primary-500">{{ skill.name }}</h1>
          <span v-if="skill.element_name" class="inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded text-xs md:text-sm"
            :style="{ background: skill.element_color + '18', color: skill.element_color }">
            <img v-if="skill.element_icon" :src="skill.element_icon" class="w-5 h-5 md:w-6 md:h-6" />
            {{ skill.element_name }}
          </span>
          <span class="px-2 py-0.5 md:px-2.5 md:py-1 rounded text-xs md:text-sm font-medium"
            :style="{ background: categoryColor(skill.category) + '15', color: categoryColor(skill.category) }">
            {{ skill.category }}
          </span>
        </div>

        <!-- 数值 -->
        <div class="flex items-center gap-4 md:gap-6 mb-3 md:mb-4 justify-center md:justify-start">
          <div class="text-center">
            <div class="text-xs md:text-sm text-muted">能耗</div>
            <div class="text-lg md:text-xl font-bold">{{ skill.cost || 0 }}</div>
          </div>
          <div class="text-center">
            <div class="text-xs md:text-sm text-muted">威力</div>
            <div class="text-lg md:text-xl font-bold">{{ skill.power || 0 }}</div>
          </div>
          <div v-if="skill.version" class="text-center">
            <div class="text-xs md:text-sm text-muted">版本</div>
            <div class="text-lg md:text-xl font-bold">{{ skill.version }}</div>
          </div>
        </div>

        <!-- 描述 -->
        <div class="text-sm md:text-base leading-relaxed">
          <SkillDescription :text="skill.description" />
        </div>
      </div>
    </div>

    <!-- 可学习精灵（分类展示） -->
    <div class="card" v-if="skill.learners && skill.learners.length">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">可学习精灵 <span class="text-sm text-muted font-normal">({{ skill.learners.length }})</span></h2>

      <!-- 自然升级学习 -->
      <div v-if="learnersByType.skills.length" class="mb-4 md:mb-6">
        <h3 class="font-roco text-sm md:text-base mb-2 md:mb-3 text-muted">自然升级学习 ({{ learnersByType.skills.length }})</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          <router-link v-for="pet in learnersByType.skills" :key="pet.uid"
            :to="`/pets/${pet.uid}`"
            class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
            <div class="min-w-0">
              <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 血脉学习 -->
      <div v-if="learnersByType.bloodline_skills.length" class="mb-4 md:mb-6">
        <h3 class="font-roco text-sm md:text-base mb-2 md:mb-3 text-muted">血脉学习 ({{ learnersByType.bloodline_skills.length }})</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          <router-link v-for="pet in learnersByType.bloodline_skills" :key="pet.uid"
            :to="`/pets/${pet.uid}`"
            class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
            <div class="min-w-0">
              <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 技能石学习 -->
      <div v-if="learnersByType.learnable_stones.length">
        <h3 class="font-roco text-sm md:text-base mb-2 md:mb-3 text-muted">技能石学习 ({{ learnersByType.learnable_stones.length }})</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          <router-link v-for="pet in learnersByType.learnable_stones" :key="pet.uid"
            :to="`/pets/${pet.uid}`"
            class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
            <div class="min-w-0">
              <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
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
import SkillDescription from '@/components/SkillDescription.vue'

const route = useRoute()
const skill = ref(null)

const learnersByType = computed(() => {
  if (!skill.value || !skill.value.learners) return { skills: [], bloodline_skills: [], learnable_stones: [] }
  const map = { skills: [], bloodline_skills: [], learnable_stones: [] }
  for (const pet of skill.value.learners) {
    if (map[pet.skill_type]) {
      map[pet.skill_type].push(pet)
    }
  }
  return map
})

const categoryColors = {
  '物攻': '#FF9636',
  '魔攻': '#9446EC',
  '防御': '#3F89B4',
  '状态': '#2E7D32',
}

function categoryColor(type) {
  return categoryColors[type] || '#6B7280'
}

onMounted(async () => {
  skill.value = await skillsApi.get(route.params.uid)
})
</script>

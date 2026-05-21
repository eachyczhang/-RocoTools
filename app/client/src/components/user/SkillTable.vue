<template>
  <div :class="title ? 'card mb-6' : ''">
    <h2 v-if="title" class="font-roco text-base md:text-lg text-primary-500 mb-3">{{ title }}</h2>
    <div class="space-y-2 md:space-y-2.5">
      <div v-for="skill in skills" :key="skill.id"
        class="flex items-start gap-2 md:gap-4 p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
        <!-- 图标 -->
        <img v-if="skill.skill_icon" :src="skill.skill_icon"
          class="w-8 h-8 md:w-10 md:h-10 object-contain rounded flex-shrink-0 mt-0.5" loading="lazy" />
        <div v-else class="w-8 h-8 md:w-10 md:h-10 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>

        <!-- 主体 -->
        <div class="flex-1 min-w-0">
          <!-- 第一行：名称 + 属性 + 类型 -->
          <div class="flex items-center gap-1.5 md:gap-2.5 flex-wrap">
            <router-link v-if="skill.skill_ref_uid" :to="`/skills/${skill.skill_ref_uid}`"
              class="font-medium text-sm md:text-base hover:text-primary-500 transition-colors">{{ skill.name }}</router-link>
            <span v-else class="font-medium text-sm md:text-base">{{ skill.name }}</span>
            <span v-if="elemMap[skill.element]" class="inline-flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 rounded text-xs md:text-sm"
              :style="{ background: elemMap[skill.element].color + '18', color: elemMap[skill.element].color }">
              <img :src="elemMap[skill.element].icon" class="w-4 h-4 md:w-5 md:h-5" />
              <span class="hidden sm:inline">{{ skill.element }}</span>
            </span>
            <span v-else-if="skill.element" class="text-xs md:text-sm text-muted px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10">{{ skill.element }}</span>
            <span v-if="skill.type" class="text-xs md:text-sm font-medium px-1.5 py-0.5 rounded"
              :style="{ background: categoryColor(skill.type) + '15', color: categoryColor(skill.type) }">
              {{ skill.type }}
            </span>
          </div>
          <!-- 第二行：描述 -->
          <SkillDescription v-if="skill.description" :text="skill.description" class="text-xs md:text-sm text-muted mt-1 md:mt-1.5 line-clamp-2 md:line-clamp-none" />
        </div>

        <!-- 右侧数据 -->
        <div class="flex items-center gap-2 md:gap-4 flex-shrink-0 text-xs md:text-sm text-center">
          <div v-if="skill.level" class="w-8 md:w-12">
            <div class="text-muted text-[10px] md:text-xs">等级</div>
            <div class="font-medium text-sm md:text-base">{{ skill.level }}</div>
          </div>
          <div class="w-8 md:w-12">
            <div class="text-muted text-[10px] md:text-xs">能耗</div>
            <div class="font-medium text-sm md:text-base">{{ skill.cost || '-' }}</div>
          </div>
          <div class="w-8 md:w-12">
            <div class="text-muted text-[10px] md:text-xs">威力</div>
            <div class="font-medium text-sm md:text-base">{{ skill.power || '-' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SkillDescription from '@/components/user/SkillDescription.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  skills: {
    type: Array,
    required: true,
  },
  elemMap: {
    type: Object,
    default: () => ({}),
  },
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
</script>

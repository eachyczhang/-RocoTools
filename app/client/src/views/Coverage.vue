<template>
  <div>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4 md:mb-5">打击面分析</h1>

    <!-- 技能格子 -->
    <div class="card mb-4 md:mb-6">
      <p class="text-xs md:text-sm text-muted mb-3 md:mb-4">选择攻击技能的属性（最多4个），分析可打击面 <span class="text-xs opacity-70">· 含血脉技能</span></p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
        <div v-for="(slot, idx) in slots" :key="idx"
          class="relative rounded-xl border-2 p-3 md:p-4 flex flex-col items-center justify-center gap-1.5 md:gap-2 min-h-[90px] md:min-h-[120px] transition-all"
          :class="slot
            ? 'shadow-md'
            : 'border-dashed border-gray-300 dark:border-gray-600'"
          :style="slot ? { background: slot.color + '20', borderColor: slot.color } : {}">
          <template v-if="slot">
            <img :src="slot.icon" class="w-9 h-9 md:w-12 md:h-12" />
            <span class="text-sm md:text-base font-bold" :style="{ color: slot.color }">{{ slot.name }}</span>
            <button @click="clearSlot(idx)"
              class="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs text-muted hover:text-red-500 hover:bg-red-50">
              ✕
            </button>
          </template>
          <template v-else>
            <span class="text-xl md:text-2xl text-muted opacity-40">+</span>
            <span class="text-[10px] md:text-xs text-muted">技能{{ idx + 1 }}</span>
          </template>
        </div>
      </div>

      <!-- 属性选择 -->
      <p class="text-xs text-muted mb-2">点击属性填入空格</p>
      <div class="flex flex-wrap gap-1.5 md:gap-2">
        <button v-for="elem in elements" :key="elem.id"
          @click="addElement(elem)"
          class="w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition-colors relative"
          :class="isSelected(elem)
            ? 'ring-2 ring-offset-1 ring-green-500 bg-green-50 dark:bg-green-500/10'
            : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'"
          :title="elem.name"
          :disabled="isSelected(elem)">
          <img :src="elem.icon" class="w-6 h-6 md:w-8 md:h-8" :alt="elem.name" :class="isSelected(elem) ? 'opacity-50' : ''" />
          <span v-if="isSelected(elem)" class="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-green-500 text-white text-[9px] md:text-[10px] flex items-center justify-center font-bold">✓</span>
        </button>
      </div>
    </div>

    <!-- 分析结果 -->
    <div class="card" v-if="selectedElements.length">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">
        打击面结果
        <span class="text-xs md:text-sm text-muted font-normal ml-2">{{ coveredElems.length }} / {{ elements.length }} 属性可克制</span>
      </h2>

      <!-- 可克制 -->
      <div v-if="coveredElems.length" class="mb-3 md:mb-4">
        <p class="text-xs md:text-sm text-muted mb-2">可有效克制</p>
        <div class="flex flex-wrap gap-1.5 md:gap-2">
          <span v-for="item in coveredElems" :key="item.name"
            class="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full"
            :style="{ background: item.color + '18' }"
            :title="item.name + '（来自：' + item.from.join('、') + '）'">
            <img :src="item.icon" class="w-5 h-5 md:w-7 md:h-7" />
          </span>
        </div>
      </div>

      <!-- 无法克制 -->
      <div v-if="uncoveredElems.length">
        <p class="text-xs md:text-sm text-muted mb-2">无法克制</p>
        <div class="flex flex-wrap gap-1.5 md:gap-2">
          <span v-for="item in uncoveredElems" :key="item.name"
            class="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full opacity-50"
            :style="{ background: item.color + '18' }"
            :title="item.name">
            <img :src="item.icon" class="w-5 h-5 md:w-7 md:h-7" />
          </span>
        </div>
      </div>
    </div>

    <!-- 可组合精灵 - 自学 -->
    <div class="card mt-4 md:mt-6" v-if="matchingPets.normal && matchingPets.normal.length">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">
        可组合此打击面的精灵
        <span class="text-xs md:text-sm text-muted font-normal ml-2">({{ matchingPets.normal.length }})</span>
      </h2>
      <p class="text-xs text-muted mb-2 md:mb-3">通过自然升级 + 技能石即可凑齐</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
        <router-link v-for="pet in matchingPets.normal" :key="pet.uid"
          :to="{ path: `/pets/${pet.uid}`, query: { coverage: selectedElementNames.join(',') } }"
          class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
          <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
          <div class="min-w-0">
            <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
            <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
              <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
              <span class="text-xs md:text-sm" :style="{ color: pet.element_color }">{{ pet.element_name }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 可组合精灵 - 需要血脉（按血脉属性分组） -->
    <div class="card mt-4 md:mt-6" v-if="matchingPets.bloodline && matchingPets.bloodline.length">
      <h2 class="font-roco text-base md:text-lg text-primary-500 mb-3 md:mb-4">
        需修改血脉才可组合
        <span class="text-xs md:text-sm text-muted font-normal ml-2">({{ matchingPets.bloodline.length }})</span>
      </h2>
      <p class="text-xs text-muted mb-3 md:mb-4">部分属性攻击技能需要通过血脉学习获得，按所需血脉属性分类</p>

      <div v-for="group in bloodlineGroups" :key="group.element" class="mb-3 md:mb-4 last:mb-0">
        <button @click="toggleGroup(group.element)"
          class="flex items-center gap-2 mb-2 md:mb-3 w-full text-left hover:opacity-80 transition-opacity">
          <span class="text-xs text-muted transition-transform" :class="expandedGroups[group.element] ? 'rotate-90' : ''">▶</span>
          <img v-if="group.icon" :src="group.icon" class="w-5 h-5 md:w-6 md:h-6" />
          <h3 class="text-sm md:text-base font-medium" :style="{ color: group.color }">{{ group.element }}系血脉</h3>
          <span class="text-xs text-muted">({{ group.pets.length }})</span>
        </button>
        <div v-show="expandedGroups[group.element]" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          <router-link v-for="pet in group.pets" :key="pet.uid"
            :to="{ path: `/pets/${pet.uid}`, query: { coverage: selectedElementNames.join(','), bloodline: group.element } }"
            class="flex items-center gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
            <img v-if="pet.image_url" :src="pet.image_url" class="w-10 h-10 md:w-14 md:h-14 object-contain flex-shrink-0" loading="lazy" />
            <div class="min-w-0">
              <div class="text-sm md:text-base font-medium truncate">{{ pet.name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5 md:mt-1">
                <img v-if="pet.element_icon" :src="pet.element_icon" class="w-4 h-4 md:w-5 md:h-5" />
                <span class="text-xs md:text-sm" :style="{ color: pet.element_color }">{{ pet.element_name }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <div class="card mt-4 md:mt-6" v-else-if="selectedElements.length && (!matchingPets.normal || !matchingPets.normal.length) && (!matchingPets.bloodline || !matchingPets.bloodline.length)">
      <p class="text-xs md:text-sm text-muted">没有精灵能同时学会这些属性的攻击技能</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { elementsApi, petsApi } from '@/api'

const elements = ref([])
const slots = ref([null, null, null, null])
const matchingPets = ref({ normal: [], bloodline: [] })
const expandedGroups = ref({})

function toggleGroup(elemName) {
  expandedGroups.value[elemName] = !expandedGroups.value[elemName]
}

const selectedElements = computed(() => slots.value.filter(Boolean))
const selectedElementNames = computed(() => selectedElements.value.map(e => e.name))

// 血脉精灵按所需血脉属性分组
const bloodlineGroups = computed(() => {
  const pets = matchingPets.value.bloodline || []
  if (!pets.length) return []
  const groupMap = {}
  for (const pet of pets) {
    const elemName = pet.bloodline_elements[0]
    if (!groupMap[elemName]) {
      const elemInfo = elements.value.find(e => e.name === elemName)
      groupMap[elemName] = {
        element: elemName,
        icon: elemInfo?.icon || '',
        color: elemInfo?.color || '#6B7280',
        pets: [],
      }
    }
    groupMap[elemName].pets.push(pet)
  }
  return Object.values(groupMap)
})

// 监听选中属性变化，实时查询匹配精灵
watch(selectedElements, async (newVal) => {
  if (!newVal.length) {
    matchingPets.value = { normal: [], bloodline: [] }
    return
  }
  const names = newVal.map(e => e.name)
  matchingPets.value = await petsApi.coverage(names)
}, { deep: true })

function isSelected(elem) {
  return slots.value.some(s => s && s.id === elem.id)
}

function addElement(elem) {
  if (isSelected(elem)) return
  const idx = slots.value.findIndex(s => s === null)
  if (idx === -1) return
  slots.value[idx] = { id: elem.id, name: elem.name, icon: elem.icon, color: elem.color, strong_against: elem.strong_against }
}

function clearSlot(idx) {
  slots.value[idx] = null
}

// 计算打击面
const coveredElems = computed(() => {
  if (!selectedElements.value.length || !elements.value.length) return []
  const covered = []
  for (const defender of elements.value) {
    const from = []
    for (const atk of selectedElements.value) {
      if (atk.strong_against?.some(e => e.id === defender.id || e.name === defender.name)) {
        from.push(atk.name)
      }
    }
    if (from.length) {
      covered.push({ name: defender.name, icon: defender.icon, color: defender.color, from })
    }
  }
  return covered
})

const uncoveredElems = computed(() => {
  if (!selectedElements.value.length || !elements.value.length) return []
  const coveredIds = new Set(coveredElems.value.map(e => e.name))
  return elements.value
    .filter(e => !coveredIds.has(e.name))
    .map(e => ({ name: e.name, icon: e.icon, color: e.color }))
})

onMounted(async () => {
  const data = await elementsApi.list()
  elements.value = data.elements
})
</script>

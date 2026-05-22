<template>
  <div>
    <!-- Loading -->
    <div v-if="!loaded" class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!sortedList.length" class="text-center mt-20">
      <div class="text-4xl mb-3">📰</div>
      <p class="text-muted">暂无皮卡月刊数据</p>
    </div>

    <template v-else>
      <!-- Period selector (horizontal scroll tabs) -->
      <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto mb-4 sm:mb-5 pb-1 pt-3">
        <button
          v-for="item in sortedList"
          :key="item.id"
          @click="selectPeriod(item)"
          class="period-tab"
          :class="currentItem && currentItem.id === item.id ? 'period-tab-active' : 'period-tab-inactive'"
        >
          <span class="period-tab-name">{{ item.name }}</span>
          <span class="period-tab-date">{{ item.period }}</span>
          <span v-if="statusText(item) === '当期'" class="period-tab-current">
            <span class="w-1 h-1 rounded-full bg-white/80 animate-pulse"></span>
            当前
          </span>
        </button>
      </div>

      <!-- Current period content -->
      <div v-if="currentItem" class="space-y-4 sm:space-y-5">
        <!-- Header info -->
        <div class="flex items-center gap-2 flex-wrap">
          <h1 class="font-roco text-2xl sm:text-3xl text-primary-500">{{ currentItem.name }}</h1>
          <span :class="statusClass(currentItem)" class="status-tag">{{ statusText(currentItem) }}</span>
          <span v-if="currentItem.start_date || currentItem.end_date" class="text-sm text-muted ml-1">
            {{ currentItem.start_date || '?' }} ~ {{ currentItem.end_date || '?' }}
          </span>
        </div>

        <!-- Concept art: horizontal banners (16:9) -->
        <div v-if="currentItem.concept_male || currentItem.concept_female" class="concept-row">
          <div v-if="currentItem.concept_male" class="concept-card" @click="openPreview(currentItem.concept_male)">
            <img :src="currentItem.concept_male" class="concept-img" />
            <span class="concept-badge male">♂ 男装概念</span>
          </div>
          <div v-if="currentItem.concept_female" class="concept-card" @click="openPreview(currentItem.concept_female)">
            <img :src="currentItem.concept_female" class="concept-img" />
            <span class="concept-badge female">♀ 女装概念</span>
          </div>
        </div>

        <!-- Pets section: clickable pet tabs + costume display -->
        <div v-if="currentItem.pets && currentItem.pets.length">
          <!-- Pet selector: clickable icons -->
          <div class="pet-selector">
            <button
              v-for="pet in currentItem.pets"
              :key="pet.pet_uid"
              @click="selectPet(pet)"
              class="pet-tab"
              :class="selectedPet && selectedPet.pet_uid === pet.pet_uid ? 'pet-tab-active' : 'pet-tab-inactive'"
            >
              <img v-if="pet.pet_icon" :src="pet.pet_icon" class="pet-tab-icon" />
              <span class="pet-tab-name">{{ pet.pet_name }}</span>
            </button>
          </div>

          <!-- Selected pet costume display -->
          <div v-if="selectedPet" class="costume-display">
            <div v-if="selectedPet.locke_male || selectedPet.locke_female" class="costume-pair">
              <div v-if="selectedPet.locke_male" class="costume-card" @click="openPreview(selectedPet.locke_male)">
                <img :src="selectedPet.locke_male" class="costume-img" />
                <span class="costume-label male">♂ 男洛克</span>
              </div>
              <div v-if="selectedPet.locke_female" class="costume-card" @click="openPreview(selectedPet.locke_female)">
                <img :src="selectedPet.locke_female" class="costume-img" />
                <span class="costume-label female">♀ 女洛克</span>
              </div>
            </div>
            <div v-else class="text-center py-10 text-muted">
              <p>暂无「{{ selectedPet.pet_name }}」的时装图片</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pikaApi } from '@/api'
import { useImagePreview } from '@/composables/useImagePreview'

const { openPreview } = useImagePreview()

const loaded = ref(false)
const list = ref([])
const currentItem = ref(null)
const selectedPet = ref(null)

// Sort: future first, then current, then past
const sortedList = computed(() => {
  if (!list.value.length) return []
  const today = new Date().toISOString().slice(0, 10)

  const items = [...list.value]
  const future = []
  const current = []
  const past = []

  for (const item of items) {
    if (!item.start_date && !item.end_date) {
      past.push(item)
    } else if (item.start_date && item.start_date > today) {
      future.push(item)
    } else if (item.end_date && item.end_date < today) {
      past.push(item)
    } else {
      current.push(item)
    }
  }

  future.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
  current.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
  past.sort((a, b) => (b.end_date || b.start_date || '').localeCompare(a.end_date || a.start_date || ''))

  return [...future, ...current, ...past]
})

function statusText(item) {
  const today = new Date().toISOString().slice(0, 10)
  if (!item.start_date && !item.end_date) return '未知'
  if (item.start_date && item.start_date > today) return '即将上线'
  if (item.end_date && item.end_date < today) return '已结束'
  return '当期'
}

function statusClass(item) {
  const text = statusText(item)
  if (text === '当期') return 'status-current'
  if (text === '即将上线') return 'status-future'
  return 'status-past'
}

function selectPeriod(item) {
  currentItem.value = item
  // Auto-select first pet
  if (item.pets && item.pets.length) {
    selectedPet.value = item.pets[0]
  } else {
    selectedPet.value = null
  }
}

function selectPet(pet) {
  selectedPet.value = pet
}

// Find default period (current > latest)
function findDefaultPeriod() {
  const today = new Date().toISOString().slice(0, 10)
  // Find current period
  const current = sortedList.value.find(item => {
    if (!item.start_date && !item.end_date) return false
    const started = !item.start_date || item.start_date <= today
    const notEnded = !item.end_date || item.end_date >= today
    return started && notEnded
  })
  if (current) return current

  // No current, find latest (last future or first past)
  const futureEnd = sortedList.value.findIndex(item => {
    if (!item.start_date) return true
    return item.start_date <= today
  })
  if (futureEnd > 0) return sortedList.value[futureEnd - 1]
  return sortedList.value[0] || null
}

onMounted(async () => {
  try {
    const res = await pikaApi.list()
    list.value = res.monthlies || []
  } catch (err) {
    console.error('[PikaMonthlies] Load failed:', err)
  }
  loaded.value = true

  if (sortedList.value.length) {
    const defaultItem = findDefaultPeriod()
    if (defaultItem) {
      selectPeriod(defaultItem)
    }
  }
})
</script>

<style scoped>
/* Period tabs */
.period-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid transparent;
}
@media (min-width: 640px) {
  .period-tab { padding: 0.6rem 1rem; }
}

.period-tab-active {
  background: rgba(214, 159, 35, 0.1);
  border-color: rgba(214, 159, 35, 0.3);
  color: var(--color-primary-600, #B8860B);
}
:root.dark .period-tab-active {
  background: rgba(255, 202, 40, 0.12);
  border-color: rgba(255, 202, 40, 0.3);
  color: var(--color-primary-400, #FFCA28);
}

.period-tab-inactive {
  color: var(--color-text-muted, #6b7280);
}
.period-tab-inactive:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
}
:root.dark .period-tab-inactive:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.period-tab-name {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.3;
}
@media (min-width: 640px) {
  .period-tab-name { font-size: 0.85rem; }
}

.period-tab-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-top: 0.15rem;
}
:root.dark .period-tab-date {
  color: #d1d5db;
}
.period-tab-active .period-tab-date {
  color: var(--color-primary-600, #B8860B);
  font-weight: 600;
}
:root.dark .period-tab-active .period-tab-date {
  color: var(--color-primary-400, #FFCA28);
}

.period-tab-current {
  position: absolute;
  top: -0.4rem;
  right: -0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  background: var(--color-primary-500, #D69F23);
  color: white;
}

/* Status tags */
.status-tag {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}
.status-current {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
:root.dark .status-current {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.3);
}
.status-future {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}
:root.dark .status-future {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.3);
}
.status-past {
  background: rgba(156, 163, 175, 0.1);
  color: #6b7280;
  border: 1px solid rgba(156, 163, 175, 0.2);
}
:root.dark .status-past {
  background: rgba(156, 163, 175, 0.15);
  color: #d1d5db;
  border-color: rgba(156, 163, 175, 0.3);
}

/* Concept art row */
.concept-row {
  display: flex;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .concept-row { gap: 1rem; }
}

.concept-card {
  position: relative;
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.25s;
  background: #f3f4f6;
}
:root.dark .concept-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.concept-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary-300, #FFD54F);
}
:root.dark .concept-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  border-color: var(--color-primary-500, #D69F23);
}

.concept-img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  display: block;
}

.concept-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 5px;
  backdrop-filter: blur(6px);
  color: white;
}
.concept-badge.male { background: rgba(59, 130, 246, 0.8); }
.concept-badge.female { background: rgba(236, 72, 153, 0.8); }

/* Pet selector */
.pet-selector {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}
@media (min-width: 640px) {
  .pet-selector { gap: 0.75rem; }
}

.pet-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 9999px;
  border: 1.5px solid transparent;
  transition: all 0.2s;
  flex-shrink: 0;
  cursor: pointer;
}
@media (min-width: 640px) {
  .pet-tab { padding: 0.5rem 1rem; gap: 0.5rem; }
}

.pet-tab-active {
  background: rgba(214, 159, 35, 0.1);
  border-color: var(--color-primary-400, #FFCA28);
  box-shadow: 0 2px 8px rgba(214, 159, 35, 0.15);
}
:root.dark .pet-tab-active {
  background: rgba(255, 202, 40, 0.12);
  border-color: var(--color-primary-500, #D69F23);
}

.pet-tab-inactive {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
:root.dark .pet-tab-inactive {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}
.pet-tab-inactive:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.15);
}
:root.dark .pet-tab-inactive:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
}

.pet-tab-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
@media (min-width: 640px) {
  .pet-tab-icon { width: 32px; height: 32px; }
}

.pet-tab-name {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
@media (min-width: 640px) {
  .pet-tab-name { font-size: 0.85rem; }
}

/* Costume display area */
.costume-display {
  margin-top: 0.5rem;
}

.costume-pair {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
@media (min-width: 640px) {
  .costume-pair { gap: 1.5rem; }
}

.costume-card {
  position: relative;
  width: 100%;
  max-width: 280px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.25s;
  background: #f3f4f6;
}
:root.dark .costume-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
@media (min-width: 640px) {
  .costume-card { max-width: 320px; }
}
@media (min-width: 1024px) {
  .costume-card { max-width: 360px; }
}

.costume-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-300, #FFD54F);
}
:root.dark .costume-card:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
  border-color: var(--color-primary-500, #D69F23);
}

.costume-img {
  width: 100%;
  aspect-ratio: 9/16;
  object-fit: cover;
  display: block;
}

.costume-label {
  position: absolute;
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  color: white;
  backdrop-filter: blur(6px);
}
.costume-label.male { background: rgba(59, 130, 246, 0.8); }
.costume-label.female { background: rgba(236, 72, 153, 0.8); }
</style>

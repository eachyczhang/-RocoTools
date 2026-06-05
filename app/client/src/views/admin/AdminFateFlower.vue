
<template>
  <div>
    <router-link to="/admin/pika" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回皮卡月刊</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-pink-500 mb-4">🌸 命定花种技能配置 <span v-if="monthlyTitle" class="text-base text-muted font-normal">· {{ monthlyTitle }}</span></h1>

    <!-- Counter-picks toggle -->
    <div class="flex items-center gap-3 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="counterPicksEnabled" @change="toggleCounterPicks" class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer" />
        <span class="text-sm font-medium">启用反制推荐模块</span>
      </label>
      <span class="text-xs text-muted">（开启后用户端命定花种页面将显示反制推荐）</span>
    </div>

    <!-- Loading -->
    <div v-if="!loaded" class="text-muted text-center mt-20">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!allPets.length" class="text-center mt-20">
      <div class="text-4xl mb-3">🌸</div>
      <p class="text-muted">暂无命定花种精灵数据</p>
      <p class="text-xs text-muted mt-2">请先在皮卡月刊中配置精灵并同步活动</p>
    </div>

    <template v-else>
      <!-- Pet selector tabs with avatars (same as user page) -->
      <div class="border-b border-surface-light-border dark:border-surface-dark-border mb-5">
        <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-1 pt-1">
          <button
            v-for="pet in allPets"
            :key="pet.uid"
            @click="selectPet(pet)"
            class="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all cursor-pointer flex-shrink-0"
            :class="selectedPet && selectedPet.uid === pet.uid
              ? 'bg-pink-100 dark:bg-pink-500/20 ring-2 ring-pink-400 dark:ring-pink-500/50'
              : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 opacity-70 hover:opacity-100'"
          >
            <img :src="pet.icon" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain" :alt="pet.name" />
            <span class="text-xs sm:text-sm font-medium whitespace-nowrap mt-1">{{ pet.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selected pet detail + skill config -->
      <div v-if="selectedPet && petDetail" class="space-y-5">
        <!-- Pet info card (compact) -->
        <div class="card">
          <div class="flex items-center gap-4">
            <img :src="petDetail.detail?.image_default || petDetail.image_url" class="w-20 h-20 object-contain flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h2 class="font-roco text-lg">{{ petDetail.name }}</h2>
                <div class="flex items-center gap-1">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-4 h-4" />
                  <span class="text-xs">{{ petDetail.element_name }}</span>
                </div>
                <span class="text-muted text-xs">|</span>
                <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20">
                  <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-3 h-3" />
                  <span class="text-[10px] font-medium text-purple-600 dark:text-purple-400">血脉：{{ petDetail.element_name }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-1.5 text-xs">
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">种族值 <strong class="text-primary-500">{{ petDetail.total }}</strong></span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">生命 {{ petDetail.hp }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">物攻 {{ petDetail.atk }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">魔攻 {{ petDetail.matk }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">物防 {{ petDetail.def }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">魔防 {{ petDetail.mdef }}</span>
                <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">速度 {{ petDetail.speed }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Nature configuration -->
        <div class="card">
          <h3 class="font-roco text-base text-pink-500 mb-3 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            固定性格
          </h3>
          <div class="flex items-center gap-3">
            <select v-model="selectedNature" class="input text-sm w-48">
              <option value="">未配置</option>
              <option v-for="n in naturesList" :key="n.id" :value="n.name">
                {{ n.name }}（+{{ n.stat_up }} -{{ n.stat_down }}）
              </option>
            </select>
            <button @click="saveNature" :disabled="savingNature" class="btn-primary px-4 py-1.5 text-xs font-medium">
              {{ savingNature ? '保存中...' : '保存性格' }}
            </button>
            <span v-if="selectedNature" class="text-xs text-muted">
              当前：<strong class="text-foreground">{{ selectedNature }}</strong>
            </span>
          </div>
        </div>

        <!-- Skill configuration -->
        <div class="card">
          <h3 class="font-roco text-base text-pink-500 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-pink-500"></span>
            技能配置
            <span class="text-xs font-normal text-muted">（最多 3 个，愿力冲击为固定技能无需配置）</span>
          </h3>

          <!-- 固定技能：愿力冲击 -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 mb-4">
            <img v-if="petDetail.element_icon" :src="petDetail.element_icon" class="w-8 h-8 object-contain rounded" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">愿力冲击</span>
                <span v-if="elemMap[petDetail.element_name]" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                  :style="{ background: elemMap[petDetail.element_name].color + '18', color: elemMap[petDetail.element_name].color }">
                  <img :src="elemMap[petDetail.element_name].icon" class="w-3.5 h-3.5" />
                  {{ petDetail.element_name }}
                </span>
              </div>
            </div>
            <span class="text-xs text-pink-500 font-medium px-2 py-1 rounded bg-pink-100 dark:bg-pink-500/20">固定技能</span>
          </div>

          <!-- 3 skill slots -->
          <div class="space-y-3">
            <div v-for="(slot, idx) in skillSlots" :key="idx"
              class="rounded-xl border overflow-hidden"
              :class="slot.skill_ref_uid ? 'border-green-200 dark:border-green-500/30' : 'border-gray-200 dark:border-gray-700'">
              <!-- 已选技能 -->
              <div v-if="slot.skill_ref_uid" class="flex items-center gap-3 px-4 py-3">
                <span class="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center bg-green-100 dark:bg-green-500/20 text-green-600 flex-shrink-0">{{ idx + 1 }}</span>
                <img v-if="slot.skill_icon" :src="slot.skill_icon" class="w-8 h-8 rounded object-contain flex-shrink-0" />
                <img v-else-if="slot.skill_element_icon" :src="slot.skill_element_icon" class="w-8 h-8 rounded object-contain flex-shrink-0" />
                <div v-else class="w-8 h-8 rounded bg-gray-200 dark:bg-white/10 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-medium text-sm">{{ slot.skill_name }}</span>
                    <span v-if="slot.skill_element" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px]"
                      :style="{ background: (slot.skill_element_color || '#999') + '15', color: slot.skill_element_color || '#999' }">
                      <img v-if="slot.skill_element_icon" :src="slot.skill_element_icon" class="w-3 h-3" />
                      {{ slot.skill_element }}
                    </span>
                    <span v-if="slot.skill_type" class="text-[10px] text-muted px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10">{{ slot.skill_type }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0 text-xs text-center">
                  <div class="w-10">
                    <div class="text-[9px] text-muted">能耗</div>
                    <div class="font-medium">{{ slot.skill_cost != null ? slot.skill_cost : '-' }}</div>
                  </div>
                  <div class="w-10">
                    <div class="text-[9px] text-muted">威力</div>
                    <div class="font-medium">{{ slot.skill_power || '-' }}</div>
                  </div>
                </div>
                <button @click="openPicker(idx)" class="text-xs text-primary-500 hover:underline flex-shrink-0 cursor-pointer">更换</button>
                <button @click="clearSlot(idx)" class="text-xs text-red-400 hover:text-red-600 flex-shrink-0 cursor-pointer">清除</button>
              </div>

              <!-- 未选技能 -->
              <div v-else class="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                @click="openPicker(idx)">
                <span class="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-muted flex-shrink-0">{{ idx + 1 }}</span>
                <span class="text-sm text-muted">点击选择技能</span>
                <span class="ml-auto text-xs text-primary-500">📋 从全部技能中选择</span>
              </div>
            </div>
          </div>

          <!-- SkillPicker 弹窗 -->
          <SkillPicker v-model:visible="pickerVisible" @select="onSkillSelected" />

          <!-- Save button -->
          <div class="flex justify-end mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button @click="saveSkillConfig" :disabled="saving" class="btn-primary px-6 py-2.5 text-sm font-medium">
              {{ saving ? '保存中...' : '💾 保存技能配置' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading pet detail -->
      <div v-else-if="selectedPet && !petDetail" class="text-muted text-center mt-10">
        <div class="animate-pulse">加载精灵信息...</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi, petsApi, elementsApi, naturesApi } from '@/api'
import { useModal } from '@/composables/useModal'
import SkillPicker from '@/components/shared/SkillPicker.vue'

const route = useRoute()
const modal = useModal()

const loaded = ref(false)
const monthlyPets = ref([])
const selectedPet = ref(null)
const petDetail = ref(null)
const elemMap = ref({})
const saving = ref(false)
const currentMonthlyPetId = ref(null)
const naturesList = ref([])
const selectedNature = ref('')
const savingNature = ref(false)
const counterPicksEnabled = ref(false)
const monthlyTitle = ref('')

const skillSlots = ref([
  { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
  { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
  { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
])

// SkillPicker 弹窗状态
const pickerVisible = ref(false)
const pickerTargetIdx = ref(0)

const allPets = computed(() => monthlyPets.value)

function openPicker(idx) {
  pickerTargetIdx.value = idx
  pickerVisible.value = true
}

function onSkillSelected(sk) {
  const idx = pickerTargetIdx.value
  skillSlots.value[idx] = {
    skill_ref_uid: sk.skill_ref_uid,
    skill_name: sk.skill_name,
    skill_source: 'all',
    skill_element: sk.skill_element,
    skill_type: sk.skill_type,
    skill_cost: sk.skill_cost,
    skill_power: sk.skill_power,
    skill_icon: sk.skill_icon,
    skill_element_icon: sk.skill_element_icon,
    skill_element_color: sk.skill_element_color,
  }
}

function clearSlot(idx) {
  skillSlots.value[idx] = { skill_ref_uid: '', skill_name: '', skill_source: 'all' }
}

async function selectPet(pet) {
  selectedPet.value = pet
  petDetail.value = null
  currentMonthlyPetId.value = null

  try {
    const detail = await petsApi.get(pet.uid)
    petDetail.value = detail
    await loadExistingConfig(pet.uid)
  } catch (err) {
    console.error('[AdminFateFlower] Load pet failed:', err)
  }
}

async function loadExistingConfig(petUid) {
  // Reset slots
  skillSlots.value = [
    { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
    { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
    { skill_ref_uid: '', skill_name: '', skill_source: 'all' },
  ]

  try {
    const monthlyId = route.query.monthlyId
    if (!monthlyId) return

    const skillRes = await adminApi.getFateFlowerSkills(monthlyId)
    const petConfig = (skillRes.pets || []).find(p => p.pet_uid === petUid)
    if (petConfig) {
      currentMonthlyPetId.value = petConfig.monthly_pet_id
      selectedNature.value = petConfig.fate_nature || ''
      const saved = petConfig.skills || []
      for (let i = 0; i < Math.min(saved.length, 3); i++) {
        // 从技能库加载完整信息
        let skillDetail = null
        if (saved[i].skill_ref_uid) {
          try {
            const { skillsApi } = await import('@/api')
            skillDetail = await skillsApi.get(saved[i].skill_ref_uid)
          } catch {}
        }
        skillSlots.value[i] = {
          skill_ref_uid: saved[i].skill_ref_uid,
          skill_name: saved[i].skill_name,
          skill_source: saved[i].skill_source || 'all',
          skill_element: skillDetail?.element_name || '',
          skill_type: skillDetail?.category || '',
          skill_cost: skillDetail?.cost ?? null,
          skill_power: skillDetail?.power ?? null,
          skill_icon: skillDetail?.icon_url || '',
          skill_element_icon: skillDetail?.element_icon || '',
          skill_element_color: skillDetail?.element_color || '',
        }
      }
    }
  } catch (err) {
    console.error('[AdminFateFlower] Load config failed:', err)
  }
}

async function saveNature() {
  if (!currentMonthlyPetId.value) {
    await modal.warning('提示', '未找到该精灵的月刊关联记录，请先在皮卡月刊中配置精灵')
    return
  }
  savingNature.value = true
  try {
    await adminApi.saveFateFlowerNature(currentMonthlyPetId.value, selectedNature.value)
    await modal.success('成功', '固定性格已保存')
  } catch (e) {
    await modal.alert('失败', '保存失败: ' + e.message)
  }
  savingNature.value = false
}

async function saveSkillConfig() {
  if (!currentMonthlyPetId.value) {
    await modal.warning('提示', '未找到该精灵的月刊关联记录，请先在皮卡月刊中配置精灵')
    return
  }

  const validSkills = skillSlots.value
    .filter(s => s.skill_ref_uid)
    .map((s, i) => ({
      skill_ref_uid: s.skill_ref_uid,
      skill_name: s.skill_name,
      skill_source: 'all',
      sort_order: i,
    }))

  saving.value = true
  try {
    await adminApi.saveFateFlowerSkills(currentMonthlyPetId.value, validSkills)
    await modal.success('成功', '技能配置已保存')
  } catch (e) {
    await modal.alert('失败', '保存失败: ' + e.message)
  }
  saving.value = false
}

onMounted(async () => {
  try {
    // Load counter-picks setting
    const settings = await adminApi.getSettings()
    const cpSetting = settings.find(s => s.key === 'counter_picks_enabled')
    counterPicksEnabled.value = cpSetting?.value === '1'
  } catch (e) {
    // Non-critical
  }

  try {
    // Load elements
    const elemRes = await elementsApi.list()
    const map = {}
    for (const e of (elemRes.elements || elemRes || [])) {
      map[e.name] = { icon: e.icon, color: e.color, name: e.name }
    }
    elemMap.value = map

    // Load natures
    const natRes = await naturesApi.list()
    naturesList.value = natRes.natures || []

    // Load monthly pets by monthlyId
    const monthlyId = route.query.monthlyId
    if (monthlyId) {
      const pikaRes = await adminApi.list('pika_monthlies', { limit: 100 })
      const monthly = (pikaRes.rows || []).find(r => String(r.id) === String(monthlyId))
      if (monthly) {
        monthlyTitle.value = monthly.title || `第${monthly.id}期`
        const pets = monthly.pets ? JSON.parse(monthly.pets) : []
        monthlyPets.value = pets.filter(p => p.uid || p.pet_uid).map(p => ({
          uid: p.pet_uid || p.uid,
          name: p.pet_name || p.name || p.pet_uid,
          icon: p.pet_icon || p.icon || '',
        }))
      }
    }
  } catch (err) {
    console.error('[AdminFateFlower] Load failed:', err)
  }
  loaded.value = true

  // Auto-select first pet
  if (allPets.value.length) {
    selectPet(allPets.value[0])
  }
})

async function toggleCounterPicks() {
  try {
    await adminApi.updateSetting('counter_picks_enabled', counterPicksEnabled.value ? '1' : '0', '反制推荐模块开关')
  } catch (e) {
    await modal.alert('失败', '保存设置失败: ' + e.message)
    counterPicksEnabled.value = !counterPicksEnabled.value // Revert
  }
}
</script>

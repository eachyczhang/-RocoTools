<template>
  <div v-if="loaded">
    <router-link to="/admin/pets" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回精灵列表</router-link>

    <div class="flex items-center gap-3 mb-4">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">{{ isNew ? '新增精灵' : pet.name }}</h1>
      <span v-if="!isNew" class="text-xs text-muted">{{ pet.uid }}</span>
    </div>

    <!-- 图片区域 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">图片管理</h2>

      <!-- 立绘预览 + 切换 -->
      <div class="flex flex-col items-center mb-4">
        <div class="w-40 h-40 md:w-52 md:h-52 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-3">
          <img v-if="currentPreviewUrl" :src="currentPreviewUrl" class="w-full h-full object-contain rounded-xl" />
          <span v-else class="text-sm text-muted">无图片</span>
        </div>
        <!-- 切换按钮 -->
        <div class="flex items-center gap-3">
          <button v-for="img in imageSlots" :key="img.type" @click="previewType = img.type"
            class="flex flex-col items-center gap-0.5 transition-opacity cursor-pointer"
            :class="previewType === img.type ? 'opacity-100' : 'opacity-40 hover:opacity-70'">
            <div class="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded flex items-center justify-center">
              <img v-if="img.url" :src="img.url" class="w-full h-full object-contain rounded" />
              <span v-else class="text-[8px] text-muted">无</span>
            </div>
            <span class="text-[10px] text-muted">{{ img.label }}</span>
          </button>
        </div>
      </div>

      <!-- 上传按钮组 -->
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <label v-for="img in uploadSlots" :key="img.type"
          class="text-center p-2 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer transition-colors">
          <div class="text-xs font-medium mb-1">{{ img.label }}</div>
          <div class="text-[10px] text-primary-500">上传</div>
          <input type="file" accept="image/*" class="hidden" @change="(e) => uploadImage(img.type, e)" />
        </label>
      </div>
    </div>

    <!-- 编号 + UID -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">编号信息 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-muted">精灵编号 <span class="text-red-500">*</span></label>
          <input v-model="form.pet_id" class="input w-full" placeholder="如 001, 040"
            :disabled="!isNew" @input="updateUid" />
        </div>
        <div v-if="isNew">
          <label class="text-xs text-muted">形态序号（多形态时填，如 1、2）</label>
          <input v-model="formVariant" class="input w-full" placeholder="留空=单形态" @input="updateUid" />
        </div>
        <div>
          <label class="text-xs text-muted">UID（自动生成）</label>
          <input :value="computedUid" class="input w-full bg-gray-50 dark:bg-white/10" disabled />
        </div>
      </div>
    </div>

    <!-- 基础信息 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">基础信息</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted">名称 <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">主属性 <span class="text-red-500">*</span></label>
          <select v-model="form.element_id" class="select w-full">
            <option :value="null" disabled>请选择属性</option>
            <option v-for="e in elements" :key="e.id" :value="e.id">
              {{ e.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-muted">副属性</label>
          <select v-model="form.sub_element_id" class="select w-full">
            <option :value="null">无</option>
            <option v-for="e in elements" :key="e.id" :value="e.id">
              {{ e.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-muted">版本</label>
          <input v-model="form.version" class="input w-full" />
        </div>
      </div>
    </div>

    <!-- 特性 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">特性 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted">特性名称 <span class="text-red-500">*</span></label>
          <input v-model="form.ability_name" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">特性描述 <span class="text-red-500">*</span></label>
          <input v-model="form.ability_desc" class="input w-full" />
        </div>
      </div>
      <div class="mt-3 flex items-center gap-4">
        <div class="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center">
          <img v-if="abilityIconUrl" :src="abilityIconUrl" class="w-full h-full object-contain rounded-lg" />
          <span v-else class="text-[8px] text-muted">无图标</span>
        </div>
        <label class="text-xs text-primary-500 hover:underline cursor-pointer">
          上传特性图标
          <input type="file" accept="image/*" class="hidden" @change="(e) => uploadImage('pet_ability', e)" />
        </label>
      </div>
    </div>

    <!-- 种族值 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">种族值 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-3 md:grid-cols-7 gap-3">
        <div v-for="s in statFields" :key="s.key">
          <label class="text-xs text-muted">{{ s.label }} <span v-if="s.key !== 'total'" class="text-red-500">*</span></label>
          <input v-model.number="form[s.key]" type="number" class="input w-full text-center"
            :class="s.key === 'total' ? 'bg-gray-50 dark:bg-white/10' : ''"
            :disabled="s.key === 'total'" />
        </div>
      </div>
    </div>

    <!-- 详情字段 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">详情信息</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-muted">身高</label>
          <input v-model="detailForm.height" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">体重</label>
          <input v-model="detailForm.weight" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">分布</label>
          <input v-model="detailForm.location" class="input w-full" />
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex gap-3 mb-8">
      <button @click="save" class="btn" :disabled="saving">{{ saving ? '保存中...' : (isNew ? '创建精灵' : '保存修改') }}</button>
      <span v-if="msg" class="text-sm self-center" :class="ok ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
  </div>
  <div v-else class="text-muted text-center mt-20">加载中...</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { petsApi, elementsApi } from '@/api'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'

const route = useRoute()
const router = useRouter()
const modal = useModal()
const uid = route.params.uid
const isNew = uid === 'new'

const pet = ref(null)
const detail = ref(null)
const elements = ref([])
const loaded = ref(false)
const saving = ref(false)
const msg = ref('')
const ok = ref(false)
const previewType = ref('pet_default')
const formVariant = ref('')

const form = ref({
  pet_id: '', name: '', element_id: null, sub_element_id: null,
  ability_name: '', ability_desc: '', version: '',
  hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, speed: 0, total: 0,
})

const detailForm = ref({ height: '', weight: '', location: '' })

const statFields = [
  { key: 'hp', label: 'HP' }, { key: 'atk', label: '物攻' }, { key: 'def', label: '物防' },
  { key: 'matk', label: '魔攻' }, { key: 'mdef', label: '魔防' }, { key: 'speed', label: '速度' },
  { key: 'total', label: '总和' },
]

// 自动计算种族值总和
watch(() => [form.value.hp, form.value.atk, form.value.def, form.value.matk, form.value.mdef, form.value.speed], () => {
  form.value.total = (form.value.hp || 0) + (form.value.atk || 0) + (form.value.def || 0) +
    (form.value.matk || 0) + (form.value.mdef || 0) + (form.value.speed || 0)
})

// 编号 → UID
const computedUid = computed(() => {
  if (!isNew) return uid
  const pid = form.value.pet_id?.trim()
  if (!pid) return ''
  const padded = pid.padStart(3, '0')
  return formVariant.value?.trim() ? `pet_${padded}_${formVariant.value.trim()}` : `pet_${padded}`
})

function updateUid() {}

// 图片插槽
const imageSlots = computed(() => [
  { type: 'pet_default', label: '立绘', url: detail.value?.image_default },
  { type: 'pet_shiny', label: '异色', url: detail.value?.image_shiny },
  { type: 'pet_fruit', label: '果实', url: detail.value?.image_fruit },
  { type: 'pet_egg', label: '精灵蛋', url: detail.value?.image_egg },
  { type: 'pet_thumb', label: '缩略图', url: pet.value?.thumb_url },
])

const uploadSlots = computed(() => [
  { type: 'pet_default', label: '立绘' },
  { type: 'pet_shiny', label: '异色' },
  { type: 'pet_fruit', label: '果实' },
  { type: 'pet_egg', label: '精灵蛋' },
  { type: 'pet_thumb', label: '缩略图' },
  { type: 'pet_ability', label: '特性图标' },
])

const currentPreviewUrl = computed(() => {
  const slot = imageSlots.value.find(s => s.type === previewType.value)
  return slot?.url || null
})

const abilityIconUrl = computed(() => detail.value?.ability_icon || null)

async function loadData() {
  const elemRes = await elementsApi.list()
  elements.value = elemRes.elements

  if (!isNew) {
    const data = await petsApi.get(uid)
    pet.value = data
    detail.value = data.detail || null

    form.value = {
      pet_id: data.pet_id, name: data.name,
      element_id: data.element_id, sub_element_id: data.sub_element_id,
      ability_name: data.ability_name, ability_desc: data.ability_desc,
      version: data.version,
      hp: data.hp, atk: data.atk, def: data.def,
      matk: data.matk, mdef: data.mdef, speed: data.speed, total: data.total,
    }

    if (data.detail) {
      detailForm.value = {
        height: data.detail.height, weight: data.detail.weight, location: data.detail.location,
      }
    }
  }

  loaded.value = true
}

function validate() {
  if (!form.value.pet_id?.trim()) return '请填写精灵编号'
  if (!form.value.name?.trim()) return '请填写名称'
  if (!form.value.element_id) return '请选择主属性'
  if (!form.value.ability_name?.trim()) return '请填写特性名称'
  if (!form.value.ability_desc?.trim()) return '请填写特性描述'
  if (!form.value.hp && !form.value.atk && !form.value.speed) return '请填写种族值'
  return null
}

async function save() {
  const err = validate()
  if (err) { await modal.warning('缺少必填项', err); return }

  saving.value = true; msg.value = ''
  try {
    if (isNew) {
      const newUid = computedUid.value
      if (!newUid) { await modal.warning('提示', '编号无效'); saving.value = false; return }
      await adminApi.create('pets', { uid: newUid, ...form.value })
      await adminApi.create('pet_details', { pet_uid: newUid, ...detailForm.value })
      await modal.success('创建成功', `精灵 ${form.value.name}（${newUid}）已创建`)
      router.replace(`/admin/pets/${newUid}`)
    } else {
      await adminApi.update('pets', uid, form.value)
      if (detail.value) {
        await adminApi.update('pet_details', uid, detailForm.value)
      }
      ok.value = true; msg.value = '保存成功'
      loadData()
    }
  } catch (err) {
    await modal.alert('操作失败', err.message)
  } finally {
    saving.value = false
  }
}

async function uploadImage(type, event) {
  const file = event.target.files?.[0]
  if (!file) return
  const targetUid = isNew ? computedUid.value : uid
  if (!targetUid) { msg.value = '请先填写编号'; ok.value = false; return }
  try {
    const res = await adminApi.upload(file, type, targetUid)
    msg.value = `上传成功: ${res.path}`; ok.value = true
    if (!isNew) loadData()
  } catch (err) {
    msg.value = err.message; ok.value = false
  }
  event.target.value = ''
}

onMounted(loadData)
</script>

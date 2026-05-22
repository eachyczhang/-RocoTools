<template>
  <div v-if="loaded">
    <router-link to="/admin/skills" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回技能列表</router-link>

    <div class="flex items-center gap-3 mb-4">
      <img v-if="!isNew && skill?.icon_url" :src="skill.icon_url" class="w-12 h-12 object-contain" />
      <div>
        <h1 class="font-roco text-xl text-primary-500">{{ isNew ? '新增技能' : skill?.name }}</h1>
        <span v-if="!isNew" class="text-xs text-muted">{{ skill?.uid }}</span>
      </div>
    </div>

    <!-- UID (only for new) -->
    <div v-if="isNew" class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">技能标识 <span class="text-xs text-red-500">*</span></h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-muted">技能 UID <span class="text-red-500">*</span></label>
          <input v-model="newUid" class="input w-full" placeholder="如 skill_470" />
          <p class="text-[10px] text-muted mt-1">格式：skill_编号，如 skill_470</p>
        </div>
      </div>
    </div>

    <!-- 图标上传 -->
    <div v-if="!isNew" class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">技能图标</h2>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center">
            <img v-if="skill?.icon_url" :src="skill.icon_url" class="w-full h-full object-contain rounded-lg" />
            <span v-else class="text-xs text-muted">无</span>
          </div>
          <ImageUploader
            upload-type="skill_icon"
            :upload-uid="uid"
            upload-label="上传图标"
            btn-class="text-xs text-primary-500 hover:underline cursor-pointer"
            @uploaded="() => { ok = true; msg = '图标上传成功'; loadData() }"
          />
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
          <label class="text-xs text-muted">属性</label>
          <SearchSelect
            v-model="elementIdStr"
            :options="[{ value: '', label: '无' }, ...elements.map(e => ({ value: String(e.id), label: e.name, icon: e.icon }))]"
            placeholder="无"
          />
        </div>
        <div>
          <label class="text-xs text-muted">分类</label>
          <input v-model="form.category" class="input w-full" placeholder="物攻/魔攻/防御/状态" />
        </div>
        <div>
          <label class="text-xs text-muted">能量消耗</label>
          <input v-model.number="form.cost" type="number" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">威力</label>
          <input v-model.number="form.power" type="number" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">版本</label>
          <input v-model="form.version" class="input w-full" />
        </div>
      </div>
      <div class="mt-3">
        <label class="text-xs text-muted">描述</label>
        <textarea v-model="form.description" class="input w-full h-20 resize-y"></textarea>
      </div>
    </div>

    <div class="flex gap-3 mb-8">
      <button @click="save" class="btn-primary shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" :disabled="saving">
        {{ saving ? '保存中...' : (isNew ? '✨ 创建技能' : '💾 保存修改') }}
      </button>
      <span v-if="msg" class="text-sm self-center" :class="ok ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
  </div>
  <div v-else class="text-muted text-center mt-20">加载中...</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { skillsApi, elementsApi } from '@/api'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import SearchSelect from '@/components/shared/SearchSelect.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'

const route = useRoute()
const router = useRouter()
const modal = useModal()
const uid = route.params.uid
const isNew = uid === 'new'

const skill = ref(null)
const elements = ref([])
const loaded = ref(false)
const form = ref({ name: '', element_id: null, category: '', cost: 0, power: 0, description: '', version: '' })
const newUid = ref('')
const saving = ref(false)
const msg = ref('')
const ok = ref(false)

// SearchSelect 需要字符串，element_id 在 DB 中是数字，做桥接
const elementIdStr = computed({
  get: () => form.value.element_id != null ? String(form.value.element_id) : '',
  set: (v) => { form.value.element_id = v ? Number(v) : null },
})

async function loadData() {
  const elemRes = await elementsApi.list()
  elements.value = elemRes.elements

  if (!isNew) {
    const data = await skillsApi.get(uid)
    skill.value = data
    form.value = {
      name: data.name, element_id: data.element_id,
      category: data.category, cost: data.cost, power: data.power,
      description: data.description, version: data.version,
    }
  }

  loaded.value = true
}

async function save() {
  if (!form.value.name?.trim()) {
    await modal.warning('缺少必填项', '请填写技能名称')
    return
  }

  saving.value = true; msg.value = ''
  try {
    if (isNew) {
      const uidVal = newUid.value.trim()
      if (!uidVal) {
        await modal.warning('缺少必填项', '请填写技能 UID')
        saving.value = false
        return
      }
      await adminApi.create('skills', { uid: uidVal, ...form.value })
      await modal.success('创建成功', `技能「${form.value.name}」（${uidVal}）已创建`)
      router.replace(`/admin/skills/${uidVal}`)
    } else {
      await adminApi.update('skills', uid, form.value)
      ok.value = true; msg.value = '保存成功'; loadData()
    }
  } catch (err) {
    await modal.alert('操作失败', err.message)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

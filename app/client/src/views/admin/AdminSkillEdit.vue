<template>
  <div v-if="skill">
    <router-link to="/admin/skills" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回技能列表</router-link>

    <div class="flex items-center gap-3 mb-4">
      <img v-if="skill.icon_url" :src="skill.icon_url" class="w-12 h-12 object-contain" />
      <div>
        <h1 class="font-roco text-xl text-primary-500">{{ skill.name }}</h1>
        <span class="text-xs text-muted">{{ skill.uid }}</span>
      </div>
    </div>

    <!-- 图标上传 -->
    <div class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 mb-3">技能图标</h2>
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center">
            <img v-if="skill.icon_url" :src="skill.icon_url" class="w-full h-full object-contain rounded-lg" />
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
          <label class="text-xs text-muted">名称</label>
          <input v-model="form.name" class="input w-full" />
        </div>
        <div>
          <label class="text-xs text-muted">属性</label>
          <SearchSelect
            v-model="elementIdStr"
            :options="[{ value: '', label: '无' }, ...elements.map(e => ({ value: String(e.id), label: e.name }))]"
            placeholder="无"
          />
        </div>
        <div>
          <label class="text-xs text-muted">分类</label>
          <input v-model="form.category" class="input w-full" placeholder="物攻/魔攻/防御/状态" />
        </div>
        <div>
          <label class="text-xs text-muted">PP消耗</label>
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

    <div class="flex gap-3">
      <button @click="save" class="btn" :disabled="saving">{{ saving ? '保存中...' : '保存修改' }}</button>
      <span v-if="msg" class="text-sm self-center" :class="ok ? 'text-green-600' : 'text-red-500'">{{ msg }}</span>
    </div>
  </div>
  <div v-else class="text-muted text-center mt-20">加载中...</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { skillsApi, elementsApi } from '@/api'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import SearchSelect from '@/components/shared/SearchSelect.vue'
import ImageUploader from '@/components/shared/ImageUploader.vue'

const route = useRoute()
const modal = useModal()
const uid = route.params.uid
const skill = ref(null)
const elements = ref([])
const form = ref({})
const saving = ref(false)
const msg = ref('')
const ok = ref(false)

// SearchSelect 需要字符串，element_id 在 DB 中是数字，做桥接
const elementIdStr = computed({
  get: () => form.value.element_id != null ? String(form.value.element_id) : '',
  set: (v) => { form.value.element_id = v ? Number(v) : null },
})

async function loadData() {
  const [data, elemRes] = await Promise.all([skillsApi.get(uid), elementsApi.list()])
  skill.value = data
  elements.value = elemRes.elements
  form.value = {
    name: data.name, element_id: data.element_id,
    category: data.category, cost: data.cost, power: data.power,
    description: data.description, version: data.version,
  }
}

async function save() {
  saving.value = true; msg.value = ''
  try {
    await adminApi.update('skills', uid, form.value)
    ok.value = true; msg.value = '保存成功'; loadData()
  } catch (err) { await modal.alert('保存失败', err.message) }
  finally { saving.value = false }
}

onMounted(loadData)
</script>

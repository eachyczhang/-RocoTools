<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">赛季管理</h1>

    <!-- 赛季列表 + 新增 -->
    <div class="flex items-center gap-2 mb-4">
      <select v-model="currentSeasonId" class="select" @change="loadSeason">
        <option value="">选择赛季</option>
        <option v-for="s in seasonList" :key="s.id" :value="s.id">
          {{ s.name }} ({{ s.id }}) {{ s.is_current ? '← 当前' : '' }}
        </option>
      </select>
      <button @click="showCreate = true" class="btn text-xs">+ 新增赛季</button>
    </div>

    <!-- 新增赛季 -->
    <div v-if="showCreate" class="card mb-4">
      <h2 class="font-roco text-base text-primary-500 font-bold mb-3">新增赛季</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="text-xs text-muted">赛季ID <span class="text-red-500">*</span></label>
          <input v-model="newSeason.id" class="input w-full" placeholder="如 S1、S2" />
        </div>
        <div>
          <label class="text-xs text-muted">赛季名称 <span class="text-red-500">*</span></label>
          <input v-model="newSeason.name" class="input w-full" placeholder="如 第一赛季" />
        </div>
        <div>
          <label class="text-xs text-muted">设为当前赛季</label>
          <select v-model="newSeason.is_current" class="select w-full">
            <option :value="1">是</option>
            <option :value="0">否</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="createSeason" class="btn text-xs">创建</button>
        <button @click="showCreate = false" class="btn-ghost text-xs">取消</button>
      </div>
    </div>

    <!-- 赛季详情编辑 -->
    <div v-if="season" class="space-y-4">
      <!-- 赛季封面 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-3">赛季封面</h2>
        <div class="flex items-center gap-4">
          <div class="w-32 h-20 md:w-48 md:h-28 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
            <img v-if="form.image" :src="form.image" class="w-full h-full object-cover rounded-lg" />
            <span v-else class="text-xs text-muted">无封面</span>
          </div>
          <div>
            <label class="text-xs text-primary-500 hover:underline cursor-pointer block mb-1">
              上传封面图
              <input type="file" accept="image/*" class="hidden" @change="uploadCover" />
            </label>
            <p class="text-[10px] text-muted">命名规则：{{ currentSeasonId }}_cover.png</p>
          </div>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-3">基本信息</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-muted">赛季ID</label>
            <input :value="season.id" class="input w-full bg-gray-50 dark:bg-white/10" disabled />
          </div>
          <div>
            <label class="text-xs text-muted">赛季名称</label>
            <input v-model="form.name" class="input w-full" />
          </div>
          <div>
            <label class="text-xs text-muted">设为当前赛季</label>
            <select v-model="form.is_current" class="select w-full">
              <option :value="1">是</option>
              <option :value="0">否</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-muted">开始日期</label>
            <input v-model="form.start_date" type="date" class="input w-full" />
          </div>
          <div>
            <label class="text-xs text-muted">结束日期</label>
            <input v-model="form.end_date" type="date" class="input w-full" />
          </div>
          <div>
            <label class="text-xs text-muted">备注</label>
            <input v-model="form.note" class="input w-full" />
          </div>
        </div>
      </div>

      <!-- 通行证精灵（2只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-3">通行证精灵 <span class="text-xs text-muted font-normal">（2只）</span></h2>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.pass_pets" :key="'pass_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.pass_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.pass_pets.length < 2" @click="form.pass_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 传说精灵（1只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">传说精灵</h2>
        <p class="text-xs text-muted mb-3">当赛季主推的传说精灵，不排除后续返厂</p>
        <PetPicker v-model="form.legend_pet" />
      </div>

      <!-- 赛季限定精灵（8只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季限定精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">仅当赛季可捕捉，拥有异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.season_pets" :key="'season_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.season_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.season_pets.length < 8" @click="form.season_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 赛季异色精灵（8只） -->
      <div class="card">
        <h2 class="font-roco text-base text-primary-500 font-bold mb-1">赛季异色精灵 <span class="text-xs text-muted font-normal">（8只）</span></h2>
        <p class="text-xs text-muted mb-3">日常可捕捉的精灵，当赛季可在野外获取其异色版本，赛季结束后异色仅可通过孵蛋获取</p>
        <div class="space-y-3">
          <div v-for="(uid, i) in form.shiny_pets" :key="'shiny_'+i" class="flex items-center gap-2">
            <span class="text-xs text-muted w-6 flex-shrink-0">{{ i + 1 }}.</span>
            <PetPicker v-model="form.shiny_pets[i]" class="flex-1" />
          </div>
          <button v-if="form.shiny_pets.length < 8" @click="form.shiny_pets.push('')" class="text-xs text-primary-500 hover:underline">+ 添加</button>
        </div>
      </div>

      <!-- 保存 -->
      <div class="flex gap-3 mb-8">
        <button @click="save" class="btn" :disabled="saving">{{ saving ? '保存中...' : '保存赛季配置' }}</button>
        <button @click="deleteSeason" class="text-xs text-red-500 hover:underline self-center">删除此赛季</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import PetPicker from '@/components/shared/PetPicker.vue'

const modal = useModal()

const seasonList = ref([])
const currentSeasonId = ref('')
const season = ref(null)
const showCreate = ref(false)
const saving = ref(false)

const newSeason = reactive({ id: '', name: '', is_current: 0 })

const form = reactive({
  name: '', is_current: 0, image: '', start_date: '', end_date: '', note: '',
  legend_pet: '',
  pass_pets: [],
  season_pets: [],
  shiny_pets: [],
})

async function loadList() {
  try {
    const res = await adminApi.list('seasons', { limit: 100 })
    seasonList.value = res.rows || []
  } catch {}
}

function loadSeason() {
  const s = seasonList.value.find(x => x.id === currentSeasonId.value)
  if (!s) { season.value = null; return }
  season.value = s
  form.name = s.name
  form.is_current = s.is_current
  form.image = s.image || ''
  form.start_date = s.start_date || ''
  form.end_date = s.end_date || ''
  form.note = s.note || ''
  form.legend_pet = s.legend_pet || ''
  form.pass_pets = JSON.parse(s.pass_pets || '[]')
  form.season_pets = JSON.parse(s.season_pets || '[]')
  form.shiny_pets = JSON.parse(s.shiny_pets || '[]')
}

async function createSeason() {
  if (!newSeason.id.trim() || !newSeason.name.trim()) {
    await modal.warning('提示', '请填写赛季ID和名称')
    return
  }
  try {
    await adminApi.create('seasons', {
      id: newSeason.id.trim(),
      name: newSeason.name.trim(),
      is_current: newSeason.is_current,
      pass_pets: '[]', season_pets: '[]', shiny_pets: '[]',
    })
    await modal.success('创建成功', `赛季 ${newSeason.id} 已创建`)
    showCreate.value = false
    newSeason.id = ''; newSeason.name = ''; newSeason.is_current = 0
    await loadList()
    currentSeasonId.value = newSeason.id || seasonList.value[seasonList.value.length - 1]?.id
    loadSeason()
  } catch (err) {
    await modal.alert('创建失败', err.message)
  }
}

async function uploadCover(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const res = await adminApi.upload(file, 'season_cover', currentSeasonId.value)
    form.image = res.path
    await modal.success('上传成功', `封面已保存为 ${res.path}`)
    loadList()
  } catch (err) {
    await modal.alert('上传失败', err.message)
  }
  e.target.value = ''
}

async function save() {
  saving.value = true
  try {
    if (form.is_current) {
      for (const s of seasonList.value) {
        if (s.id !== currentSeasonId.value && s.is_current) {
          await adminApi.update('seasons', s.id, { is_current: 0 })
        }
      }
    }

    await adminApi.update('seasons', currentSeasonId.value, {
      name: form.name,
      is_current: form.is_current,
      image: form.image || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      note: form.note || null,
      legend_pet: form.legend_pet || null,
      pass_pets: JSON.stringify(form.pass_pets.filter(Boolean)),
      season_pets: JSON.stringify(form.season_pets.filter(Boolean)),
      shiny_pets: JSON.stringify(form.shiny_pets.filter(Boolean)),
    })
    await modal.success('保存成功', '赛季配置已更新')
    loadList()
  } catch (err) {
    await modal.alert('保存失败', err.message)
  } finally {
    saving.value = false
  }
}

async function deleteSeason() {
  const ok = await modal.danger('删除赛季', `确定删除赛季 ${currentSeasonId.value}？`)
  if (!ok) return
  try {
    await adminApi.delete('seasons', currentSeasonId.value)
    season.value = null
    currentSeasonId.value = ''
    loadList()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

onMounted(loadList)
</script>

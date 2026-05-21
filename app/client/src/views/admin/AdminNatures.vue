<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">性格管理</h1>

    <div class="card">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b dark:border-white/10">
              <th class="text-left py-2 px-2 text-muted">ID</th>
              <th class="text-left py-2 px-2 text-muted">名称</th>
              <th class="text-left py-2 px-2 text-muted">增加属性</th>
              <th class="text-left py-2 px-2 text-muted">减少属性</th>
              <th class="text-right py-2 px-2 text-muted">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in natures" :key="n.id" class="border-b dark:border-white/5">
              <td class="py-2 px-2">{{ n.id }}</td>
              <td class="py-2 px-2">
                <input v-if="editing === n.id" v-model="editForm.name" class="input w-full" />
                <span v-else>{{ n.name }}</span>
              </td>
              <td class="py-2 px-2">
                <input v-if="editing === n.id" v-model="editForm.stat_up" class="input w-full" />
                <span v-else>{{ n.stat_up || '-' }}</span>
              </td>
              <td class="py-2 px-2">
                <input v-if="editing === n.id" v-model="editForm.stat_down" class="input w-full" />
                <span v-else>{{ n.stat_down || '-' }}</span>
              </td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <template v-if="editing === n.id">
                  <button @click="saveNature(n.id)" class="text-xs text-green-600 hover:underline mr-2">保存</button>
                  <button @click="editing = null" class="text-xs text-muted hover:underline">取消</button>
                </template>
                <button v-else @click="startEdit(n)" class="text-xs text-primary-500 hover:underline">编辑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-if="msg" class="text-sm mt-3" :class="ok ? 'text-green-600' : 'text-red-500'">{{ msg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { naturesApi } from '@/api'
import { adminApi } from '@/api/admin'

const natures = ref([])
const editing = ref(null)
const editForm = ref({})
const msg = ref('')
const ok = ref(false)

async function loadData() {
  const res = await naturesApi.list()
  natures.value = res.natures || res
}

function startEdit(n) {
  editing.value = n.id
  editForm.value = { name: n.name, stat_up: n.stat_up, stat_down: n.stat_down }
}

async function saveNature(id) {
  try {
    await adminApi.update('natures', id, editForm.value)
    ok.value = true; msg.value = '保存成功'
    editing.value = null; loadData()
  } catch (err) { ok.value = false; msg.value = err.message }
}

onMounted(loadData)
</script>

<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">蛋组管理</h1>

    <div class="card">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b dark:border-white/10">
              <th class="text-left py-2 px-2 text-muted">ID</th>
              <th class="text-left py-2 px-2 text-muted">名称</th>
              <th class="text-right py-2 px-2 text-muted">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in groups" :key="g.id" class="border-b dark:border-white/5">
              <td class="py-2 px-2">{{ g.id }}</td>
              <td class="py-2 px-2">
                <input v-if="editing === g.id" v-model="editName" class="input w-full" />
                <span v-else>{{ g.name }}</span>
              </td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <template v-if="editing === g.id">
                  <button @click="saveGroup(g.id)" class="text-xs text-green-600 hover:underline mr-2">保存</button>
                  <button @click="editing = null" class="text-xs text-muted hover:underline">取消</button>
                </template>
                <button v-else @click="editing = g.id; editName = g.name" class="text-xs text-primary-500 hover:underline">编辑</button>
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
import { eggsApi } from '@/api'
import { adminApi } from '@/api/admin'

const groups = ref([])
const editing = ref(null)
const editName = ref('')
const msg = ref('')
const ok = ref(false)

async function loadData() {
  const res = await eggsApi.list()
  groups.value = res.egg_groups || res.groups || []
}

async function saveGroup(id) {
  try {
    await adminApi.update('egg_groups', id, { name: editName.value })
    ok.value = true; msg.value = '保存成功'
    editing.value = null; loadData()
  } catch (err) { ok.value = false; msg.value = err.message }
}

onMounted(loadData)
</script>

<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl md:text-2xl text-primary-500 mb-4">数据审查</h1>

    <!-- 无冲突 -->
    <div v-if="loaded && conflicts.length === 0" class="card text-center py-10">
      <div class="text-2xl mb-2">✅</div>
      <p class="text-muted">没有待审查的数据冲突</p>
    </div>

    <!-- 有冲突 -->
    <template v-if="conflicts.length > 0">
      <!-- 批量操作 -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-muted">共 {{ conflicts.length }} 条冲突</span>
        <button @click="acceptAll" class="btn text-xs">全部使用爬虫数据</button>
        <button @click="rejectAll" class="btn-ghost text-xs">全部保留当前数据</button>
      </div>

      <!-- 逐条审查 -->
      <div class="space-y-4">
        <div v-for="(c, i) in conflicts" :key="i" class="card">
          <!-- 标题 -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <span class="font-roco text-primary-500 text-sm">{{ tableLabel(c.table) }}</span>
              <span class="text-xs text-muted ml-2">{{ c.id }}</span>
              <span class="font-medium text-sm ml-2">{{ c.name }}</span>
            </div>
            <div class="flex gap-2">
              <button @click="accept(i)" class="text-xs px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600">
                使用爬虫数据
              </button>
              <button @click="reject(i)" class="text-xs px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300">
                保留当前
              </button>
            </div>
          </div>

          <!-- 对比表格 -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b dark:border-white/10">
                  <th class="text-left py-1.5 px-2 text-muted w-28">字段</th>
                  <th class="text-left py-1.5 px-2 text-blue-600 dark:text-blue-400">当前数据（手动编辑）</th>
                  <th class="text-left py-1.5 px-2 text-green-600 dark:text-green-400">爬虫新数据</th>
                  <th class="text-center py-1.5 px-2 text-muted w-16">差异</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in diffFields(c)" :key="field"
                  class="border-b dark:border-white/5"
                  :class="isDiff(c, field) ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''">
                  <td class="py-1.5 px-2 text-muted font-medium">{{ field }}</td>
                  <td class="py-1.5 px-2 max-w-[200px] truncate">{{ displayVal(c.currentData?.[field]) }}</td>
                  <td class="py-1.5 px-2 max-w-[200px] truncate">{{ displayVal(c.newData?.[field]) }}</td>
                  <td class="py-1.5 px-2 text-center">
                    <span v-if="isDiff(c, field)" class="text-amber-500">●</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'

const modal = useModal()
const conflicts = ref([])
const loaded = ref(false)

const TABLE_LABELS = { pets: '精灵', skills: '技能', pet_details: '精灵详情' }
function tableLabel(t) { return TABLE_LABELS[t] || t }

function diffFields(c) {
  const fields = new Set([...Object.keys(c.newData || {})])
  // 排除非对比字段
  fields.delete('manual_edit')
  return [...fields]
}

function isDiff(c, field) {
  const cur = c.currentData?.[field]
  const nw = c.newData?.[field]
  return String(cur ?? '') !== String(nw ?? '')
}

function displayVal(val) {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'string' && val.length > 80) return val.slice(0, 80) + '...'
  return String(val)
}

async function loadData() {
  try {
    const res = await adminApi.conflicts()
    conflicts.value = res.conflicts || []
  } catch (err) {
    await modal.alert('加载失败', err.message)
  }
  loaded.value = true
}

async function accept(index) {
  try {
    await adminApi.acceptConflict(index)
    conflicts.value.splice(index, 1)
  } catch (err) { await modal.alert('操作失败', err.message) }
}

async function reject(index) {
  try {
    await adminApi.rejectConflict(index)
    conflicts.value.splice(index, 1)
  } catch (err) { await modal.alert('操作失败', err.message) }
}

async function acceptAll() {
  const ok = await modal.confirm('全部覆盖', `确定用爬虫数据覆盖全部 ${conflicts.value.length} 条手动编辑？`)
  if (!ok) return
  try {
    await adminApi.acceptAllConflicts()
    conflicts.value = []
    await modal.success('完成', '已全部覆盖')
  } catch (err) { await modal.alert('操作失败', err.message) }
}

async function rejectAll() {
  const ok = await modal.confirm('全部保留', `确定保留全部手动编辑，忽略爬虫新数据？`)
  if (!ok) return
  try {
    await adminApi.rejectAllConflicts()
    conflicts.value = []
    await modal.success('完成', '已全部保留')
  } catch (err) { await modal.alert('操作失败', err.message) }
}

onMounted(loadData)
</script>

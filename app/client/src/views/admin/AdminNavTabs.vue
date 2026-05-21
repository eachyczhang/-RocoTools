<template>
  <div>
    <router-link to="/admin/dashboard" class="text-sm text-muted hover:text-primary-500 mb-3 inline-block">← 返回管理首页</router-link>
    <h1 class="font-roco text-xl sm:text-2xl text-primary-500 mb-4">用户端导航标签管理</h1>
    <p class="text-xs sm:text-sm text-muted mb-4">管理用户端顶部导航栏显示的标签，可隐藏/显示标签，无需删除</p>

    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button @click="openAddModal" class="btn-primary text-sm">+ 新增标签</button>
        <button @click="loadList" :disabled="loading" class="text-sm text-muted hover:text-foreground bg-surface-light dark:bg-surface-dark px-3 py-1.5 rounded-lg">刷新</button>
      </div>
    </div>

    <!-- 标签列表 -->
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-muted text-xs bg-surface-light dark:bg-surface-dark">
          <th class="py-3 px-4">标签名称</th>
          <th class="py-3 px-4">路由</th>
          <th class="py-3 px-4">标识键</th>
          <th class="py-3 px-4">父级</th>
          <th class="py-3 px-4 w-20">排序</th>
          <th class="py-3 px-4 w-20">显示</th>
          <th class="py-3 px-4 w-32">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedList" :key="item.id" class="border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
          <td class="py-3 px-4 font-medium">{{ item.label }}</td>
          <td class="py-3 px-4 text-xs text-muted">{{ item.route }}</td>
          <td class="py-3 px-4 text-xs text-muted">{{ item.tab_key }}</td>
          <td class="py-3 px-4 text-xs text-muted">{{ getParentLabel(item.parent_key) }}</td>
          <td class="py-3 px-4">
            <input v-model.number="item.sort_order" class="input w-16 text-center text-xs" @change="updateTab(item)" />
          </td>
          <td class="py-3 px-4">
            <button
              @click="toggleVisible(item)"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="item.is_visible ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow"
                :class="item.is_visible ? 'translate-x-4.5' : 'translate-x-0.5'"
              ></span>
            </button>
          </td>
          <td class="py-3 px-4 flex gap-2">
            <button @click="openEdit(item)" class="text-xs text-primary-500 hover:underline">编辑</button>
            <button @click="deleteTab(item)" class="text-xs text-red-500 hover:underline">删除</button>
          </td>
        </tr>
        <tr v-if="sortedList.length === 0">
          <td colspan="7" class="py-8 text-center text-muted text-sm">暂无标签数据，请点击「新增标签」创建</td>
        </tr>
      </tbody>
    </table>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeModal">
      <div class="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div class="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex items-center justify-between">
          <h3 class="font-roco text-lg text-primary-500">{{ isEdit ? '编辑标签' : '新增标签' }}</h3>
          <button @click="closeModal" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <label class="text-xs text-muted block mb-1">标识键 <span class="text-red-500">*</span></label>
            <input v-model="form.tab_key" class="input w-full" placeholder="如 home、season" :disabled="isEdit" />
            <p v-if="!isEdit" class="text-xs text-muted mt-1">唯一标识，创建后不可修改</p>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">显示名称 <span class="text-red-500">*</span></label>
            <input v-model="form.label" class="input w-full" placeholder="如 首页、赛季" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">路由路径</label>
            <input v-model="form.route" class="input w-full" placeholder="如 /、/season" :disabled="form.is_parent" />
            <p v-if="form.is_parent" class="text-xs text-muted mt-1">已设为父级标签，鼠标悬停显示子标签，无需路由</p>
            <p v-else class="text-xs text-muted mt-1">留空则作为下拉菜单（父级标签）</p>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="form.is_parent" type="checkbox" id="is_parent" class="w-4 h-4" @change="onParentChange" />
            <label for="is_parent" class="text-xs text-muted">作为父级（下拉菜单，不跳转）</label>
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">图标（可选）</label>
            <input v-model="form.icon" class="input w-full" placeholder="图标类名或 emoji" />
          </div>
          <div>
            <label class="text-xs text-muted block mb-1">父级标签</label>
            <select v-model="form.parent_key" class="input w-full">
              <option value="">— 无（顶级标签）—</option>
              <option v-for="t in topLevelTabs.filter(t => t.tab_key !== form.tab_key)" :key="t.tab_key" :value="t.tab_key">
                {{ t.label }}
              </option>
            </select>
            <p class="text-xs text-muted mt-1">设为子标签后，用户端将在此标签下显示下拉菜单</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-muted block mb-1">排序权重</label>
              <input v-model.number="form.sort_order" type="number" class="input w-full" placeholder="数字越大越靠前" />
            </div>
            <div class="flex items-center gap-2 pt-5">
              <input v-model="form.is_visible" type="checkbox" id="is_visible" class="w-4 h-4" />
              <label for="is_visible" class="text-xs text-muted">显示标签</label>
            </div>
          </div>
        </div>
        <div class="sticky bottom-0 bg-surface-light dark:bg-surface-dark border-t border-surface-light-border dark:border-surface-dark-border px-4 py-3 flex justify-end gap-2">
          <button @click="closeModal" class="btn">取消</button>
          <button @click="saveTab" :disabled="saving" class="btn-primary">{{ isEdit ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { useModalState } from '@/composables/useModal'

const { state: modalState, onConfirm: modalConfirm, onCancel: modalCancel } = useModalState()

const loading = ref(false)
const list = ref([])
const showModal = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = ref({
  tab_key: '',
  label: '',
  route: '',
  icon: '',
  parent_key: '',
  is_parent: false,   // 前端临时状态，不存 DB；勾选则 route 为空（作为下拉菜单）
  is_visible: true,
  sort_order: 0,
})

const sortedList = computed(() => {
  return [...list.value].sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
})

// 顶级标签（用作父级选择）
const topLevelTabs = computed(() => {
  return list.value.filter(t => !t.parent_key)
})

// 获取父级标签名称
function getParentLabel(parentKey) {
  if (!parentKey) return '-'
  const parent = list.value.find(t => t.tab_key === parentKey)
  return parent ? parent.label : parentKey
}

async function loadList() {
  loading.value = true
  try {
    const res = await adminApi.navTabs()
    list.value = res.tabs || []
  } catch (e) {
    console.error('加载失败', e)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  isEdit.value = false
  editingId.value = null
  form.value = { tab_key: '', label: '', route: '', icon: '', parent_key: '', is_parent: false, is_visible: true, sort_order: 0 }
  showModal.value = true
}

function openEdit(item) {
  isEdit.value = true
  editingId.value = item.id
  form.value = {
    tab_key: item.tab_key,
    label: item.label,
    route: item.route,
    icon: item.icon || '',
    parent_key: item.parent_key || '',
    is_parent: !item.route,  // route 为空则是父级
    is_visible: !!item.is_visible,
    sort_order: item.sort_order || 0,
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

// 勾选/取消「作为父级」时触发
function onParentChange() {
  if (form.value.is_parent) {
    form.value.route = ''  // 勾选父级时清空路由
  }
}

async function saveTab() {
  if (!form.value.tab_key || !form.value.label) {
    alert('请填写必填字段：标识键、显示名称')
    return
  }
  // 非子标签且非父级时，要求填写路由
  if (!form.value.parent_key && !form.value.is_parent && !form.value.route) {
    alert('请填写路由路径，或勾选「作为父级（下拉菜单）」')
    return
  }
  saving.value = true
  try {
    // 如果是父级标签，route 传空字符串
    const routeValue = form.value.is_parent ? '' : form.value.route
    const payload = {
      tab_key: form.value.tab_key,
      label: form.value.label,
      route: routeValue,
      icon: form.value.icon || '',
      parent_key: form.value.parent_key,
      is_visible: form.value.is_visible ? 1 : 0,
      sort_order: form.value.sort_order,
    }
    if (isEdit.value) {
      await adminApi.updateNavTab(editingId.value, payload)
    } else {
      await adminApi.createNavTab(payload)
    }
    showModal.value = false
    await loadList()
  } catch (e) {
    alert('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function updateTab(item) {
  try {
    await adminApi.updateNavTab(item.id, {
      tab_key: item.tab_key,
      label: item.label,
      route: item.route,
      icon: item.icon || '',
      parent_key: item.parent_key || '',
      is_visible: item.is_visible,
      sort_order: item.sort_order,
    })
  } catch (e) {
    console.error('更新失败', e)
  }
}

async function toggleVisible(item) {
  item.is_visible = item.is_visible ? 0 : 1
  await updateTab(item)
}

async function deleteTab(item) {
  if (!confirm(`确定要删除标签「${item.label}」吗？删除后用户端将不再显示此标签。`)) return
  try {
    await adminApi.deleteNavTab(item.id)
    await loadList()
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}

onMounted(() => {
  loadList()
})
</script>

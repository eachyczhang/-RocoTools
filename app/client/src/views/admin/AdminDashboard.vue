<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">管理后台</h1>
      <button @click="handleLogout" class="text-xs text-muted hover:text-red-500">退出登录</button>
    </div>

    <!-- 数据概览 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="card text-center" v-for="s in stats" :key="s.label">
        <div class="font-roco text-2xl text-primary-500">{{ s.value }}</div>
        <div class="text-muted text-xs mt-1">{{ s.label }}</div>
      </div>
    </div>

    <!-- 管理入口 -->
    <h2 class="font-roco text-lg text-primary-500 mb-3">数据管理</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      <router-link v-for="item in navCards" :key="item.path" :to="item.path" class="card group">
        <div class="font-roco text-sm md:text-base group-hover:text-primary-500 transition-colors">{{ item.title }}</div>
        <div class="text-muted text-xs mt-1">{{ item.desc }}</div>
      </router-link>
    </div>

    <!-- ========== 赛季备份 ========== -->
    <div class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-roco text-base text-primary-500">赛季备份 <span class="text-xs text-muted font-normal">（受保护，删除需二次确认）</span></h2>
      </div>

      <!-- 创建赛季备份 -->
      <div class="flex flex-wrap gap-2 mb-3">
        <input v-model="seasonLabel" placeholder="赛季名称（如 S1）" class="input w-32" />
        <input v-model="seasonNote" placeholder="备注（可选）" class="input flex-1" />
        <button @click="createSeasonBackup" class="btn text-xs" :disabled="backingSeason">
          {{ backingSeason ? '备份中...' : '创建赛季备份' }}
        </button>
      </div>

      <div v-if="seasons.length === 0" class="text-muted text-sm">暂无赛季备份</div>
      <div v-else class="space-y-2">
        <div v-for="b in seasons" :key="b.name"
          class="flex items-center justify-between p-3 rounded-lg bg-primary-50/50 dark:bg-primary-500/5 border border-primary-200/50 dark:border-primary-500/10">
          <div>
            <div class="text-sm font-medium">
              <span class="text-primary-600 dark:text-primary-400">{{ b.label }}</span>
              <span class="text-muted text-xs ml-2">{{ b.name }}</span>
            </div>
            <div class="text-xs text-muted">{{ formatSize(b.size) }} · {{ formatTime(b.time) }}</div>
            <div v-if="b.note" class="text-xs text-muted mt-0.5">{{ b.note }}</div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button @click="restoreBackup(b.name, 'season')" class="text-xs text-primary-500 hover:underline">恢复</button>
            <button @click="deleteSeasonBackup(b)" class="text-xs text-red-500 hover:underline">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 临时备份 ========== -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-roco text-base text-primary-500">临时备份</h2>
        <button @click="createBackup" class="btn text-xs" :disabled="backingUp">
          {{ backingUp ? '备份中...' : '创建临时备份' }}
        </button>
      </div>
      <div v-if="tempBackups.length === 0" class="text-muted text-sm">暂无备份</div>
      <div v-else class="space-y-2">
        <div v-for="b in tempBackups" :key="b.name"
          class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/5">
          <div>
            <div class="text-sm font-medium">{{ b.name }}</div>
            <div class="text-xs text-muted">{{ formatSize(b.size) }} · {{ formatTime(b.time) }}</div>
          </div>
          <div class="flex gap-2">
            <button @click="restoreBackup(b.name, 'temp')" class="text-xs text-primary-500 hover:underline">恢复</button>
            <button @click="deleteBackup(b.name)" class="text-xs text-red-500 hover:underline">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 恢复前快照 ========== -->
    <div class="card mt-4" v-if="snapshots.length">
      <h2 class="font-roco text-base text-primary-500 mb-3">恢复前快照</h2>
      <div class="space-y-2">
        <div v-for="b in snapshots" :key="b.name"
          class="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/30 dark:border-blue-500/10">
          <div>
            <div class="text-sm font-medium">
              <span class="text-blue-600 dark:text-blue-400">{{ b.label }}</span>
              <span class="text-muted text-xs ml-2">{{ b.name }}</span>
            </div>
            <div class="text-xs text-muted">{{ formatSize(b.size) }} · {{ formatTime(b.time) }}</div>
            <div v-if="b.note" class="text-xs text-muted mt-0.5">{{ b.note }}</div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button @click="restoreBackup(b.name, 'snapshot')" class="text-xs text-primary-500 hover:underline">恢复</button>
            <button @click="deleteSnapshot(b.name)" class="text-xs text-red-500 hover:underline">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 恢复确认弹窗 ========== -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="restoreModal.visible" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="restoreModal.visible = false">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800">
            <div class="h-1 bg-primary-500"></div>
            <div class="p-5 md:p-6">
              <h3 class="font-medium text-base mb-3">确认恢复</h3>
              <p class="text-sm text-muted mb-4">即将恢复到备份 <span class="font-medium text-gray-700 dark:text-gray-200">{{ restoreModal.name }}</span></p>

              <!-- 是否保存当前数据 -->
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="restoreModal.saveCurrent" class="rounded" />
                  <span class="text-sm">恢复前保存当前数据为快照</span>
                </label>
                <div v-if="restoreModal.saveCurrent" class="mt-2">
                  <input v-model="restoreModal.saveLabel" placeholder="快照名称（如：S1更新前）" class="input w-full text-sm" />
                </div>
              </div>

              <div class="flex justify-end gap-2.5">
                <button @click="restoreModal.visible = false"
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10">
                  取消
                </button>
                <button @click="confirmRestore"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600">
                  确认恢复
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { petsApi, skillsApi, elementsApi, eggsApi } from '@/api'
import { useAdmin } from '@/composables/useAdmin'
import { useModal } from '@/composables/useModal'
import ModalDialog from '@/components/shared/ModalDialog.vue'

const router = useRouter()
const { logout } = useAdmin()
const modal = useModal()

function handleLogout() {
  logout()
  router.push('/admin')
}

const stats = ref([])
const navCards = [
  { path: '/admin/pets', title: '精灵管理', desc: '编辑精灵数据、图片、种族值' },
  { path: '/admin/skills', title: '技能管理', desc: '编辑技能数据、图标' },
  { path: '/admin/natures', title: '性格管理', desc: '编辑性格属性加减' },
  { path: '/admin/eggs', title: '蛋组管理', desc: '编辑蛋组成员' },
  { path: '/admin/seasons', title: '赛季管理', desc: '配置通行证/限定/异色精灵' },
  { path: '/admin/events', title: '活动管理', desc: '配置当前赛季活动日历' },
  { path: '/admin/pika', title: '皮卡月刊', desc: '配置角色时装、绑定精灵' },
  { path: '/admin/nav-tabs', title: '导航标签', desc: '管理用户端顶部导航栏标签显示' },
  { path: '/admin/conflicts', title: '数据审查', desc: '处理爬虫与手动编辑的数据冲突' },
]

// 备份
const tempBackups = ref([])
const seasons = ref([])
const snapshots = ref([])
const backingUp = ref(false)
const backingSeason = ref(false)
const seasonLabel = ref('')
const seasonNote = ref('')

// 恢复确认弹窗
const restoreModal = reactive({
  visible: false,
  name: '',
  type: '',
  saveCurrent: true,
  saveLabel: '',
})

async function loadBackups() {
  try {
    const res = await adminApi.backups()
    tempBackups.value = res.temp || []
    seasons.value = res.seasons || []
    snapshots.value = res.snapshots || []
  } catch (err) { console.error("[Page] 加载失败:", err) }
}

async function createBackup() {
  backingUp.value = true
  try { await adminApi.backup(); loadBackups() }
  catch (err) { await modal.alert('备份失败', err.message) }
  finally { backingUp.value = false }
}

async function createSeasonBackup() {
  if (!seasonLabel.value.trim()) { await modal.warning('提示', '请输入赛季名称'); return }
  backingSeason.value = true
  try {
    await adminApi.backupSeason(seasonLabel.value, seasonNote.value)
    seasonLabel.value = ''; seasonNote.value = ''
    await modal.success('备份成功', '赛季备份已创建')
    loadBackups()
  } catch (err) { await modal.alert('备份失败', err.message) }
  finally { backingSeason.value = false }
}

function restoreBackup(name, type) {
  restoreModal.name = name
  restoreModal.type = type
  restoreModal.saveCurrent = true
  restoreModal.saveLabel = ''
  restoreModal.visible = true
}

async function confirmRestore() {
  const { name, type, saveCurrent, saveLabel } = restoreModal
  restoreModal.visible = false
  try {
    const r = await adminApi.restore(name, type, saveCurrent, saveLabel || undefined)
    await modal.success('恢复成功', r.message)
    loadBackups()
  } catch (err) { await modal.alert('恢复失败', err.message) }
}

async function deleteBackup(name) {
  const ok = await modal.danger('删除临时备份', `确定删除 ${name}？`)
  if (!ok) return
  try { await adminApi.deleteBackup(name); loadBackups() }
  catch (err) { await modal.alert('删除失败', err.message) }
}

async function deleteSnapshot(name) {
  const ok = await modal.danger('删除快照', `确定删除快照 ${name}？`)
  if (!ok) return
  try { await adminApi.deleteSnapshot(name); loadBackups() }
  catch (err) { await modal.alert('删除失败', err.message) }
}

async function deleteSeasonBackup(b) {
  const ok1 = await modal.danger('删除赛季备份', `赛季备份「${b.label}」受保护，确定要删除吗？`)
  if (!ok1) return
  try {
    const res = await adminApi.deleteSeasonBackup(b.name)
    if (res.confirm_required) {
      const ok2 = await modal.show({
        type: 'danger', title: '最终确认',
        message: `即将永久删除赛季备份「${b.label}」，此操作不可恢复！`,
        confirmText: '确认删除', cancelText: '取消',
      })
      if (!ok2) return
      await adminApi.deleteSeasonBackup(b.name, res.confirm_token)
    }
    await modal.success('已删除', `赛季备份「${b.label}」已删除`)
    loadBackups()
  } catch (err) { await modal.alert('删除失败', err.message) }
}

function formatSize(b) {
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}
function formatTime(ms) { return new Date(ms).toLocaleString('zh-CN') }

onMounted(async () => {
  loadBackups()
  try {
    const [pets, skills, elements, eggs] = await Promise.all([
      petsApi.list({ limit: 1 }), skillsApi.list({ limit: 1 }),
      elementsApi.list(), eggsApi.list(),
    ])
    stats.value = [
      { label: '精灵', value: pets.total },
      { label: '技能', value: skills.total },
      { label: '属性', value: elements.total },
      { label: '蛋组', value: eggs.total },
    ]
  } catch (err) { console.error("[Page] 加载失败:", err) }
})
</script>

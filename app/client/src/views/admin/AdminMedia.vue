
<template>
  <div>
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h1 class="font-roco text-xl md:text-2xl text-primary-500">素材管理</h1>
      <div class="flex items-center gap-2">
        <input v-model="searchQuery" placeholder="搜索文件名..." class="input text-sm w-40 sm:w-52" />
        <label class="btn text-xs cursor-pointer">
          📷 上传文件
          <input type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
        </label>
        <label class="btn text-xs cursor-pointer">
          📁 上传文件夹
          <input type="file" webkitdirectory class="hidden" @change="handleFolderUpload" />
        </label>
      </div>
    </div>

    <!-- Category tabs -->
    <div class="flex items-center gap-1 overflow-x-auto pb-2 mb-2">
      <button
        v-for="cat in categories"
        :key="cat.key"
        @click="selectCategory(cat.key)"
        class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
        :class="currentCategory === cat.key
          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
          : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'"
      >
        {{ cat.label }}
        <span class="ml-1 text-xs opacity-60">({{ getCategoryCount(cat.key) }})</span>
      </button>
    </div>

    <!-- Sub-category tabs for pets -->
    <div v-if="currentCategory === 'pets'" class="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
      <button
        v-for="sub in petSubCategories"
        :key="sub.key"
        @click="currentPetSub = sub.key"
        class="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
        :class="currentPetSub === sub.key
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          : 'text-muted hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'"
      >
        {{ sub.label }}
        <span class="ml-1 text-[10px] opacity-60">({{ getPetSubCount(sub.key) }})</span>
      </button>
    </div>
    <div v-else class="mb-4"></div>

    <!-- Stats bar -->
    <div class="flex items-center justify-between text-xs text-muted mb-3">
      <span>共 {{ filteredFiles.length }} 张图片{{ selectedFiles.size > 0 ? ' · 已选 ' + selectedFiles.size + ' 张' : '' }}</span>
      <div class="flex items-center gap-2">
        <button v-if="isLibraryCategory" @click="selectAllPage" class="text-primary-500 hover:underline">{{ isAllPageSelected ? '取消全选' : '全选本页' }}</button>
        <button v-if="selectedFiles.size > 0" @click="batchDelete" class="text-red-500 hover:underline">批量删除</button>
        <button v-if="selectedFiles.size > 0" @click="selectedFiles.clear()" class="text-muted hover:underline">取消选择</button>
        <select v-model="pageSize" class="input text-xs w-20" @change="currentPage = 1">
          <option :value="36">36/页</option>
          <option :value="72">72/页</option>
          <option :value="120">120/页</option>
          <option :value="0">全部</option>
        </select>
        <button @click="toggleViewMode" class="text-muted hover:text-foreground">
          {{ viewMode === 'grid' ? '📋 列表' : '🖼️ 网格' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10 text-muted">
      <div class="animate-pulse">加载中...</div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredFiles.length === 0" class="text-center py-10">
      <div class="text-3xl mb-2">🖼️</div>
      <p class="text-muted text-sm">{{ searchQuery ? '未找到匹配的图片' : '该分类下暂无图片' }}</p>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      <div
        v-for="file in pagedFiles"
        :key="file.fullPath"
        class="group relative rounded-xl overflow-hidden border transition-all cursor-pointer"
        :class="[
          selectedFiles.has(file.fullPath)
            ? 'border-primary-500 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
        ]"
        @click.exact="openPreview(file.url)"
        @click.ctrl="toggleSelect(file)"
        @click.meta="toggleSelect(file)"
        :title="!isLibraryCategory ? '该分类下的图片受保护，不可批量操作' : ''"
      >
        <div class="aspect-square bg-gray-100 dark:bg-gray-800">
          <img :src="file.url" class="w-full h-full object-cover" loading="lazy" />
        </div>
        <!-- Overlay on hover -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
          <div class="w-full p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p class="text-white text-[10px] truncate">{{ file.displayName }}</p>
            <p class="text-white/60 text-[9px]">{{ formatSize(file.size) }}</p>
          </div>
        </div>
        <!-- Select checkbox (only for library category) -->
        <div v-if="isLibraryCategory" class="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          :class="{ '!opacity-100': selectedFiles.has(file.fullPath) }">
          <button
            @click.stop="toggleSelect(file)"
            class="w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors"
            :class="selectedFiles.has(file.fullPath)
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'bg-white/80 border-gray-400 text-transparent hover:border-primary-500'"
          >✓</button>
        </div>
        <!-- Category badge -->
        <div class="absolute top-1.5 right-1.5">
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white/80 backdrop-blur-sm">
            {{ file.categoryLabel }}
          </span>
        </div>
        <!-- Delete button -->
        <button
          @click.stop="deleteFile(file)"
          class="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs items-center justify-center hidden group-hover:flex hover:bg-red-600"
        >×</button>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="space-y-1">
      <div
        v-for="file in pagedFiles"
        :key="file.fullPath"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
      >
        <button v-if="isLibraryCategory" @click="toggleSelect(file)" class="flex-shrink-0">
          <span class="w-5 h-5 rounded border-2 flex items-center justify-center text-xs"
            :class="selectedFiles.has(file.fullPath)
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'border-gray-300 dark:border-gray-600'">
            {{ selectedFiles.has(file.fullPath) ? '✓' : '' }}
          </span>
        </button>
        <span v-else class="w-5 flex-shrink-0"></span>
        <div class="w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 cursor-pointer"
          @click="openPreview(file.url)">
          <img :src="file.url" class="w-full h-full object-cover" loading="lazy" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">{{ file.displayName }}</p>
          <p class="text-xs text-muted">{{ file.categoryLabel }} · {{ formatSize(file.size) }} · {{ formatTime(file.mtime) }}</p>
        </div>
        <div class="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click="copyPath(file)" class="text-xs text-muted hover:text-primary-500" title="复制路径">📋</button>
          <button @click="deleteFile(file)" class="text-xs text-red-500 hover:text-red-600" title="删除">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        @click="currentPage = 1"
        :disabled="currentPage === 1"
        class="px-2 py-1 rounded text-xs transition-colors"
        :class="currentPage === 1 ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
      >«</button>
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="px-2 py-1 rounded text-xs transition-colors"
        :class="currentPage === 1 ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
      >‹</button>
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="text-xs text-muted px-1">…</span>
        <button
          v-else
          @click="currentPage = p"
          class="w-7 h-7 rounded text-xs font-medium transition-colors"
          :class="currentPage === p
            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
            : 'text-muted hover:bg-gray-100 dark:hover:bg-white/10'"
        >{{ p }}</button>
      </template>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 rounded text-xs transition-colors"
        :class="currentPage === totalPages ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
      >›</button>
      <button
        @click="currentPage = totalPages"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 rounded text-xs transition-colors"
        :class="currentPage === totalPages ? 'text-muted cursor-not-allowed' : 'text-foreground hover:bg-gray-100 dark:hover:bg-white/10'"
      >»</button>
    </div>

    <!-- Upload progress overlay -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="uploadProgress" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-80">
            <h3 class="text-sm font-medium mb-3">上传中...</h3>
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div class="h-full bg-primary-500 transition-all duration-300 rounded-full"
                :style="{ width: (uploadProgress.current / uploadProgress.total * 100) + '%' }"></div>
            </div>
            <p class="text-xs text-muted text-center">{{ uploadProgress.current }} / {{ uploadProgress.total }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Folder prompt dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="folderPrompt" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="cancelFolderPrompt">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-96">
            <h3 class="text-sm font-medium mb-1">选择目标目录</h3>
            <p class="text-xs text-muted mb-3">即将上传 {{ folderPrompt.desc }}，请指定存放的子目录（留空则存入素材库根目录）</p>
            <div class="flex items-center gap-1 mb-3">
              <span class="text-xs text-muted whitespace-nowrap">uploads/library/</span>
              <input v-model="folderInputValue" class="input flex-1 text-sm" placeholder="子目录名（如 icons、pets/shiny）" @keyup.enter="confirmFolderPrompt" />
            </div>
            <div class="flex justify-end gap-2">
              <button @click="cancelFolderPrompt" class="btn-ghost text-xs">取消</button>
              <button @click="confirmFolderPrompt" class="btn text-xs">确认上传</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'

const modal = useModal()
const { openPreview } = useImagePreview()

const loading = ref(false)
const allFiles = ref([])
const currentCategory = ref('all')
const searchQuery = ref('')
const viewMode = ref('grid')
const selectedFiles = reactive(new Set())
const currentPage = ref(1)
const pageSize = ref(36)
const uploadProgress = ref(null) // { current, total }
const folderPrompt = ref(null) // { desc, defaultVal, resolve }

const categories = [
  { key: 'all', label: '全部' },
  { key: 'library', label: '素材库' },
  { key: 'pets', label: '精灵' },
  { key: 'pika', label: '皮卡月刊' },
  { key: 'seasons', label: '赛季' },
  { key: 'events', label: '活动' },
  { key: 'skills', label: '技能' },
  { key: 'elements', label: '属性' },
]

const petSubCategories = [
  { key: 'all', label: '全部' },
  { key: 'default', label: '高清立绘' },
  { key: 'thumb', label: '缩略图' },
  { key: 'shiny', label: '异色' },
  { key: 'fruit', label: '果实' },
  { key: 'egg', label: '精灵蛋' },
  { key: 'ability', label: '特性图标' },
  { key: 'other', label: '其他' },
]

const currentPetSub = ref('all')

// Map directory prefix to category
function getFileCategory(filePath) {
  if (filePath.includes('/library/')) return 'library'
  if (filePath.includes('/pets/') || filePath.includes('/thumbs/')) return 'pets'
  if (filePath.includes('/pika/')) return 'pika'
  if (filePath.includes('/seasons/')) return 'seasons'
  if (filePath.includes('/events/')) return 'events'
  if (filePath.includes('/skills/')) return 'skills'
  if (filePath.includes('/elements/')) return 'elements'
  return 'library'
}

// Map pet image path to sub-category
function getPetSubCategory(filePath) {
  if (filePath.includes('/pets/thumbs/')) return 'thumb'
  if (filePath.includes('/pets/default/')) return 'default'
  if (filePath.includes('/pets/shiny/')) return 'shiny'
  if (filePath.includes('/pets/fruit/')) return 'fruit'
  if (filePath.includes('/pets/egg/')) return 'egg'
  if (filePath.includes('/pets/abilities/')) return 'ability'
  return 'other'
}

function getPetSubCount(key) {
  const petFiles = allFiles.value.filter(f => f.category === 'pets')
  if (key === 'all') return petFiles.length
  return petFiles.filter(f => f.petSub === key).length
}

function selectCategory(key) {
  currentCategory.value = key
  currentPetSub.value = 'all'
}

function getCategoryLabel(cat) {
  const found = categories.find(c => c.key === cat)
  return found ? found.label : cat
}

function getCategoryCount(key) {
  if (key === 'all') return allFiles.value.length
  return allFiles.value.filter(f => f.category === key).length
}

const filteredFiles = computed(() => {
  let files = allFiles.value
  if (currentCategory.value !== 'all') {
    files = files.filter(f => f.category === currentCategory.value)
  }
  // Apply pet sub-category filter
  if (currentCategory.value === 'pets' && currentPetSub.value !== 'all') {
    files = files.filter(f => f.petSub === currentPetSub.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    files = files.filter(f => f.displayName.toLowerCase().includes(q) || f.fullPath.toLowerCase().includes(q))
  }
  return files
})

const totalPages = computed(() => {
  if (pageSize.value === 0) return 1
  return Math.max(1, Math.ceil(filteredFiles.value.length / pageSize.value))
})

const pagedFiles = computed(() => {
  if (pageSize.value === 0) return filteredFiles.value
  const start = (currentPage.value - 1) * pageSize.value
  return filteredFiles.value.slice(start, start + pageSize.value)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// Reset page and selection when filter changes
watch([currentCategory, searchQuery, currentPetSub], () => {
  currentPage.value = 1
  selectedFiles.clear()
})

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// Only library category files can be selected
const isLibraryCategory = computed(() => currentCategory.value === 'library')

const isAllPageSelected = computed(() => {
  if (!pagedFiles.value.length) return false
  return pagedFiles.value.every(f => selectedFiles.has(f.fullPath))
})

function selectAllPage() {
  if (isAllPageSelected.value) {
    // Deselect all on current page
    pagedFiles.value.forEach(f => selectedFiles.delete(f.fullPath))
  } else {
    // Select all on current page
    pagedFiles.value.forEach(f => selectedFiles.add(f.fullPath))
  }
}

function toggleSelect(file) {
  // Only allow selecting library files
  if (file.category !== 'library') return
  if (selectedFiles.has(file.fullPath)) {
    selectedFiles.delete(file.fullPath)
  } else {
    selectedFiles.add(file.fullPath)
  }
}

async function loadAllMedia() {
  loading.value = true
  try {
    const res = await adminApi.mediaList()
    allFiles.value = (res.files || []).map(f => {
      const category = getFileCategory(f.fullPath)
      return {
        ...f,
        category,
        categoryLabel: getCategoryLabel(category),
        petSub: category === 'pets' ? getPetSubCategory(f.fullPath) : null,
        displayName: f.filename.replace(/^\d+_/, ''),
      }
    })
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    loading.value = false
  }
}

async function handleUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  // Ask for optional target folder
  const folder = await promptFolder(files.length + ' 个文件')
  if (folder === null) { e.target.value = ''; return } // cancelled

  loading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  try {
    for (let i = 0; i < files.length; i++) {
      await adminApi.libraryUpload(files[i], folder || undefined)
      uploadProgress.value.current = i + 1
    }
    await modal.success('上传成功', files.length + ' 张图片已上传到素材库' + (folder ? '/' + folder : ''))
    await loadAllMedia()
  } catch (err) {
    await modal.alert('上传失败', '已上传 ' + uploadProgress.value.current + '/' + files.length + '，错误: ' + err.message)
  } finally {
    loading.value = false
    uploadProgress.value = null
    e.target.value = ''
  }
}

async function handleFolderUpload(e) {
  const allEntries = Array.from(e.target.files || [])
  // Filter to image files only
  const files = allEntries.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f.name))
  if (!files.length) {
    await modal.alert('无图片', '所选文件夹中没有找到图片文件（支持 PNG/JPEG/WebP/GIF）')
    e.target.value = ''
    return
  }

  // Extract folder structure from webkitRelativePath
  const topFolder = files[0].webkitRelativePath.split('/')[0] || ''
  const folder = await promptFolder(files.length + ' 张图片（来自 ' + topFolder + '）', topFolder)
  if (folder === null) { e.target.value = ''; return }

  loading.value = true
  uploadProgress.value = { current: 0, total: files.length }
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Preserve sub-directory structure: e.g. "myFolder/sub/img.png" → folder = "target/sub"
      const relativePath = file.webkitRelativePath || ''
      const parts = relativePath.split('/')
      // Remove top-level folder name and filename, keep middle dirs
      const subDirs = parts.slice(1, -1).join('/')
      const targetFolder = folder ? (subDirs ? folder + '/' + subDirs : folder) : subDirs
      await adminApi.libraryUpload(file, targetFolder || undefined)
      uploadProgress.value.current = i + 1
    }
    await modal.success('上传成功', files.length + ' 张图片已上传到素材库' + (folder ? '/' + folder : ''))
    await loadAllMedia()
  } catch (err) {
    await modal.alert('上传失败', '已上传 ' + uploadProgress.value.current + '/' + files.length + '，错误: ' + err.message)
  } finally {
    loading.value = false
    uploadProgress.value = null
    e.target.value = ''
  }
}

/**
 * Prompt user for target sub-folder name
 * Returns folder string (empty = root), or null if cancelled
 */
const folderInputValue = ref('')

async function promptFolder(desc, defaultVal = '') {
  folderInputValue.value = defaultVal
  return new Promise(resolve => {
    folderPrompt.value = { desc, defaultVal, resolve }
  })
}

function confirmFolderPrompt() {
  if (!folderPrompt.value) return
  const resolve = folderPrompt.value.resolve
  folderPrompt.value = null
  resolve(folderInputValue.value.trim())
}

function cancelFolderPrompt() {
  if (!folderPrompt.value) return
  const resolve = folderPrompt.value.resolve
  folderPrompt.value = null
  resolve(null)
}

async function deleteFile(file) {
  const ok = await modal.danger('删除图片', '确定删除「' + file.displayName + '」？此操作不可恢复。')
  if (!ok) return
  try {
    await adminApi.mediaDelete(file.fullPath)
    selectedFiles.delete(file.fullPath)
    await loadAllMedia()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

async function batchDelete() {
  const count = selectedFiles.size
  const ok = await modal.danger('批量删除', '确定删除选中的 ' + count + ' 张图片？此操作不可恢复。')
  if (!ok) return
  try {
    const paths = [...selectedFiles]
    await Promise.all(paths.map(p => adminApi.mediaDelete(p)))
    selectedFiles.clear()
    await modal.success('删除成功', count + ' 张图片已删除')
    await loadAllMedia()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

function copyPath(file) {
  navigator.clipboard.writeText(file.url)
}

function formatSize(b) {
  if (!b) return '—'
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

function formatTime(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('zh-CN')
}

onMounted(loadAllMedia)
</script>

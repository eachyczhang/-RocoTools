<template>
  <!-- Trigger area: local upload + library pick -->
  <div class="inline-flex items-center gap-1.5">
    <!-- Local upload -->
    <label class="cursor-pointer" :class="btnClass">
      <slot name="upload-btn">
        <span>{{ uploadLabel }}</span>
      </slot>
      <input type="file" accept="image/*" class="hidden" :disabled="loading" @change="handleLocalUpload" />
    </label>

    <!-- Pick from library -->
    <button type="button" :class="btnClass" :disabled="loading" @click="openLibrary">
      <slot name="library-btn">
        <span>📂 素材库</span>
      </slot>
    </button>

    <!-- Loading indicator -->
    <span v-if="loading" class="text-xs text-muted">上传中...</span>
  </div>

  <!-- Library modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showLibrary" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="showLibrary = false">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-3xl h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          :class="isDark ? 'bg-gray-800' : 'bg-white'">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b"
            :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <h2 class="font-roco text-base text-primary-500 font-bold">素材库</h2>
            <div class="flex items-center gap-2">
              <label class="btn text-xs cursor-pointer">
                + 上传到素材库
                <input type="file" accept="image/*" multiple class="hidden" @change="handleLibraryUpload" />
              </label>
              <button @click="showLibrary = false" class="text-muted hover:text-foreground text-xl leading-none">&times;</button>
            </div>
          </div>

          <!-- Breadcrumb navigation -->
          <div class="px-5 py-2 border-b flex items-center gap-1 text-xs flex-wrap"
            :class="isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'">
            <button @click="navigateTo('')"
              class="hover:text-primary-500 transition-colors font-medium"
              :class="currentDir ? 'text-muted' : 'text-primary-500'">
              📁 根目录
            </button>
            <template v-for="(seg, idx) in breadcrumbs" :key="idx">
              <span class="text-muted">/</span>
              <button @click="navigateTo(seg.path)"
                class="hover:text-primary-500 transition-colors truncate max-w-[120px]"
                :class="idx === breadcrumbs.length - 1 ? 'text-primary-500 font-medium' : 'text-muted'"
                :title="seg.name">
                {{ seg.name }}
              </button>
            </template>
          </div>

          <!-- Content area: directories + images -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="libraryLoading" class="flex items-center justify-center h-40 text-muted text-sm">加载中...</div>
            <template v-else>
              <!-- Subdirectories -->
              <div v-if="subDirectories.length > 0" class="mb-4">
                <div class="text-xs text-muted mb-2 font-medium">📂 子目录 ({{ subDirectories.length }})</div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  <button v-for="dir in subDirectories" :key="dir.path"
                    @click="navigateTo(dir.path)"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all hover:shadow-sm"
                    :class="isDark
                      ? 'border-gray-700 hover:border-primary-500/50 hover:bg-gray-700'
                      : 'border-gray-200 hover:border-primary-500/50 hover:bg-primary-50'">
                    <span class="text-lg flex-shrink-0">📁</span>
                    <span class="truncate" :title="dir.name">{{ dir.name }}</span>
                    <span v-if="dir.count" class="text-[10px] text-muted ml-auto flex-shrink-0">({{ dir.count }})</span>
                  </button>
                </div>
              </div>

              <!-- Images -->
              <div v-if="libraryFiles.length === 0 && subDirectories.length === 0"
                class="flex flex-col items-center justify-center h-40 text-muted text-sm gap-2">
                <span class="text-3xl">🖼️</span>
                <span>当前目录为空</span>
              </div>
              <div v-else-if="libraryFiles.length === 0 && subDirectories.length > 0"
                class="flex flex-col items-center justify-center h-24 text-muted text-xs gap-1">
                <span>当前目录无图片，请进入子目录查看</span>
              </div>
              <div v-else>
                <div v-if="subDirectories.length > 0" class="text-xs text-muted mb-2 font-medium">🖼️ 图片 ({{ libraryTotal }})</div>
                <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  <div v-for="file in libraryFiles" :key="file.filename"
                    class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all"
                    :class="selectedFile === file.filename
                      ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                      : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'"
                    @click="selectedFile = file.filename">
                    <div class="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <img
                        :data-src="file.thumb_path || file.path"
                        class="w-full h-full object-cover lazy-img"
                        @load="$event.target.classList.add('loaded')"
                      />
                    </div>
                    <!-- Selected mark -->
                    <div v-if="selectedFile === file.filename"
                      class="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                      <span class="text-2xl">✓</span>
                    </div>
                    <!-- Delete button -->
                    <button
                      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex"
                      @click.stop="deleteLibraryFile(file.filename)">×</button>
                    <!-- Filename -->
                    <div class="px-1 py-0.5 text-[10px] text-muted truncate"
                      :class="isDark ? 'bg-gray-800' : 'bg-white'">
                      {{ getDisplayName(file.filename) }}
                    </div>
                  </div>
                </div>

                <!-- Pagination -->
                <div v-if="libraryTotalPages > 1" class="flex items-center justify-center gap-2 mt-4">
                  <button @click="changePage(libraryPage - 1)" :disabled="libraryPage <= 1"
                    class="btn-ghost text-xs px-2 py-1 disabled:opacity-30">← 上一页</button>
                  <span class="text-xs text-muted">{{ libraryPage }} / {{ libraryTotalPages }}</span>
                  <button @click="changePage(libraryPage + 1)" :disabled="libraryPage >= libraryTotalPages"
                    class="btn-ghost text-xs px-2 py-1 disabled:opacity-30">下一页 →</button>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t"
            :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <div class="flex items-center gap-3">
              <span class="text-xs text-muted">{{ libraryTotal }} 张图片{{ selectedFile ? ' · 已选择 1 张' : '' }}</span>
              <!-- Copy-to-business option: only show when uploadType and uploadUid are provided -->
              <label v-if="uploadType && uploadUid && selectedFile" class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="copyToBusiness" class="rounded w-3.5 h-3.5" />
                <span class="text-xs text-muted">复制到业务目录</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button @click="showLibrary = false" class="btn-ghost text-sm">取消</button>
              <button @click="confirmSelect" :disabled="!selectedFile || confirming" class="btn text-sm">
                {{ confirming ? '处理中...' : '确认选取' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import { adminApi } from '@/api/admin'
import { useModal } from '@/composables/useModal'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  // Upload type (maps to backend IMAGE_TYPES). If empty, only library pick is supported.
  uploadType: { type: String, default: '' },
  // Upload uid
  uploadUid: { type: String, default: '' },
  // Button style class
  btnClass: { type: String, default: 'btn text-xs' },
  // Upload button text
  uploadLabel: { type: String, default: '📷 上传图片' },
})

const emit = defineEmits(['uploaded', 'file-selected'])

const modal = useModal()
const { isDark } = useTheme()

const loading = ref(false)
const showLibrary = ref(false)
const libraryLoading = ref(false)
const libraryFiles = ref([])
const libraryTotal = ref(0)
const libraryPage = ref(1)
const libraryTotalPages = ref(1)
const selectedFile = ref('')
const copyToBusiness = ref(true)
const confirming = ref(false)

// Directory navigation
const currentDir = ref('')
const directories = ref([])

// Computed: breadcrumb segments from currentDir
const breadcrumbs = computed(() => {
  if (!currentDir.value) return []
  const parts = currentDir.value.split('/')
  return parts.map((name, idx) => ({
    name,
    path: parts.slice(0, idx + 1).join('/'),
  }))
})

// Computed: subdirectories of current level
const subDirectories = computed(() => {
  const prefix = currentDir.value ? currentDir.value + '/' : ''
  return directories.value
    .filter(d => {
      if (!prefix) {
        // Root level: directories without '/'
        return !d.path.includes('/')
      }
      // Must start with prefix and have no further '/' after prefix
      return d.path.startsWith(prefix) && !d.path.slice(prefix.length).includes('/')
    })
    .map(d => ({
      ...d,
      name: d.path.split('/').pop(),
    }))
})

// Get display name: strip directory prefix and leading timestamp
function getDisplayName(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename
  return basename.replace(/^\d+_/, '')
}

// Local upload: if type/uid provided, upload immediately; otherwise emit file for deferred upload
async function handleLocalUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return

  // Deferred mode: no type/uid, just emit the file object for parent to handle
  if (!props.uploadType || !props.uploadUid) {
    emit('file-selected', file)
    e.target.value = ''
    return
  }

  // Immediate mode: upload directly to business directory
  loading.value = true
  try {
    const res = await adminApi.upload(file, props.uploadType, props.uploadUid)
    emit('uploaded', res.path)
  } catch (err) {
    await modal.alert('上传失败', err.message)
  } finally {
    loading.value = false
    e.target.value = ''
  }
}

// Open library modal
async function openLibrary() {
  showLibrary.value = true
  selectedFile.value = ''
  currentDir.value = ''
  libraryPage.value = 1
  copyToBusiness.value = !!(props.uploadType && props.uploadUid)
  await loadDirectories()
  await loadLibrary()
}

// Load directory tree and flatten it
async function loadDirectories() {
  try {
    const res = await adminApi.libraryDirectories()
    // Flatten nested directory structure into a flat list
    const flat = []
    function flatten(dirs) {
      for (const dir of dirs) {
        flat.push({ name: dir.name, path: dir.path })
        if (dir.children && dir.children.length > 0) {
          flatten(dir.children)
        }
      }
    }
    flatten(res.directories || [])
    directories.value = flat
  } catch {
    directories.value = []
  }
}

// Navigate to a directory
async function navigateTo(dirPath) {
  currentDir.value = dirPath
  libraryPage.value = 1
  selectedFile.value = ''
  await loadLibrary()
}

// Change page
async function changePage(page) {
  if (page < 1 || page > libraryTotalPages.value) return
  libraryPage.value = page
  selectedFile.value = ''
  await loadLibrary()
}

async function loadLibrary() {
  libraryLoading.value = true
  try {
    const params = { page: libraryPage.value, pageSize: 24 }
    if (currentDir.value) params.directory = currentDir.value
    const res = await adminApi.libraryList(params)
    libraryFiles.value = res.files || []
    libraryTotal.value = res.total || 0
    libraryTotalPages.value = res.totalPages || 1
    // Start lazy loading after DOM updates
    nextTick(() => setupLazyLoad())
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    libraryLoading.value = false
  }
}

// IntersectionObserver for lazy loading images
let observer = null

function setupLazyLoad() {
  cleanupObserver()
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target
        if (img.dataset.src) {
          img.src = img.dataset.src
          img.removeAttribute('data-src')
        }
        observer.unobserve(img)
      }
    }
  }, { rootMargin: '100px' })

  const images = document.querySelectorAll('.lazy-img[data-src]')
  images.forEach(img => observer.observe(img))
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onBeforeUnmount(() => cleanupObserver())

// Upload to library (upload to current directory)
async function handleLibraryUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  libraryLoading.value = true
  try {
    const folder = currentDir.value || undefined
    await Promise.all(files.map(f => adminApi.libraryUpload(f, folder)))
    await loadLibrary()
  } catch (err) {
    await modal.alert('上传失败', err.message)
  } finally {
    libraryLoading.value = false
    e.target.value = ''
  }
}

// Delete library file
async function deleteLibraryFile(filename) {
  const displayName = getDisplayName(filename)
  const ok = await modal.danger('删除图片', '确定删除「' + displayName + '」？')
  if (!ok) return
  try {
    await adminApi.libraryDelete(filename)
    if (selectedFile.value === filename) selectedFile.value = ''
    await loadLibrary()
  } catch (err) {
    await modal.alert('删除失败', err.message)
  }
}

// Confirm selection: either copy to business dir or just use library path
async function confirmSelect() {
  const file = libraryFiles.value.find(f => f.filename === selectedFile.value)
  if (!file) return

  // If copy-to-business is checked and we have type/uid, copy the file
  if (copyToBusiness.value && props.uploadType && props.uploadUid) {
    confirming.value = true
    try {
      const res = await adminApi.mediaCopyToBusiness(file.path, props.uploadType, props.uploadUid)
      emit('uploaded', res.path)
      showLibrary.value = false
    } catch (err) {
      await modal.alert('复制失败', err.message)
    } finally {
      confirming.value = false
    }
  } else {
    // Just emit the library path directly
    emit('uploaded', file.path)
    showLibrary.value = false
  }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-active > div:last-child, .modal-leave-active > div:last-child { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
.modal-leave-to > div:last-child { transform: scale(0.95) translateY(8px); }

/* Lazy loading fade-in */
.lazy-img { opacity: 0; transition: opacity 0.3s ease; }
.lazy-img.loaded { opacity: 1; }
</style>

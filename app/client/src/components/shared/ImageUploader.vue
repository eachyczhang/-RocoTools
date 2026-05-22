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
        <div class="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
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

          <!-- Image grid -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="libraryLoading" class="flex items-center justify-center h-40 text-muted text-sm">加载中...</div>
            <div v-else-if="libraryFiles.length === 0" class="flex flex-col items-center justify-center h-40 text-muted text-sm gap-2">
              <span class="text-3xl">🖼️</span>
              <span>素材库为空，点击右上角上传图片</span>
            </div>
            <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              <div v-for="file in libraryFiles" :key="file.filename"
                class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all"
                :class="selectedFile === file.filename
                  ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                  : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'"
                @click="selectedFile = file.filename">
                <div class="aspect-square bg-gray-100 dark:bg-gray-700">
                  <img :src="file.path" class="w-full h-full object-cover" loading="lazy" />
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
                  {{ file.filename.replace(/^\d+_/, '') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-5 py-3 border-t"
            :class="isDark ? 'border-gray-700' : 'border-gray-200'">
            <div class="flex items-center gap-3">
              <span class="text-xs text-muted">{{ libraryFiles.length }} 张图片{{ selectedFile ? ' · 已选择 1 张' : '' }}</span>
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
import { ref } from 'vue'
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
const selectedFile = ref('')
const copyToBusiness = ref(true)
const confirming = ref(false)

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
  copyToBusiness.value = !!(props.uploadType && props.uploadUid)
  await loadLibrary()
}

async function loadLibrary() {
  libraryLoading.value = true
  try {
    const res = await adminApi.libraryList()
    libraryFiles.value = res.files || []
  } catch (err) {
    await modal.alert('加载失败', err.message)
  } finally {
    libraryLoading.value = false
  }
}

// Upload to library
async function handleLibraryUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  libraryLoading.value = true
  try {
    await Promise.all(files.map(f => adminApi.libraryUpload(f)))
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
  const ok = await modal.danger('删除图片', '确定删除「' + filename.replace(/^\d+_/, '') + '」？')
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
</style>

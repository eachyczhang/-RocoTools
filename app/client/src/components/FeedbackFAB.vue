<template>
  <!-- FAB Button -->
  <Teleport to="body">
    <Transition name="fab">
      <button v-if="showFab && !panelOpen"
        @click="openPanel"
        class="fixed z-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
               bg-primary-500 text-white hover:shadow-xl active:scale-95
               w-11 h-11 right-4 bottom-4
               sm:w-11 sm:h-11 sm:right-5 sm:bottom-5
               lg:w-10 lg:h-10 lg:right-6 lg:bottom-6 lg:opacity-50 lg:hover:opacity-100 lg:hover:scale-110"
        title="反馈建议">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </Transition>

    <!-- Panel Overlay (mobile/tablet) -->
    <Transition name="overlay">
      <div v-if="panelOpen && !isDesktop"
        class="fixed inset-0 z-[60] bg-black/40 sm:bg-black/40 lg:bg-transparent"
        @click="closePanel"></div>
    </Transition>

    <!-- Feedback Panel -->
    <Transition :name="panelTransition">
      <div v-if="panelOpen" ref="panelRef"
        class="fixed z-[61]"
        :class="panelPositionClass"
        @click.stop>
        <!-- Drag handle (mobile/tablet) -->
        <div v-if="!isDesktop" class="flex justify-center pt-3 pb-1 cursor-grab"
          @touchstart="onDragStart" @touchmove="onDragMove" @touchend="onDragEnd">
          <div class="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>

        <!-- Panel Content -->
        <div class="px-5 pb-5" :class="{ 'pt-4': isDesktop, 'pt-1': !isDesktop }">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-roco text-base text-primary-500">反馈建议</h3>
            <button @click="closePanel" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-muted">
              ✕
            </button>
          </div>

          <!-- Success State -->
          <Transition name="fade">
            <div v-if="submitted" class="text-center py-8">
              <div class="text-4xl mb-3 animate-bounce">✅</div>
              <p class="text-sm font-medium">感谢你的反馈！</p>
            </div>
          </Transition>

          <!-- Form -->
          <div v-if="!submitted">
            <!-- Type Selection -->
            <div class="mb-4">
              <label class="text-xs text-muted mb-2 block">反馈类型</label>
              <div class="flex gap-2">
                <button v-for="t in types" :key="t.value"
                  @click="form.type = t.value"
                  class="flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all"
                  :class="form.type === t.value
                    ? 'border-primary-400 bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 dark:border-primary-500'
                    : 'border-gray-200 dark:border-gray-600 text-muted hover:border-gray-300 dark:hover:border-gray-500'">
                  {{ t.icon }} {{ t.label }}
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="mb-4">
              <label class="text-xs text-muted mb-2 block">反馈内容 <span class="text-red-400">*</span></label>
              <div class="relative">
                <textarea v-model="form.content"
                  class="input w-full resize-none text-sm"
                  :class="isDesktop ? 'h-[120px]' : 'h-[100px] sm:h-[120px]'"
                  placeholder="请描述你遇到的问题或建议..."
                  maxlength="500"></textarea>
                <span class="absolute bottom-2 right-3 text-xs text-muted">{{ form.content.length }}/500</span>
              </div>
            </div>

            <!-- Image Upload -->
            <div class="mb-4">
              <label class="text-xs text-muted mb-2 block">截图（选填，最多2张）</label>
              <div class="flex gap-2 flex-wrap">
                <!-- Add button -->
                <label v-if="form.images.length < 2"
                  class="w-[60px] h-[60px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
                         flex items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-400 transition-colors">
                  <input type="file" class="hidden" accept="image/jpeg,image/png,image/webp" @change="onImageSelect">
                  <span class="text-lg text-muted">📷</span>
                </label>
                <!-- Preview thumbnails -->
                <div v-for="(img, idx) in form.images" :key="idx"
                  class="relative w-[60px] h-[60px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <img :src="img.preview" class="w-full h-full object-cover" />
                  <button @click="removeImage(idx)"
                    class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow">
                    ✕
                  </button>
                </div>
              </div>
              <p class="text-xs text-muted mt-1">单张≤3MB，支持 jpg/png/webp</p>
            </div>

            <!-- Contact -->
            <div class="mb-4">
              <label class="text-xs text-muted mb-2 block">联系方式（选填）</label>
              <input v-model="form.contact" class="input w-full text-sm" placeholder="QQ/邮箱，方便我们回复你" maxlength="100" />
            </div>

            <!-- Submit -->
            <button @click="submitFeedback"
              class="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canSubmit || submitting">
              {{ submitting ? '提交中...' : cooldownRemaining > 0 ? `请等待 ${cooldownRemaining}s` : '提交反馈' }}
            </button>

            <!-- Current page info -->
            <div class="mt-3 text-xs text-muted text-center truncate">
              📍 {{ currentPageTitle }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { isDark } = useTheme()

// ============================================================
// State
// ============================================================
const showFab = ref(false)
const panelOpen = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const cooldownRemaining = ref(0)
const panelRef = ref(null)
const dragStartY = ref(0)
const dragDelta = ref(0)
let justOpened = false // Prevent click-outside from immediately closing

const types = [
  { value: 'bug', icon: '🐛', label: 'Bug' },
  { value: 'suggestion', icon: '💡', label: '建议' },
  { value: 'other', icon: '📝', label: '其他' },
]

const form = reactive({
  type: 'suggestion',
  content: '',
  contact: '',
  images: [], // { file, preview }
})

// ============================================================
// Computed
// ============================================================
const isDesktop = computed(() => window.innerWidth >= 1024)
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const panelPositionClass = computed(() => {
  if (isDesktop.value) {
    return 'right-6 bottom-20 w-[420px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl border ' +
      (isDark.value ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-gray-200')
  }
  // Tablet
  if (window.innerWidth >= 640) {
    return 'inset-x-0 bottom-0 max-w-[560px] mx-auto max-h-[75vh] overflow-y-auto rounded-t-[20px] shadow-2xl ' +
      (isDark.value ? 'bg-surface-dark' : 'bg-white')
  }
  // Mobile
  return 'inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl shadow-2xl ' +
    (isDark.value ? 'bg-surface-dark' : 'bg-white')
})

const panelTransition = computed(() => isDesktop.value ? 'panel-desktop' : 'panel-mobile')

const currentPageTitle = computed(() => {
  return document.title?.replace(' - Roco Tools', '').replace(' - 洛克王国世界', '') || route.path
})

const canSubmit = computed(() => {
  return form.content.length >= 10 && form.content.length <= 500 && cooldownRemaining.value <= 0
})

// ============================================================
// Methods
// ============================================================
async function checkEnabled() {
  try {
    const res = await fetch('/api/feedbacks/enabled')
    if (res.ok) {
      const data = await res.json()
      showFab.value = data.enabled
    }
  } catch {
    showFab.value = false
  }
}

function openPanel() {
  panelOpen.value = true
  submitted.value = false
  // Prevent onClickOutside from immediately closing the panel
  justOpened = true
  setTimeout(() => { justOpened = false }, 100)
  // Check cooldown
  updateCooldown()
}

function closePanel() {
  panelOpen.value = false
}

function resetForm() {
  form.type = 'suggestion'
  form.content = ''
  form.contact = ''
  form.images.forEach(img => URL.revokeObjectURL(img.preview))
  form.images = []
}

function onImageSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = '' // Reset input

  // Validate
  if (file.size > 3 * 1024 * 1024) {
    alert('图片大小不能超过 3MB')
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('仅支持 jpg/png/webp 格式')
    return
  }
  if (form.images.length >= 2) return

  const preview = URL.createObjectURL(file)
  form.images.push({ file, preview })
}

function removeImage(idx) {
  URL.revokeObjectURL(form.images[idx].preview)
  form.images.splice(idx, 1)
}

function updateCooldown() {
  const lastSubmit = localStorage.getItem('feedback_last_submit')
  if (lastSubmit) {
    const elapsed = Date.now() - parseInt(lastSubmit)
    const remaining = Math.ceil((5 * 60 * 1000 - elapsed) / 1000)
    cooldownRemaining.value = Math.max(0, remaining)
  }
}

async function submitFeedback() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('type', form.type)
    formData.append('content', form.content)
    formData.append('contact', form.contact)
    formData.append('page_url', route.path)
    formData.append('page_title', currentPageTitle.value)
    formData.append('device_type', getDeviceType())
    formData.append('screen_size', `${window.innerWidth}×${window.innerHeight}`)
    formData.append('user_agent', navigator.userAgent)
    formData.append('dark_mode', isDark.value ? '1' : '0')

    form.images.forEach(img => formData.append('images', img.file))

    const res = await fetch('/api/feedbacks', { method: 'POST', body: formData })

    if (res.status === 429) {
      alert('提交过于频繁，请稍后再试')
      return
    }
    if (res.status === 403) {
      alert('反馈功能已关闭')
      showFab.value = false
      closePanel()
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.error || '提交失败，请重试')
      return
    }

    // Success
    localStorage.setItem('feedback_last_submit', String(Date.now()))
    submitted.value = true
    resetForm()

    // Auto close after 1.5s
    setTimeout(() => {
      closePanel()
      submitted.value = false
    }, 1500)
  } catch (err) {
    alert('网络错误，请重试')
  } finally {
    submitting.value = false
  }
}

function getDeviceType() {
  const w = window.innerWidth
  if (w < 640) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// Drag to close (mobile/tablet)
function onDragStart(e) {
  dragStartY.value = e.touches[0].clientY
  dragDelta.value = 0
}

function onDragMove(e) {
  const delta = e.touches[0].clientY - dragStartY.value
  if (delta > 0) {
    dragDelta.value = delta
    if (panelRef.value) {
      panelRef.value.style.transform = `translateY(${delta}px)`
    }
  }
}

function onDragEnd() {
  if (dragDelta.value > 100) {
    closePanel()
  }
  if (panelRef.value) {
    panelRef.value.style.transform = ''
  }
  dragDelta.value = 0
}

// Close on ESC (desktop)
function onKeydown(e) {
  if (e.key === 'Escape' && panelOpen.value) closePanel()
}

// Close on click outside (desktop)
function onClickOutside(e) {
  if (!isDesktop.value) return
  if (justOpened) return
  if (panelOpen.value && panelRef.value && !panelRef.value.contains(e.target)) {
    closePanel()
  }
}

// Cooldown timer
let cooldownTimer = null
function startCooldownTimer() {
  cooldownTimer = setInterval(() => {
    updateCooldown()
    if (cooldownRemaining.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

// ============================================================
// Lifecycle
// ============================================================
onMounted(() => {
  // Don't show on admin pages
  if (!isAdminRoute.value) {
    checkEnabled()
  }
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onClickOutside)
  updateCooldown()
  if (cooldownRemaining.value > 0) startCooldownTimer()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onClickOutside)
  if (cooldownTimer) clearInterval(cooldownTimer)
  form.images.forEach(img => URL.revokeObjectURL(img.preview))
})

// Watch route changes - hide on admin
watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/admin')) {
    showFab.value = false
    closePanel()
  } else {
    checkEnabled()
  }
})

// Start cooldown timer when panel opens
watch(panelOpen, (open) => {
  if (open) {
    updateCooldown()
    if (cooldownRemaining.value > 0 && !cooldownTimer) startCooldownTimer()
  }
})
</script>

<style scoped>
/* FAB transition */
.fab-enter-active, .fab-leave-active { transition: all 0.3s ease; }
.fab-enter-from, .fab-leave-to { opacity: 0; transform: scale(0.5); }

/* Overlay */
.overlay-enter-active, .overlay-leave-active { transition: opacity 0.3s ease; }
.overlay-enter-from, .overlay-leave-to { opacity: 0; }

/* Desktop panel: scale from bottom-right */
.panel-desktop-enter-active, .panel-desktop-leave-active { transition: all 0.25s ease; transform-origin: bottom right; }
.panel-desktop-enter-from, .panel-desktop-leave-to { opacity: 0; transform: scale(0.85); }

/* Mobile panel: slide from bottom */
.panel-mobile-enter-active, .panel-mobile-leave-active { transition: all 0.3s ease; }
.panel-mobile-enter-from, .panel-mobile-leave-to { transform: translateY(100%); }

/* Fade */
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(0.9); }
</style>

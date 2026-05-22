<template>
  <Teleport to="body">
    <Transition name="image-preview-modal">
      <div
        v-if="visible"
        class="image-preview-overlay"
        @click.self="close"
        @wheel.prevent="onWheel"
      >
        <!-- Top bar -->
        <div class="image-preview-topbar">
          <span class="image-preview-info">{{ zoomPercent }}%</span>
          <button @click="close" class="image-preview-close" title="关闭 (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Image container -->
        <div
          class="image-preview-container"
          :class="{ 'is-dragging': isDragging }"
          @mousedown="onDragStart"
          @dblclick="onDoubleClick"
        >
          <!-- Loading spinner -->
          <div v-if="loading" class="image-preview-loading">
            <div class="image-preview-spinner"></div>
          </div>
          <img
            :src="src"
            class="image-preview-img"
            :style="imageStyle"
            @load="onImageLoad"
            @error="onImageError"
            draggable="false"
          />
        </div>

        <!-- Bottom toolbar -->
        <div class="image-preview-toolbar">
          <button @click="zoomOut" class="image-preview-btn" title="缩小 (-)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button @click="resetZoom" class="image-preview-btn image-preview-btn-text" title="重置">
            {{ zoomPercent }}%
          </button>
          <button @click="zoomIn" class="image-preview-btn" title="放大 (+)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <div class="image-preview-divider"></div>
          <button @click="downloadImage" class="image-preview-btn" title="下载">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  src: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(false)
const loading = ref(true)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)

// Drag state
let dragStartX = 0
let dragStartY = 0
let dragStartTranslateX = 0
let dragStartTranslateY = 0
let rafId = null

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const ZOOM_STEP = 0.25

const zoomPercent = computed(() => Math.round(scale.value * 100))

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  opacity: loading.value ? 0 : 1,
}))

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetZoom()
    loading.value = true
  }
}, { immediate: true })

watch(visible, (val) => {
  emit('update:modelValue', val)
  // Lock body scroll when preview is open
  document.body.style.overflow = val ? 'hidden' : ''
})

function close() {
  visible.value = false
  emit('close')
}

function onImageLoad() {
  loading.value = false
}

function onImageError() {
  loading.value = false
}

// Zoom
function zoomIn() {
  scale.value = Math.min(MAX_SCALE, scale.value + ZOOM_STEP)
}

function zoomOut() {
  scale.value = Math.max(MIN_SCALE, scale.value - ZOOM_STEP)
}

function resetZoom() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta))
  scale.value = newScale
}

function onDoubleClick() {
  if (scale.value === 1) {
    scale.value = 2
  } else {
    resetZoom()
  }
}

// Drag to pan
function onDragStart(e) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartTranslateX = translateX.value
  dragStartTranslateY = translateY.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!isDragging.value) return
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    translateX.value = dragStartTranslateX + (e.clientX - dragStartX)
    translateY.value = dragStartTranslateY + (e.clientY - dragStartY)
    rafId = null
  })
}

function onDragEnd() {
  isDragging.value = false
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// Download
function downloadImage() {
  if (!props.src) return
  const a = document.createElement('a')
  a.href = props.src
  a.download = props.src.split('/').pop() || 'image'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (!visible.value) return
  switch (e.key) {
    case 'Escape': close(); break
    case '+': case '=': zoomIn(); break
    case '-': zoomOut(); break
    case '0': resetZoom(); break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style>
/* Global styles (not scoped) for Teleport to body */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.92);
}

/* Top bar */
.image-preview-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  z-index: 10;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
}

.image-preview-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.image-preview-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}

/* Image container */
.image-preview-container {
  position: relative;
  max-width: 85vw;
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}

.image-preview-container.is-dragging {
  cursor: grabbing;
}

.image-preview-img {
  max-width: 85vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  transition: opacity 0.3s ease;
}

.image-preview-container:not(.is-dragging) .image-preview-img {
  transition: opacity 0.3s ease, transform 0.12s ease;
}

/* Loading */
.image-preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: preview-spin 0.8s linear infinite;
}

@keyframes preview-spin {
  to { transform: rotate(360deg); }
}

/* Bottom toolbar */
.image-preview-toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.image-preview-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s;
}

.image-preview-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.image-preview-btn:active {
  transform: scale(0.92);
}

.image-preview-btn-text {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 48px;
}

.image-preview-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

/* Transition animations */
.image-preview-modal-enter-active,
.image-preview-modal-leave-active {
  transition: opacity 0.25s ease;
}

.image-preview-modal-enter-active .image-preview-container,
.image-preview-modal-leave-active .image-preview-container {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.image-preview-modal-enter-active .image-preview-toolbar,
.image-preview-modal-leave-active .image-preview-toolbar {
  transition: all 0.25s ease 0.05s;
}

.image-preview-modal-enter-active .image-preview-topbar,
.image-preview-modal-leave-active .image-preview-topbar {
  transition: all 0.25s ease 0.05s;
}

.image-preview-modal-enter-from,
.image-preview-modal-leave-to {
  opacity: 0;
}

.image-preview-modal-enter-from .image-preview-container,
.image-preview-modal-leave-to .image-preview-container {
  transform: scale(0.92);
}

.image-preview-modal-enter-from .image-preview-toolbar,
.image-preview-modal-leave-to .image-preview-toolbar {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

.image-preview-modal-enter-from .image-preview-topbar,
.image-preview-modal-leave-to .image-preview-topbar {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

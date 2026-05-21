<template>
  <Teleport to="body">
    <Transition name="image-preview-modal">
      <div
        v-if="visible"
        class="image-preview-overlay"
        @click.self="close"
      >
        <div class="image-preview-container">
          <img :src="src" class="image-preview-img" />
          <button @click="close" class="image-preview-close">&times;</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  src: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
}, { immediate: true })

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function close() {
  visible.value = false
  emit('close')
}

// ESC 键关闭
function handleKeydown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style>
/* 不使用 scoped，确保 Teleport 到 body 后样式仍然生效 */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.image-preview-container {
  position: relative;
  max-width: 80vw;
  max-height: 90vh;
  width: 100%;
}

.image-preview-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.image-preview-close {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 36px;
  color: rgba(255, 255, 255, 0.8);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  z-index: 10;
  line-height: 1;
}

.image-preview-close:hover {
  color: white;
}

/* 过渡动画 */
.image-preview-modal-enter-active,
.image-preview-modal-leave-active {
  transition: opacity 0.3s ease;
}
.image-preview-modal-enter-from,
.image-preview-modal-leave-to {
  opacity: 0;
}
.image-preview-modal-enter-active .image-preview-container,
.image-preview-modal-leave-active .image-preview-container {
  transition: transform 0.3s ease;
}
.image-preview-modal-enter-from .image-preview-container,
.image-preview-modal-leave-to .image-preview-container {
  transform: scale(0.9);
}
</style>

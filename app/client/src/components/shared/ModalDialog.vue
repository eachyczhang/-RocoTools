<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="handleCancel">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

        <!-- 弹窗 -->
        <div class="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
          :class="isDark ? 'bg-gray-800' : 'bg-white'">

          <!-- 顶部色条 -->
          <div class="h-1" :class="barColor"></div>

          <div class="p-5 md:p-6">
            <!-- 图标 + 标题 -->
            <div class="flex items-start gap-3 mb-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                :class="iconBg">
                {{ icon }}
              </div>
              <div class="flex-1 min-w-0 pt-1.5">
                <h3 class="font-medium text-base">{{ title }}</h3>
              </div>
            </div>

            <!-- 内容 -->
            <p class="text-sm text-muted leading-relaxed ml-[52px]">{{ message }}</p>

            <!-- 按钮 -->
            <div class="flex justify-end gap-2.5 mt-5">
              <button v-if="showCancel" @click="handleCancel"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="isDark
                  ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'">
                {{ cancelText }}
              </button>
              <button @click="handleConfirm"
                class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                :class="confirmBtnClass">
                {{ confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'confirm' }, // confirm | danger | warning | info | success
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  showCancel: { type: Boolean, default: true },
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const icon = computed(() => ({
  confirm: '❓', danger: '⚠️', warning: '⚡', info: 'ℹ️', success: '✅',
}[props.type] || '❓'))

const barColor = computed(() => ({
  confirm: 'bg-primary-500',
  danger: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  success: 'bg-green-500',
}[props.type] || 'bg-primary-500'))

const iconBg = computed(() => ({
  confirm: 'bg-primary-50 dark:bg-primary-500/10',
  danger: 'bg-red-50 dark:bg-red-500/10',
  warning: 'bg-amber-50 dark:bg-amber-500/10',
  info: 'bg-blue-50 dark:bg-blue-500/10',
  success: 'bg-green-50 dark:bg-green-500/10',
}[props.type] || 'bg-primary-50 dark:bg-primary-500/10'))

const confirmBtnClass = computed(() => ({
  confirm: 'bg-primary-500 hover:bg-primary-600',
  danger: 'bg-red-500 hover:bg-red-600',
  warning: 'bg-amber-500 hover:bg-amber-600',
  info: 'bg-blue-500 hover:bg-blue-600',
  success: 'bg-green-500 hover:bg-green-600',
}[props.type] || 'bg-primary-500 hover:bg-primary-600'))

function handleConfirm() {
  emit('confirm')
  emit('update:visible', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-active > div:last-child, .modal-leave-active > div:last-child {
  transition: all 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child {
  transform: scale(0.95) translateY(8px);
}
.modal-leave-to > div:last-child {
  transform: scale(0.95) translateY(8px);
}
</style>

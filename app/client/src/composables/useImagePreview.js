/**
 * 全局图片预览 composable
 * 所有管理端页面共享同一个 ImagePreview 实例（挂载在 App.vue）
 * 
 * 用法：
 *   import { useImagePreview } from '@/composables/useImagePreview'
 *   const { openPreview } = useImagePreview()
 *   openPreview('/uploads/xxx.png')
 */
import { ref } from 'vue'

// 模块级单例状态（所有组件共享）
const showPreview = ref(false)
const previewSrc = ref('')

export function useImagePreview() {
  function openPreview(src) {
    if (!src) return
    previewSrc.value = src
    showPreview.value = true
  }

  function closePreview() {
    showPreview.value = false
  }

  return {
    showPreview,
    previewSrc,
    openPreview,
    closePreview,
  }
}

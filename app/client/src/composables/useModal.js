import { ref, reactive } from 'vue'

const state = reactive({
  visible: false,
  type: 'confirm',
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: true,
})

let _resolve = null

/**
 * 全局弹窗状态（供 ModalProvider 使用）
 */
export function useModalState() {
  function onConfirm() {
    state.visible = false
    _resolve?.(true)
    _resolve = null
  }
  function onCancel() {
    state.visible = false
    _resolve?.(false)
    _resolve = null
  }
  return { state, onConfirm, onCancel }
}

/**
 * 全局弹窗调用
 *
 * await modal.confirm('确定删除？')           // true | false
 * await modal.danger('删除赛季备份', '不可恢复')
 * await modal.alert('操作成功')               // 无取消按钮
 */
export function useModal() {
  function show(options) {
    return new Promise((resolve) => {
      _resolve = resolve
      Object.assign(state, {
        visible: true,
        type: options.type || 'confirm',
        title: options.title || '提示',
        message: options.message || '',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        showCancel: options.showCancel !== false,
      })
    })
  }

  return {
    confirm: (title, message) => show({ type: 'confirm', title, message }),
    danger: (title, message) => show({ type: 'danger', title, message, confirmText: '删除', cancelText: '取消' }),
    warning: (title, message) => show({ type: 'warning', title, message }),
    info: (title, message) => show({ type: 'info', title, message }),
    success: (title, message) => show({ type: 'success', title, message, showCancel: false }),
    alert: (title, message) => show({ type: 'info', title, message, showCancel: false }),
    show,
  }
}

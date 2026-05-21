/**
 * 图片懒加载指令 + 并发控制
 * - IntersectionObserver: 只加载视窗附近的图片
 * - 并发队列: 同时最多加载 N 张，避免连接打满
 */

const MAX_CONCURRENT = 6  // 同时最多加载 6 张图片
let activeCount = 0
const queue = []

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const { el, src } = queue.shift()
    if (!el.isConnected) continue // 元素已不在 DOM 中（翻页了）
    activeCount++
    const img = new Image()
    img.onload = () => {
      el.src = src
      activeCount--
      processQueue()
    }
    img.onerror = () => {
      activeCount--
      processQueue()
    }
    img.src = src
  }
}

function enqueue(el, src) {
  queue.push({ el, src })
  processQueue()
}

// 翻页时清空队列（旧请求不再需要）
function clearQueue() {
  queue.length = 0
}

/**
 * Vue 自定义指令 v-lazy-src
 * 用法：<img v-lazy-src="imageUrl" />
 */
export const vLazySrc = {
  mounted(el, binding) {
    if (!binding.value) return
    // 占位透明像素
    el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            enqueue(el, binding.value)
            observer.unobserve(el)
          }
        }
      },
      { rootMargin: '300px 0px' }
    )
    observer.observe(el)
    el._lazyObserver = observer
  },
  updated(el, binding) {
    if (!binding.value) return
    if (binding.value !== binding.oldValue) {
      // URL 变了（翻页），清空旧队列 + 重新观察
      clearQueue()
      if (el._lazyObserver) el._lazyObserver.disconnect()

      el.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              enqueue(el, binding.value)
              observer.unobserve(el)
            }
          }
        },
        { rootMargin: '300px 0px' }
      )
      observer.observe(el)
      el._lazyObserver = observer
    }
  },
  beforeUnmount(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect()
      delete el._lazyObserver
    }
  },
}

/**
 * Vue 自定义指令 v-click-outside
 * 用法：<div v-click-outside="handler" />
 */
export const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (e) => {
      if (!el.contains(e.target)) {
        const fn = typeof binding.value === 'function' ? binding.value : () => {
          el[binding.value]()
        }
        fn.call(el, e)
      }
    }
    document.addEventListener('click', el._clickOutsideHandler, true)
  },
  beforeUnmount(el) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler, true)
      delete el._clickOutsideHandler
    }
  },
}


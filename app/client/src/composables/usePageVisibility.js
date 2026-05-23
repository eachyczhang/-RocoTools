/**
 * Page Visibility Recovery
 * Monitors document.visibilitychange to detect when user returns to the page.
 * Provides a global event bus for components to subscribe to "page resumed" events.
 * Also handles stale token detection and automatic page reload when needed.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isLoggedIn } from '@/api/admin'

// Global state: timestamp when page was last hidden
let hiddenAt = 0
// Threshold: if page was hidden for more than this duration, trigger recovery (ms)
const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

// Simple event bus for page resume
const listeners = new Set()

export function onPageResume(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyResume(hiddenDuration) {
  for (const fn of listeners) {
    try { fn(hiddenDuration) } catch (e) { console.error('[PageVisibility] listener error:', e) }
  }
}

/**
 * usePageVisibility composable
 * Call this in App.vue to activate global visibility monitoring.
 * Options:
 *   - onResume: callback when page becomes visible after being hidden
 *   - requiresAdmin: if true, check token validity on resume
 */
export function usePageVisibility({ onResume, requiresAdmin = false } = {}) {
  const isVisible = ref(!document.hidden)
  let unsubscribe = null

  function handleVisibilityChange() {
    if (document.hidden) {
      // Page is being hidden - record timestamp
      hiddenAt = Date.now()
      isVisible.value = false
    } else {
      // Page is becoming visible again
      isVisible.value = true
      const hiddenDuration = hiddenAt ? Date.now() - hiddenAt : 0
      hiddenAt = 0

      // If page was hidden long enough, trigger recovery
      if (hiddenDuration >= STALE_THRESHOLD) {
        // Check admin token if on admin route
        if (requiresAdmin && !isLoggedIn()) {
          // Token expired while page was hidden - reload to trigger auth redirect
          window.location.reload()
          return
        }

        // Notify all listeners that page has resumed from stale state
        notifyResume(hiddenDuration)

        // Call local onResume callback
        if (onResume) onResume(hiddenDuration)
      }
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (unsubscribe) unsubscribe()
  })

  return { isVisible }
}

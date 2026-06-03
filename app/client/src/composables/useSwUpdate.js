import { ref, onMounted } from 'vue'

/**
 * Service Worker update detection composable.
 * Shows a toast when a new version is available and auto-updates.
 */
export function useSwUpdate() {
  const showUpdateToast = ref(false)

  onMounted(async () => {
    // Only in production with SW support
    if (!('serviceWorker' in navigator)) return

    try {
      const { registerSW } = await import('virtual:pwa-register')

      const updateSW = registerSW({
        onNeedRefresh() {
          // New content available, show toast briefly then update
          showUpdateToast.value = true
          setTimeout(() => {
            showUpdateToast.value = false
            updateSW(true)
          }, 2000)
        },
        onOfflineReady() {
          // SW installed, app available offline - silent
        },
        onRegisteredSW(swUrl, registration) {
          // Check for updates every hour
          if (registration) {
            setInterval(() => registration.update(), 60 * 60 * 1000)
          }
        },
      })
    } catch {
      // SW registration failed silently (e.g. dev mode)
    }
  })

  return { showUpdateToast }
}

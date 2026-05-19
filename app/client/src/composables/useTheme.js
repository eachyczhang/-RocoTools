import { ref, watch } from 'vue'

const isDark = ref(localStorage.getItem('theme') === 'dark')

function toggle() {
  isDark.value = !isDark.value
}

watch(isDark, (val) => {
  document.body.classList.toggle('dark', val)
  localStorage.setItem('theme', val ? 'dark' : 'light')
}, { immediate: true })

export function useTheme() {
  return { isDark, toggle }
}

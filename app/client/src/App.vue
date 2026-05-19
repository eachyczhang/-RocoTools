<template>
  <div class="min-h-screen flex flex-col">
    <!-- 导航栏 -->
    <nav class="sticky top-0 z-50 backdrop-blur-md border-b"
      :class="isDark ? 'bg-surface-dark/90 border-surface-dark-border' : 'bg-white/90 border-surface-light-border'">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <router-link to="/" class="font-roco text-xl text-primary-500 tracking-wide">
          Roco Tools
        </router-link>

        <div class="flex-1 flex items-center gap-1">
          <router-link v-for="nav in navItems" :key="nav.path" :to="nav.path" class="nav-link">
            {{ nav.name }}
          </router-link>
        </div>

        <!-- 主题切换 -->
        <button @click="toggle" class="btn-ghost w-9 h-9 flex items-center justify-center rounded-full">
          <span v-if="isDark" class="text-lg">☀️</span>
          <span v-else class="text-lg">🌙</span>
        </button>
      </div>
    </nav>

    <!-- 内容区 -->
    <main class="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
      <router-view />
    </main>

    <!-- 底部 -->
    <footer class="text-center py-4 text-xs text-muted border-t"
      :class="isDark ? 'border-surface-dark-border' : 'border-surface-light-border'">
      数据来源：洛克王国世界 BWIKI · CC BY-NC-SA 4.0
    </footer>
  </div>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

const { isDark, toggle } = useTheme()

const navItems = [
  { path: '/pets', name: '精灵' },
  { path: '/skills', name: '技能' },
  { path: '/elements', name: '属性' },
]
</script>

<style lang="scss" scoped>
.nav-link {
  @apply px-3 py-1.5 rounded-lg text-sm font-medium transition-colors;
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-100;

  .dark & {
    @apply text-gray-400 hover:text-white hover:bg-white/5;
  }

  &.router-link-active {
    @apply text-primary-600 bg-primary-50;
    .dark & {
      @apply text-primary-400 bg-primary-500/10;
    }
  }
}
</style>

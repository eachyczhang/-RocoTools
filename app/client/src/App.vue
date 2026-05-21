<template>
  <div class="min-h-screen flex flex-col">
    <!-- 导航栏 -->
    <nav class="sticky top-0 z-50 backdrop-blur-md border-b"
      :class="isDark ? 'bg-surface-dark/90 border-surface-dark-border' : 'bg-white/90 border-surface-light-border'">
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 lg:h-16 flex items-center gap-4 lg:gap-8">
        <!-- Logo：管理端点击回管理首页，用户端回首页 -->
        <router-link :to="isAdminRoute ? '/admin/dashboard' : '/'"
          class="font-roco text-xl sm:text-xl lg:text-2xl text-primary-500 tracking-wide flex-shrink-0">
          {{ isAdminRoute ? 'Roco Admin' : 'Roco Tools' }}
        </router-link>

        <!-- 用户端桌面导航 -->
        <div v-if="!isAdminRoute" class="hidden md:flex flex-1 items-center gap-1 lg:gap-2">
          <router-link to="/" class="nav-link" exact>首页</router-link>
          <router-link to="/pets" class="nav-link">精灵</router-link>
          <div class="relative" @mouseenter="skillMenuOpen = true" @mouseleave="skillMenuOpen = false">
            <button class="nav-link" :class="{ 'router-link-active': $route.path.startsWith('/skills') || $route.path === '/coverage' }">
              技能 <span class="text-xs opacity-60 ml-0.5">▼</span>
            </button>
            <div v-show="skillMenuOpen"
              class="absolute top-full left-0 pt-1">
              <div class="py-1 rounded-lg shadow-lg min-w-[140px] border"
                :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
                <router-link to="/skills" class="dropdown-item" @click="skillMenuOpen = false">技能列表</router-link>
                <router-link to="/coverage" class="dropdown-item" @click="skillMenuOpen = false">打击面分析</router-link>
              </div>
            </div>
          </div>
          <router-link to="/eggs" class="nav-link">蛋组</router-link>
          <router-link to="/natures" class="nav-link">性格</router-link>
          <router-link to="/elements" class="nav-link">属性</router-link>
        </div>

        <!-- 管理端桌面导航 -->
        <div v-if="isAdminRoute" class="hidden md:flex flex-1 items-center gap-1 lg:gap-2">
          <router-link to="/admin/dashboard" class="nav-link">总览</router-link>
          <router-link to="/admin/pets" class="nav-link">精灵</router-link>
          <router-link to="/admin/skills" class="nav-link">技能</router-link>
          <router-link to="/admin/natures" class="nav-link">性格</router-link>
          <router-link to="/admin/eggs" class="nav-link">蛋组</router-link>
        </div>

        <!-- 右侧按钮组 -->
        <div class="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <!-- 管理端：回到用户端 -->
          <router-link v-if="isAdminRoute" to="/" class="btn-icon" title="回到用户端">
            <span class="text-sm">🏠</span>
          </router-link>
          <!-- GitHub -->
          <a v-if="!isAdminRoute" href="https://github.com/eachyczhang/-RocoTools" target="_blank" rel="noopener noreferrer"
            class="btn-icon" title="GitHub 源码">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          <!-- 主题切换 -->
          <button @click="toggle" class="btn-icon">
            <span v-if="isDark">☀️</span>
            <span v-else>🌙</span>
          </button>
          <!-- 汉堡菜单（仅手机/小平板） -->
          <button @click="mobileMenuOpen = !mobileMenuOpen"
            class="btn-icon md:!hidden">
            <span v-if="mobileMenuOpen">✕</span>
            <span v-else>☰</span>
          </button>
        </div>
      </div>

      <!-- 移动端导航菜单 -->
      <div v-show="mobileMenuOpen" class="md:hidden border-t px-4 py-2 space-y-0.5"
        :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
        <template v-if="!isAdminRoute">
          <router-link to="/" class="mobile-nav-link" @click="mobileMenuOpen = false">首页</router-link>
          <router-link to="/pets" class="mobile-nav-link" @click="mobileMenuOpen = false">精灵</router-link>
          <router-link to="/skills" class="mobile-nav-link" @click="mobileMenuOpen = false">技能列表</router-link>
          <router-link to="/coverage" class="mobile-nav-link" @click="mobileMenuOpen = false">打击面分析</router-link>
          <router-link to="/eggs" class="mobile-nav-link" @click="mobileMenuOpen = false">蛋组</router-link>
          <router-link to="/natures" class="mobile-nav-link" @click="mobileMenuOpen = false">性格</router-link>
          <router-link to="/elements" class="mobile-nav-link" @click="mobileMenuOpen = false">属性</router-link>
        </template>
        <template v-else>
          <router-link to="/admin/dashboard" class="mobile-nav-link" @click="mobileMenuOpen = false">总览</router-link>
          <router-link to="/admin/pets" class="mobile-nav-link" @click="mobileMenuOpen = false">精灵</router-link>
          <router-link to="/admin/skills" class="mobile-nav-link" @click="mobileMenuOpen = false">技能</router-link>
          <router-link to="/admin/natures" class="mobile-nav-link" @click="mobileMenuOpen = false">性格</router-link>
          <router-link to="/admin/eggs" class="mobile-nav-link" @click="mobileMenuOpen = false">蛋组</router-link>
          <router-link to="/" class="mobile-nav-link" @click="mobileMenuOpen = false">回到用户端</router-link>
        </template>
      </div>
    </nav>

    <!-- 内容区 -->
    <main class="flex-1 max-w-screen-2xl mx-auto w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <router-view />
    </main>

    <!-- 底部（仅用户端显示） -->
    <footer v-if="!isAdminRoute" class="text-center py-4 text-xs sm:text-sm text-muted border-t"
      :class="isDark ? 'border-surface-dark-border' : 'border-surface-light-border'">
      数据来源：<a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">洛克王国世界 BWIKI</a>
      · 内容遵循 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">CC BY-NC-SA 4.0</a> 协议
    </footer>
    <!-- 全局弹窗 -->
    <ModalDialog
      :visible="modalState.visible"
      :type="modalState.type"
      :title="modalState.title"
      :message="modalState.message"
      :confirm-text="modalState.confirmText"
      :cancel-text="modalState.cancelText"
      :show-cancel="modalState.showCancel"
      @confirm="modalConfirm"
      @cancel="modalCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useModalState } from '@/composables/useModal'
import ModalDialog from '@/components/shared/ModalDialog.vue'

const route = useRoute()
const { isDark, toggle } = useTheme()
const skillMenuOpen = ref(false)
const mobileMenuOpen = ref(false)

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const { state: modalState, onConfirm: modalConfirm, onCancel: modalCancel } = useModalState()
</script>

<style lang="scss" scoped>
.nav-link {
  @apply px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-sm lg:text-base font-medium transition-colors;
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

.mobile-nav-link {
  @apply block px-4 py-2.5 rounded-lg text-base font-medium transition-colors;
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

.dropdown-item {
  @apply block px-4 py-2 text-sm transition-colors;
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

.btn-icon {
  @apply w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full;
  @apply text-lg sm:text-xl transition-colors;
  @apply hover:bg-gray-100;

  .dark & {
    @apply hover:bg-white/5;
  }
}
</style>

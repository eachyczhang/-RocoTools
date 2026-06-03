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
          <template v-for="tab in navTabsGrouped" :key="tab.tab_key">
            <!-- 有子标签：下拉菜单 -->
            <div v-if="tab.children && tab.children.length > 0"
              class="relative"
              @mouseenter="openMenus[tab.tab_key] = true" @mouseleave="openMenus[tab.tab_key] = false">
              <!-- 有路由：可点击跳转 -->
              <router-link v-if="tab.route" :to="tab.route"
                class="nav-link inline-flex items-center gap-1"
                :class="{ 'router-link-active': isTabActive(tab) }">
                {{ tab.label }} <span class="text-xs opacity-60 ml-0.5">▼</span>
              </router-link>
              <!-- 无路由：仅下拉触发器 -->
              <button v-else
                class="nav-link inline-flex items-center gap-1"
                :class="{ 'router-link-active': isTabActive(tab) }">
                {{ tab.label }} <span class="text-xs opacity-60 ml-0.5">▼</span>
              </button>
              <div v-show="openMenus[tab.tab_key]"
                class="absolute top-full left-0 pt-1">
                <div class="py-1 rounded-lg shadow-lg min-w-[140px] border"
                  :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
                  <router-link v-for="child in tab.children" :key="child.tab_key"
                    :to="child.route" class="dropdown-item" @click="openMenus[tab.tab_key] = false">{{ child.label }}</router-link>
                </div>
              </div>
            </div>
            <!-- 无子标签：普通链接 -->
            <router-link v-else :to="tab.route" class="nav-link">{{ tab.label }}</router-link>
          </template>
        </div>

        <!-- 管理端桌面导航 -->
        <div v-if="isAdminRoute" class="hidden md:flex flex-1 items-center gap-1 lg:gap-2">
          <router-link to="/admin/dashboard" class="nav-link">总览</router-link>
          <!-- 精灵分组 -->
          <div class="relative" @mouseenter="adminMenus.pets = true" @mouseleave="adminMenus.pets = false">
            <router-link to="/admin/pets" class="nav-link inline-flex items-center gap-1"
              :class="{ 'router-link-active': route.path.startsWith('/admin/pets') || route.path.startsWith('/admin/eggs') || route.path.startsWith('/admin/abilities') || route.path.startsWith('/admin/achievements') }">
              精灵 <span class="text-xs opacity-60 ml-0.5">▼</span>
            </router-link>
            <div v-show="adminMenus.pets" class="absolute top-full left-0 pt-1">
              <div class="py-1 rounded-lg shadow-lg min-w-[120px] border"
                :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
                <router-link to="/admin/pets" class="dropdown-item" @click="adminMenus.pets = false">精灵管理</router-link>
                <router-link to="/admin/eggs" class="dropdown-item" @click="adminMenus.pets = false">蛋组</router-link>
                <router-link to="/admin/abilities" class="dropdown-item" @click="adminMenus.pets = false">特性</router-link>
                <router-link to="/admin/achievements" class="dropdown-item" @click="adminMenus.pets = false">图鉴课题</router-link>
              </div>
            </div>
          </div>
          <router-link to="/admin/skills" class="nav-link">技能</router-link>
          <router-link to="/admin/natures" class="nav-link">性格</router-link>
          <router-link to="/admin/seasons" class="nav-link">赛季</router-link>
          <router-link to="/admin/events" class="nav-link">活动</router-link>
          <router-link to="/admin/pika" class="nav-link">皮卡</router-link>
          <!-- 系统分组 -->
          <div class="relative" @mouseenter="adminMenus.system = true" @mouseleave="adminMenus.system = false">
            <button class="nav-link inline-flex items-center gap-1"
              :class="{ 'router-link-active': route.path.startsWith('/admin/media') || route.path.startsWith('/admin/nav-tabs') || route.path.startsWith('/admin/feedbacks') || route.path.startsWith('/admin/conflicts') }">
              系统 <span class="text-xs opacity-60 ml-0.5">▼</span>
            </button>
            <div v-show="adminMenus.system" class="absolute top-full left-0 pt-1">
              <div class="py-1 rounded-lg shadow-lg min-w-[120px] border"
                :class="isDark ? 'bg-surface-dark border-surface-dark-border' : 'bg-white border-surface-light-border'">
                <router-link to="/admin/media" class="dropdown-item" @click="adminMenus.system = false">素材</router-link>
                <router-link to="/admin/nav-tabs" class="dropdown-item" @click="adminMenus.system = false">导航标签</router-link>
                <router-link to="/admin/feedbacks" class="dropdown-item" @click="adminMenus.system = false">反馈</router-link>
                <router-link to="/admin/conflicts" class="dropdown-item" @click="adminMenus.system = false">审查</router-link>
              </div>
            </div>
          </div>
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
          <template v-for="tab in navTabsGrouped" :key="tab.tab_key">
            <!-- 有子标签：可展开 -->
            <div v-if="tab.children && tab.children.length > 0">
              <button @click="mobileExpanded[tab.tab_key] = !mobileExpanded[tab.tab_key]"
                class="mobile-nav-link w-full text-left flex items-center justify-between">
                <span>{{ tab.label }}</span>
                <span class="text-xs opacity-60">{{ mobileExpanded[tab.tab_key] ? '▲' : '▼' }}</span>
              </button>
              <div v-show="mobileExpanded[tab.tab_key]" class="pl-4 space-y-0.5">
                <router-link v-if="tab.route" :to="tab.route" class="mobile-nav-link text-sm"
                  @click="mobileMenuOpen = false; mobileExpanded = {}">{{ tab.label }}（首页）</router-link>
                <router-link v-for="child in tab.children" :key="child.tab_key"
                  :to="child.route" class="mobile-nav-link text-sm"
                  @click="mobileMenuOpen = false; mobileExpanded = {}">{{ child.label }}</router-link>
              </div>
            </div>
            <!-- 无子标签：普通链接 -->
            <router-link v-else :to="tab.route" class="mobile-nav-link" @click="mobileMenuOpen = false">{{ tab.label }}</router-link>
          </template>
        </template>
        <template v-else>
          <router-link to="/admin/dashboard" class="mobile-nav-link" @click="mobileMenuOpen = false">总览</router-link>
          <!-- 精灵分组 -->
          <div>
            <button @click="mobileExpanded._pets = !mobileExpanded._pets"
              class="mobile-nav-link w-full text-left flex items-center justify-between">
              <span>精灵</span>
              <span class="text-xs opacity-60">{{ mobileExpanded._pets ? '▲' : '▼' }}</span>
            </button>
            <div v-show="mobileExpanded._pets" class="pl-4 space-y-0.5">
              <router-link to="/admin/pets" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">精灵管理</router-link>
              <router-link to="/admin/eggs" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">蛋组</router-link>
              <router-link to="/admin/abilities" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">特性</router-link>
              <router-link to="/admin/achievements" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">图鉴课题</router-link>
            </div>
          </div>
          <router-link to="/admin/skills" class="mobile-nav-link" @click="mobileMenuOpen = false">技能</router-link>
          <router-link to="/admin/natures" class="mobile-nav-link" @click="mobileMenuOpen = false">性格</router-link>
          <router-link to="/admin/seasons" class="mobile-nav-link" @click="mobileMenuOpen = false">赛季</router-link>
          <router-link to="/admin/events" class="mobile-nav-link" @click="mobileMenuOpen = false">活动</router-link>
          <router-link to="/admin/pika" class="mobile-nav-link" @click="mobileMenuOpen = false">皮卡月刊</router-link>
          <!-- 系统分组 -->
          <div>
            <button @click="mobileExpanded._system = !mobileExpanded._system"
              class="mobile-nav-link w-full text-left flex items-center justify-between">
              <span>系统</span>
              <span class="text-xs opacity-60">{{ mobileExpanded._system ? '▲' : '▼' }}</span>
            </button>
            <div v-show="mobileExpanded._system" class="pl-4 space-y-0.5">
              <router-link to="/admin/media" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">素材管理</router-link>
              <router-link to="/admin/nav-tabs" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">导航标签</router-link>
              <router-link to="/admin/feedbacks" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">反馈</router-link>
              <router-link to="/admin/conflicts" class="mobile-nav-link text-sm" @click="mobileMenuOpen = false">审查</router-link>
            </div>
          </div>
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
      数据来源：<a href="https://wiki.biligame.com/rocom" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">BWIKI</a>
      · <a href="https://space.bilibili.com/626796832" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">B站</a>
      · <a href="https://weibo.com/u/7476327149" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">微博</a>
      · <a href="https://www.taptap.cn/app/188212" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">TapTap</a>
      · 官方创作者素材库
      · 内容遵循 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">CC BY-NC-SA 4.0</a> 协议
      <div class="mt-1">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" class="hover:text-primary-500 underline underline-offset-2">粤ICP备2026067950号</a>
      </div>
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
      :input-placeholder="modalState.inputPlaceholder"
      @confirm="(val) => modalConfirm(val)"
      @cancel="modalCancel"
    />

    <!-- 全局图片预览 -->
    <ImagePreview v-model="showPreview" :src="previewSrc" @close="closePreview" />

    <!-- 全局用户反馈 FAB（仅用户端） -->
    <FeedbackFAB />

    <!-- SW 更新提示 Toast -->
    <Transition name="fab">
      <div v-if="showUpdateToast"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
        :class="isDark ? 'bg-green-700 text-white' : 'bg-green-600 text-white'">
        ✨ 已更新到最新版本
      </div>
    </Transition>

    <!-- 全局悬浮按钮：BWIKI爬取预览最小化时显示（仅管理端） -->
    <Transition name="fab">
      <button v-if="isAdminRoute && crawlHasData && crawlIsMinimized"
        @click="crawlRestore"
        class="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        :class="isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'"
        title="恢复 BWIKI 爬取预览">
        <span class="text-xl">🌐</span>
        <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800 animate-pulse"></span>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useModalState } from '@/composables/useModal'
import { useImagePreview } from '@/composables/useImagePreview'
import { usePageVisibility } from '@/composables/usePageVisibility'
import { useCrawlPreview } from '@/composables/useCrawlPreview'
import { useSwUpdate } from '@/composables/useSwUpdate'
import ModalDialog from '@/components/shared/ModalDialog.vue'
import ImagePreview from '@/components/shared/ImagePreview.vue'
import FeedbackFAB from '@/components/FeedbackFAB.vue'

const route = useRoute()
const router = useRouter()
const { isDark, toggle } = useTheme()
const mobileMenuOpen = ref(false)
const mobileExpanded = reactive({})  // 移动端二级菜单展开状态
const navTabs = ref([])
const openMenus = reactive({})
const adminMenus = reactive({ pets: false, system: false })  // 管理端下拉菜单状态

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const { state: modalState, onConfirm: modalConfirm, onCancel: modalCancel } = useModalState()

// 全局图片预览（仅管理端）
const { showPreview, previewSrc, closePreview } = useImagePreview()

// 全局爬取预览状态
const { hasData: crawlHasData, isMinimized: crawlIsMinimized, restore: crawlRestore } = useCrawlPreview()

// Service Worker 更新提示
const { showUpdateToast } = useSwUpdate()

// Page visibility recovery: auto-reload when returning from background after long idle
usePageVisibility({
  requiresAdmin: isAdminRoute.value,
  onResume(hiddenDuration) {
    // Page was hidden for 5+ minutes - reload current route to refresh data
    // This prevents "unresponsive" state caused by stale connections/data
    router.replace(route.fullPath)
  },
})

// 分组导航标签（父子结构）
const navTabsGrouped = computed(() => {
  const topLevel = navTabs.value.filter(t => !t.parent_key)
  const childrenMap = {}
  const children = navTabs.value.filter(t => t.parent_key)
  for (const child of children) {
    if (!childrenMap[child.parent_key]) childrenMap[child.parent_key] = []
    childrenMap[child.parent_key].push(child)
  }
  return topLevel.map(tab => ({
    ...tab,
    children: childrenMap[tab.tab_key] || []
  })).sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
})

// 判断标签是否激活（含子标签）
function isTabActive(tab) {
  if (tab.children && tab.children.length > 0) {
    return tab.children.some(c => route.path.startsWith(c.route) || route.path === c.route)
  }
  return route.path.startsWith(tab.route) || route.path === tab.route
}

// 加载用户端导航标签
async function loadNavTabs() {
  try {
    const res = await fetch('/api/admin/nav-tabs/public')
    if (res.ok) {
      const data = await res.json()
      navTabs.value = data.tabs || []
    }
  } catch (e) {
    console.error('加载导航标签失败', e)
    navTabs.value = []
  }
}

onMounted(() => {
  if (!isAdminRoute.value) {
    loadNavTabs()
  }
})

// 关闭移动端菜单时重置展开状态
watch(mobileMenuOpen, (val) => {
  if (!val) {
    for (const key in mobileExpanded) delete mobileExpanded[key]
  }
})
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

<style>
/* FAB transition */
.fab-enter-active, .fab-leave-active { transition: all 0.3s ease; }
.fab-enter-from, .fab-leave-to { opacity: 0; transform: scale(0.5) translateY(20px); }
</style>

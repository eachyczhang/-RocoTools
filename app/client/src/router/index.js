import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn, clearToken } from '@/api/admin'

const routes = [
  // 用户端
  { path: '/', name: 'Home', component: () => import('@/views/user/Home.vue') },
  { path: '/season', name: 'Season', component: () => import('@/views/user/Season.vue') },
  { path: '/events', name: 'Events', component: () => import('@/views/user/Events.vue') },
  { path: '/pets', name: 'Pets', component: () => import('@/views/user/Pets.vue') },
  { path: '/pets/:uid', name: 'PetDetail', component: () => import('@/views/user/PetDetail.vue') },
  { path: '/skills', name: 'Skills', component: () => import('@/views/user/Skills.vue') },
  { path: '/skills/:uid', name: 'SkillDetail', component: () => import('@/views/user/SkillDetail.vue') },
  { path: '/coverage', name: 'Coverage', component: () => import('@/views/user/Coverage.vue') },
  { path: '/eggs', name: 'Eggs', component: () => import('@/views/user/Eggs.vue') },
  { path: '/natures', name: 'Natures', component: () => import('@/views/user/Natures.vue') },
  { path: '/elements', name: 'Elements', component: () => import('@/views/user/Elements.vue') },

  // 管理端
  { path: '/admin', name: 'Admin', component: () => import('@/views/admin/Admin.vue'), meta: { hidden: true } },
  { path: '/admin/dashboard', name: 'AdminDashboard', component: () => import('@/views/admin/AdminDashboard.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/pets', name: 'AdminPets', component: () => import('@/views/admin/AdminPets.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/pets/:uid', name: 'AdminPetEdit', component: () => import('@/views/admin/AdminPetEdit.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/skills', name: 'AdminSkills', component: () => import('@/views/admin/AdminSkills.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/skills/:uid', name: 'AdminSkillEdit', component: () => import('@/views/admin/AdminSkillEdit.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/natures', name: 'AdminNatures', component: () => import('@/views/admin/AdminNatures.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/eggs', name: 'AdminEggs', component: () => import('@/views/admin/AdminEggs.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/seasons', name: 'AdminSeasons', component: () => import('@/views/admin/AdminSeasons.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/events', name: 'AdminEvents', component: () => import('@/views/admin/AdminEvents.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/pika', name: 'AdminPikaMonthlies', component: () => import('@/views/admin/AdminPikaMonthlies.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/conflicts', name: 'AdminConflicts', component: () => import('@/views/admin/AdminConflicts.vue'), meta: { hidden: true, requiresAdmin: true } },
  { path: '/admin/nav-tabs', name: 'AdminNavTabs', component: () => import('@/views/admin/AdminNavTabs.vue'), meta: { hidden: true, requiresAdmin: true } },
]

const router = createRouter({
  history: createWebHistory('/rocotools/'),
  routes,
})

// 路由守卫：管理端页面需验证 token
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAdmin) {
    if (!isLoggedIn()) {
      clearToken()
      next('/admin')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

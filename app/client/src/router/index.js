import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // 用户端
  { path: '/', name: 'Home', component: () => import('@/views/user/Home.vue') },
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
  { path: '/admin/dashboard', name: 'AdminDashboard', component: () => import('@/views/admin/AdminDashboard.vue'), meta: { hidden: true } },
  { path: '/admin/pets', name: 'AdminPets', component: () => import('@/views/admin/AdminPets.vue'), meta: { hidden: true } },
  { path: '/admin/pets/:uid', name: 'AdminPetEdit', component: () => import('@/views/admin/AdminPetEdit.vue'), meta: { hidden: true } },
  { path: '/admin/skills', name: 'AdminSkills', component: () => import('@/views/admin/AdminSkills.vue'), meta: { hidden: true } },
  { path: '/admin/skills/:uid', name: 'AdminSkillEdit', component: () => import('@/views/admin/AdminSkillEdit.vue'), meta: { hidden: true } },
  { path: '/admin/natures', name: 'AdminNatures', component: () => import('@/views/admin/AdminNatures.vue'), meta: { hidden: true } },
  { path: '/admin/eggs', name: 'AdminEggs', component: () => import('@/views/admin/AdminEggs.vue'), meta: { hidden: true } },
]

export default createRouter({
  history: createWebHistory('/rocotools/'),
  routes,
})

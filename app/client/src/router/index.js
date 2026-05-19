import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/pets', name: 'Pets', component: () => import('@/views/Pets.vue') },
  { path: '/pets/:uid', name: 'PetDetail', component: () => import('@/views/PetDetail.vue') },
  { path: '/skills', name: 'Skills', component: () => import('@/views/Skills.vue') },
  { path: '/elements', name: 'Elements', component: () => import('@/views/Elements.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

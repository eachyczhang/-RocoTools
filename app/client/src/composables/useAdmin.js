import { ref, readonly } from 'vue'
import { isLoggedIn, clearToken } from '@/api/admin'

const loggedIn = ref(isLoggedIn())

export function useAdmin() {
  function login() {
    loggedIn.value = true
  }

  function logout() {
    clearToken()
    loggedIn.value = false
  }

  function checkAuth() {
    loggedIn.value = isLoggedIn()
    return loggedIn.value
  }

  return {
    isAdmin: readonly(loggedIn),
    login,
    logout,
    checkAuth,
  }
}

<template>
  <div class="max-w-sm mx-auto mt-20">
    <h1 class="font-roco text-2xl text-primary-500 mb-6 text-center">管理后台</h1>
    <div class="card">
      <input v-model="password" type="password" placeholder="管理员密码" class="input w-full mb-3"
        @keyup.enter="handleLogin" />
      <button @click="handleLogin" class="btn w-full" :disabled="logging">
        {{ logging ? '登录中...' : '登录' }}
      </button>
      <p v-if="loginError" class="text-red-500 text-xs mt-2">{{ loginError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, setToken } from '@/api/admin'
import { useAdmin } from '@/composables/useAdmin'

const router = useRouter()
const { isAdmin, login: adminLogin } = useAdmin()
const password = ref('')
const logging = ref(false)
const loginError = ref('')

onMounted(() => {
  if (isAdmin.value) router.replace('/admin/dashboard')
})

async function handleLogin() {
  logging.value = true
  loginError.value = ''
  try {
    const { token } = await adminApi.login(password.value)
    setToken(token)
    adminLogin()
    router.push('/admin/dashboard')
  } catch (err) {
    loginError.value = err.message
  } finally {
    logging.value = false
  }
}
</script>

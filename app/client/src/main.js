import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.scss'
import { vLazySrc, vClickOutside } from './composables/useLazyImage'

const app = createApp(App)
app.use(router)
app.directive('lazy-src', vLazySrc)
app.directive('click-outside', vClickOutside)
app.mount('#app')

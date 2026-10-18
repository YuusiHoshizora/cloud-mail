import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/tokens.css'
import './styles/app.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const auth = useAuthStore(pinia)

/* 先把站点配置 / 登录态拿到再挂载，避免首屏闪一下再跳登录 */
auth.bootstrap().finally(() => {
  app.use(router)
  app.mount('#app')
})

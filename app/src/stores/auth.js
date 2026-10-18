import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const settings = ref({})
  const accounts = ref([])
  const ready = ref(false)

  const logged = computed(() => Boolean(token.value && user.value))

  const currentAccount = computed(() => {
    const id = user.value?.account?.accountId
    if (!id) return accounts.value[0] || null
    return accounts.value.find((a) => a.accountId === id) || user.value.account
  })

  function setToken(value) {
    token.value = value || ''
    if (value) localStorage.setItem('token', value)
    else localStorage.removeItem('token')
  }

  async function bootstrap() {
    settings.value = await api.websiteConfig().catch(() => ({}))
    if (token.value) {
      try {
        user.value = await api.loginUserInfo()
        accounts.value = await api
          .accountList({ size: 50 })
          .catch(() => (user.value?.account ? [user.value.account] : []))
      } catch (err) {
        if (err?.code === 401) setToken('')
        user.value = null
      }
    }
    ready.value = true
  }

  async function login(email, password) {
    const data = await api.login(email, password)
    setToken(data?.token || '')
    await bootstrap()
    if (!user.value) throw new Error('登录成功但获取用户信息失败')
    return user.value
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* 忽略：token 可能已过期 */
    }
    setToken('')
    user.value = null
    accounts.value = []
  }

  return { token, user, settings, accounts, ready, logged, currentAccount, setToken, bootstrap, login, logout }
})

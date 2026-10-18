<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const title = ref('')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let timer = null

function typeTitle() {
  const text = '星 域 邮 路'
  if (reduceMotion) {
    title.value = text
    return
  }
  let i = 0
  timer = setInterval(() => {
    i += 1
    title.value = text.slice(0, i)
    if (i >= text.length) clearInterval(timer)
  }, 160)
}

onMounted(typeTitle)
onUnmounted(() => clearInterval(timer))

async function submit() {
  if (busy.value) return
  error.value = ''
  busy.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    router.replace({ name: 'inbox' })
  } catch (err) {
    error.value = err?.message || '登录失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="screen screen--login">
    <section class="login-hero">
      <p class="login-sub">星域邮路<br /><br />MAILBOX OF STARLIGHT SACRED SANCTUARY</p>
      <h1 class="login-title">{{ title }}<span v-if="title.length < 7" class="caret"></span></h1>
      <p class="login-motto">Nuntii per stellas.</p>

      <form class="panel login-panel" autocomplete="off" @submit.prevent="submit">
        <div class="field">
          <label class="field__label" for="email">邮箱地址 · ADDRESS</label>
          <input id="email" v-model="email" class="input" type="email" spellcheck="false" required />
        </div>
        <div class="field">
          <label class="field__label" for="password">密码 · PASSWORD</label>
          <input id="password" v-model="password" class="input" type="password" required />
          <p v-if="error" class="field__error">{{ error }}</p>
        </div>

        <button class="btn btn--primary login-submit" type="submit" :disabled="busy">
          {{ busy ? '正 在 连 接…' : '进 入 邮 箱' }}
        </button>

        <p class="login-links">
          <a href="https://starlightsacredsanctuary.top/">返回星光圣域</a>
        </p>
      </form>
    </section>
  </main>
</template>

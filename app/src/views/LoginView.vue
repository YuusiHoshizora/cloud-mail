<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const mode = ref('login') // login | register
const prefix = ref('')
const password = ref('')
const inviteCode = ref('')
const suffix = ref('')
const error = ref('')
const busy = ref(false)
const title = ref('')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let timer = null

/* 邮箱后缀：来自站点配置 domainList（形如 ['@stsas.top']） */
const domains = computed(() => {
  const list = auth.settings?.domainList
  if (Array.isArray(list) && list.length) {
    return list.map((item) => (String(item).startsWith('@') ? String(item) : `@${item}`))
  }
  return ['@stsas.top']
})
const currentSuffix = computed(() => suffix.value || domains.value[0])

const canRegister = computed(() => Number(auth.settings?.register ?? 0) === 0)
const needInvite = computed(() => Number(auth.settings?.regKey ?? 1) !== 1)
const email = computed(() => `${prefix.value.trim()}${currentSuffix.value}`)

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

function switchMode(next) {
  mode.value = next
  error.value = ''
  password.value = ''
  if (next === 'login') inviteCode.value = ''
}

async function submit() {
  if (busy.value) return
  error.value = ''
  if (!prefix.value.trim()) {
    error.value = '请填写邮箱前缀'
    return
  }
  if (!password.value) {
    error.value = '请填写密码'
    return
  }
  if (mode.value === 'register' && needInvite.value && !inviteCode.value.trim()) {
    error.value = '请输入邀请码'
    return
  }

  busy.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
      router.replace({ name: 'inbox' })
      return
    }

    /* 注册成功一般直接返回 token（可能是字符串或 { token }） */
    const data = await api.register({
      email: email.value,
      password: password.value,
      code: inviteCode.value.trim(),
      token: '' // Turnstile 预留位：启用后把 widget token 放这里
    })
    const token = typeof data === 'string' ? data : data?.token
    if (token) {
      auth.setToken(token)
      await auth.bootstrap()
      router.replace({ name: 'inbox' })
    } else {
      await auth.login(email.value, password.value)
      router.replace({ name: 'inbox' })
    }
  } catch (err) {
    error.value = err?.message || (mode.value === 'login' ? '登录失败' : '注册失败')
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
          <label class="field__label" for="prefix">
            {{ mode === 'login' ? '邮箱地址 · ADDRESS' : '注册邮箱 · ADDRESS' }}
          </label>
          <div class="addr-row">
            <input
              id="prefix"
              v-model="prefix"
              class="input"
              type="text"
              spellcheck="false"
              placeholder="your-name"
              required
            />
            <select v-if="domains.length > 1" v-model="suffix" class="input addr-suffix">
              <option v-for="d in domains" :key="d" :value="d">{{ d }}</option>
            </select>
            <span v-else class="addr-suffix">{{ currentSuffix }}</span>
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="password">密码 · PASSWORD</label>
          <input id="password" v-model="password" class="input" type="password" required />
        </div>

        <div v-if="mode === 'register' && needInvite" class="field">
          <label class="field__label" for="invite">邀请码 · INVITE CODE</label>
          <input id="invite" v-model="inviteCode" class="input" type="text" placeholder="例如 STSAS-8F2C" />
        </div>

        <!-- Turnstile 预留位：站点开启人机验证后把 widget 挂在这里 -->
        <div v-if="mode === 'register'" id="turnstile-slot" class="turnstile-slot" aria-hidden="true"></div>

        <p v-if="error" class="field__error">{{ error }}</p>

        <button class="btn btn--primary login-submit" type="submit" :disabled="busy">
          {{ busy ? '处 理 中…' : mode === 'login' ? '进 入 邮 箱' : '注 册 并 登 录' }}
        </button>

        <p class="login-links">
          <template v-if="mode === 'login'">
            <a v-if="canRegister" href="#" @click.prevent="switchMode('register')">注册邮箱</a>
            <span v-if="canRegister">·</span>
          </template>
          <template v-else>
            <a href="#" @click.prevent="switchMode('login')">返回登录</a>
            <span>·</span>
          </template>
          <a href="https://starlightsacredsanctuary.top/">返回星光圣域</a>
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.addr-row { display: flex; align-items: stretch; }
.addr-row .input { flex: 1 1 auto; border-top-right-radius: 0; border-bottom-right-radius: 0; }
.addr-suffix {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  font-size: 14px;
  letter-spacing: 1px;
  color: var(--mail-fg-sub);
  background: var(--ctl-bg);
  border: 1px solid var(--ctl-border);
  border-left: 0;
  border-radius: 0 var(--ctl-radius) var(--ctl-radius) 0;
  white-space: nowrap;
}
select.addr-suffix { appearance: none; cursor: pointer; }
.turnstile-slot { display: none; }
</style>

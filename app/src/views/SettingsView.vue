<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const password = ref('')
const confirm = ref('')
const status = ref('')
const busy = ref(false)

const account = computed(() => auth.currentAccount)

async function savePassword() {
  if (busy.value) return
  status.value = ''
  if (password.value.length < 8) {
    status.value = '新密码至少 8 位'
    return
  }
  if (password.value !== confirm.value) {
    status.value = '两次输入不一致'
    return
  }
  busy.value = true
  try {
    await api.resetPassword(password.value)
    status.value = '密码已更新'
    password.value = ''
    confirm.value = ''
  } catch (err) {
    status.value = err?.message || '修改失败'
  } finally {
    busy.value = false
  }
}

async function doLogout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <main class="screen screen--settings">
    <div class="settings-wrap">
      <aside class="panel panel--tight settings-nav">
        <router-link class="side-item" to="/">返回收件箱</router-link>
        <a class="side-item" href="#" aria-current="true">账户</a>
      </aside>

      <section class="panel settings-main">
        <h2 class="settings-title">账户 · ACCOUNT</h2>
        <p class="meta">
          当前收件账户 {{ account?.email || '—' }} · 用户 {{ auth.user?.email || '—' }}
        </p>

        <div class="setting-row">
          <div>
            <p class="setting-row__name">发件额度</p>
            <p class="meta">已发送 {{ auth.user?.sendCount ?? 0 }} 封 · 角色 {{ auth.user?.role?.name || '—' }}</p>
          </div>
          <span class="meta">{{ auth.user?.role?.sendType === 'day' ? '按日' : '按量' }}</span>
        </div>

        <div class="setting-row">
          <div>
            <p class="setting-row__name">当前账户结构</p>
            <p class="meta">共 {{ auth.accounts.length }} 个收件账户 · 聚合收信 {{ Number(account?.allReceive || 0) ? '开启' : '关闭' }}</p>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <p class="setting-row__name">修改密码</p>
            <p class="meta">至少 8 位；修改后所有设备需要重新登录</p>
          </div>
        </div>

        <div class="settings-form" style="display: flex; gap: 12px; align-items: flex-end; margin-top: 8px">
          <div class="field" style="flex: 1 1 auto">
            <label class="field__label" for="np">新密码</label>
            <input id="np" v-model="password" class="input" type="password" autocomplete="new-password" />
          </div>
          <div class="field" style="flex: 1 1 auto">
            <label class="field__label" for="nc">确认密码</label>
            <input id="nc" v-model="confirm" class="input" type="password" autocomplete="new-password" />
          </div>
          <button class="btn" type="button" :disabled="busy" @click="savePassword">保 存</button>
        </div>
        <p v-if="status" class="meta" style="margin-top: 10px">{{ status }}</p>

        <div class="setting-row" style="margin-top: 24px">
          <div>
            <p class="setting-row__name">退出登录</p>
            <p class="meta">清除本机 token</p>
          </div>
          <button class="btn btn--danger" type="button" @click="doLogout">退 出</button>
        </div>
      </section>
    </div>
  </main>
</template>

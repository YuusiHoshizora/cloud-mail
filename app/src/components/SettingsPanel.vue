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
  <section class="pane pane--panel panel">
    <div class="admin-head">
      <h2 class="admin-title">设置 · SETTINGS</h2>
    </div>

    <p class="meta" style="margin: 0 0 18px">
      当前收件账户 {{ account?.email || '—' }} · 用户 {{ auth.user?.email || '—' }}
    </p>

    <div class="setting-row">
      <div>
        <p class="setting-row__name">发件额度</p>
        <p class="meta">已发送 {{ auth.user?.sendCount ?? 0 }} 封 · 规则 {{ auth.user?.role?.sendType === 'day' ? '按日' : '按量' }}</p>
      </div>
      <span class="meta">{{ auth.user?.role?.name || '—' }}</span>
    </div>

    <div class="setting-row">
      <div>
        <p class="setting-row__name">收件账户</p>
        <p class="meta">共 {{ auth.accounts.length }} 个 · 聚合收信 {{ Number(account?.allReceive || 0) ? '开启' : '关闭' }}</p>
      </div>
      <span class="meta">{{ account?.email || '—' }}</span>
    </div>

    <div class="setting-row">
      <div>
        <p class="setting-row__name">修改密码</p>
        <p class="meta">至少 8 位；修改后其他设备需要用新密码重新登录</p>
      </div>
    </div>

    <div class="form-grid" style="margin-top: 14px">
      <div class="field">
        <label class="field__label">新密码</label>
        <input v-model="password" class="input" type="password" autocomplete="new-password" />
      </div>
      <div class="field">
        <label class="field__label">确认新密码</label>
        <input v-model="confirm" class="input" type="password" autocomplete="new-password" />
      </div>
    </div>

    <div class="admin-tools">
      <button class="btn btn--enter" type="button" :disabled="busy" @click="savePassword">保 存</button>
      <span v-if="status" class="meta">{{ status }}</span>
    </div>

    <div class="setting-row" style="margin-top: 26px">
      <div>
        <p class="setting-row__name">退出登录</p>
        <p class="meta">清除本机保存的 token</p>
      </div>
      <button class="btn btn--danger" type="button" @click="doLogout">退 出</button>
    </div>
  </section>
</template>

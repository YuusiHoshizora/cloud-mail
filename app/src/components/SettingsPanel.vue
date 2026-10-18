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

const accountMsg = ref('')
const newEmail = ref('')
const addBusy = ref(false)
const editingId = ref(null)
const editName = ref('')

const account = computed(() => auth.currentAccount)

async function reloadAccounts() {
  try {
    auth.accounts = await api.accountList({ size: 50 })
  } catch (err) {
    accountMsg.value = err?.message || '账户列表刷新失败'
  }
}

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

/* ---------------------------------------------------------- 账户管理 */
function startRename(row) {
  editingId.value = row.accountId
  editName.value = row.name || ''
}

async function submitRename(row) {
  try {
    await api.accountSetName(row.accountId, editName.value.trim())
    row.name = editName.value.trim()
    editingId.value = null
    accountMsg.value = '名称已更新'
  } catch (err) {
    accountMsg.value = err?.message || '改名失败'
  }
}

async function toggleAllReceive(row) {
  try {
    await api.accountSetAllReceive(row.accountId)
    await reloadAccounts()
    accountMsg.value = '聚合收信已切换'
  } catch (err) {
    accountMsg.value = err?.message || '切换失败'
  }
}

async function pinAccount(row) {
  try {
    await api.accountSetAsTop(row.accountId)
    await reloadAccounts()
    accountMsg.value = `已置顶 ${row.email}`
  } catch (err) {
    accountMsg.value = err?.message || '置顶失败'
  }
}

async function removeAccount(row) {
  if (!window.confirm(`删除收件账户 ${row.email}？该账户下的邮件会一并不可见。`)) return
  try {
    await api.accountDelete(row.accountId)
    await reloadAccounts()
    accountMsg.value = '账户已删除'
  } catch (err) {
    accountMsg.value = err?.message || '删除失败'
  }
}

async function addAccount() {
  const email = newEmail.value.trim()
  if (!email) {
    accountMsg.value = '请填写完整邮箱地址'
    return
  }
  addBusy.value = true
  accountMsg.value = ''
  try {
    /* 后端 /account/add 需要 token（验证码换取）；站点若关闭了添加验证，传空即可 */
    await api.accountAdd(email, '')
    newEmail.value = ''
    await reloadAccounts()
    accountMsg.value = `已添加 ${email}`
  } catch (err) {
    accountMsg.value = err?.message || '添加失败（若站点开启了「添加邮箱验证」，需要先走验证码流程）'
  } finally {
    addBusy.value = false
  }
}

async function deleteSelf() {
  if (!window.confirm('注销当前账号并删除其全部数据？此操作不可撤销。')) return
  try {
    await api.userDeleteSelf()
    await auth.logout()
    router.replace({ name: 'login' })
  } catch (err) {
    status.value = err?.message || '注销失败'
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
      <span v-if="accountMsg" class="meta">{{ accountMsg }}</span>
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

    <!-- 账户管理 -->
    <h3 class="settings-subtitle" style="margin-top: 26px">收件账户</h3>
    <table class="table">
      <thead>
        <tr><th>邮箱</th><th>名称</th><th>聚合收信</th><th>置顶</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="row in auth.accounts" :key="row.accountId">
          <td>{{ row.email }}</td>
          <td>
            <template v-if="editingId === row.accountId">
              <input v-model="editName" class="input input--inline" type="text" placeholder="名称" />
            </template>
            <template v-else>{{ row.name || '—' }}</template>
          </td>
          <td><span class="dot" :class="{ 'dot--off': !Number(row.allReceive) }"></span>{{ Number(row.allReceive) ? '开' : '关' }}</td>
          <td>{{ Number(row.sort) ? '是' : '—' }}</td>
          <td class="actions">
            <template v-if="editingId === row.accountId">
              <button class="btn btn--xs" type="button" @click="submitRename(row)">保存</button>
              <button class="btn btn--xs" type="button" @click="editingId = null">取消</button>
            </template>
            <template v-else>
              <button class="btn btn--xs" type="button" @click="startRename(row)">改名</button>
              <button class="btn btn--xs" type="button" @click="toggleAllReceive(row)">聚合</button>
              <button class="btn btn--xs" type="button" @click="pinAccount(row)">置顶</button>
              <button class="btn btn--xs btn--danger" type="button" @click="removeAccount(row)">删除</button>
            </template>
          </td>
        </tr>
        <tr v-if="!auth.accounts.length"><td colspan="5" class="empty-hint">还没有收件账户</td></tr>
      </tbody>
    </table>

    <div class="admin-tools" style="margin-top: 14px">
      <input v-model="newEmail" class="input input--search" type="email" placeholder="新邮箱，例如 hello@stsas.top" @keyup.enter="addAccount" />
      <button class="btn btn--slim" type="button" :disabled="addBusy" @click="addAccount">添 加 账 户</button>
    </div>

    <!-- 改密 -->
    <h3 class="settings-subtitle" style="margin-top: 26px">修改密码</h3>
    <p class="meta" style="margin: 0 0 12px">至少 8 位；修改后其他设备需要用新密码重新登录</p>
    <div class="form-grid">
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
      <button class="btn btn--enter" type="button" :disabled="busy" @click="savePassword">保 存 密 码</button>
      <span v-if="status" class="meta">{{ status }}</span>
    </div>

    <!-- 危险操作 -->
    <h3 class="settings-subtitle" style="margin-top: 30px">账号</h3>
    <div class="setting-row">
      <div>
        <p class="setting-row__name">退出登录</p>
        <p class="meta">清除本机保存的 token，可随时重新登录</p>
      </div>
      <button class="btn" type="button" @click="doLogout">退 出</button>
    </div>
    <div class="setting-row">
      <div>
        <p class="setting-row__name">注销账号</p>
        <p class="meta">删除账号及其全部邮件、账户，不可撤销</p>
      </div>
      <button class="btn btn--danger" type="button" @click="deleteSelf">注 销</button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { allowedSections, toList, toTotal } from '@/lib/perm'
import { cvtR2Url, formatDateTime } from '@/lib/url'

const props = defineProps({ section: { type: String, default: '' } })

const auth = useAuthStore()

const sections = computed(() => allowedSections(auth.user))
const active = computed(() => {
  if (props.section && sections.value.some((s) => s.key === props.section)) return props.section
  return sections.value[0]?.key || ''
})
const activeLabel = computed(() => sections.value.find((s) => s.key === active.value)?.label || '')

const busy = ref(false)
const message = ref('')
const error = ref('')

function note(text) {
  message.value = text
  error.value = ''
  setTimeout(() => { if (message.value === text) message.value = '' }, 2600)
}
function fail(err) {
  error.value = err?.message || '操作失败'
  message.value = ''
}

/* ------------------------------------------------------------ 用户 */
const users = reactive({ list: [], total: 0, num: 1, size: 20, email: '', status: -1, isDel: 0 })

const userEditor = reactive({
  open: false,
  mode: 'add',
  userId: null,
  email: '',
  password: '',
  type: 1
})

const rolesForPicker = ref([])

async function ensureRoles() {
  if (rolesForPicker.value.length) return
  try {
    rolesForPicker.value = toList(await api.roleList())
  } catch {
    rolesForPicker.value = []
  }
}

async function loadUsers() {
  busy.value = true
  try {
    await ensureRoles()
    const data = await api.userList({
      num: users.num,
      size: users.size,
      email: users.email || undefined,
      status: Number(users.status),
      isDel: Number(users.isDel),
      timeSort: 0
    })
    users.list = toList(data)
    users.total = toTotal(data, users.list.length)
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function roleName(type) {
  const found = rolesForPicker.value.find((role) => role.roleId === type)
  return found ? found.name : `角色 #${type}`
}

function openAddUser() {
  Object.assign(userEditor, { open: true, mode: 'add', userId: null, email: '', password: '', type: rolesForPicker.value[0]?.roleId ?? 1 })
}

function openEditUser(row) {
  Object.assign(userEditor, { open: true, mode: 'edit', userId: row.userId, email: row.email, password: '', type: row.type })
}

function closeUserEditor() {
  userEditor.open = false
}

async function saveUser() {
  if (userEditor.mode === 'add') {
    if (!userEditor.email.trim()) {
      error.value = '请填写完整邮箱地址'
      return
    }
    if (String(userEditor.password).length < 6) {
      error.value = '初始密码至少 6 位'
      return
    }
    busy.value = true
    try {
      await api.userAdd({
        email: userEditor.email.trim(),
        type: Number(userEditor.type),
        password: userEditor.password
      })
      note('用户已创建')
      userEditor.open = false
      await loadUsers()
    } catch (err) {
      fail(err)
    } finally {
      busy.value = false
    }
    return
  }

  /* 编辑：密码留空表示不改 */
  busy.value = true
  try {
    if (userEditor.password) {
      if (String(userEditor.password).length < 6) throw new Error('新密码至少 6 位')
      await api.userSetPwd(userEditor.userId, userEditor.password)
    }
    await api.userSetType(userEditor.userId, Number(userEditor.type))
    note(`已更新 ${userEditor.email}`)
    userEditor.open = false
    await loadUsers()
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

async function restoreUser(row) {
  try {
    await api.userRestore(row.userId, 1)
    note(`已恢复 ${row.email}`)
    await loadUsers()
  } catch (err) {
    fail(err)
  }
}

async function setUserStatus(row) {
  const next = row.status === 0 ? 1 : 0
  try {
    await api.userSetStatus(row.userId, next)
    row.status = next
    note(next === 0 ? `已启用 ${row.email}` : `已禁用 ${row.email}`)
  } catch (err) {
    fail(err)
  }
}

async function resetSendCount(row) {
  try {
    await api.userResetSendCount(row.userId)
    row.sendCount = 0
    note(`已重置 ${row.email} 的发送计数`)
  } catch (err) {
    fail(err)
  }
}

async function removeUser(row) {
  if (!window.confirm(`确定删除用户 ${row.email}？此操作不可撤销。`)) return
  try {
    await api.userDelete([row.userId])
    note('用户已删除')
    await loadUsers()
  } catch (err) {
    fail(err)
  }
}

/* ------------------------------------------------------------ 全站邮件 */
const mails = reactive({ list: [], total: 0, subject: '', userEmail: '', cursor: '' })

async function loadMails(reset = true) {
  busy.value = true
  try {
    if (reset) mails.cursor = ''
    const data = await api.allEmailList({
      emailId: mails.cursor || undefined,
      size: 20,
      subject: mails.subject || undefined,
      userEmail: mails.userEmail || undefined,
      type: 0,
      timeSort: 0
    })
    const list = toList(data)
    mails.list = reset ? list : [...mails.list, ...list]
    mails.total = toTotal(data, mails.list.length)
    mails.cursor = list.length ? list[list.length - 1].emailId : mails.cursor
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

async function removeMail(row) {
  if (!window.confirm(`删除邮件《${row.subject || '(无主题)'}》？`)) return
  try {
    await api.allEmailDelete([row.emailId])
    mails.list = mails.list.filter((m) => m.emailId !== row.emailId)
    note('邮件已删除')
  } catch (err) {
    fail(err)
  }
}

/* ------------------------------------------------------------ 邀请码 */
const invites = reactive({ list: [], code: '', count: 5, roleId: 0 })

async function loadInvites() {
  busy.value = true
  try {
    invites.list = toList(await api.regKeyList({}))
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = 'STSAS-'
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  invites.code = out
}

async function addInvite() {
  if (!invites.code.trim()) {
    error.value = '先填一个邀请码（可点“随机生成”）'
    return
  }
  try {
    await api.regKeyAdd({
      code: invites.code.trim(),
      roleId: Number(invites.roleId) || 0,
      count: Number(invites.count) || 1
    })
    note('邀请码已创建')
    invites.code = ''
    await loadInvites()
  } catch (err) {
    fail(err)
  }
}

async function removeInvite(row) {
  if (!window.confirm(`删除邀请码 ${row.code}？`)) return
  try {
    await api.regKeyDelete([row.regKeyId])
    invites.list = invites.list.filter((k) => k.regKeyId !== row.regKeyId)
    note('邀请码已删除')
  } catch (err) {
    fail(err)
  }
}

/* ------------------------------------------------------------ 角色 */
const roles = ref([])
const permTree = ref([])

const roleEditor = reactive({
  open: false,
  roleId: null,
  name: '',
  sendType: 'count',
  sendCount: 0,
  accountCount: 0,
  banEmail: '',
  availDomain: '',
  permIds: []
})

async function loadRoles() {
  busy.value = true
  try {
    const [list, tree] = await Promise.all([api.roleList(), api.rolePermTree()])
    roles.value = toList(list)
    permTree.value = toList(tree)
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function startCreateRole() {
  Object.assign(roleEditor, {
    open: true,
    roleId: null,
    name: '',
    sendType: 'count',
    sendCount: 50,
    accountCount: 2,
    banEmail: '',
    availDomain: '',
    permIds: []
  })
}

function startEditRole(row) {
  Object.assign(roleEditor, {
    open: true,
    roleId: row.roleId,
    name: row.name || '',
    sendType: row.sendType || 'count',
    sendCount: Number(row.sendCount ?? 0),
    accountCount: Number(row.accountCount ?? 0),
    banEmail: (row.banEmail || []).join(', '),
    availDomain: (row.availDomain || []).join(', '),
    permIds: [...(row.permIds || [])]
  })
}

function closeRoleEditor() {
  roleEditor.open = false
}

function hasPermId(permId) {
  return roleEditor.permIds.includes(permId)
}

function togglePermId(permId) {
  roleEditor.permIds = hasPermId(permId)
    ? roleEditor.permIds.filter((id) => id !== permId)
    : [...roleEditor.permIds, permId]
}

function toggleGroup(group) {
  const ids = (group.children || []).map((child) => child.permId)
  const allIn = ids.every((id) => roleEditor.permIds.includes(id))
  roleEditor.permIds = allIn
    ? roleEditor.permIds.filter((id) => !ids.includes(id))
    : [...new Set([...roleEditor.permIds, ...ids])]
}

function splitEmails(text) {
  return String(text || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function saveRole() {
  if (!roleEditor.name.trim()) {
    error.value = '角色名称不能为空'
    return
  }
  const payload = {
    name: roleEditor.name.trim(),
    sendType: roleEditor.sendType,
    sendCount: Number(roleEditor.sendCount) || 0,
    accountCount: Number(roleEditor.accountCount) || 0,
    banEmail: splitEmails(roleEditor.banEmail),
    availDomain: splitEmails(roleEditor.availDomain),
    permIds: roleEditor.permIds
  }
  busy.value = true
  try {
    if (roleEditor.roleId) {
      await api.roleSet({ ...payload, roleId: roleEditor.roleId })
      note('角色已更新')
    } else {
      await api.roleAdd(payload)
      note('角色已创建')
    }
    roleEditor.open = false
    await loadRoles()
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

async function setDefaultRole(row) {
  try {
    await api.roleSetDefault(row.roleId)
    await loadRoles()
    note(`默认角色已设为 ${row.name}`)
  } catch (err) {
    fail(err)
  }
}

async function removeRole(row) {
  if (!window.confirm(`删除角色「${row.name}」？该角色下的用户会失去对应权限。`)) return
  try {
    await api.roleDelete(row.roleId)
    await loadRoles()
    note('角色已删除')
  } catch (err) {
    fail(err)
  }
}

/* ------------------------------------------------------------ 统计 */
const analysis = ref(null)

async function loadAnalysis() {
  busy.value = true
  try {
    analysis.value = await api.analysisEcharts(
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
    )
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

/** 统计接口里有的字段是数字，有的是对象（如 numberCount.receiveTotal） */
function pick(source, keys = [], fallback = '—') {
  if (source === null || source === undefined) return fallback
  if (typeof source === 'number' || typeof source === 'string') return source
  for (const key of keys) {
    const value = source[key]
    if (value !== null && value !== undefined) return value
  }
  return fallback
}
function bars(source) {
  const list = Array.isArray(source)
    ? source
    : Object.entries(source || {}).map(([date, total]) => ({ date, total }))
  const max = Math.max(1, ...list.map((item) => Number(item.total) || 0))
  return list.map((item) => ({
    date: String(item.date || '').slice(-5),
    total: Number(item.total) || 0,
    height: Math.round(((Number(item.total) || 0) / max) * 100)
  }))
}

/* ------------------------------------------------------------ 系统设置 */
const settings = reactive({ form: null, patch: {}, backgroundPreview: '' })
const bgBusy = ref(false)
const bgSrc = computed(() => cvtR2Url(settings.form?.background))
const bgFileEl = ref(null)

/* 开关语义（后端 entity-const）：0 = 开，1 = 关 */
const VERIFY_OPTIONS = [
  { value: 0, label: '总是需要人机验证' },
  { value: 1, label: '不验证' },
  { value: 2, label: '达到次数后才验证' }
]

const SETTING_GROUPS = [
  {
    title: '站点信息',
    fields: [
      { key: 'title', label: '站点标题', type: 'text' },
      { key: 'minEmailPrefix', label: '邮箱前缀最小长度', type: 'number' },
      { key: 'loginOpacity', label: '登录页卡片透明度', type: 'number', step: '0.01' },
      { key: 'loginDomain', label: '登录页选择域名', type: 'switch' },
      { key: 'autoRefresh', label: '收件自动刷新', type: 'switch' },
      { key: 'noRecipient', label: '允许发往不存在的收件人', type: 'switch' }
    ]
  },
  {
    title: '注册与发信',
    fields: [
      { key: 'register', label: '开放注册', type: 'switch' },
      { key: 'regKey', label: '邀请码模式', type: 'select', options: [
        { value: 0, label: '必须邀请码' },
        { value: 1, label: '关闭邀请码' },
        { value: 2, label: '邀请码可选' }
      ] },
      { key: 'addEmail', label: '允许添加邮箱', type: 'switch' },
      { key: 'manyEmail', label: '允许多邮箱', type: 'switch' },
      { key: 'send', label: '允许发信', type: 'switch' },
      { key: 'receive', label: '允许收信', type: 'switch' },
      { key: 'registerVerify', label: '注册人机验证', type: 'select', options: VERIFY_OPTIONS },
      { key: 'addEmailVerify', label: '添加邮箱人机验证', type: 'select', options: VERIFY_OPTIONS },
      { key: 'regVerifyCount', label: '注册验证触发次数', type: 'number' },
      { key: 'addVerifyCount', label: '添加邮箱验证触发次数', type: 'number' },
      { key: 'siteKey', label: 'Turnstile 站点密钥', type: 'secret' },
      { key: 'secretKey', label: 'Turnstile 私钥', type: 'secret' }
    ]
  },
  {
    title: '公告',
    fields: [
      { key: 'notice', label: '显示公告', type: 'switch' },
      { key: 'noticeTitle', label: '公告标题', type: 'text' },
      { key: 'noticeContent', label: '公告内容（支持 HTML）', type: 'textarea' },
      { key: 'noticeType', label: '公告类型', type: 'text' },
      { key: 'noticeDuration', label: '停留时长（秒）', type: 'number' },
      { key: 'noticePosition', label: '位置', type: 'text' },
      { key: 'noticeWidth', label: '宽度', type: 'number' },
      { key: 'noticeOffset', label: '偏移', type: 'number' }
    ]
  },
  {
    title: '存储与附件',
    fields: [
      { key: 'r2Domain', label: 'R2 自定义域（留空走同源）', type: 'text' },
      { key: 'bucket', label: 'S3 桶名', type: 'text' },
      { key: 'region', label: 'S3 区域', type: 'text' },
      { key: 'endpoint', label: 'S3 Endpoint', type: 'text' },
      { key: 'customDomain', label: 'S3 自定义域', type: 'text' },
      { key: 's3AccessKey', label: 'S3 AccessKey', type: 'secret' },
      { key: 's3SecretKey', label: 'S3 SecretKey', type: 'secret' },
      { key: 'forcePathStyle', label: '强制 Path-Style', type: 'switch' }
    ]
  },
  {
    title: '转发与通知',
    fields: [
      { key: 'forwardEmail', label: '转发目标邮箱', type: 'text' },
      { key: 'forwardStatus', label: '开启转发', type: 'switch' },
      { key: 'ruleEmail', label: '规则匹配地址', type: 'text' },
      { key: 'ruleType', label: '规则类型（0 全部 / 1 规则）', type: 'number' },
      { key: 'tgChatId', label: 'Telegram Chat ID', type: 'text' },
      { key: 'tgBotToken', label: 'Telegram Bot Token', type: 'secret' },
      { key: 'tgBotStatus', label: '开启 Telegram 通知', type: 'switch' }
    ]
  }
]

async function loadSettings() {
  busy.value = true
  try {
    settings.form = await api.settingQuery()
    settings.patch = {}
    settings.backgroundPreview = ''
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function fieldValue(field) {
  if (field.type === 'secret') return ''
  return settings.form?.[field.key] ?? ''
}

function setField(key, value) {
  settings.patch[key] = value
  if (settings.form) settings.form[key] = value
}

function toggleSwitch(key) {
  const current = Number(settings.form?.[key] ?? 1)
  setField(key, current === 0 ? 1 : 0)
}

function isSwitchOn(key) {
  return Number(settings.form?.[key] ?? 0) === 0
}

async function onBackgroundFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 4 * 1024 * 1024) {
    error.value = '背景图建议小于 4 MB'
    return
  }
  bgBusy.value = true
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await api.settingSetBackground(dataUrl)
    await loadSettings()
    note('背景图已更新')
  } catch (err) {
    fail(err)
  } finally {
    bgBusy.value = false
  }
}

async function removeBackground() {
  bgBusy.value = true
  try {
    await api.settingDeleteBackground()
    await loadSettings()
    note('背景图已删除')
  } catch (err) {
    fail(err)
  } finally {
    bgBusy.value = false
  }
}

async function saveSettings() {
  if (!Object.keys(settings.patch).length) {
    error.value = '没有改动'
    return
  }
  busy.value = true
  try {
    await api.settingSet(settings.patch)
    note(`已保存 ${Object.keys(settings.patch).length} 个字段`)
    await loadSettings()
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

/* ------------------------------------------------------------ 调度 */
function loadSection() {
  message.value = ''
  error.value = ''
  if (active.value === 'users') loadUsers()
  if (active.value === 'all-mail') loadMails(true)
  if (active.value === 'invite') loadInvites()
  if (active.value === 'roles') loadRoles()
  if (active.value === 'analysis') loadAnalysis()
  if (active.value === 'setting') loadSettings()
}

onMounted(loadSection)
watch(active, () => {
  if (active.value) loadSection()
})
</script>

<template>
  <section class="pane pane--admin panel">
    <div class="admin-head">
      <h2 class="admin-title">{{ activeLabel }}</h2>
      <span v-if="busy" class="meta">加载中…</span>
      <span v-if="message" class="meta">{{ message }}</span>
      <span v-if="error" class="field__error">{{ error }}</span>
    </div>

        <!-- 用户 -->
    <template v-if="active === 'users'">
      <div class="admin-tools">
        <input v-model="users.email" class="input input--search" type="search" placeholder="按邮箱搜索" @keyup.enter="users.num = 1; loadUsers()" />
        <select v-model="users.status" class="input input--search" style="max-width: 130px" @change="users.num = 1; loadUsers()">
          <option :value="-1">全部状态</option>
          <option :value="0">正常</option>
          <option :value="1">已禁用</option>
        </select>
        <select v-model="users.isDel" class="input input--search" style="max-width: 130px" @change="users.num = 1; loadUsers()">
          <option :value="0">未删除</option>
          <option :value="1">已删除</option>
        </select>
        <button class="btn btn--slim" type="button" @click="users.num = 1; loadUsers()">搜 索</button>
        <button class="btn btn--slim btn--primary" type="button" @click="openAddUser">添 加 用 户</button>
      </div>

      <table class="table">
        <thead><tr><th>邮箱</th><th>名称</th><th>角色</th><th>状态</th><th>已发送</th><th>注册时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in users.list" :key="row.userId">
            <td>{{ row.email }}</td>
            <td>{{ row.name || '—' }}</td>
            <td>{{ roleName(row.type) }}</td>
            <td><span class="dot" :class="{ 'dot--off': row.status !== 0 }"></span>{{ row.status === 0 ? '正常' : '已禁用' }}</td>
            <td>{{ row.sendCount ?? 0 }}</td>
            <td class="meta">{{ formatDateTime(row.createTime) }}</td>
            <td class="actions">
              <template v-if="Number(users.isDel) === 1">
                <button class="btn btn--xs" type="button" @click="restoreUser(row)">恢复</button>
              </template>
              <template v-else>
                <button class="btn btn--xs" type="button" @click="openEditUser(row)">编辑</button>
                <button class="btn btn--xs" type="button" @click="setUserStatus(row)">{{ row.status === 0 ? '禁用' : '启用' }}</button>
                <button class="btn btn--xs" type="button" @click="resetSendCount(row)">重置计数</button>
                <button class="btn btn--xs btn--danger" type="button" @click="removeUser(row)">删除</button>
              </template>
            </td>
          </tr>
          <tr v-if="!users.list.length"><td colspan="7" class="empty-hint">{{ Number(users.isDel) === 1 ? '没有已删除的用户' : '没有用户' }}</td></tr>
        </tbody>
      </table>

      <div class="pager">
        <button class="btn btn--xs" type="button" :disabled="users.num <= 1" @click="users.num--; loadUsers()">上一页</button>
        <span class="meta">第 {{ users.num }} 页 · 共 {{ users.total }} 个</span>
        <button class="btn btn--xs" type="button" :disabled="users.list.length < users.size" @click="users.num++; loadUsers()">下一页</button>
      </div>

      <div v-if="userEditor.open" class="role-editor">
        <h3 class="settings-subtitle">{{ userEditor.mode === 'add' ? '添加用户' : `编辑 · ${userEditor.email}` }}</h3>
        <div class="form-grid">
          <div class="field">
            <label class="field__label">邮箱地址</label>
            <input v-model="userEditor.email" class="input" type="email" :readonly="userEditor.mode === 'edit'" placeholder="someone@stsas.top" />
          </div>
          <div class="field">
            <label class="field__label">{{ userEditor.mode === 'add' ? '初始密码（至少 6 位）' : '重置密码（留空不修改）' }}</label>
            <input v-model="userEditor.password" class="input" type="text" autocomplete="new-password" />
          </div>
          <div class="field">
            <label class="field__label">角色</label>
            <select v-model="userEditor.type" class="input">
              <option v-for="role in rolesForPicker" :key="role.roleId" :value="role.roleId">{{ role.name }}</option>
            </select>
          </div>
        </div>
        <div class="admin-tools" style="margin-top: 14px">
          <button class="btn btn--enter" type="button" :disabled="busy" @click="saveUser">保 存</button>
          <button class="btn btn--ghost btn--slim" type="button" @click="closeUserEditor">取 消</button>
          <span v-if="userEditor.mode === 'edit'" class="meta">改密码会踢掉该用户所有已登录设备</span>
        </div>
      </div>
    </template>

    <!-- 全站邮件 -->
    <template v-else-if="active === 'all-mail'">
      <div class="admin-tools">
        <input v-model="mails.subject" class="input input--search" type="search" placeholder="按主题搜索" />
        <input v-model="mails.userEmail" class="input input--search" type="search" placeholder="按账户邮箱过滤" />
        <button class="btn btn--slim" type="button" @click="loadMails(true)">搜 索</button>
      </div>
      <table class="table">
        <thead><tr><th>发件人</th><th>主题</th><th>收件账户</th><th>时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in mails.list" :key="row.emailId">
            <td>{{ row.name || row.sendEmail }}</td>
            <td>{{ row.subject || '(无主题)' }}</td>
            <td class="meta">{{ row.toEmail || '—' }}</td>
            <td class="meta">{{ formatDateTime(row.createTime) }}</td>
            <td class="actions"><button class="btn btn--xs btn--danger" type="button" @click="removeMail(row)">删除</button></td>
          </tr>
          <tr v-if="!mails.list.length"><td colspan="5" class="empty-hint">没有邮件</td></tr>
        </tbody>
      </table>
      <div class="pager">
        <span class="meta">已加载 {{ mails.list.length }} / {{ mails.total }}</span>
        <button class="btn btn--xs" type="button" :disabled="mails.list.length >= mails.total" @click="loadMails(false)">加载更多</button>
      </div>
    </template>

    <!-- 邀请码 -->
    <template v-else-if="active === 'invite'">
      <div class="admin-tools">
        <input v-model="invites.code" class="input input--search" type="text" placeholder="邀请码，例如 STSAS-8F2C" />
        <button class="btn btn--slim" type="button" @click="randomCode">随机生成</button>
        <input v-model="invites.count" class="input input--search" type="number" min="1" style="max-width: 110px" placeholder="次数" />
        <button class="btn btn--slim btn--primary" type="button" @click="addInvite">创 建</button>
      </div>
      <table class="table">
        <thead><tr><th>邀请码</th><th>角色</th><th>额度</th><th>已用</th><th>创建时间</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in invites.list" :key="row.regKeyId">
            <td>{{ row.code }}</td>
            <td>{{ row.roleName || row.roleId || '—' }}</td>
            <td>{{ row.count ?? '—' }}</td>
            <td>{{ row.usedCount ?? row.useCount ?? 0 }}</td>
            <td class="meta">{{ formatDateTime(row.createTime) }}</td>
            <td class="actions"><button class="btn btn--xs btn--danger" type="button" @click="removeInvite(row)">删除</button></td>
          </tr>
          <tr v-if="!invites.list.length"><td colspan="6" class="empty-hint">还没有邀请码</td></tr>
        </tbody>
      </table>
    </template>

    <!-- 角色 -->
        <!-- 角色 -->
    <template v-else-if="active === 'roles'">
      <div class="admin-tools">
        <button class="btn btn--slim" type="button" @click="startCreateRole">新 建 角 色</button>
        <span class="meta">权限点来自 /role/permTree，勾选后保存即生效</span>
      </div>

      <table class="table">
        <thead><tr><th>ID</th><th>名称</th><th>默认</th><th>发信</th><th>账户数</th><th>权限</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in roles" :key="row.roleId">
            <td>{{ row.roleId }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.isDefault ? '是' : '—' }}</td>
            <td class="meta">{{ row.sendCount ?? '不限' }} · {{ row.sendType === 'day' ? '按日' : '按量' }}</td>
            <td class="meta">{{ row.accountCount ?? '不限' }}</td>
            <td class="meta">{{ (row.permIds || []).length }} 项</td>
            <td class="actions">
              <button class="btn btn--xs" type="button" @click="startEditRole(row)">编辑</button>
              <button class="btn btn--xs" type="button" :disabled="!!row.isDefault" @click="setDefaultRole(row)">设默认</button>
              <button class="btn btn--xs btn--danger" type="button" :disabled="!!row.isDefault" @click="removeRole(row)">删除</button>
            </td>
          </tr>
          <tr v-if="!roles.length"><td colspan="7" class="empty-hint">没有角色</td></tr>
        </tbody>
      </table>

      <div v-if="roleEditor.open" class="role-editor">
        <h3 class="settings-subtitle">
          {{ roleEditor.roleId ? `编辑角色 · ${roleEditor.name}` : '新建角色' }}
        </h3>

        <div class="form-grid">
          <div class="field">
            <label class="field__label">名称</label>
            <input v-model="roleEditor.name" class="input" type="text" placeholder="例如 普通用户" />
          </div>
          <div class="field">
            <label class="field__label">发信规则</label>
            <select v-model="roleEditor.sendType" class="input">
              <option value="count">按量（总次数）</option>
              <option value="day">按日（每天次数）</option>
            </select>
          </div>
          <div class="field">
            <label class="field__label">发信额度</label>
            <input v-model="roleEditor.sendCount" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field__label">可绑定账户数</label>
            <input v-model="roleEditor.accountCount" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field__label">禁止发信的地址 / 域</label>
            <input v-model="roleEditor.banEmail" class="input" type="text" placeholder="逗号分隔，可用 *" />
          </div>
          <div class="field">
            <label class="field__label">可用域（留空=不限）</label>
            <input v-model="roleEditor.availDomain" class="input" type="text" placeholder="逗号分隔" />
          </div>
        </div>

        <p class="field__label" style="margin: 4px 0 10px">权限点</p>
        <div class="perm-tree">
          <div v-for="group in permTree" :key="group.permId" class="perm-group">
            <label class="perm-item perm-item--group">
              <input
                type="checkbox"
                :checked="(group.children || []).length > 0 && group.children.every((child) => hasPermId(child.permId))"
                @change="toggleGroup(group)"
              />
              <span>{{ group.name }}</span>
            </label>
            <div class="perm-children">
              <label v-for="child in group.children || []" :key="child.permId" class="perm-item">
                <input type="checkbox" :checked="hasPermId(child.permId)" @change="togglePermId(child.permId)" />
                <span>{{ child.name }}</span>
                <span class="meta">{{ child.permKey }}</span>
              </label>
            </div>
          </div>
          <p v-if="!permTree.length" class="meta">没有可分配的权限点</p>
        </div>

        <div class="admin-tools" style="margin-top: 18px">
          <button class="btn btn--enter" type="button" :disabled="busy" @click="saveRole">保 存 角 色</button>
          <button class="btn btn--ghost btn--slim" type="button" @click="closeRoleEditor">取 消</button>
          <span class="meta">已选 {{ roleEditor.permIds.length }} 个权限点</span>
        </div>
      </div>
    </template>

    <!-- 统计 -->
    <template v-else-if="active === 'analysis'">
      <div class="stat-row">
        <div class="stat-card"><span class="meta">用户总数</span><b>{{ pick(analysis?.numberCount, ['normalUserTotal', 'userTotal']) }}</b></div>
        <div class="stat-card"><span class="meta">账户总数</span><b>{{ pick(analysis?.numberCount, ['normalAccountTotal', 'accountTotal']) }}</b></div>
        <div class="stat-card"><span class="meta">累计收信</span><b>{{ pick(analysis?.numberCount, ['normalReceiveTotal', 'receiveTotal']) }}</b></div>
        <div class="stat-card"><span class="meta">累计发信</span><b>{{ pick(analysis?.numberCount, ['normalSendTotal', 'sendTotal']) }}</b></div>
        <div class="stat-card"><span class="meta">今日发送</span><b>{{ pick(analysis?.daySendTotal, []) }}</b></div>
      </div>

      <p class="meta">近 15 天新增用户</p>
      <div class="bars">
        <i v-for="item in bars(analysis?.userDayCount)" :key="'u' + item.date" :style="{ height: item.height + '%' }" :title="`${item.date} · ${item.total}`"></i>
      </div>

      <p class="meta">近 15 天收信</p>
      <div class="bars">
        <i v-for="item in bars(analysis?.emailDayCount?.receiveDayCount)" :key="'r' + item.date" :style="{ height: item.height + '%' }" :title="`${item.date} · ${item.total}`"></i>
      </div>

      <p class="meta">近 15 天发信</p>
      <div class="bars">
        <i v-for="item in bars(analysis?.emailDayCount?.sendDayCount)" :key="'s' + item.date" :style="{ height: item.height + '%' }" :title="`${item.date} · ${item.total}`"></i>
      </div>
    </template>

    <!-- 系统设置 -->
        <!-- 系统设置 -->
    <template v-else-if="active === 'setting'">
      <p class="meta" style="margin: 0 0 16px">
        只提交改动过的字段（后端为局部更新）。密钥类字段显示脱敏值，留空表示不修改。
      </p>

      <div v-for="group in SETTING_GROUPS" :key="group.title" class="setting-group">
        <h3 class="settings-subtitle">{{ group.title }}</h3>
        <div class="form-grid">
          <div
            v-for="field in group.fields"
            :key="field.key"
            class="field"
            :class="{ 'field--wide': field.type === 'textarea' }"
          >
            <label class="field__label">{{ field.label }}</label>

            <button
              v-if="field.type === 'switch'"
              class="switch"
              type="button"
              role="switch"
              :aria-checked="isSwitchOn(field.key)"
              @click="toggleSwitch(field.key)"
            ></button>

            <select
              v-else-if="field.type === 'select'"
              class="input"
              :value="Number(settings.form?.[field.key] ?? 0)"
              @change="setField(field.key, Number($event.target.value))"
            >
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <textarea
              v-else-if="field.type === 'textarea'"
              class="input textarea"
              rows="4"
              :value="settings.form?.[field.key] ?? ''"
              @change="setField(field.key, $event.target.value)"
            ></textarea>

            <input
              v-else-if="field.type === 'secret'"
              class="input"
              type="text"
              autocomplete="new-password"
              placeholder="已配置则显示脱敏值，留空表示不修改"
              @change="setField(field.key, $event.target.value)"
            />

            <input
              v-else
              class="input"
              :type="field.type === 'number' ? 'number' : 'text'"
              :step="field.step"
              :value="fieldValue(field)"
              @change="setField(field.key, field.type === 'number' ? Number($event.target.value) : $event.target.value)"
            />
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3 class="settings-subtitle">登录页背景</h3>
        <div class="bg-row">
          <div v-if="settings.form?.background" class="bg-thumb">
            <img :src="settings.backgroundPreview || bgSrc" alt="当前背景" />
          </div>
          <div class="bg-actions">
            <button class="btn btn--slim" type="button" :disabled="bgBusy" @click="bgFileEl?.click()">
              {{ bgBusy ? '处理中…' : (settings.form?.background ? '更换背景图' : '上传背景图') }}
            </button>
            <button
              v-if="settings.form?.background"
              class="btn btn--slim btn--danger"
              type="button"
              :disabled="bgBusy"
              @click="removeBackground"
            >删除背景</button>
            <input ref="bgFileEl" type="file" accept="image/*" hidden @change="onBackgroundFile" />
            <p class="meta" style="margin: 8px 0 0">建议 4 MB 以内；上传后走 R2 存储，删除时会一并清理对象</p>
          </div>
        </div>
      </div>

      <div class="setting-row" style="margin-top: 8px">
        <div>
          <p class="setting-row__name">邮件域（只读）</p>
          <p class="meta">
            来自 Worker 变量 <code>domain</code>：{{ (settings.form?.domainList || []).join('　') || '—' }}
          </p>
        </div>
      </div>

      <div class="admin-tools" style="margin-top: 20px">
        <button class="btn btn--enter" type="button" :disabled="busy" @click="saveSettings">保 存 改 动</button>
        <span class="meta">{{ Object.keys(settings.patch).length }} 个字段待保存</span>
      </div>
    </template>

    <p v-else class="empty-hint">没有可用的管理权限</p>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { allowedSections, toList, toTotal } from '@/lib/perm'
import { formatDateTime } from '@/lib/url'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sections = computed(() => allowedSections(auth.user))
const section = computed(() => {
  const key = route.params.section
  if (key && sections.value.some((s) => s.key === key)) return key
  return sections.value[0]?.key || ''
})
const sectionLabel = computed(() => sections.value.find((s) => s.key === section.value)?.label || '')

/* 各区块共用的小状态 */
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
const users = reactive({ list: [], total: 0, num: 1, size: 20, email: '' })

async function loadUsers() {
  busy.value = true
  try {
    const data = await api.userList({
      num: users.num,
      size: users.size,
      email: users.email || undefined,
      status: -1,
      isDel: 0,
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
    error.value = '先填一个邀请码（可点右边的“随机生成”）'
    return
  }
  try {
    await api.regKeyAdd({ code: invites.code.trim(), roleId: Number(invites.roleId) || 0, count: Number(invites.count) || 1 })
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

async function loadRoles() {
  busy.value = true
  try {
    roles.value = toList(await api.roleList())
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

/* ------------------------------------------------------------ 统计 */
const analysis = ref(null)

async function loadAnalysis() {
  busy.value = true
  try {
    analysis.value = await api.analysisEcharts(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai')
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function bars(source) {
  const list = Array.isArray(source) ? source : Object.entries(source || {}).map(([date, total]) => ({ date, total }))
  const max = Math.max(1, ...list.map((item) => Number(item.total) || 0))
  return list.map((item) => ({
    date: String(item.date || '').slice(-5),
    total: Number(item.total) || 0,
    height: Math.round(((Number(item.total) || 0) / max) * 100)
  }))
}

/* ------------------------------------------------------------ 系统设置 */
const settings = reactive({ form: null, patch: {} })

async function loadSettings() {
  busy.value = true
  try {
    const data = await api.settingQuery()
    settings.form = data
    settings.patch = {}
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

function setField(key, value) {
  settings.patch[key] = value
  if (settings.form) settings.form[key] = value
}

function toggleSwitch(key) {
  const current = Number(settings.form?.[key] ?? 0)
  setField(key, current === 0 ? 1 : 0)
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
    settings.patch = {}
    await loadSettings()
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}

/* ------------------------------------------------------------ 加载调度 */
function loadSection() {
  message.value = ''
  error.value = ''
  if (section.value === 'users') loadUsers()
  if (section.value === 'all-mail') loadMails(true)
  if (section.value === 'invite') loadInvites()
  if (section.value === 'roles') loadRoles()
  if (section.value === 'analysis') loadAnalysis()
  if (section.value === 'setting') loadSettings()
}

onMounted(loadSection)
watch(section, () => {
  if (section.value) loadSection()
})

function go(key) {
  router.push(`/admin/${key}`)
}
</script>

<template>
  <main class="screen screen--admin">
    <div class="admin-wrap">
      <aside class="panel panel--tight admin-nav">
        <p class="side-group">管理</p>
        <a
          v-for="item in sections"
          :key="item.key"
          class="side-item"
          href="#"
          :aria-current="item.key === section ? 'true' : undefined"
          @click.prevent="go(item.key)"
        >{{ item.label }}</a>

        <p class="side-group">返回</p>
        <router-link class="side-item" to="/">收件箱</router-link>
      </aside>

      <section class="panel admin-main">
        <div class="admin-head">
          <h2 class="admin-title">{{ sectionLabel }}</h2>
          <span v-if="busy" class="meta">加载中…</span>
          <span v-if="message" class="meta admin-msg">{{ message }}</span>
          <span v-if="error" class="field__error admin-msg">{{ error }}</span>
        </div>

        <!-- 用户 -->
        <template v-if="section === 'users'">
          <div class="admin-tools">
            <input v-model="users.email" class="input input--search" type="search" placeholder="按邮箱搜索" />
            <button class="btn btn--slim" type="button" @click="users.num = 1; loadUsers()">搜 索</button>
          </div>

          <table class="table">
            <thead>
              <tr><th>邮箱</th><th>名称</th><th>角色</th><th>状态</th><th>已发送</th><th>注册时间</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="row in users.list" :key="row.userId">
                <td>{{ row.email }}</td>
                <td>{{ row.name || '—' }}</td>
                <td>{{ row.type === 0 ? '管理员' : '用户' }}</td>
                <td>
                  <span class="dot" :class="{ 'dot--off': row.status !== 0 }"></span>
                  {{ row.status === 0 ? '正常' : '已禁用' }}
                </td>
                <td>{{ row.sendCount ?? 0 }}</td>
                <td class="meta">{{ formatDateTime(row.createTime) }}</td>
                <td class="actions">
                  <button class="btn btn--xs" type="button" @click="setUserStatus(row)">{{ row.status === 0 ? '禁用' : '启用' }}</button>
                  <button class="btn btn--xs" type="button" @click="resetSendCount(row)">重置计数</button>
                  <button class="btn btn--xs btn--danger" type="button" @click="removeUser(row)">删除</button>
                </td>
              </tr>
              <tr v-if="!users.list.length"><td colspan="7" class="empty-hint">没有用户</td></tr>
            </tbody>
          </table>

          <div class="pager">
            <button class="btn btn--xs" type="button" :disabled="users.num <= 1" @click="users.num--; loadUsers()">上一页</button>
            <span class="meta">第 {{ users.num }} 页 · 共 {{ users.total }} 个</span>
            <button class="btn btn--xs" type="button" :disabled="users.list.length < users.size" @click="users.num++; loadUsers()">下一页</button>
          </div>
        </template>

        <!-- 全站邮件 -->
        <template v-else-if="section === 'all-mail'">
          <div class="admin-tools">
            <input v-model="mails.subject" class="input input--search" type="search" placeholder="按主题搜索" />
            <input v-model="mails.userEmail" class="input input--search" type="search" placeholder="按账户邮箱过滤" />
            <button class="btn btn--slim" type="button" @click="loadMails(true)">搜 索</button>
          </div>

          <table class="table">
            <thead>
              <tr><th>发件人</th><th>主题</th><th>收件账户</th><th>时间</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="row in mails.list" :key="row.emailId">
                <td>{{ row.name || row.sendEmail }}</td>
                <td>{{ row.subject || '(无主题)' }}</td>
                <td class="meta">{{ row.toEmail || row.recipient || '—' }}</td>
                <td class="meta">{{ formatDateTime(row.createTime) }}</td>
                <td class="actions">
                  <button class="btn btn--xs btn--danger" type="button" @click="removeMail(row)">删除</button>
                </td>
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
        <template v-else-if="section === 'invite'">
          <div class="admin-tools">
            <input v-model="invites.code" class="input input--search" type="text" placeholder="邀请码，例如 STSAS-8F2C" />
            <button class="btn btn--slim" type="button" @click="randomCode">随机生成</button>
            <input v-model="invites.count" class="input input--search" type="number" min="1" style="max-width: 120px" placeholder="可用次数" />
            <button class="btn btn--slim btn--primary" type="button" @click="addInvite">创 建</button>
          </div>

          <table class="table">
            <thead>
              <tr><th>邀请码</th><th>角色</th><th>额度</th><th>已用</th><th>创建时间</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="row in invites.list" :key="row.regKeyId">
                <td>{{ row.code }}</td>
                <td>{{ row.roleName || row.roleId || '—' }}</td>
                <td>{{ row.count ?? '—' }}</td>
                <td>{{ row.usedCount ?? row.useCount ?? 0 }}</td>
                <td class="meta">{{ formatDateTime(row.createTime) }}</td>
                <td class="actions">
                  <button class="btn btn--xs btn--danger" type="button" @click="removeInvite(row)">删除</button>
                </td>
              </tr>
              <tr v-if="!invites.list.length"><td colspan="6" class="empty-hint">还没有邀请码</td></tr>
            </tbody>
          </table>
        </template>

        <!-- 角色（只读） -->
        <template v-else-if="section === 'roles'">
          <p class="meta" style="margin: 0 0 14px">角色与权限点的编辑仍在旧后台完成，这里先做只读一览。</p>
          <table class="table">
            <thead><tr><th>ID</th><th>名称</th><th>默认</th><th>权限点</th></tr></thead>
            <tbody>
              <tr v-for="row in roles" :key="row.roleId">
                <td>{{ row.roleId }}</td>
                <td>{{ row.name }}</td>
                <td>{{ row.isDefault ? '是' : '—' }}</td>
                <td class="meta">{{ (row.permKeys || []).join('、') || '—' }}</td>
              </tr>
              <tr v-if="!roles.length"><td colspan="4" class="empty-hint">没有角色</td></tr>
            </tbody>
          </table>
        </template>

        <!-- 统计 -->
        <template v-else-if="section === 'analysis'">
          <div class="stat-row">
            <div class="stat-card"><span class="meta">用户总数</span><b>{{ analysis?.numberCount ?? '—' }}</b></div>
            <div class="stat-card"><span class="meta">今日新增用户</span><b>{{ analysis?.userDayCount ?? '—' }}</b></div>
            <div class="stat-card"><span class="meta">今日发送</span><b>{{ analysis?.daySendTotal ?? '—' }}</b></div>
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
        <template v-else-if="section === 'setting'">
          <p class="meta" style="margin: 0 0 16px">只提交改动过的字段（后端是局部更新），密钥类字段不在此修改。</p>

          <div class="form-grid">
            <div class="field">
              <label class="field__label">站点标题</label>
              <input class="input" :value="settings.form?.title" @change="setField('title', $event.target.value)" />
            </div>
            <div class="field">
              <label class="field__label">邮箱前缀最小长度</label>
              <input class="input" type="number" min="1" :value="settings.form?.minEmailPrefix" @change="setField('minEmailPrefix', Number($event.target.value))" />
            </div>
            <div class="field">
              <label class="field__label">邮件域（逗号分隔）</label>
              <input class="input" :value="settings.form?.domainList" @change="setField('domainList', $event.target.value)" />
            </div>
            <div class="field">
              <label class="field__label">首页公告标题</label>
              <input class="input" :value="settings.form?.noticeTitle" @change="setField('noticeTitle', $event.target.value)" />
            </div>
          </div>

          <div class="setting-list">
            <div class="setting-row"><div><p class="setting-row__name">开放注册</p><p class="meta">关闭后只能靠邀请码或管理员添加</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.register ?? 1) === 0" @click="toggleSwitch('register')"></button></div>
            <div class="setting-row"><div><p class="setting-row__name">允许收信</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.receive ?? 1) === 0" @click="toggleSwitch('receive')"></button></div>
            <div class="setting-row"><div><p class="setting-row__name">允许发信</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.send ?? 1) === 0" @click="toggleSwitch('send')"></button></div>
            <div class="setting-row"><div><p class="setting-row__name">允许添加邮箱</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.addEmail ?? 1) === 0" @click="toggleSwitch('addEmail')"></button></div>
            <div class="setting-row"><div><p class="setting-row__name">允许多邮箱</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.manyEmail ?? 1) === 0" @click="toggleSwitch('manyEmail')"></button></div>
            <div class="setting-row"><div><p class="setting-row__name">显示公告</p></div>
              <button class="switch" type="button" role="switch" :aria-checked="Number(settings.form?.notice ?? 1) === 0" @click="toggleSwitch('notice')"></button></div>
          </div>

          <div class="admin-tools" style="margin-top: 20px">
            <button class="btn btn--primary" type="button" :disabled="busy" @click="saveSettings">保 存 改 动</button>
            <span class="meta">{{ Object.keys(settings.patch).length }} 个字段待保存</span>
          </div>
        </template>

        <p v-else class="empty-hint">没有可用的管理权限</p>
      </section>
    </div>
  </main>
</template>

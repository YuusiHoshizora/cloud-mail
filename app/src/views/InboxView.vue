<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useInboxStore } from '@/stores/inbox'
import { TYPE } from '@/api'
import MailRow from '@/components/MailRow.vue'
import MailReading from '@/components/MailReading.vue'
import ComposePopup from '@/components/ComposePopup.vue'
import ComposePage from '@/components/ComposePage.vue'

const router = useRouter()
const auth = useAuthStore()
const inbox = useInboxStore()

const accountId = ref(auth.currentAccount?.accountId ?? null)
const filter = ref('all')
const mobileView = ref('list')

const draft = reactive({
  to: '',
  cc: '',
  subject: '',
  html: '',
  sendType: '',
  emailId: 0,
  attachments: [],
  mode: 'closed'
})

const selected = computed(() => inbox.selected)

const visibleItems = computed(() => {
  const list = inbox.items
  if (filter.value === 'unread') return list.filter((m) => m.unread === 0)
  if (filter.value === 'attach') return list.filter((m) => (m.attList || []).length > 0)
  return list
})

const unreadCount = computed(() => inbox.items.filter((m) => m.unread === 0).length)
const allReceive = computed(() => Number(auth.currentAccount?.allReceive || 0))

function pickAccount(id) {
  accountId.value = id
}

async function refresh() {
  if (!accountId.value) return
  await inbox.load(accountId.value, { allReceive: allReceive.value, type: TYPE.RECEIVE })
  inbox.startPolling(accountId.value, allReceive.value)
}

onMounted(() => {
  if (!accountId.value && auth.accounts.length) accountId.value = auth.accounts[0].accountId
  refresh()
})

onUnmounted(() => inbox.stopPolling())

watch(accountId, () => refresh())

function openMail(emailId) {
  inbox.select(emailId)
  mobileView.value = 'reading'
}

function backToList() {
  mobileView.value = 'list'
}

function openCompose(preset = {}) {
  Object.assign(draft, {
    to: preset.to || '',
    cc: '',
    subject: preset.subject || '',
    html: preset.html || '',
    sendType: preset.sendType || '',
    emailId: preset.emailId || 0,
    attachments: [],
    mode: 'popup'
  })
}

function replyTo(mail) {
  const quoted = mail.content
    ? `<p><br></p><blockquote>${mail.content}</blockquote>`
    : '<p><br></p>'
  openCompose({
    to: mail.sendEmail,
    subject: `Re: ${mail.subject || ''}`,
    html: quoted,
    sendType: 'reply',
    emailId: mail.emailId
  })
}

function forwardMail(mail) {
  const quoted = mail.content ? `<p><br></p><blockquote>${mail.content}</blockquote>` : '<p><br></p>'
  openCompose({ subject: `Fwd: ${mail.subject || ''}`, html: quoted, sendType: 'forward', emailId: mail.emailId })
}

function onExpand(html) {
  draft.html = html
  draft.mode = 'page'
}

function onCollapse(html) {
  draft.html = html
  draft.mode = 'popup'
}

async function onSent() {
  draft.mode = 'closed'
  draft.html = ''
  await refresh()
}

async function onDelete(mail) {
  await inbox.remove(mail.emailId)
  mobileView.value = 'list'
}

async function doLogout() {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <main class="screen screen--app">
    <div class="workspace" :data-view="mobileView">
      <!-- 左栏 -->
      <aside class="pane pane--aside panel panel--tight">
        <p class="side-group">账户</p>
        <a
          v-for="acc in auth.accounts"
          :key="acc.accountId"
          class="side-item"
          href="#"
          :aria-current="acc.accountId === accountId ? 'true' : undefined"
          @click.prevent="pickAccount(acc.accountId)"
        >
          <span class="dot" :class="{ 'dot--off': acc.accountId !== accountId }"></span>
          {{ acc.email }}
        </a>

        <p class="side-group">文件夹</p>
        <a class="side-item" href="#" aria-current="true">
          收件箱 <span v-if="unreadCount" class="side-count">{{ unreadCount }}</span>
        </a>
        <router-link class="side-item" to="/settings">设置</router-link>

        <p class="side-group">账户信息</p>
        <p class="meta" style="margin: 0 12px; line-height: 1.9">
          {{ auth.user?.email || '—' }}<br />
          {{ auth.user?.name || '' }}
        </p>

        <div class="side-foot">
          <button class="btn btn--primary side-compose" type="button" @click="openCompose()">写 信</button>
          <button class="btn btn--ghost side-compose" type="button" style="margin-top: 8px" @click="doLogout">
            退出登录
          </button>
        </div>
      </aside>

      <!-- 中栏 -->
      <section class="pane pane--list panel" aria-label="邮件列表">
        <div class="toolbar">
          <button class="btn btn--ghost btn--slim" type="button" @click="backToList">‹ 列表</button>
          <button class="btn btn--icon" type="button" title="刷新" @click="refresh">↻</button>
        </div>

        <div class="filters">
          <button class="chip" type="button" :aria-selected="filter === 'all'" @click="filter = 'all'">全部</button>
          <button class="chip" type="button" :aria-selected="filter === 'unread'" @click="filter = 'unread'">未读</button>
          <button class="chip" type="button" :aria-selected="filter === 'attach'" @click="filter = 'attach'">有附件</button>
        </div>

        <div class="rows">
          <template v-if="inbox.loading && !inbox.items.length">
            <div v-for="n in 6" :key="n" class="row-skeleton"><i></i><i></i></div>
          </template>

          <p v-else-if="inbox.error" class="meta" style="padding: 24px 12px">{{ inbox.error }}</p>

          <p v-else-if="!visibleItems.length" class="meta" style="padding: 28px 12px">这里还没有邮件。</p>

          <template v-else>
            <MailRow
              v-for="mail in visibleItems"
              :key="mail.emailId"
              :mail="mail"
              :selected="mail.emailId === inbox.selectedId"
              @select="openMail"
            />
          </template>
        </div>
      </section>

      <!-- 右栏 -->
      <section class="pane pane--reading panel" :class="{ 'is-open': !!selected }">
        <MailReading
          v-if="selected"
          :mail="selected"
          @delete="onDelete"
          @reply="replyTo"
          @forward="forwardMail"
          @star="inbox.toggleStar(selected)"
        />
        <div v-else class="reading-empty">
          <span class="dot"></span>
          <p>未 选 择 邮 件</p>
        </div>
      </section>
    </div>

    <ComposePopup
      :open="draft.mode === 'popup'"
      :draft="draft"
      @close="draft.mode = 'closed'"
      @expand="onExpand"
      @sent="onSent"
    />

    <ComposePage
      :open="draft.mode === 'page'"
      :draft="draft"
      @close="draft.mode = 'closed'"
      @collapse="onCollapse"
      @sent="onSent"
    />
  </main>
</template>

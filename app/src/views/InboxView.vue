<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { FOLDERS, useInboxStore } from '@/stores/inbox'
import { allowedSections } from '@/lib/perm'
import { deleteDraft, draftToRow, listDrafts, newDraftId, putDraft } from '@/lib/drafts'
import MailRow from '@/components/MailRow.vue'
import MailReading from '@/components/MailReading.vue'
import ComposePopup from '@/components/ComposePopup.vue'
import ComposePage from '@/components/ComposePage.vue'
import AdminPanel from '@/components/AdminPanel.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const inbox = useInboxStore()

const accountId = ref(auth.currentAccount?.accountId ?? null)
const filter = ref('all')
const mobileView = ref('list')

const drafts = ref([])

const draft = reactive({
  draftId: '',
  to: '',
  cc: '',
  subject: '',
  html: '',
  sendType: '',
  emailId: 0,
  attachments: [],
  mode: 'closed'
})

const adminSections = computed(() => allowedSections(auth.user))
const isAdmin = computed(() => route.name === 'admin')
const isSettings = computed(() => route.name === 'settings')
/* 管理 / 设置都占「中栏 + 右栏」，左侧导航保持常驻 */
const isPanel = computed(() => isAdmin.value || isSettings.value)
const adminSection = computed(() => String(route.params.section || ''))
function goAdmin(key) {
  router.push(/admin/)
}
const selected = computed(() => inbox.selected)

const visibleItems = computed(() => {
  if (inbox.folder === 'drafts') return draftRows.value
  const list = inbox.items
  if (filter.value === 'unread') return list.filter((m) => m.unread === 0)
  if (filter.value === 'attach') return list.filter((m) => (m.attList || []).length > 0)
  return list
})

const allReceive = computed(() => Number(auth.currentAccount?.allReceive || 0))
const emptyText = computed(() => {
  if (inbox.folder === 'sent') return '还没有发出过邮件。'
  if (inbox.folder === 'starred') return '还没有标记的邮件。'
  if (inbox.folder === 'drafts') return '没有草稿。写信的内容会自动存在本机。'
  return '收件箱是空的。'
})

function pickAccount(id) {
  if (id !== accountId.value) accountId.value = id
  // 在管理面板里点账户 = 想回去看邮件
  if (isPanel.value) {
    router.push('/')
    return
  }
  refresh()
}

async function refresh() {
  if (!accountId.value) return
  await inbox.load(accountId.value, { allReceive: allReceive.value })
  // 每次刷新手都确认轮询参数是最新的（startPolling 内部对重复调用是幂等的）
  inbox.startPolling(accountId.value, allReceive.value)
}

function pickFolder(key) {
  if (inbox.folder !== key) {
    inbox.setFolder(key)
    filter.value = 'all'
  }
  // 在管理面板里点文件夹 = 想回去看邮件（watch(isAdmin) 会负责重新拉取）
  if (isPanel.value) {
    router.push('/')
    return
  }
  refresh()
}

onMounted(() => {
  if (!accountId.value && auth.accounts.length) accountId.value = auth.accounts[0].accountId
  if (isAdmin.value) return
  refresh()
})

/* 从管理面板回到邮件区时再拉一次 + 恢复轮询 */
watch(isPanel, (panel) => {
  if (panel) {
    inbox.stopPolling()
    return
  }
  refresh()
})

onUnmounted(() => inbox.stopPolling())

watch(accountId, () => refresh())

/* ------------------------------------------------------------ 草稿箱 */
const draftRows = computed(() => drafts.value.map(draftToRow))

async function loadDrafts() {
  drafts.value = await listDrafts()
}

function openDraft(draftId) {
  const found = drafts.value.find((item) => item.id === draftId)
  if (!found) return
  Object.assign(draft, {
    draftId: found.id,
    to: found.to || '',
    cc: found.cc || '',
    subject: found.subject || '',
    html: found.html || '',
    sendType: found.sendType || '',
    emailId: found.emailId || 0,
    attachments: found.attachments || [],
    mode: 'popup'
  })
}

async function discardCurrentDraft() {
  await deleteDraft(draft.draftId)
  draft.draftId = ''
  draft.mode = 'closed'
  draft.html = ''
  await loadDrafts()
}

/* 自动存草稿：停止输入 700ms 后写 IndexedDB（与旧版一致，纯本地） */
let draftTimer = null
watch(
  () => [draft.mode, draft.to, draft.cc, draft.subject, draft.html, draft.attachments.length],
  () => {
    if (draft.mode === 'closed') return
    if (!draft.to && !draft.subject && !(draft.html || '').replace(/<[^>]*>/g, '').trim()) return
    clearTimeout(draftTimer)
    draftTimer = setTimeout(async () => {
      if (!draft.draftId) draft.draftId = newDraftId()
      await putDraft({
        id: draft.draftId,
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        html: draft.html,
        attachments: draft.attachments,
        sendType: draft.sendType,
        emailId: draft.emailId,
        updatedAt: Date.now()
      })
      if (inbox.folder === 'drafts') await loadDrafts()
    }, 700)
  }
)
/* 滚动到底自动加载更多（列表底部放一个哨兵元素） */
const rowsEl = ref(null)
const sentinel = ref(null)
let observer = null

function loadMore() {
  inbox.loadMore(accountId.value, { allReceive: allReceive.value })
}

function setupObserver() {
  observer?.disconnect()
  observer = null
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && inbox.folder !== 'drafts') loadMore()
    },
    { root: rowsEl.value, rootMargin: '120px' }
  )
  observer.observe(sentinel.value)
}

/* 骨架屏 → 有列表时哨兵才出现，所以用 watch 而不是 onMounted */
watch(sentinel, (el) => { if (el) setupObserver() })

onUnmounted(() => observer?.disconnect())
function openMail(emailId) {
  inbox.select(emailId)
  mobileView.value = 'reading'
}

function backToList() {
  mobileView.value = 'list'
}

function openCompose(preset = {}) {
  Object.assign(draft, {
    draftId: '',
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
  openCompose({
    to: mail.sendEmail,
    subject: `Re: ${mail.subject || ''}`,
    html: mail.content ? `<p><br></p><blockquote>${mail.content}</blockquote>` : '<p><br></p>',
    sendType: 'reply',
    emailId: mail.emailId
  })
}

function forwardMail(mail) {
  openCompose({
    subject: `Fwd: ${mail.subject || ''}`,
    html: mail.content ? `<p><br></p><blockquote>${mail.content}</blockquote>` : '<p><br></p>',
    sendType: 'forward',
    emailId: mail.emailId
  })
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
  if (draft.draftId) await deleteDraft(draft.draftId)
  draft.draftId = ''
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
    <div class="workspace" :data-view="mobileView" :data-mode="isAdmin ? 'admin' : isSettings ? 'settings' : 'mail'">
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
        <a
          v-for="item in FOLDERS"
          :key="item.key"
          class="side-item"
          href="#"
          :aria-current="!isPanel && inbox.folder === item.key ? 'true' : undefined"
          @click.prevent="pickFolder(item.key)"
        >
          {{ item.label }}
          <span v-if="item.key === 'inbox' && inbox.unreadCount" class="side-count">{{ inbox.unreadCount }}</span>
        </a>

        <template v-if="adminSections.length">
          <p class="side-group">管理</p>
          <router-link
            v-for="item in adminSections"
            :key="item.key"
            class="side-item"
            :to="`/admin/${item.key}`"
          >{{ item.label }}</router-link>
        </template>

        <div class="side-bottom">
          <router-link class="side-item" to="/settings">设置</router-link>

          <p class="side-group">账户信息</p>
          <p class="meta" style="margin: 0 12px; line-height: 1.9">
          {{ auth.user?.email || '—' }}<br />
          {{ auth.user?.name || '' }}
            <span v-if="auth.user?.permKeys?.includes('*')"> · 管理员</span>
          </p>
        </div>

        <div class="side-foot">
          <button class="btn btn--primary side-compose" type="button" @click="openCompose()">写 信</button>
          <button class="btn btn--ghost side-compose" type="button" style="margin-top: 8px" @click="doLogout">
            退出登录
          </button>
        </div>
      </aside>

      <!-- 管理面板：占中栏+右栏，左侧导航不消失 -->
      <AdminPanel
        v-if="isAdmin"
        :section="adminSection"
        @go="goAdmin"
      />

      <SettingsPanel v-else-if="isSettings" />

      <!-- 中栏 -->
      <section v-if="!isPanel" class="pane pane--list panel" aria-label="邮件列表">
        <div class="toolbar">
          <button class="btn btn--ghost btn--slim" type="button" @click="backToList">‹ 列表</button>
          <span class="meta" style="margin-left: auto">{{ FOLDERS.find((f) => f.key === inbox.folder)?.label }}</span>
          <button class="btn btn--icon" type="button" title="刷新" @click="refresh">↻</button>
        </div>

        <div v-if="inbox.folder !== 'drafts'" class="filters">
          <button class="chip" type="button" :aria-selected="filter === 'all'" @click="filter = 'all'">全部</button>
          <button class="chip" type="button" :aria-selected="filter === 'unread'" @click="filter = 'unread'">未读</button>
          <button class="chip" type="button" :aria-selected="filter === 'attach'" @click="filter = 'attach'">有附件</button>
        </div>

        <div ref="rowsEl" class="rows">
          <template v-if="inbox.loading && !inbox.items.length">
            <div v-for="n in 6" :key="n" class="row-skeleton"><i></i><i></i></div>
          </template>

          <p v-else-if="inbox.error" class="meta" style="padding: 24px 12px">{{ inbox.error }}</p>

          <p v-else-if="!visibleItems.length" class="empty-hint">{{ emptyText }}</p>

          <template v-else>
            <MailRow
              v-for="mail in visibleItems"
              :key="mail.emailId"
              :mail="mail"
              :selected="mail.emailId === inbox.selectedId"
              @select="mail.isDraft ? openDraft(mail.draftId) : openMail(mail.emailId)"
            />
          </template>

          <div ref="sentinel" class="list-sentinel">
            <button
              v-if="inbox.folder !== 'drafts' && inbox.hasMore"
              class="btn btn--xs"
              type="button"
              :disabled="inbox.loadingMore"
              @click="loadMore"
            >{{ inbox.loadingMore ? '加载中…' : '加载更多' }}</button>
            <span v-else-if="visibleItems.length" class="meta">已经是全部了</span>
          </div>
        </div>
      </section>

      <!-- 右栏 -->
      <section v-if="!isPanel" class="pane pane--reading panel" :class="{ 'is-open': !!selected }">
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
      @discard="discardCurrentDraft"
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

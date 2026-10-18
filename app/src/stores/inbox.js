import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, TYPE, UNREAD } from '@/api'

export const FOLDERS = [
  { key: 'inbox', label: '收件箱' },
  { key: 'sent', label: '已发送' },
  { key: 'starred', label: '星标' },
  { key: 'drafts', label: '草稿' }
]

export const useInboxStore = defineStore('inbox', () => {
  const folder = ref('inbox')
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const selectedId = ref(null)
  const latestEmailId = ref(0)

  const selected = computed(() => items.value.find((m) => m.emailId === selectedId.value) || null)
  const unreadCount = computed(() => items.value.filter((m) => m.unread === UNREAD.UNREAD).length)

  let pollTimer = null
  let pollParams = null
  let stopped = true

  function setFolder(key) {
    if (folder.value === key) return
    folder.value = key
    selectedId.value = null
    items.value = []
    total.value = 0
    latestEmailId.value = 0
  }

  async function load(accountId, { allReceive = 0, size = 20 } = {}) {
    if (!accountId) return
    if (folder.value === 'drafts') {
      // 草稿在 IndexedDB 里，由视图层加载
      items.value = []
      total.value = 0
      loading.value = false
      return
    }
    loading.value = true
    error.value = ''
    try {
      let list = []
      if (folder.value === 'starred') {
        const data = await api.starList({ size })
        list = Array.isArray(data) ? data : data?.list || []
        total.value = list.length
        latestEmailId.value = 0
      } else {
        const data = await api.emailList({
          accountId,
          allReceive,
          type: folder.value === 'sent' ? TYPE.SEND : TYPE.RECEIVE,
          size
        })
        list = data?.list || []
        total.value = data?.total ?? list.length
        latestEmailId.value = data?.latestEmail?.emailId || list[0]?.emailId || 0
      }

      items.value = list
      if (selectedId.value && !list.some((m) => m.emailId === selectedId.value)) selectedId.value = null
    } catch (err) {
      error.value = err?.message || '加载失败'
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 选中即已读：只改这一行，不重建列表（金框靠 CSS 过渡进出） */
  async function select(emailId) {
    selectedId.value = emailId
    const mail = items.value.find((m) => m.emailId === emailId)
    if (!mail) return
    if (mail.unread === UNREAD.UNREAD) {
      mail.unread = UNREAD.READ
      try {
        await api.emailRead([emailId])
      } catch {
        /* 已读失败不影响阅读 */
      }
    }
  }

  async function remove(emailId) {
    try {
      await api.emailDelete([emailId])
      items.value = items.value.filter((m) => m.emailId !== emailId)
      if (selectedId.value === emailId) selectedId.value = null
    } catch (err) {
      error.value = err?.message || '删除失败'
    }
  }

  async function toggleStar(mail) {
    const next = mail.isStar ? 0 : 1
    mail.isStar = next
    try {
      await (next ? api.starAdd(mail.emailId) : api.starCancel(mail.emailId))
      if (folder.value === 'starred' && !next) {
        items.value = items.value.filter((m) => m.emailId !== mail.emailId)
      }
    } catch {
      mail.isStar = next ? 0 : 1
    }
  }

  function startPolling(accountId, allReceive) {
    pollParams = { accountId, allReceive }
    if (!stopped) return
    stopped = false
    tick()
  }

  async function tick() {
    if (stopped || !pollParams) return
    try {
      const list = await api.emailLatest({
        emailId: latestEmailId.value,
        accountId: pollParams.accountId,
        allReceive: pollParams.allReceive
      })
      if (folder.value === 'inbox' && Array.isArray(list) && list.length) {
        const fresh = list.filter((m) => !items.value.some((x) => x.emailId === m.emailId))
        if (fresh.length) {
          items.value = [...fresh, ...items.value]
          total.value += fresh.length
          latestEmailId.value = Math.max(latestEmailId.value, ...fresh.map((m) => m.emailId))
        }
      }
    } catch {
      /* 轮询失败静默重试 */
    }
    if (!stopped) pollTimer = setTimeout(tick, 1500)
  }

  function stopPolling() {
    stopped = true
    clearTimeout(pollTimer)
    pollTimer = null
    pollParams = null
  }

  return {
    folder,
    items,
    total,
    loading,
    error,
    selectedId,
    selected,
    unreadCount,
    setFolder,
    load,
    select,
    remove,
    toggleStar,
    startPolling,
    stopPolling
  }
})

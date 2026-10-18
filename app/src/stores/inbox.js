import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, TYPE, UNREAD } from '@/api'

export const useInboxStore = defineStore('inbox', () => {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const selectedId = ref(null)
  const latestEmailId = ref(0)

  const selected = computed(() => items.value.find((m) => m.emailId === selectedId.value) || null)

  let pollTimer = null
  let pollParams = null
  let stopped = true

  async function load(accountId, { allReceive = 0, type = TYPE.RECEIVE, size = 20 } = {}) {
    if (!accountId) return
    loading.value = true
    error.value = ''
    try {
      const data = await api.emailList({ accountId, allReceive, type, size })
      items.value = (data?.list || []).slice()
      total.value = data?.total ?? items.value.length
      latestEmailId.value = data?.latestEmail?.emailId || items.value[0]?.emailId || 0
      if (selectedId.value && !items.value.some((m) => m.emailId === selectedId.value)) {
        selectedId.value = null
      }
    } catch (err) {
      error.value = err?.message || '收件箱加载失败'
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
      if (Array.isArray(list) && list.length) {
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

  return { items, total, loading, error, selectedId, selected, load, select, remove, toggleStar, startPolling, stopPolling }
})

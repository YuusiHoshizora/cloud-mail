/* 本地草稿：旧 UI 用 IndexedDB 存（db/db.js），这里换成独立的小封装。
   草稿只存在本机浏览器里，不上传后端——和旧版行为一致。 */

const DB_NAME = 'stsas-mail'
const DB_VERSION = 1
const STORE = 'drafts'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

export function newDraftId() {
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function listDrafts() {
  try {
    const db = await openDb()
    const all = await new Promise((resolve, reject) => {
      const request = tx(db, 'readonly').getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
    db.close()
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  } catch {
    return []
  }
}

export async function putDraft(draft) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const request = tx(db, 'readwrite').put(draft)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function deleteDraft(id) {
  if (!id) return
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const request = tx(db, 'readwrite').delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
  } catch {
    /* 忽略：清不掉也不影响主流程 */
  }
}

/** 草稿对象 → 列表行能吃的形状 */
export function draftToRow(draft) {
  return {
    emailId: `draft:${draft.id}`,
    draftId: draft.id,
    type: 1,
    subject: draft.subject || '(无主题)',
    recipient: draft.to || '',
    toEmail: draft.to || '',
    name: '',
    sendEmail: '',
    unread: 1,
    isStar: 0,
    attList: draft.attachments || [],
    createTime: new Date(draft.updatedAt || Date.now()).toISOString().slice(0, 19).replace('T', ' '),
    isDraft: true
  }
}

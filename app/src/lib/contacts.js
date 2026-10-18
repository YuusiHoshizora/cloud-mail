/* 最近联系人：与旧 UI 的 writer.sendRecipientRecord 同一用途，
   存在 localStorage（不经过后端）。最多保留 60 个，最近优先去重。 */

const KEY = 'stsas.contacts'
const LIMIT = 60

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

export function getContacts() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string' && item) : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)))
  } catch {
    /* 存不下就算了，不影响发信 */
  }
}

/** 发信成功后记录收件人 */
export function addContacts(list) {
  const cleaned = (list || [])
    .map((item) => String(item || '').trim())
    .filter((item) => EMAIL_RE.test(item))
  if (!cleaned.length) return
  const lower = new Set(cleaned.map((item) => item.toLowerCase()))
  const rest = getContacts().filter((item) => !lower.has(item.toLowerCase()))
  save([...cleaned, ...rest])
}

export function removeContact(email) {
  const target = String(email || '').toLowerCase()
  save(getContacts().filter((item) => item.toLowerCase() !== target))
}

/** 按输入片段筛选（大小写不敏感），已填过的自动排除 */
export function suggestContacts(typed, exclude = []) {
  const keyword = String(typed || '').trim().toLowerCase()
  const excludeSet = new Set((exclude || []).map((item) => item.toLowerCase()))
  return getContacts()
    .filter((item) => !excludeSet.has(item.toLowerCase()))
    .filter((item) => !keyword || item.toLowerCase().includes(keyword))
    .slice(0, 6)
}

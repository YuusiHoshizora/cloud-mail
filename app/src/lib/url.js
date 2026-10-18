import { useAuthStore } from '@/stores/auth'

/** 附件 / 背景图地址：实体里的 key 已带 attachments/ 前缀，走 r2Domain 或同源相对路径 */
export function cvtR2Url(key) {
  if (!key) return ''
  if (/^https?:\/\//.test(key)) return key

  const auth = useAuthStore()
  let domain = auth.settings?.r2Domain || ''

  if (!domain) return `/${key}`

  if (!/^https?/.test(domain)) domain = `https://${domain}`
  domain = domain.replace(/\/$/, '')
  return `${domain}/${key}`
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = Number(bytes)
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDateTime(raw) {
  if (!raw) return ''
  const d = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 16)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

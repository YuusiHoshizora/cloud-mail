import { api } from '@/api'
import { addContacts } from '@/lib/contacts'

export function splitRecipients(value) {
  return String(value || '')
    .split(/[,，;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 发信：对齐 POST /api/email/send 的实体结构
 * attachments: [{ content(base64, 无 data: 前缀), filename, size, contentType }]
 */
export async function sendMail({ auth, draft, content, onProgress }) {
  const receiveEmail = splitRecipients(draft.to)
  if (!receiveEmail.length) throw new Error('请填写收件人')
  if (!String(draft.subject || '').trim()) throw new Error('请填写主题')

  const text = htmlToText(content)
  if (!text) throw new Error('正文不能为空')

  const account = auth.currentAccount
  onProgress?.(12)

  const result = await api.emailSend({
    sendEmail: account?.email || auth.user?.email || '',
    receiveEmail,
    accountId: account?.accountId ?? -1,
    name: auth.user?.name || account?.name || '',
    subject: String(draft.subject).trim(),
    content,
    text,
    sendType: draft.sendType || '',
    emailId: draft.emailId || 0,
    attachments: (draft.attachments || []).map((a) => ({
      content: a.content,
      filename: a.filename,
      size: a.size,
      contentType: a.contentType
    }))
  })

  addContacts(receiveEmail)
  onProgress?.(100)
  return result
}

/** 把 File 读成 { content(base64), filename, size, contentType } */
export function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve({
        content: result.slice(result.indexOf(',') + 1),
        filename: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream'
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

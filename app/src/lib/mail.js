/* 邮件字段的小解析工具 */

/**
 * 后端对「发出去的邮件」把收件人存在 recipient 字段里，形如：
 *   [{"address":"a@b.com","name":""}]
 * 收到的邮件则把本地地址放在 toEmail。
 */
export function parseRecipients(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === 'string'
          ? { address: item, name: '' }
          : { address: item?.address || item?.email || '', name: item?.name || '' }
      )
      .filter((item) => item.address)
  }

  const text = String(raw).trim()
  if (!text) return []

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const data = JSON.parse(text)
      return parseRecipients(data)
    } catch {
      /* 不是合法 JSON，退化成纯文本处理 */
    }
  }

  return text
    .split(/[,;，；\s]+/)
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => ({ address, name: '' }))
}

/** "名字 <地址>" 用、连接 */
export function formatRecipients(raw) {
  const list = parseRecipients(raw)
  if (!list.length) return ''
  return list
    .map((item) => (item.name ? `${item.name} <${item.address}>` : item.address))
    .join('、')
}

/** 一行式收件人展示：发件箱看 recipient，收件箱看 toEmail */
export function recipientLine(mail) {
  const text = formatRecipients(mail?.recipient)
  if (text) return text
  const to = formatRecipients(mail?.toEmail)
  return to || ''
}

/** 邮箱的 @ 前部分：侧栏只显示这个，完整地址放 title 里 */
export function localPart(email) {
  const text = String(email || '')
  const at = text.indexOf('@')
  return at > 0 ? text.slice(0, at) : text
}
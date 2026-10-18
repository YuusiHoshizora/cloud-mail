/* 内置假数据：VITE_MOCK=1 时启用，字段与真实接口完全一致（见 .upstream 里的 drizzle 实体）。
   只为在没有后端/没有账号时把界面跑起来。 */
export const TYPE = { RECEIVE: 0, SEND: 1 }
export const UNREAD = { UNREAD: 0, READ: 1 }

const wait = (ms = 140) => new Promise((r) => setTimeout(r, ms))

let seq = 1000
const day = (offset, hhmm) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const [h, m] = hhmm.split(':')
  d.setHours(Number(h), Number(m), 0, 0)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const makeAtt = (attId, filename, size, mimeType) => ({
  attId, emailId: 0, accountId: 1, userId: 1,
  key: `attachments/${filename}`, filename, mimeType, size,
  status: 0, type: 0, contentId: null
})

const mail = (data) => ({
  emailId: ++seq,
  accountId: 1,
  userId: 1,
  sendEmail: '',
  name: '',
  subject: '',
  text: '',
  content: '',
  cc: '[]',
  bcc: '[]',
  recipient: '',
  toEmail: '',
  toName: '',
  inReplyTo: '',
  relation: '',
  messageId: '',
  type: TYPE.RECEIVE,
  status: 0,
  resendEmailId: null,
  message: null,
  unread: UNREAD.READ,
  createTime: day(0, '12:00'),
  isDel: 0,
  isStar: 0,
  attList: [],
  ...data
})

let emails = null

function db() {
  if (emails) return emails
  emails = [
  mail({
    sendEmail: 'noreply@cloudflare.com', name: 'Cloudflare',
    subject: 'Workers 构建成功：starlight-sacred-sanctuary',
    unread: UNREAD.UNREAD, isStar: 1, createTime: day(0, '11:42'),
    text: 'Worker 已完成部署，共传输 41 个静态资源。',
    content: `<p>你的 Worker <b>starlight-sacred-sanctuary</b> 已完成一次生产部署。</p>
      <p>版本 8f2c1a4 · 静态资源 41 个 · 总计 2.8 MB · 耗时 38s。</p>
      <blockquote>构建日志末尾：<br>[ok] assets uploaded 41/41<br>[ok] worker published</blockquote>
      <p>若需要回滚，请在控制台选择上一版本并重新部署即可。</p>`
  }),
  mail({
    sendEmail: 'notifications@resend.dev', name: 'Resend',
    subject: '送达率周报 · 98.6%',
    unread: UNREAD.UNREAD, createTime: day(0, '09:18'),
    text: '本周共发送 142 封，退信 2 封，无投诉。',
    content: `<p>本周（04-06 至 04-12）域 <b>stsas.top</b> 的投递情况：</p>
      <p>· 发送 142 封　· 送达 140 封（98.6%）　· 退信 2 封　· 投诉 0</p>
      <p>SPF / DKIM / DMARC 三项全部通过。</p>`,
    attList: [makeAtt(1, 'deliverability-2026-w15.pdf', 421888, 'application/pdf')]
  }),
  mail({
    sendEmail: 'yuusi@stsas.top', name: 'YuusiHoshizora',
    subject: '星图节点 SSS-07 维护窗口',
    createTime: day(1, '18:02'),
    text: '04-12 02:00–03:00 UTC+8 只读。',
    content: `<p>星图节点 <b>SSS-07</b> 将于 04-12 02:00–03:00（UTC+8）进入维护，期间只读。</p>
      <p>影响范围：档案检索、工具页解析台、星空坐标查询。</p>
      <blockquote>—— 余事星空<br>Starlight Sacred Sanctuary</blockquote>`
  }),
  mail({
    sendEmail: 'starmap@stsas.top', name: '星光圣域 · 星图组',
    subject: '本周观测记录已归档', createTime: day(3, '10:20'),
    text: '共 37 条观测记录，含 3 条异常信号。',
    content: `<p>本周共记录观测 37 条，其中 3 条被标记为异常信号（振幅突变）。</p>
      <p>全部记录已归入档案 S-2026-04，可按日期检索。</p>`
  }),
  mail({
    sendEmail: 'noreply@github.com', name: 'GitHub',
    subject: '[YuusiHoshizora/cloud-mail] Issue #12',
    createTime: day(5, '21:35'),
    text: '前端能否支持自定义主题色？',
    content: `<p><b>issue #12</b> 由 starlight-visitor 创建：</p>
      <blockquote>前端能否支持自定义主题色？目前的蓝色不太搭我的站点。</blockquote>`
  }),
  mail({
    sendEmail: 'contact@starlightsacredsanctuary.top', name: '访客',
    type: TYPE.SEND, status: 1, createTime: day(2, '14:10'), toEmail: 'yuusi@stsas.top',
    subject: 'Re: 星图维护窗口', text: '收到，届时我不做检索。',
    content: `<p>收到，届时不做检索。</p>`
  })
]
  return emails
}

let accounts = null

function acc() {
  if (accounts) return accounts
  accounts = [
  { accountId: 1, userId: 1, email: 'yuusi@stsas.top', name: '主账户', status: 0, latestEmailTime: day(0, '11:42'), createTime: day(200, '10:00'), allReceive: 0, sort: 0, isDel: 0 },
  { accountId: 2, userId: 1, email: 'contact@starlightsacredsanctuary.top', name: '站点联系', status: 0, latestEmailTime: day(4, '09:00'), createTime: day(150, '10:00'), allReceive: 0, sort: 0, isDel: 0 },
  { accountId: 3, userId: 1, email: 'archive@stsas.top', name: '归档', status: 0, latestEmailTime: null, createTime: day(120, '10:00'), allReceive: 0, sort: 0, isDel: 0 }
  ]
  return accounts
}

export const login = async (email) => { await wait(); return { token: 'mock-token' } }
export const logout = async () => { await wait(60) }

export const loginUserInfo = async () => {
  await wait()
  return {
    userId: 1,
    email: 'yuusi@stsas.top',
    name: '余事星空',
    sendCount: 42,
    permKeys: ['*'],
    type: 0,
    role: { name: 'admin', sendCount: 0, sendType: 'count', accountCount: 0 },
    account: acc()[0]
  }
}

export const websiteConfig = async () => {
  await wait(60)
  return { title: '星光圣域 · 邮箱', domainList: ['stsas.top', 'starlightsacredsanctuary.top'], background: null, register: 1, siteName: '星光圣域' }
}

export const accountList = async () => { await wait(80); return acc() }

export const emailList = async (params = {}) => {
  await wait(160)
  const type = Number(params.type ?? TYPE.RECEIVE)
  const size = Number(params.size || 20)
  const list = emails
    .filter((e) => e.isDel === 0 && e.type === type)
    .sort((a, b) => b.emailId - a.emailId)
    .slice(0, size)
  return { list, total: list.length, latestEmail: list[0] || { emailId: 0 } }
}

export const emailLatest = async () => { await wait(400); return [] }

export const emailRead = async (emailIds) => {
  await wait(60)
  db().forEach((e) => { if (emailIds.includes(e.emailId)) e.unread = UNREAD.READ })
}

export const emailDelete = async (emailIds) => {
  await wait(80)
  db().forEach((e) => { if (emailIds.includes(e.emailId)) e.isDel = 1 })
}

export const emailSend = async (form) => {
  await wait(420)
  const created = mail({
    type: TYPE.SEND, status: 1,
    sendEmail: form.sendEmail || acc()[0].email,
    toEmail: (form.receiveEmail || []).join(','),
    subject: form.subject,
    content: form.content,
    text: form.text || '',
    createTime: day(0, '12:00'),
    attList: (form.attachments || []).map((a, i) => makeAtt(900 + i, a.filename, a.size, a.contentType))
  })
  emails = [created, ...(emails || [])]
  return [created]
}

export const starAdd = async (emailId) => { await wait(50); const m = db().find((e) => e.emailId === emailId); if (m) m.isStar = 1 }
export const starList = async () => {
  await wait(100)
  return db().filter((e) => e.isStar === 1 && e.isDel === 0)
}

export const starCancel = async (emailId) => { await wait(50); const m = db().find((e) => e.emailId === emailId); if (m) m.isStar = 0 }

export const resetPassword = async () => { await wait(120) }
export const settingQuery = async () => {
  await wait(100)
  return {
    title: '星光圣域 · 邮箱', register: 0, receive: 0, send: 0, addEmail: 0, manyEmail: 0,
    regKey: 0, minEmailPrefix: 1, domainList: '@stsas.top', notice: 0,
    noticeTitle: '通知', noticeContent: '', noticeType: 'none', loginOpacity: 0.9
  }
}
export const settingSet = async () => { await wait(120) }

/* ---------------------------------------------------------------- 管理端（演示桩） */
const MOCK_USERS = [
  { userId: 1, email: 'yuusi@stsas.top', name: '余事星空', type: 0, status: 0, sendCount: 42, createTime: day(200, '10:00'), isDel: 0 },
  { userId: 2, email: 'visitor@stsas.top', name: '访客', type: 1, status: 0, sendCount: 3, createTime: day(30, '09:00'), isDel: 0 },
  { userId: 3, email: 'archive@stsas.top', name: '归档', type: 1, status: 1, sendCount: 0, createTime: day(12, '08:00'), isDel: 0 }
]

export const userList = async (params = {}) => {
  await wait(140)
  const keyword = String(params.email || '').trim()
  const isDel = Number(params.isDel || 0)
  const list = MOCK_USERS.filter((u) => Number(u.isDel || 0) === isDel).filter((u) => !keyword || u.email.includes(keyword))
  return { list, total: list.length }
}
export const userAdd = async () => { await wait(120) }
export const userSetStatus = async (userId, status) => {
  await wait(80)
  const row = MOCK_USERS.find((u) => u.userId === userId)
  if (row) row.status = status
}
export const userSetPwd = async () => { await wait(120) }
export const userResetSendCount = async (userId) => {
  await wait(80)
  const row = MOCK_USERS.find((u) => u.userId === userId)
  if (row) row.sendCount = 0
}
export const userDelete = async (userIds) => {
  await wait(100)
  userIds.forEach((id) => { const i = MOCK_USERS.findIndex((u) => u.userId === id); if (i > -1) MOCK_USERS.splice(i, 1) })
}

export const allEmailList = async (params = {}) => {
  await wait(140)
  const list = db().slice(0, Number(params.size) || 20)
  return { list, total: db().length, latestEmail: list[0] || { emailId: 0 } }
}
export const allEmailDelete = async () => { await wait(100) }

const MOCK_REG_KEYS = [
  { regKeyId: 1, code: 'STSAS-8F2C', roleId: 1, roleName: '普通用户', count: 5, usedCount: 2, createTime: day(9, '12:00') },
  { regKeyId: 2, code: 'STSAS-1A04', roleId: 1, roleName: '普通用户', count: 3, usedCount: 3, createTime: day(21, '12:00') }
]
export const regKeyList = async () => { await wait(120); return MOCK_REG_KEYS }
export const regKeyAdd = async (form) => {
  await wait(120)
  MOCK_REG_KEYS.unshift({ regKeyId: MOCK_REG_KEYS.length + 10, code: form.code, roleId: form.roleId, roleName: '普通用户', count: form.count, usedCount: 0, createTime: day(0, '12:00') })
}
export const regKeyDelete = async (ids) => {
  await wait(100)
  ids.forEach((id) => { const i = MOCK_REG_KEYS.findIndex((k) => k.regKeyId === id); if (i > -1) MOCK_REG_KEYS.splice(i, 1) })
}

const MOCK_PERM_TREE = [
  { permId: 100, name: '邮件', permKey: 'email', pid: 0, children: [
    { permId: 101, name: '发送邮件', permKey: 'email:send', pid: 100 },
    { permId: 102, name: '删除邮件', permKey: 'email:delete', pid: 100 }
  ] },
  { permId: 200, name: '账户', permKey: 'account', pid: 0, children: [
    { permId: 201, name: '查看账户', permKey: 'account:query', pid: 200 },
    { permId: 202, name: '添加账户', permKey: 'account:add', pid: 200 },
    { permId: 203, name: '删除账户', permKey: 'account:delete', pid: 200 }
  ] }
]

const MOCK_ROLES = [
  { roleId: 0, name: 'admin', isDefault: 1, sendCount: 0, accountCount: 0, sendType: 'count', banEmail: [], availDomain: [], permIds: [101, 102, 201, 202, 203] },
  { roleId: 1, name: '普通用户', isDefault: 0, sendCount: 50, accountCount: 2, sendType: 'day', banEmail: [], availDomain: [], permIds: [101, 201] }
]

export const roleList = async () => { await wait(100); return MOCK_ROLES }
export const rolePermTree = async () => { await wait(80); return MOCK_PERM_TREE }
export const roleAdd = async (form) => {
  await wait(120)
  MOCK_ROLES.push({ roleId: MOCK_ROLES.length + 10, isDefault: 0, ...form })
}
export const roleSet = async (form) => {
  await wait(120)
  const index = MOCK_ROLES.findIndex((r) => r.roleId === form.roleId)
  if (index > -1) MOCK_ROLES[index] = { ...MOCK_ROLES[index], ...form }
}
export const roleDelete = async (roleId) => {
  await wait(100)
  const index = MOCK_ROLES.findIndex((r) => r.roleId === roleId)
  if (index > -1) MOCK_ROLES.splice(index, 1)
}
export const roleSetDefault = async (roleId) => {
  await wait(100)
  MOCK_ROLES.forEach((r) => { r.isDefault = r.roleId === roleId ? 1 : 0 })
}

export const analysisEcharts = async () => {
  await wait(160)
  // 结构与真实接口一致：numberCount 是对象，userDayCount / *DayCount 是 [{date,total}]
  const days = (scale) => Array.from({ length: 15 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (14 - i))
    const p = (n) => String(n).padStart(2, '0')
    return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, total: Math.floor(Math.random() * scale) }
  })
  return {
    numberCount: {
      receiveTotal: 128, sendTotal: 42, delReceiveTotal: 3, delSendTotal: 0,
      normalReceiveTotal: 125, normalSendTotal: 42,
      userTotal: 3, normalUserTotal: 3, delUserTotal: 0,
      accountTotal: 4, normalAccountTotal: 4, delAccountTotal: 0
    },
    userDayCount: days(2),
    daySendTotal: 2,
    emailDayCount: { receiveDayCount: days(12), sendDayCount: days(4) }
  }
}

/* 账户操作（演示桩） */
export const accountAdd = async (email) => {
  await wait(180)
  const created = { accountId: acc().length + 10, userId: 1, email, name: '', status: 0, allReceive: 0, sort: 0, isDel: 0, createTime: day(0, '12:00'), latestEmailTime: null }
  acc().push(created)
  return created
}
export const accountSetName = async (accountId, name) => {
  await wait(80)
  const row = acc().find((a) => a.accountId === accountId)
  if (row) row.name = name
}
export const accountDelete = async (accountId) => {
  await wait(100)
  accounts = acc().filter((a) => a.accountId !== accountId)
}
export const accountSetAllReceive = async (accountId) => {
  await wait(80)
  acc().forEach((a) => { a.allReceive = a.accountId === accountId ? (a.allReceive ? 0 : 1) : 0 })
}
export const accountSetAsTop = async (accountId) => {
  await wait(80)
  acc().forEach((a) => { a.sort = a.accountId === accountId ? 1 : 0 })
}
export const userDeleteSelf = async () => { await wait(150) }

export const userSetType = async (userId, type) => {
  await wait(80)
  const row = MOCK_USERS.find((u) => u.userId === userId)
  if (row) row.type = type
}
export const userRestore = async (userId) => {
  await wait(100)
  const row = MOCK_USERS.find((u) => u.userId === userId)
  if (row) row.isDel = 0
}
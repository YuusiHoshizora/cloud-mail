/* 真实后端：路径与参数严格对齐 docs/02-api-contract.md */
import { request } from './http'

export const TYPE = { RECEIVE: 0, SEND: 1 }
export const UNREAD = { UNREAD: 0, READ: 1 }

export const login = (email, password) =>
  request('/login', { method: 'POST', body: { email, password } })

export const logout = () => request('/logout', { method: 'DELETE' })

/** 注册：{ email, password, code(邀请码), token(Turnstile) } */
export const register = (form) => request('/register', { method: 'POST', body: form })

export const loginUserInfo = () => request('/my/loginUserInfo')

export const accountAdd = (email, token) =>
  request('/account/add', { method: 'POST', body: { email, token } })
export const accountSetName = (accountId, name) =>
  request('/account/setName', { method: 'PUT', body: { accountId, name } })
export const accountDelete = (accountId) =>
  request('/account/delete', { method: 'DELETE', params: { accountId } })
export const accountSetAllReceive = (accountId) =>
  request('/account/setAllReceive', { method: 'PUT', body: { accountId } })
export const accountSetAsTop = (accountId) =>
  request('/account/setAsTop', { method: 'PUT', body: { accountId } })

export const userDeleteSelf = () => request('/my/delete', { method: 'DELETE' })
export const websiteConfig = () => request('/setting/websiteConfig')

export const accountList = (params = {}) => request('/account/list', { params })

export const emailList = (params) => request('/email/list', { params })

/** 长轮询：后端最多挂 35s 才返回，前端 timeout 放 40s */
export const emailLatest = (params, signal) =>
  request('/email/latest', { params, signal, timeout: 40000 })

export const emailRead = (emailIds) =>
  request('/email/read', { method: 'PUT', body: { emailIds } })

export const emailDelete = (emailIds) =>
  request('/email/delete', { method: 'DELETE', params: { emailIds: emailIds.join(',') } })

/** form: { sendEmail, receiveEmail[], accountId, name, subject, content, text,
 *          sendType, emailId, attachments[{content(base64),filename,size,contentType}] } */
export const emailSend = (form) => request('/email/send', { method: 'POST', body: form })

export const starAdd = (emailId) => request('/star/add', { method: 'POST', body: { emailId } })
export const starList = (params) => request('/star/list', { params })

export const starCancel = (emailId) => request('/star/cancel', { method: 'DELETE', params: { emailId } })

export const resetPassword = (password) =>
  request('/my/resetPassword', { method: 'PUT', body: { password } })

export const settingQuery = () => request('/setting/query')
export const settingSet = (setting) => request('/setting/set', { method: 'PUT', body: setting })
export const settingSetBackground = (background) =>
  request('/setting/setBackground', { method: 'PUT', body: { background } })
export const settingDeleteBackground = () =>
  request('/setting/deleteBackground', { method: 'DELETE' })

/* ---------------------------------------------------------------- 管理端 */
export const userList = (params) => request('/user/list', { params })
export const userAdd = (form) => request('/user/add', { method: 'POST', body: form })
export const userSetStatus = (userId, status) =>
  request('/user/setStatus', { method: 'PUT', body: { userId, status } })
export const userSetPwd = (userId, password) =>
  request('/user/setPwd', { method: 'PUT', body: { userId, password } })
export const userSetType = (userId, type) =>
  request('/user/setType', { method: 'PUT', body: { userId, type } })
export const userRestore = (userId, type) =>
  request('/user/restore', { method: 'PUT', body: { userId, type } })
export const userResetSendCount = (userId) =>
  request('/user/resetSendCount', { method: 'PUT', body: { userId } })
export const userDelete = (userIds) =>
  request('/user/delete', { method: 'DELETE', params: { userIds: userIds.join(',') } })

export const allEmailList = (params) => request('/allEmail/list', { params })
export const allEmailDelete = (emailIds) =>
  request('/allEmail/delete', { method: 'DELETE', params: { emailIds: emailIds.join(',') } })

export const regKeyList = (params) => request('/regKey/list', { params })
export const regKeyAdd = (form) => request('/regKey/add', { method: 'POST', body: form })
export const regKeyDelete = (regKeyIds) =>
  request('/regKey/delete', { method: 'DELETE', params: { regKeyIds: regKeyIds.join(',') } })

export const roleList = () => request('/role/list')
export const roleAdd = (form) => request('/role/add', { method: 'POST', body: form })
export const roleSet = (form) => request('/role/set', { method: 'PUT', body: form })
export const roleDelete = (roleId) => request('/role/delete', { method: 'DELETE', params: { roleId } })
export const roleSetDefault = (roleId) => request('/role/setDefault', { method: 'PUT', body: { roleId } })
export const rolePermTree = () => request('/role/permTree')

export const analysisEcharts = (timeZone) =>
  request('/analysis/echarts', { params: { timeZone } })

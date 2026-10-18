/* 真实后端：路径与参数严格对齐 docs/02-api-contract.md */
import { request } from './http'

export const TYPE = { RECEIVE: 0, SEND: 1 }
export const UNREAD = { UNREAD: 0, READ: 1 }

export const login = (email, password) =>
  request('/login', { method: 'POST', body: { email, password } })

export const logout = () => request('/logout', { method: 'DELETE' })

export const loginUserInfo = () => request('/my/loginUserInfo')

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
export const starCancel = (emailId) => request('/star/cancel', { method: 'DELETE', params: { emailId } })

export const resetPassword = (password) =>
  request('/my/resetPassword', { method: 'PUT', body: { password } })

export const settingQuery = () => request('/setting/query')
export const settingSet = (setting) => request('/setting/set', { method: 'PUT', body: setting })

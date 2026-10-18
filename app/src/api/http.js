/* 统一请求层：包体恒为 { code, message, data }，code!==200 一律抛错。
   鉴权走 `Authorization: <token 原文>`（后端没有 Bearer 前缀）。 */

const BASE = import.meta.env.VITE_API_BASE || '/api'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

function absolute(path) {
  if (/^https?:\/\//.test(BASE)) return BASE.replace(/\/$/, '') + path
  return BASE.replace(/\/$/, '') + path
}

/**
 * @param {string} path          以 / 开头的接口路径，例如 '/email/list'
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.params]  query 参数（null/undefined/'' 会被跳过）
 * @param {object} [options.body]    JSON 体
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeout] 毫秒；超时抛 AbortError
 */
export async function request(path, options = {}) {
  const { method = 'GET', params, body, signal, timeout } = options

  const url = new URL(absolute(path), location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  const headers = {}
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = token
  headers['accept-language'] = localStorage.getItem('lang') || 'zh'
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let timer
  let ctrl = signal
  if (timeout && !signal) {
    ctrl = new AbortController()
    timer = setTimeout(() => ctrl.abort(), timeout)
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl
    })
  } finally {
    if (timer) clearTimeout(timer)
  }

  const payload = await res.json().catch(() => null)
  if (!payload || typeof payload.code === 'undefined') {
    throw new ApiError(`服务器返回异常（HTTP ${res.status}）`, res.status)
  }
  if (payload.code !== 200) throw new ApiError(payload.message || '请求失败', payload.code)

  return payload.data
}

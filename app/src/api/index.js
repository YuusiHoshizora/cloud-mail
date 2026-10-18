/* 出口：VITE_MOCK=1 用假数据，否则打真实 API。组件只从这里拿接口。
   注意：这里必须先落到一个局部常量上再判断——如果直接写
   `export const api = import.meta.env.VITE_MOCK === '1' ? mock : real`，
   被导出的 binding 会阻止打包器内联，mock 假数据就会一起进生产包。 */
import * as real from './real'
import * as mock from './mock'

const USE_MOCK = import.meta.env.VITE_MOCK === '1'

export const isMock = USE_MOCK
export const api = USE_MOCK ? mock : real
export const TYPE = real.TYPE
export const UNREAD = real.UNREAD
export { ApiError } from './http'

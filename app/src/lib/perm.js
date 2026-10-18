/* 管理端权限：菜单项由后端返回的 permKeys 决定（'*' = 全部） */

export const ADMIN_SECTIONS = [
  { key: 'users', label: '用户', perm: 'user:query' },
  { key: 'all-mail', label: '全站邮件', perm: 'all-email:query' },
  { key: 'invite', label: '邀请码', perm: 'reg-key:query' },
  { key: 'roles', label: '角色', perm: 'role:query' },
  { key: 'analysis', label: '统计', perm: 'analysis:query' },
  { key: 'setting', label: '系统设置', perm: 'setting:query' }
]

export function hasPerm(user, perm) {
  const keys = user?.permKeys || []
  return keys.includes('*') || keys.includes(perm)
}

export function allowedSections(user) {
  return ADMIN_SECTIONS.filter((section) => hasPerm(user, section.perm))
}

/** 后端返回可能是数组、也可能是 { list } / { records }；统一成数组 */
export function toList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

export function toTotal(data, fallback = 0) {
  if (typeof data?.total === 'number') return data.total
  return fallback
}

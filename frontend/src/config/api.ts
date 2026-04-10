/**
 * 后端 API 基准地址（无尾部斜杠）。
 *
 * - 开发环境：返回空字符串，请求走当前页面源 + Vite proxy，避免跨域。
 * - 生产环境：使用 VITE_API_BASE_URL；未设置则回退为同域（由网关反代 /api）。
 */
export function resolveApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return ''
  }
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
  if (raw) {
    return raw.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

/** 拼接完整请求 URL（path 须以 / 开头，可含 query）。 */
export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = resolveApiBaseUrl()
  return base ? `${base}${normalized}` : normalized
}

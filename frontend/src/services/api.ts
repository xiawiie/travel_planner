import axios, { type AxiosError } from 'axios'
import type { TripFormData, TripPlanResponse } from '@/types'
import { resolveApiBaseUrl } from '@/config/api'

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function formatAxiosError(error: AxiosError<{ detail?: unknown }>): string {
  const detail = error.response?.data?.detail
  if (detail == null) {
    return error.message || '请求失败'
  }
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item: unknown) =>
        typeof item === 'object' && item !== null && 'msg' in item
          ? String((item as { msg: string }).msg)
          : JSON.stringify(item)
      )
      .join('; ')
  }
  if (typeof detail === 'object') {
    return JSON.stringify(detail)
  }
  return String(detail)
}

apiClient.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.method?.toUpperCase(), config.baseURL || '', config.url)
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('响应错误:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

/** 后端 LLM 可达约 600s；全局 120s 会先超时，成功响应永远到不了前端，结果页不会跳转 */
const TRIP_PLAN_TIMEOUT_MS = 660_000

export async function generateTripPlan(formData: TripFormData): Promise<TripPlanResponse> {
  try {
    const response = await apiClient.post<TripPlanResponse>('/api/trip/plan', formData, {
      timeout: TRIP_PLAN_TIMEOUT_MS,
    })
    return response.data
  } catch (error: unknown) {
    console.error('生成旅行计划失败:', error)
    if (axios.isAxiosError(error)) {
      throw new Error(formatAxiosError(error))
    }
    throw error instanceof Error ? error : new Error('生成旅行计划失败')
  }
}

export async function healthCheck(): Promise<unknown> {
  try {
    const response = await apiClient.get('/health')
    return response.data
  } catch (error: unknown) {
    console.error('健康检查失败:', error)
    if (axios.isAxiosError(error)) {
      throw new Error(formatAxiosError(error))
    }
    throw error instanceof Error ? error : new Error('健康检查失败')
  }
}

export default apiClient

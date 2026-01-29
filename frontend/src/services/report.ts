import type { ConversationMessage } from '../store/useCallStore'

export interface GenerateReportInput {
  projectName: string
  conversationHistory: ConversationMessage[]
  duration?: string
  projectId: string
}

export interface GeneratedReport {
  projectName: string
  date: string
  duration: string
  todayWork: {
    [key: string]: string[]
  }
  tomorrowPlan: string[]
  summary: string
  highlights: string[]
  risks: string[]
}

export interface SavedReport extends GeneratedReport {
  id: string
  projectId: string
  conversation: {
    history: ConversationMessage[]
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * 生成日报（不保存）
 */
export async function generateReport(input: GenerateReportInput): Promise<GeneratedReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    },
    body: JSON.stringify({
      projectName: input.projectName,
      conversationHistory: input.conversationHistory,
      duration: input.duration || '0:00'
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '生成日报失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 生成并保存日报
 */
export async function saveReport(input: GenerateReportInput): Promise<SavedReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    },
    body: JSON.stringify({
      projectName: input.projectName,
      conversationHistory: input.conversationHistory,
      duration: input.duration || '0:00',
      projectId: input.projectId
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '保存日报失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 获取日报详情
 */
export async function getReport(id: string): Promise<SavedReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
    headers: {
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取日报失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 获取日报列表
 */
export async function getReports(filters?: {
  projectId?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<SavedReport[]> {
  const params = new URLSearchParams()

  if (filters?.projectId) {
    params.append('projectId', filters.projectId)
  }
  if (filters?.startDate) {
    params.append('startDate', filters.startDate)
  }
  if (filters?.endDate) {
    params.append('endDate', filters.endDate)
  }
  if (filters?.limit) {
    params.append('limit', filters.limit.toString())
  }

  const response = await fetch(`${API_BASE_URL}/api/reports?${params.toString()}`, {
    headers: {
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取日报列表失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 更新日报
 */
export async function updateReport(
  id: string,
  updates: {
    todayWork?: { [key: string]: string[] }
    tomorrowPlan?: string[]
    summary?: string
  }
): Promise<SavedReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '更新日报失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 删除日报
 */
export async function deleteReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
    method: 'DELETE',
    headers: {
      'X-User-Id': 'default-user' // TODO: 替换为真实用户ID
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '删除日报失败')
  }
}

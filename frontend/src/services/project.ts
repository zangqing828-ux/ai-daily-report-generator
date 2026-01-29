const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface Project {
  id: string
  name: string
  description: string | null
  userId: string
  createdAt: string
  updatedAt: string
  _count?: {
    reports: number
  }
}

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 获取用户的所有项目
 */
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    headers: {
      'x-user-id': 'default-user' // TODO: 替换为真实的用户 ID
    }
  })

  const result: ApiResponse<Project[]> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取项目列表失败')
  }

  return result.data
}

/**
 * 获取单个项目详情
 */
export async function getProject(id: string): Promise<Project & { reports?: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    headers: {
      'x-user-id': 'default-user' // TODO: 替换为真实的用户 ID
    }
  })

  const result: ApiResponse<Project & { reports?: any[] }> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取项目详情失败')
  }

  return result.data
}

/**
 * 创建新项目
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'default-user' // TODO: 替换为真实的用户 ID
    },
    body: JSON.stringify(input)
  })

  const result: ApiResponse<Project> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '创建项目失败')
  }

  return result.data
}

/**
 * 更新项目
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'default-user' // TODO: 替换为真实的用户 ID
    },
    body: JSON.stringify(input)
  })

  const result: ApiResponse<Project> = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || '更新项目失败')
  }

  return result.data
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: 'DELETE',
    headers: {
      'x-user-id': 'default-user' // TODO: 替换为真实的用户 ID
    }
  })

  const result: ApiResponse<unknown> = await response.json()

  if (!result.success) {
    throw new Error(result.error || '删除项目失败')
  }
}

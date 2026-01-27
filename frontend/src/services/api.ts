const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface CallSession {
  success: boolean
  sessionId: string
  message: string
  serverTime: string
}

export interface CallStatusResponse {
  success: boolean
  sessionId: string
  status: string
  duration: number
}

export async function startCall(projectName: string = '项目 A'): Promise<CallSession> {
  const res = await fetch(`${API_BASE}/api/call/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName })
  })

  if (!res.ok) {
    throw new Error(`Failed to start call: ${res.statusText}`)
  }

  return res.json()
}

export async function endCall(sessionId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/call/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  })

  if (!res.ok) {
    throw new Error(`Failed to end call: ${res.statusText}`)
  }

  return res.json()
}

export async function getCallStatus(sessionId: string): Promise<CallStatusResponse> {
  const res = await fetch(`${API_BASE}/api/call/status/${sessionId}`)

  if (!res.ok) {
    throw new Error(`Failed to get call status: ${res.statusText}`)
  }

  return res.json()
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/health`)

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`)
  }

  return res.json()
}

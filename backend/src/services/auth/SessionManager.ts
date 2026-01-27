import { randomUUID } from 'crypto'

interface SessionData {
  sessionId: string
  userId: string | undefined
  createdAt: Date
  expiresAt: Date
}

export class SessionManager {
  private sessions = new Map<string, SessionData>()
  private sessionExpiry = 30 * 60 * 1000 // 30 分钟

  create(userId?: string): string {
    const sessionId = randomUUID()
    const now = new Date()

    const sessionData: SessionData = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.sessionExpiry)
    }

    this.sessions.set(sessionId, sessionData)

    // 清理过期会话
    this.cleanup()

    return sessionId
  }

  validate(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return false
    }

    // 检查是否过期
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId)
      return false
    }

    return true
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId)

    if (session && new Date() > session.expiresAt) {
      this.sessions.delete(sessionId)
      return undefined
    }

    return session
  }

  revoke(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  private cleanup(): void {
    const now = new Date()

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId)
      }
    }
  }

  // 定期清理过期会话
  startCleanupInterval(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup()
    }, intervalMs)
  }

  getActiveSessionCount(): number {
    this.cleanup()
    return this.sessions.size
  }
}

// 单例实例
export const sessionManager = new SessionManager()

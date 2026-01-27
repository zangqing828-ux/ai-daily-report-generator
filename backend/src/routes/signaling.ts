import { Router, Request, Response } from 'express'
import { sessionManager } from '../services/auth/SessionManager'

const router = Router()

// 启动通话会话
router.post('/api/call/start', async (req: Request, res: Response) => {
  try {
    const { projectName } = req.body

    // 使用 SessionManager 创建会话
    const sessionId = sessionManager.create()

    res.json({
      success: true,
      sessionId,
      message: 'Call session started successfully',
      serverTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error starting call:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start call session'
    })
  }
})

// 结束通话会话
router.post('/api/call/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body

    // 撤销会话
    if (sessionId) {
      sessionManager.revoke(sessionId)
    }

    res.json({
      success: true,
      message: 'Call session ended successfully'
    })
  } catch (error) {
    console.error('Error ending call:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to end call session'
    })
  }
})

// 获取会话状态
router.get('/api/call/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    // TODO: 从数据库或缓存中获取会话状态

    res.json({
      success: true,
      sessionId,
      status: 'active',
      duration: 0
    })
  } catch (error) {
    console.error('Error getting call status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get call status'
    })
  }
})

export default router

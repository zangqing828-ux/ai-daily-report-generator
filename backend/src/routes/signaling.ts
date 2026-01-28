import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { sessionManager } from '../services/auth/SessionManager'
import { logger } from '../utils/logger'
import {
  startCallSchema,
  startCallResponseSchema,
  endCallSchema,
  endCallResponseSchema,
  callStatusResponseSchema,
  errorResponseSchema
} from '../utils/validation'

const router = Router()

// 启动通话会话
router.post('/api/call/start', async (req: Request, res: Response) => {
  try {
    // 验证请求体
    const validatedBody = startCallSchema.parse(req.body)

    // 使用 SessionManager 创建会话
    const sessionId = sessionManager.create()

    const response: z.infer<typeof startCallResponseSchema> = {
      success: true,
      sessionId,
      message: 'Call session started successfully',
      serverTime: new Date().toISOString()
    }

    // 验证响应
    const validatedResponse = startCallResponseSchema.parse(response)
    res.json(validatedResponse)
  } catch (error) {
    logger.error('Error starting call', error)

    const errorResponse: z.infer<typeof errorResponseSchema> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start call session'
    }

    res.status(500).json(errorResponse)
  }
})

// 结束通话会话
router.post('/api/call/end', async (req: Request, res: Response) => {
  try {
    // 验证请求体
    const { sessionId } = endCallSchema.parse(req.body)

    // 撤销会话
    sessionManager.revoke(sessionId)

    const response: z.infer<typeof endCallResponseSchema> = {
      success: true,
      message: 'Call session ended successfully'
    }

    const validatedResponse = endCallResponseSchema.parse(response)
    res.json(validatedResponse)
  } catch (error) {
    logger.error('Error ending call', error)

    const errorResponse: z.infer<typeof errorResponseSchema> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end call session'
    }

    res.status(500).json(errorResponse)
  }
})

// 获取会话状态
router.get('/api/call/status/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    // TODO: 从数据库或缓存中获取会话状态

    const response = {
      success: true,
      sessionId,
      status: 'active' as const,
      duration: 0
    }

    const validatedResponse = callStatusResponseSchema.parse(response)
    res.json(validatedResponse)
  } catch (error) {
    logger.error('Error getting call status', error)

    const errorResponse: z.infer<typeof errorResponseSchema> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get call status'
    }

    res.status(500).json(errorResponse)
  }
})

export default router

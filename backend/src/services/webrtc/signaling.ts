import { Socket, Server as SocketIOServer } from 'socket.io'
import type { RTCSessionDescriptionInit } from '../../types/webrtc'
import { sessionManager } from '../auth/SessionManager'
import { logger } from '../../utils/logger'
import { DoubaoRealtimeService } from '../doubao/DoubaoRealtimeService'

interface AuthenticatedSocket extends Socket {
  sessionId?: string
  userId?: string
  doubaoService?: DoubaoRealtimeService | null
}

export class SignalingService {
  private connectedClients = new Map<string, AuthenticatedSocket>()

  constructor(private io: SocketIOServer) {
    this.initializeDoubaoConfig()
  }

  /**
   * 初始化豆包配置
   */
  private initializeDoubaoConfig(): void {
    if (!process.env.DOUBAO_APP_ID || !process.env.DOUBAO_ACCESS_KEY) {
      logger.warn('Doubao credentials not configured in environment variables')
    }
  }

  /**
   * 为用户创建豆包服务实例
   */
  private createDoubaoService(): DoubaoRealtimeService | null {
    if (!process.env.DOUBAO_APP_ID || !process.env.DOUBAO_ACCESS_KEY) {
      logger.error('Doubao credentials not configured')
      return null
    }

    const service = new DoubaoRealtimeService({
      appId: process.env.DOUBAO_APP_ID,
      accessKey: process.env.DOUBAO_ACCESS_KEY,
      model: (process.env.DOUBAO_MODEL as 'O' | 'O2.0' | 'SC' | 'SC2.0') || 'O',
      defaultSpeaker: process.env.DOUBAO_DEFAULT_SPEAKER || 'zh_male_yunzhou_jupiter_bigtts',
    })

    // 设置豆包事件监听器
    this.setupDoubaoEventHandlers(service)

    return service
  }

  /**
   * 设置豆包事件处理器
   */
  private setupDoubaoEventHandlers(service: DoubaoRealtimeService): void {
    // 监听豆包 TTS 音频响应
    service.on('tts-audio', (audioData: Buffer) => {
      // 这里需要找到对应的 socket 并转发音频
      // 暂时不实现，因为需要维护 service 到 socket 的映射
    })

    // 监听豆包 ASR 文本结果
    service.on('asr-text', (data: { text: string; isInterim: boolean }) => {
      logger.debug('[Doubao] ASR result:', data)
    })

    // 监听豆包 Chat 响应
    service.on('chat-response', (data: { content: string; questionId: string; replyId: string }) => {
      logger.debug('[Doubao] Chat response:', { content: data.content })
    })

    // 监听错误
    service.on('error', (error: Error) => {
      logger.error('[Doubao] Error:', error)
    })
  }

  handleConnection(socket: AuthenticatedSocket): void {
    // 验证 sessionId
    const sessionId = socket.handshake.auth.sessionId as string

    if (!sessionId || !sessionManager.validate(sessionId)) {
      socket.emit('error', { message: 'Unauthorized: Invalid or expired session' })
      socket.disconnect()
      logger.warn('Unauthorized connection attempt', { socketId: socket.id })
      return
    }

    // 获取会话数据
    const sessionData = sessionManager.get(sessionId)

    logger.info('Client connected', { socketId: socket.id, sessionId })
    socket.sessionId = sessionId
    socket.userId = sessionData?.userId
    this.connectedClients.set(socket.id, socket)

    // 创建豆包服务实例
    socket.doubaoService = this.createDoubaoService()

    socket.on('start-call', async (data) => {
      logger.info('[Call] Start call request', { socketId: socket.id, data })
      try {
        if (!socket.doubaoService) {
          socket.emit('error', { message: 'Doubao service not initialized' })
          return
        }

        // 设置豆包事件监听器（在连接之前设置，确保不会错过事件）
        this.setupSocketDoubaoHandlers(socket, socket.doubaoService)

        // 连接到豆包并等待会话ID创建完成
        await socket.doubaoService.connect()

        // 等待 ConnectionStarted 事件创建 session ID（最多等待5秒）
        const maxWaitTime = 5000
        const startTime = Date.now()
        let sessionId = socket.doubaoService.getCurrentSessionId()

        while (!sessionId && Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100))
          sessionId = socket.doubaoService.getCurrentSessionId()
          logger.debug('[Call] Waiting for session ID...', {
            socketId: socket.id,
            elapsed: Date.now() - startTime
          })
        }

        if (!sessionId) {
          throw new Error('Failed to create session ID after 5 seconds')
        }

        logger.info('[Call] Session ID created', { socketId: socket.id, sessionId })

        // 开始会话
        socket.doubaoService.startSession({
          botName: '日报助手',
          systemRole: '你是专业的日报助手，帮助用户整理日常工作内容',
          speakingStyle: '专业、友好、简洁',
        })

        socket.emit('call-started', {
          sessionId: sessionId,
        })
      } catch (error) {
        logger.error('[Call] Failed to start call', error, { socketId: socket.id })
        socket.emit('error', { message: 'Failed to start call' })
      }
    })

    socket.on('finish-call', async () => {
      logger.info('[Call] Finish call request', { socketId: socket.id })
      try {
        if (socket.doubaoService) {
          socket.doubaoService.finishSession()
          socket.doubaoService.disconnect()
        }
        socket.emit('call-finished')
      } catch (error) {
        logger.error('[Call] Failed to finish call', error, { socketId: socket.id })
        socket.emit('error', { message: 'Failed to finish call' })
      }
    })

    socket.on('offer', async (data) => {
      logger.debug('Received offer', { socketId: socket.id })
      try {
        // 处理 SDP offer
        const answer = await this.createAnswer(data)
        socket.emit('answer', answer)
      } catch (error) {
        logger.error('Error handling offer', error, { socketId: socket.id })
        socket.emit('error', { message: 'Failed to process offer' })
      }
    })

    socket.on('ice-candidate', (candidate) => {
      logger.debug('Received ICE candidate', { socketId: socket.id })
      // 转发 ICE candidate 到其他客户端
      socket.broadcast.emit('ice-candidate', {
        candidate,
        senderId: socket.id
      })
    })

    socket.on('audio-stream', (audioData) => {
      // 处理音频流数据
      logger.info('[Audio] Received audio stream from frontend', {
        socketId: socket.id,
        dataType: Object.prototype.toString.call(audioData),
        hasData: !!audioData,
        length: audioData?.length,
        isBuffer: Buffer.isBuffer(audioData),
        isUint8Array: audioData instanceof Uint8Array
      })

      if (audioData && audioData.length > 0) {
        logger.info('[Audio] Processing audio data', {
          socketId: socket.id,
          size: audioData.length,
          bytes: audioData.length,
          firstBytes: Array.from(audioData.slice(0, 10))
        })

        // 转发音频到豆包
        if (socket.doubaoService) {
          try {
            // 如果是 Uint8Array，转换为 Buffer
            const audioBuffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData)
            logger.info('[Audio] Sending audio to Doubao', {
              socketId: socket.id,
              bufferSize: audioBuffer.length,
              hasService: !!socket.doubaoService,
              sessionId: socket.doubaoService.getCurrentSessionId()
            })
            socket.doubaoService.sendAudio(audioBuffer)
            logger.info('[Audio] Successfully sent to Doubao', { socketId: socket.id })
          } catch (error) {
            logger.error('[Audio] Failed to send audio to Doubao', error, { socketId: socket.id })
          }
        } else {
          logger.warn('[Audio] Doubao service not available', {
            socketId: socket.id,
            hasService: !!socket.doubaoService
          })
        }
      } else {
        logger.warn('[Audio] Empty or invalid audio data', {
          socketId: socket.id,
          hasData: !!audioData,
          length: audioData?.length
        })
      }
    })

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id })

      // 断开豆包连接
      if (socket.doubaoService) {
        try {
          socket.doubaoService.disconnect()
        } catch (error) {
          logger.error('Failed to disconnect Doubao service', error)
        }
      }

      this.connectedClients.delete(socket.id)
    })

    socket.on('error', (error) => {
      logger.error('Socket error', error, { socketId: socket.id })
    })
  }

  /**
   * 设置特定 socket 的豆包事件处理器
   */
  private setupSocketDoubaoHandlers(socket: AuthenticatedSocket, service: DoubaoRealtimeService): void {
    // TTS 音频响应
    service.on('tts-audio', (audioData: Buffer) => {
      socket.emit('ai-audio', audioData)
    })

    // ASR 文本结果
    service.on('asr-text', (data: { text: string; isInterim: boolean }) => {
      socket.emit('transcript', {
        text: data.text,
        role: 'user',
        isInterim: data.isInterim,
      })
    })

    // Chat 响应
    service.on('chat-response', (data: { content: string; questionId: string; replyId: string }) => {
      socket.emit('transcript', {
        text: data.content,
        role: 'assistant',
      })
    })

    // 会话启动成功
    service.on('session-started', (data: { dialogId: string }) => {
      socket.emit('session-ready', data)
    })

    // 错误处理
    service.on('error', (error: Error) => {
      socket.emit('error', { message: error.message })
    })
  }

  private async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    // TODO: 实现 WebRTC peer connection 并创建 answer
    // 现在返回 mock answer
    return {
      type: 'answer',
      sdp: 'mock-sdp-answer'
    }
  }

  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data)
  }

  sendToClient(socketId: string, event: string, data: any): void {
    const client = this.connectedClients.get(socketId)
    if (client) {
      client.emit(event, data)
    }
  }

  getConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys())
  }
}

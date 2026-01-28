import { Socket, Server as SocketIOServer } from 'socket.io'
import type { RTCSessionDescriptionInit } from '../../types/webrtc'
import { sessionManager } from '../auth/SessionManager'
import { logger } from '../../utils/logger'

interface AuthenticatedSocket extends Socket {
  sessionId?: string
  userId?: string
}

export class SignalingService {
  private connectedClients = new Map<string, AuthenticatedSocket>()

  constructor(private io: SocketIOServer) {}

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
      logger.debug('Received audio stream', {
        socketId: socket.id,
        size: audioData?.length || 0
      })
      // TODO: 处理音频数据并发送给 AI
    })

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id })
      this.connectedClients.delete(socket.id)
    })

    socket.on('error', (error) => {
      logger.error('Socket error', error, { socketId: socket.id })
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

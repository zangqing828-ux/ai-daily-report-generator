import { Socket, Server as SocketIOServer } from 'socket.io'
import type { RTCSessionDescriptionInit } from '../../types/webrtc'

export class SignalingService {
  private connectedClients = new Map<string, Socket>()

  constructor(private io: SocketIOServer) {}

  handleConnection(socket: Socket): void {
    console.log('Client connected:', socket.id)
    this.connectedClients.set(socket.id, socket)

    socket.on('offer', async (data) => {
      console.log('Received offer from', socket.id)
      try {
        // 处理 SDP offer
        const answer = await this.createAnswer(data)
        socket.emit('answer', answer)
      } catch (error) {
        console.error('Error handling offer:', error)
        socket.emit('error', { message: 'Failed to process offer' })
      }
    })

    socket.on('ice-candidate', (candidate) => {
      console.log('Received ICE candidate from', socket.id)
      // 转发 ICE candidate 到其他客户端
      socket.broadcast.emit('ice-candidate', {
        candidate,
        senderId: socket.id
      })
    })

    socket.on('audio-stream', (audioData) => {
      // 处理音频流数据
      console.log('Received audio stream from', socket.id, 'Size:', audioData?.length || 0)
      // TODO: 处理音频数据并发送给 AI
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      this.connectedClients.delete(socket.id)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', socket.id, error)
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

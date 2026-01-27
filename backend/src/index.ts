import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { SignalingService } from './services/webrtc/signaling'
import signalingRoutes from './routes/signaling'
import audioRoutes from './routes/audio'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 信息端点
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Daily Report Generator API',
    version: '1.0.0',
    status: 'running'
  })
})

// 信令路由
app.use(signalingRoutes)

// 音频处理路由
app.use(audioRoutes)

const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
})

// 初始化信令服务
const signaling = new SignalingService(io)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  signaling.handleConnection(socket)
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { SignalingService } from './services/webrtc/signaling'
import signalingRoutes from './routes/signaling'
import audioRoutes from './routes/audio'

dotenv.config()

// 验证必需的环境变量
function validateEnv() {
  const required = ['DATABASE_URL'] as const
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // 检查是否使用了不安全的默认密码
  const dbUrl = process.env['DATABASE_URL']
  if (dbUrl && (dbUrl.includes('YOUR_SECURE_PASSWORD') || dbUrl.includes('password'))) {
    throw new Error('Please set a secure password in DATABASE_URL. Do not use the default value.')
  }

  // 检查数据库连接
  if (dbUrl && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must start with postgresql:// or postgres://')
  }
}

try {
  validateEnv()
} catch (error) {
  console.error('Environment validation failed:')
  if (error instanceof Error) {
    console.error(error.message)
  }
  process.exit(1)
}

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
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true
  }
})

// 初始化信令服务
const signaling = new SignalingService(io)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  signaling.handleConnection(socket)
})

const PORT = process.env['PORT'] || 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`)
})

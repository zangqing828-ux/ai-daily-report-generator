import rateLimit from 'express-rate-limit'

// 通用 API 速率限制
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false
})

// 音频上传速率限制（更严格）
export const audioUploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分钟
  max: 10, // 每个 IP 每分钟最多 10 次音频上传
  message: '音频上传过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false
})

// Socket.IO 连接速率限制
export const connectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 50, // 每个 IP 最多 50 个连接
  message: '连接过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false
})

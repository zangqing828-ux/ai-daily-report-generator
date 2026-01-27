import { Router, Request, Response } from 'express'

const router = Router()

// 音频流大小限制
const MAX_AUDIO_SIZE = 10 * 1024 * 1024 // 10MB
const AUDIO_TIMEOUT = 30 * 1000 // 30 秒

// 接收音频流
router.post('/api/audio/stream', async (req: Request, res: Response) => {
  try {
    const chunks: Buffer[] = []
    let totalSize = 0
    let timeout: NodeJS.Timeout | null = null

    // 设置超时
    timeout = setTimeout(() => {
      req.destroy(new Error('Request timeout'))
    }, AUDIO_TIMEOUT)

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length

      // 检查大小限制
      if (totalSize > MAX_AUDIO_SIZE) {
        if (timeout) clearTimeout(timeout)
        req.destroy(new Error('Request body too large'))
        return
      }

      chunks.push(chunk)
    })

    req.on('end', async () => {
      if (timeout) clearTimeout(timeout)

      try {
        const audioBuffer = Buffer.concat(chunks)
        console.log(`Received audio chunk: ${audioBuffer.length} bytes`)

        // TODO: 处理音频数据
        // 1. 转换为 Float32Array
        // 2. 发送到 VAD 服务
        // 3. 发送到 ASR 服务
        // 4. 通过 Socket.IO 返回识别结果

        res.json({
          success: true,
          transcript: 'mock transcript'
        })
      } catch (error) {
        console.error('Error processing audio:', error)
        res.status(500).json({
          success: false,
          error: 'Failed to process audio'
        })
      }
    })

    req.on('error', (error: Error) => {
      if (timeout) clearTimeout(timeout)

      if (error.message === 'Request body too large') {
        res.status(413).json({
          success: false,
          error: 'Audio data too large (max 10MB)'
        })
      } else if (error.message === 'Request timeout') {
        res.status(408).json({
          success: false,
          error: 'Request timeout'
        })
      } else {
        res.status(500).json({
          success: false,
          error: 'Audio stream processing failed'
        })
      }
    })
  } catch (error) {
    console.error('Error in audio stream handler:', error)
    res.status(500).json({
      success: false,
      error: 'Audio stream processing failed'
    })
  }
})

export default router

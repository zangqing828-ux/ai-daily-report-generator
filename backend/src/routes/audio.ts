import { Router, Request, Response } from 'express'

const router = Router()

// 接收音频流
router.post('/api/audio/stream', async (req: Request, res: Response) => {
  try {
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    req.on('end', async () => {
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
  } catch (error) {
    console.error('Error in audio stream handler:', error)
    res.status(500).json({
      success: false,
      error: 'Audio stream processing failed'
    })
  }
})

export default router

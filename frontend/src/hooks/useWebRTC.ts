import { useCallback, useRef, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { createWebRTCConnection, closeWebRTCConnection } from '../lib/webrtc-adapter'
import { startCall as apiStartCall, endCall as apiEndCall } from '../services/api'
import { useCallStore } from '../store/useCallStore'
import type { WebRTCConnection } from '../types/conversation'
import type { ConversationMessage } from '../types/conversation'

export function useWebRTC() {
  const { status, setStatus, setAudioLevel, addConversationMessage } = useCallStore()
  const connectionRef = useRef<WebRTCConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const isRecordingRef = useRef<boolean>(false)

  // 更新通话时长
  useEffect(() => {
    if (status.aiState !== 'idle' && !durationIntervalRef.current) {
      startTimeRef.current = new Date()
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
          const minutes = Math.floor(elapsed / 60)
          const seconds = elapsed % 60
          setStatus(prev => ({
            ...prev,
            duration: `${minutes}:${seconds.toString().padStart(2, '0')}`
          }))
        }
      }, 1000)
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [status.aiState])

  // 设置音频分析器
  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      // 创建 AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      // 创建分析器
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      // 连接音频源
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // 创建数据数组并开始分析
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const analyzeAudio = () => {
        if (!analyserRef.current) {
          return
        }

        analyserRef.current.getByteFrequencyData(dataArray)

        // 计算平均音量
        const sum = dataArray.reduce((acc, val) => acc + val, 0)
        const average = sum / dataArray.length

        // 归一化到 0-1 范围
        const normalizedLevel = average / 255

        // 更新音频级别（设置阈值避免噪音）
        if (normalizedLevel > 0.01) {
          setAudioLevel(normalizedLevel)
        } else {
          setAudioLevel(0)
        }

        // 继续分析
        animationFrameRef.current = requestAnimationFrame(analyzeAudio)
      }

      // 开始分析
      analyzeAudio()
    } catch (error) {
      console.error('Failed to setup audio analyzer:', error)
    }
  }, [setAudioLevel])

  // 清理音频分析器
  const cleanupAudioAnalyzer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setAudioLevel(0)
  }, [setAudioLevel])

  // 设置 MediaRecorder 采集音频数据
  const setupMediaRecorder = useCallback((stream: MediaStream, socket: Socket) => {
    try {
      // 检查浏览器支持的 MIME 类型
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      })

      mediaRecorderRef.current = mediaRecorder
      isRecordingRef.current = true

      // 当有音频数据可用时
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socket && socket.connected && isRecordingRef.current) {
          try {
            // 将 Blob 转换为 ArrayBuffer
            const arrayBuffer = await event.data.arrayBuffer()
            // 在浏览器中使用 Uint8Array，不要用 Buffer
            const uint8Array = new Uint8Array(arrayBuffer)

            // 发送音频数据到后端
            socket.emit('audio-stream', uint8Array)
            console.log('Sent audio data:', uint8Array.length, 'bytes')
          } catch (error) {
            console.error('Failed to send audio data:', error)
          }
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
      }

      // 每 20ms 采集一次音频数据
      mediaRecorder.start(20)
      console.log('MediaRecorder started with mimeType:', mimeType)
    } catch (error) {
      console.error('Failed to setup MediaRecorder:', error)
    }
  }, [])

  const startCall = useCallback(async () => {
    try {
      setStatus(prev => ({
        ...prev,
        aiState: 'thinking',
        lastTranscript: '正在连接服务器...'
      }))

      // 1. 调用后端 API 创建会话
      const session = await apiStartCall(status.currentProject)
      sessionIdRef.current = session.sessionId

      // 2. 连接 Socket.IO（配置重连策略）
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        auth: {
          sessionId: session.sessionId
        },
        // 重连配置
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000, // 初始重连延迟 1 秒
        reconnectionDelayMax: 10000, // 最大重连延迟 10 秒
        timeout: 20000 // 连接超时 20 秒
      })
      socketRef.current = socket

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id)

        // 发送 start-call 事件启动豆包
        socket.emit('start-call', {})

        setStatus(prev => ({
          ...prev,
          aiState: 'listening',
          lastTranscript: '已连接，请开始说话'
        }))
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
        setStatus(prev => ({
          ...prev,
          aiState: 'idle',
          lastTranscript: reason === 'io server disconnect'
            ? '服务器断开连接'
            : '连接已断开，正在重连...'
        }))
      })

      socket.io.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts')
        setStatus(prev => ({
          ...prev,
          aiState: 'listening',
          lastTranscript: `重连成功 (第 ${attemptNumber} 次尝试)`
        }))
      })

      socket.io.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber)
        setStatus(prev => ({
          ...prev,
          lastTranscript: `正在重连... (${attemptNumber}/10)`
        }))
      })

      socket.io.on('reconnect_failed', () => {
        console.log('Reconnection failed')
        setStatus(prev => ({
          ...prev,
          aiState: 'idle',
          lastTranscript: '重连失败，请检查网络'
        }))
      })

      socket.on('call-started', (data) => {
        console.log('Call started:', data)
        setStatus(prev => ({
          ...prev,
          aiState: 'listening',
          lastTranscript: '豆包已就绪，请开始说话'
        }))
      })

      socket.on('session-ready', (data) => {
        console.log('Session ready:', data)
      })

      socket.on('answer', (data) => {
        console.log('Received answer:', data)
        // 处理 WebRTC answer
      })

      socket.on('ice-candidate', (data) => {
        console.log('Received ICE candidate:', data)
        // 处理 ICE candidate
      })

      socket.on('transcript', (data) => {
        // 接收实时识别文本
        console.log('Transcript:', data)
        if (data.text && !data.isInterim) {
          // 只保存非临时结果的文本
          const isUser = data.role === 'user'
          setStatus(prev => ({
            ...prev,
            aiState: isUser ? 'listening' : 'speaking',
            lastTranscript: data.text
          }))

          // 保存到对话历史
          const message: ConversationMessage = {
            role: data.role === 'user' ? 'user' : 'assistant',
            content: data.text,
            timestamp: new Date().toISOString()
          }
          addConversationMessage(message)
        }
      })

      socket.on('chat-response', (data) => {
        // 接收豆包对话响应
        console.log('Chat response:', data)
        if (data.text) {
          setStatus(prev => ({
            ...prev,
            aiState: 'speaking',
            lastTranscript: data.text
          }))

          // 保存到对话历史（避免重复，transcript 已经保存了）
          // 这里不保存，因为 chat-response 和 transcript 都会返回同样的内容
        }
      })

      socket.on('ai-audio', async (audioData) => {
        // 接收豆包 TTS 音频并播放
        console.log('Received AI audio:', audioData?.length || 0, 'bytes')
        try {
          // 将 ArrayBuffer 转换为 AudioBuffer 并播放
          const audioContext = audioContextRef.current
          if (!audioContext) {
            console.warn('AudioContext not available')
            return
          }

          // audioData 是 Buffer，需要转换为 ArrayBuffer
          const arrayBuffer = audioData.buffer.slice(
            audioData.byteOffset,
            audioData.byteOffset + audioData.byteLength
          )

          // 解码音频数据（豆包返回的是 Opus 格式，需要特殊处理）
          // 暂时跳过播放，需要先实现 Opus 解码
          console.log('Audio playback not yet implemented for Opus format')
        } catch (error) {
          console.error('Failed to play AI audio:', error)
        }
      })

      socket.on('call-finished', () => {
        console.log('Call finished')
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
        setStatus(prev => ({
          ...prev,
          lastTranscript: `错误: ${error.message || '连接失败'}`
        }))
      })

      // 3. 创建 WebRTC 连接
      const connection = await createWebRTCConnection()
      connectionRef.current = connection

      // 4. 发送 offer
      const offer = await connection.pc.createOffer()
      await connection.pc.setLocalDescription(offer)
      socket.emit('offer', { offer, sessionId: session.sessionId })

      // 5. 处理音频流
      connection.stream.getAudioTracks().forEach(track => {
        track.onended = () => {
          console.log('Audio track ended')
        }
      })

      // 6. 设置音频分析器（用于可视化）
      setupAudioAnalyzer(connection.stream)

      // 7. 设置 MediaRecorder 采集音频数据并发送到后端
      setupMediaRecorder(connection.stream, socket)

      return connection
    } catch (error) {
      console.error('Failed to start call:', error)
      setStatus(prev => ({
        ...prev,
        aiState: 'idle',
        lastTranscript: error instanceof Error ? error.message : '连接失败，请检查麦克风权限'
      }))
      throw error
    }
  }, [status.currentProject, setupAudioAnalyzer, setupMediaRecorder, setStatus, addConversationMessage])

  const endCall = useCallback(async () => {
    // 停止音频录制
    isRecordingRef.current = false
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // 发送 finish-call 事件通知后端关闭豆包连接
    if (socketRef.current) {
      socketRef.current.emit('finish-call', {})
    }

    // 清理音频分析器
    cleanupAudioAnalyzer()

    // 清理 Socket.IO 连接
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    // 清理 WebRTC 连接
    if (connectionRef.current) {
      closeWebRTCConnection(connectionRef.current)
      connectionRef.current = null
    }

    // 清理定时器
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    startTimeRef.current = null

    // 调用后端 API 结束会话
    if (sessionIdRef.current) {
      try {
        await apiEndCall(sessionIdRef.current)
      } catch (error) {
        console.error('Failed to end call session:', error)
      }
      sessionIdRef.current = null
    }

    setStatus({
      aiState: 'idle',
      duration: '0:00',
      lastTranscript: '',
      currentProject: '项目 A'
    })

    setAudioLevel(0)
  }, [cleanupAudioAnalyzer, setStatus, setAudioLevel])

  return {
    startCall,
    endCall
  }
}

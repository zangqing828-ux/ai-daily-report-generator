import { useState, useCallback, useRef, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { createWebRTCConnection, closeWebRTCConnection } from '../lib/webrtc-adapter'
import { startCall as apiStartCall, endCall as apiEndCall } from '../services/api'
import type { CallStatus, WebRTCConnection } from '../types/conversation'

export function useWebRTC() {
  const [status, setStatus] = useState<CallStatus>({
    aiState: 'idle',
    duration: '0:00',
    lastTranscript: '',
    currentProject: '项目 A'
  })
  const [audioLevel, setAudioLevel] = useState(0)
  const connectionRef = useRef<WebRTCConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

      // 2. 连接 Socket.IO
      const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        auth: {
          sessionId: session.sessionId
        }
      })
      socketRef.current = socket

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id)
        setStatus(prev => ({
          ...prev,
          aiState: 'listening',
          lastTranscript: '已连接，请开始说话'
        }))
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
        if (data.text) {
          setStatus(prev => ({
            ...prev,
            lastTranscript: data.text
          }))
        }
      })

      socket.on('ai-response', (data) => {
        // 接收 AI 响应
        if (data.text) {
          setStatus(prev => ({
            ...prev,
            aiState: 'speaking',
            lastTranscript: data.text
          }))
        }
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
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
  }, [status.currentProject])

  const endCall = useCallback(async () => {
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
  }, [])

  const updateTranscript = useCallback((transcript: string) => {
    setStatus(prev => ({
      ...prev,
      lastTranscript: transcript
    }))
  }, [])

  const updateAIState = useCallback((aiState: CallStatus['aiState']) => {
    setStatus(prev => ({
      ...prev,
      aiState
    }))
  }, [])

  const updateAudioLevel = useCallback((level: number) => {
    setAudioLevel(level)
  }, [])

  return {
    status,
    startCall,
    endCall,
    audioLevel,
    updateTranscript,
    updateAIState,
    updateAudioLevel,
    currentProject: status.currentProject
  }
}

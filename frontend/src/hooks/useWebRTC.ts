import { useState, useCallback, useRef, useEffect } from 'react'
import { createWebRTCConnection, closeWebRTCConnection } from '../lib/webrtc-adapter'
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
      const connection = await createWebRTCConnection()
      connectionRef.current = connection

      setStatus(prev => ({
        ...prev,
        aiState: 'listening',
        lastTranscript: '正在连接...'
      }))

      // TODO: 连接后端信令服务器
      // TODO: 设置音频流处理

      return connection
    } catch (error) {
      console.error('Failed to start call:', error)
      setStatus(prev => ({
        ...prev,
        lastTranscript: '连接失败，请检查麦克风权限'
      }))
      throw error
    }
  }, [])

  const endCall = useCallback(() => {
    if (connectionRef.current) {
      closeWebRTCConnection(connectionRef.current)
      connectionRef.current = null
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    startTimeRef.current = null

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

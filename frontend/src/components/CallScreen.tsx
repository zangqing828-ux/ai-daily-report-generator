import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCallStore } from '../store/useCallStore'
import { useWebRTC } from '../hooks/useWebRTC'
import { saveReport } from '../services/report'

export default function CallScreen() {
  const navigate = useNavigate()
  const { status, audioLevel, isPaused, isCallStarted, setIsPaused, setIsCallStarted, setAudioLevel, conversationHistory, currentProjectId } = useCallStore()
  const { startCall, endCall } = useWebRTC()
  const currentProject = status.currentProject

  // 波纹动画状态
  const [ripples, setRipples] = useState<Array<{ id: number, scale: number, opacity: number }>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 演示模式：模拟音频输入
  useEffect(() => {
    if (!isCallStarted) {
      const interval = setInterval(() => {
        const randomLevel = Math.random() * 0.8 + 0.1
        setAudioLevel(randomLevel)
      }, 150)
      return () => clearInterval(interval)
    }
  }, [isCallStarted, setAudioLevel])

  // 生成波纹效果
  useEffect(() => {
    if (audioLevel > 0.1 && status.aiState !== 'idle') {
      // 根据音量大小决定生成波纹的频率
      const interval = setInterval(() => {
        const newRipple = {
          id: Date.now() + Math.random(),
          scale: 1,
          opacity: 0.6
        }

        setRipples(prev => {
          const updated = [...prev, newRipple]
          // 只保留最近的 5 个波纹
          return updated.slice(-5)
        })
      }, 800 - (audioLevel * 500)) // 音量越大，生成频率越高

      return () => clearInterval(interval)
    } else {
      setRipples([])
    }
  }, [audioLevel, status.aiState])

  // 更新波纹动画
  useEffect(() => {
    const animationFrame = requestAnimationFrame(function updateRipples() {
      setRipples(prev => {
        return prev
          .map(ripple => ({
            ...ripple,
            scale: ripple.scale + 0.015, // 波纹扩散速度
            opacity: ripple.opacity - 0.008 // 透明度衰减速度
          }))
          .filter(ripple => ripple.opacity > 0) // 移除完全透明的波纹
      })

      if (ripples.length > 0) {
        requestAnimationFrame(updateRipples)
      }
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [ripples.length])

  const handleStartCall = async () => {
    await startCall()
    setIsCallStarted(true)
  }

  const handleEndCall = () => {
    endCall()
    setIsCallStarted(false)
    setIsPaused(false)
    setRipples([])
  }

  const handleFinish = async () => {
    if (!currentProject || !currentProjectId) {
      setError('未选择项目')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // 生成并保存日报
      const report = await saveReport({
        projectName: currentProject,
        conversationHistory: conversationHistory,
        duration: status.duration,
        projectId: currentProjectId
      })

      // 结束通话
      endCall()
      setIsCallStarted(false)
      setIsPaused(false)
      setRipples([])

      // 导航到预览页面并传递日报数据
      navigate('/preview', { state: { report } })
    } catch (err) {
      console.error('生成日报失败:', err)
      setError(err instanceof Error ? err.message : '生成日报失败')
      setIsGenerating(false)
    }
  }

  // AI 状态配置
  const getStateInfo = () => {
    switch (status.aiState) {
      case 'idle':
        return { text: '准备就绪', icon: '●' }
      case 'listening':
        return { text: '正在聆听...', icon: '◉' }
      case 'thinking':
        return { text: '思考中...', icon: '◐' }
      case 'speaking':
        return { text: 'AI 回复中...', icon: '◎' }
      default:
        return { text: '准备就绪', icon: '●' }
    }
  }

  const stateInfo = getStateInfo()

  // 计算中心圆的跳动幅度
  const getCenterScale = () => {
    if (status.aiState === 'idle') return 1
    const baseScale = 1 + (audioLevel * 0.4) // 最大 1.4 倍
    return Math.min(baseScale, 1.4)
  }

  return (
    <div className="h-screen w-full bg-white flex flex-col">
      {/* 顶部状态栏 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            title="返回"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-2 h-2 rounded-full ${status.aiState === 'idle' ? 'bg-gray-400' : 'bg-green-500'}`} />
          <span className="text-gray-900 text-sm font-medium">{currentProject}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm font-mono">{status.duration}</span>
          {isPaused && (
            <span className="text-gray-600 text-sm">
              已暂停
            </span>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* AI 状态指示器容器 */}
        <div className="relative mb-8 flex items-center justify-center" style={{ width: '200px', height: '200px' }}>
          {/* 波纹效果 */}
          {ripples.map(ripple => (
            <div
              key={ripple.id}
              className="absolute rounded-full border-2 border-gray-400"
              style={{
                width: '80px',
                height: '80px',
                transform: `scale(${ripple.scale})`,
                opacity: ripple.opacity,
                transition: 'none'
              }}
            />
          ))}

          {/* 中心跳动圆圈 */}
          <div
            className={`rounded-full font-light flex items-center justify-center ${
              status.aiState === 'idle' ? 'bg-gray-100 text-gray-300' : 'bg-gray-900 text-white'
            }`}
            style={{
              width: `${80 + (audioLevel * 20)}px`,
              height: `${80 + (audioLevel * 20)}px`,
              transform: `scale(${getCenterScale()})`,
              transition: 'transform 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out'
            }}
          >
            <span className="text-4xl">{stateInfo.icon}</span>
          </div>
        </div>

        {/* 状态文本 */}
        <div className="text-gray-600 text-sm font-medium mb-12">
          {isGenerating ? '正在生成日报...' : stateInfo.text}
        </div>

        {/* 提示信息 */}
        {!isCallStarted && (
          <div className="mb-8 px-6 py-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
            <p className="text-blue-800 text-sm">
              💡 <strong>使用提示：</strong><br />
              1. 点击"开始通话"按钮<br />
              2. 允许麦克风权限<br />
              3. <strong>开始说话</strong>（清晰地说出你的工作内容）<br />
              4. AI会实时识别并回复
            </p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-8 px-6 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 实时转录文本 */}
        <div className="max-w-2xl w-full text-center">
          <div className="text-gray-900 text-2xl font-normal leading-relaxed">
            {status.lastTranscript || (
              <span className="text-gray-400 text-lg">
                {isCallStarted ? '正在聆听...' : '点击下方按钮开始通话'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="h-32 border-t border-gray-200 flex items-center justify-center gap-4 bg-gray-50">
        {!isCallStarted ? (
          <button
            onClick={handleStartCall}
            className="
              px-8 py-3 rounded-full
              bg-gray-900 text-white
              hover:bg-gray-800
              active:scale-95
              transition-all duration-200
              font-medium
            "
          >
            开始通话
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={isGenerating}
              className="
                px-6 py-3 rounded-full
                bg-white text-gray-900
                border border-gray-300
                hover:bg-gray-50
                active:scale-95
                transition-all duration-200
                font-medium
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {isPaused ? '继续' : '暂停'}
            </button>

            <button
              onClick={handleEndCall}
              disabled={isGenerating}
              className="
                px-6 py-3 rounded-full
                bg-white text-gray-900
                border border-gray-300
                hover:bg-gray-50
                active:scale-95
                transition-all duration-200
                font-medium
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              取消
            </button>

            <button
              onClick={handleFinish}
              disabled={isGenerating}
              className="
                px-8 py-3 rounded-full
                bg-gray-900 text-white
                hover:bg-gray-800
                active:scale-95
                transition-all duration-200
                font-medium
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {isGenerating ? '生成中...' : '完成通话'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useCallStore } from '../store/useCallStore'
import { useWebRTC } from '../hooks/useWebRTC'

export default function CallScreen() {
  const { status, audioLevel, isPaused, isCallStarted, setIsPaused, setIsCallStarted } = useCallStore()
  const { startCall, endCall } = useWebRTC()
  const currentProject = status.currentProject

  // 音频可视化状态
  const [visualBars, setVisualBars] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      height: 10,
      hue: 180 + i * 5
    }))
  )

  // 更新音频可视化
  useEffect(() => {
    if (audioLevel > 0) {
      const interval = setInterval(() => {
        setVisualBars(prevBars =>
          prevBars.map((_, i) => {
            const baseHeight = 20 + (audioLevel * 150)
            const variation = Math.sin(Date.now() / 200 + i) * 20
            const height = Math.min(100, Math.max(10, baseHeight + variation))
            const hue = 180 + (height / 100) * 60 // 青色到紫色的渐变
            return { height, hue }
          })
        )
      }, 50)

      return () => clearInterval(interval)
    } else {
      // 静音时重置
      setVisualBars(
        Array.from({ length: 12 }, (_, i) => ({
          height: 10,
          hue: 180 + i * 5
        }))
      )
    }
  }, [audioLevel])

  const handleStartCall = async () => {
    await startCall()
    setIsCallStarted(true)
  }

  const handleEndCall = () => {
    endCall()
    setIsCallStarted(false)
    setIsPaused(false)
  }

  const aiStateConfig = {
    idle: {
      emoji: '🤖',
      color: 'from-gray-400 to-gray-600',
      textColor: 'text-gray-400',
      glow: 'shadow-gray-500/20',
      pulse: 'animate-pulse-slow',
      text: '准备就绪'
    },
    listening: {
      emoji: '👂',
      color: 'from-cyan-400 to-blue-500',
      textColor: 'text-cyan-400',
      glow: 'shadow-cyan-500/40',
      pulse: 'animate-pulse-fast',
      text: '正在听您说话...'
    },
    thinking: {
      emoji: '🤔',
      color: 'from-purple-400 to-pink-500',
      textColor: 'text-purple-400',
      glow: 'shadow-purple-500/40',
      pulse: 'animate-pulse-medium',
      text: '正在思考...'
    },
    speaking: {
      emoji: '🔊',
      color: 'from-green-400 to-emerald-500',
      textColor: 'text-green-400',
      glow: 'shadow-green-500/40',
      pulse: 'animate-pulse-fast',
      text: '正在回复...'
    }
  }

  const config = aiStateConfig[status.aiState]
  const bars = visualBars

  return (
    <div className="relative h-screen w-full bg-gradient-to-b from-gray-950 via-black to-gray-900 overflow-hidden">
      {/* 动态背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [perspective:1000px] [transform-style:preserve-3d] animate-grid-move pointer-events-none" />

      {/* 背景光晕效果 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial opacity-20 blur-3xl transition-all duration-1000 ${config.color}`} />

      {/* 状态栏 - 顶部 */}
      <div className="relative z-10 h-[8%] flex items-center justify-between px-6 backdrop-blur-sm bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-white/90 text-sm font-medium tracking-wide">{currentProject}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 text-xs font-mono">{status.duration}</span>
          {isPaused && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
              已暂停
            </span>
          )}
        </div>
      </div>

      {/* 主对话区域 - 中央 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* AI 头像容器 - 多层光环效果 */}
        <div className="relative mb-8">
          {/* 外层光晕 */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.color} opacity-30 blur-2xl ${config.pulse}`} />

          {/* 中层光环 */}
          <div className={`absolute inset-[-20px] rounded-full bg-gradient-to-br ${config.color} opacity-20 blur-xl animate-spin-slow`} />

          {/* 内层脉动环 */}
          <div className={`absolute inset-[-10px] rounded-full bg-gradient-to-br ${config.color} opacity-40 ${config.pulse} ${config.glow} shadow-2xl`} />

          {/* 核心头像 */}
          <div className={`
            relative w-36 h-36 rounded-full
            bg-gradient-to-br from-gray-800 to-gray-900
            border-2 border-white/10
            flex items-center justify-center
            shadow-2xl
            backdrop-blur-sm
            ${config.pulse}
          `}>
            {/* 扫描线效果 */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent animate-scan" />
            </div>

            {/* Emoji */}
            <span className="text-7xl filter drop-shadow-2xl">{config.emoji}</span>

            {/* 装饰性光点 */}
            <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full animate-twinkle" />
            <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-white rounded-full animate-twinkle delay-300" />
          </div>

          {/* 环绕式音频波形 */}
          {audioLevel > 0.1 && (
            <div className="absolute inset-0 flex items-center justify-center">
              {bars.map((bar, i) => {
                const rotation = (i / bars.length) * 360
                const radius = 90
                const x = Math.cos((rotation * Math.PI) / 180) * radius
                const y = Math.sin((rotation * Math.PI) / 180) * radius

                return (
                  <div
                    key={i}
                    className="absolute w-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${bar.height}%`,
                      backgroundColor: `hsl(${bar.hue}, 100%, 60%)`,
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotation + 90}deg)`,
                      boxShadow: `0 0 8px hsl(${bar.hue}, 100%, 60%)`,
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* AI 状态文本 */}
        <div className={`text-sm font-medium mb-6 tracking-wider uppercase ${config.textColor} transition-all duration-300`}>
          {config.text}
        </div>

        {/* 实时字幕 - 大号显示 */}
        <div className="relative max-w-lg w-full text-center px-6 py-4 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10">
          <div className="text-white text-2xl font-light leading-relaxed">
            {status.lastTranscript || (
              <span className="text-white/40 text-lg">{isCallStarted ? '正在聆听...' : '点击开始按钮启动通话'}</span>
            )}
          </div>

          {/* 底部渐变遮罩 */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* 音频波形指示器（当用户说话时） */}
        {audioLevel > 0.05 && (
          <div className="mt-8 flex items-end justify-center gap-1 h-10">
            {bars.slice(0, 10).map((bar, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full transition-all duration-75"
                style={{
                  height: `${bar.height * 0.6}%`,
                  background: `linear-gradient(to top, hsl(${bar.hue}, 80%, 50%), hsl(${bar.hue}, 80%, 70%))`,
                  boxShadow: `0 0 12px hsl(${bar.hue}, 80%, 60%)`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 控制区 - 底部 */}
      <div className="relative z-10 h-[20%] flex items-center justify-center gap-6 backdrop-blur-sm bg-black/20 border-t border-white/5">
        {!isCallStarted ? (
          <button
            onClick={handleStartCall}
            className="
              group relative
              w-20 h-20 rounded-full
              bg-gradient-to-br from-green-500 to-emerald-600
              shadow-2xl shadow-green-500/30
              hover:shadow-green-500/50
              hover:scale-110
              active:scale-95
              transition-all duration-300
              border-2 border-white/20
            "
          >
            {/* 光晕效果 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300" />

            {/* 图标 */}
            <span className="text-4xl filter drop-shadow-lg">📞</span>

            {/* 脉冲动画 */}
            <div className="absolute inset-0 rounded-full border-2 border-green-400/50 animate-ping" />
          </button>
        ) : (
          <>
            {/* 暂停按钮 */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`
                group relative
                w-16 h-16 rounded-full
                bg-gradient-to-br ${isPaused ? 'from-green-500 to-emerald-600 shadow-green-500/30' : 'from-gray-700 to-gray-800 shadow-gray-500/20'}
                shadow-xl
                hover:scale-110
                active:scale-95
                transition-all duration-300
                border border-white/10
              `}
            >
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${isPaused ? 'from-green-400 to-emerald-500' : 'from-gray-600 to-gray-700'} opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-300`} />
              <span className="text-2xl">{isPaused ? '▶️' : '⏸️'}</span>
            </button>

            {/* 挂断按钮 */}
            <button
              onClick={handleEndCall}
              className="
                group relative
                w-20 h-20 rounded-full
                bg-gradient-to-br from-red-500 to-rose-600
                shadow-2xl shadow-red-500/30
                hover:shadow-red-500/50
                hover:scale-110
                active:scale-95
                transition-all duration-300
                border-2 border-white/20
              "
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-rose-500 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300" />
              <span className="text-4xl filter drop-shadow-lg">📞</span>
              <div className="absolute inset-0 rounded-full border-2 border-red-400/50 animate-pulse" />
            </button>
          </>
        )}
      </div>

      {/* 装饰性边框 */}
      <div className="absolute inset-4 border border-white/5 rounded-3xl pointer-events-none" />
      <div className="absolute inset-[2px] border border-cyan-500/10 rounded-3xl pointer-events-none" />

      {/* 噪点纹理叠加 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay noise-texture" />
    </div>
  )
}

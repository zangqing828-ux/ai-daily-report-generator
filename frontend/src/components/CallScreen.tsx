import { useCallStore } from '../store/useCallStore'
import { useWebRTC } from '../hooks/useWebRTC'

export default function CallScreen() {
  const { status, audioLevel, isPaused, isCallStarted, setIsPaused, setIsCallStarted } = useCallStore()
  const { startCall, endCall } = useWebRTC()
  const currentProject = status.currentProject

  const handleStartCall = async () => {
    await startCall()
    setIsCallStarted(true)
  }

  const handleEndCall = () => {
    endCall()
    setIsCallStarted(false)
    setIsPaused(false)
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col">
      {/* 状态栏 */}
      <div className="h-[10%] flex items-center justify-between px-4">
        <span className="text-white text-lg font-semibold">{currentProject}</span>
        <span className="text-gray-400 text-sm">通话时长: {status.duration}</span>
      </div>

      {/* 中央对话区域 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* AI 头像 */}
        <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center mb-8 shadow-lg">
          {status.aiState === 'idle' && <span className="text-5xl">🤖</span>}
          {status.aiState === 'listening' && <span className="text-5xl animate-pulse">👂</span>}
          {status.aiState === 'thinking' && <span className="text-5xl animate-bounce">🤔</span>}
          {status.aiState === 'speaking' && <span className="text-5xl animate-pulse">🔊</span>}
        </div>

        {/* AI 状态文本 */}
        <div className="text-gray-400 text-sm mb-4">
          {status.aiState === 'idle' && '准备就绪'}
          {status.aiState === 'listening' && '正在听您说话...'}
          {status.aiState === 'thinking' && '正在思考...'}
          {status.aiState === 'speaking' && '正在回复...'}
        </div>

        {/* 实时字幕 */}
        <div className="text-white text-2xl mb-4 text-center max-w-md fade-in">
          {status.lastTranscript || '等待开始...'}
        </div>

        {/* 音频波形 */}
        {audioLevel > 0 && (
          <div className="flex gap-1 items-end h-8 justify-center">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full transition-all duration-100"
                style={{ height: `${Math.max(20, Math.random() * audioLevel * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 控制区 */}
      <div className="h-[20%] flex items-center justify-center gap-8">
        {!isCallStarted ? (
          <button
            onClick={handleStartCall}
            className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 text-white text-2xl flex items-center justify-center transition-all shadow-lg"
          >
            📞
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl flex items-center justify-center transition-all"
              disabled={status.aiState === 'idle'}
            >
              {isPaused ? '▶️' : '⏸️'}
            </button>

            <button
              onClick={handleEndCall}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl flex items-center justify-center transition-all shadow-lg"
            >
              📞
            </button>
          </>
        )}
      </div>

      {/* 暂停提示 */}
      {isPaused && isCallStarted && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-lg">
          已暂停
        </div>
      )}
    </div>
  )
}

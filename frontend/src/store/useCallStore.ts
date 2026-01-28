import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CallStatus } from '../types/conversation'

interface CallState {
  // 通话状态
  status: CallStatus
  audioLevel: number
  isPaused: boolean
  isCallStarted: boolean

  // Actions
  setStatus: (status: CallStatus | ((prev: CallStatus) => CallStatus)) => void
  setAudioLevel: (level: number) => void
  setIsPaused: (paused: boolean) => void
  setIsCallStarted: (started: boolean) => void
  updateTranscript: (transcript: string) => void
  updateAIState: (aiState: CallStatus['aiState']) => void
  reset: () => void
}

const initialStatus: CallStatus = {
  aiState: 'idle',
  duration: '0:00',
  lastTranscript: '',
  currentProject: '项目 A'
}

export const useCallStore = create<CallState>()(
  persist(
    (set) => ({
      // Initial state
      status: initialStatus,
      audioLevel: 0,
      isPaused: false,
      isCallStarted: false,

      // Actions
      setStatus: (status) =>
        set((state) => ({
          status: typeof status === 'function' ? status(state.status) : status
        })),

      setAudioLevel: (level) => set({ audioLevel: level }),

      setIsPaused: (paused) => set({ isPaused: paused }),

      setIsCallStarted: (started) => set({ isCallStarted: started }),

      updateTranscript: (transcript) =>
        set((state) => ({
          status: { ...state.status, lastTranscript: transcript }
        })),

      updateAIState: (aiState) =>
        set((state) => ({
          status: { ...state.status, aiState }
        })),

      reset: () =>
        set({
          status: initialStatus,
          audioLevel: 0,
          isPaused: false,
          isCallStarted: false
        })
    }),
    {
      name: 'call-storage',
      // 只持久化部分状态
      partialize: (state) => ({
        isCallStarted: state.isCallStarted,
        isPaused: state.isPaused
      })
    }
  )
)

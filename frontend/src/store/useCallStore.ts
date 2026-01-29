import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CallStatus, ConversationMessage } from '../types/conversation'

export type { ConversationMessage }

interface CallState {
  // 通话状态
  status: CallStatus
  audioLevel: number
  isPaused: boolean
  isCallStarted: boolean
  generatedReport?: string // 生成的日报内容
  conversationHistory: ConversationMessage[] // 对话历史
  currentProjectId?: string // 当前项目ID

  // Actions
  setStatus: (status: CallStatus | ((prev: CallStatus) => CallStatus)) => void
  setAudioLevel: (level: number) => void
  setIsPaused: (paused: boolean) => void
  setIsCallStarted: (started: boolean) => void
  updateTranscript: (transcript: string) => void
  updateAIState: (aiState: CallStatus['aiState']) => void
  setCurrentProject: (project: string) => void
  setCurrentProjectId: (projectId: string) => void
  addConversationMessage: (message: ConversationMessage) => void
  setGeneratedReport: (report: string) => void
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
      conversationHistory: [],
      currentProjectId: undefined,

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

      setCurrentProject: (project) =>
        set((state) => ({
          status: { ...state.status, currentProject: project }
        })),

      setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

      addConversationMessage: (message) =>
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message]
        })),

      setGeneratedReport: (report) => set({ generatedReport: report }),

      reset: () =>
        set({
          status: initialStatus,
          audioLevel: 0,
          isPaused: false,
          isCallStarted: false,
          generatedReport: undefined,
          conversationHistory: [],
          currentProjectId: undefined
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

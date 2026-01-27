export interface CallStatus {
  aiState: 'idle' | 'listening' | 'thinking' | 'speaking'
  duration: string
  lastTranscript: string
  currentProject: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface WebRTCConnection {
  pc: RTCPeerConnection
  stream: MediaStream
}

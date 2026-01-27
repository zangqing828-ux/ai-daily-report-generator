import type { WebRTCConnection } from '../types/conversation'

export async function createWebRTCConnection(): Promise<WebRTCConnection> {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  const pc = new RTCPeerConnection(configuration)

  // 获取用户音频流
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000
    }
  })

  // 添加音频轨道
  stream.getAudioTracks().forEach(track => {
    pc.addTrack(track, stream)
  })

  return { pc, stream }
}

export function closeWebRTCConnection(connection: WebRTCConnection): void {
  connection.stream.getTracks().forEach(track => track.stop())
  connection.pc.close()
}

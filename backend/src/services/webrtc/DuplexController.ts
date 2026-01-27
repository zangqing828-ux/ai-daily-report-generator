import { VADService, VADResult } from '../audio/VADService'
import { MockTTSService } from '../doubao/MockTTSService'

type DuplexMode = 'user-speaking' | 'ai-speaking' | 'turn-taking'

export class DuplexController {
  private mode: DuplexMode = 'user-speaking'
  private ttsQueue: string[] = []
  private isPlayingTTS = false

  constructor(
    private vad: VADService,
    private tts: MockTTSService
  ) {}

  async processAudioFrame(audioData: Float32Array): Promise<VADResult & { mode: DuplexMode }> {
    const vadResult = this.vad.detect(audioData)

    if (vadResult.isSpeech) {
      // 用户正在说话
      this.mode = 'user-speaking'

      // 如果 AI 正在播放，打断它
      if (this.isPlayingTTS) {
        this.tts.stop()
        this.isPlayingTTS = false
        this.ttsQueue = [] // 清空队列
      }
    }

    if (vadResult.isSilence && this.mode === 'user-speaking') {
      // 用户停顿，切换到 AI 回复模式
      this.mode = 'ai-speaking'

      // 开始播放队列中的 TTS
      if (this.ttsQueue.length > 0 && !this.isPlayingTTS) {
        await this.playQueuedTTS()
      }
    }

    return {
      ...vadResult,
      mode: this.mode
    }
  }

  async queueTTS(text: string): Promise<void> {
    this.ttsQueue.push(text)

    // 如果当前是 AI 说话模式且没有在播放，开始播放
    if (this.mode === 'ai-speaking' && !this.isPlayingTTS && this.ttsQueue.length === 1) {
      await this.playQueuedTTS()
    }
  }

  private async playQueuedTTS(): Promise<void> {
    if (this.ttsQueue.length === 0 || this.isPlayingTTS) {
      return
    }

    this.isPlayingTTS = true

    try {
      while (this.ttsQueue.length > 0 && this.mode !== 'user-speaking') {
        const text = this.ttsQueue.shift()!

        for await (const chunk of this.tts.synthesizeStream(text)) {
          // 检查是否被用户打断（在生成音频的过程中）
          if ((this.mode as DuplexMode) === 'user-speaking') {
            this.ttsQueue = []
            return
          }

          // TODO: 发送音频数据到前端
          // 这里应该通过 WebRTC 发送音频
        }
      }
    } finally {
      this.isPlayingTTS = false
    }
  }

  stopTTS(): void {
    this.tts.stop()
    this.isPlayingTTS = false
    this.ttsQueue = []
  }

  getMode(): DuplexMode {
    return this.mode
  }

  setMode(mode: DuplexMode): void {
    this.mode = mode
    if (mode === 'user-speaking') {
      this.stopTTS()
    }
  }

  getQueueLength(): number {
    return this.ttsQueue.length
  }

  isPlaying(): boolean {
    return this.isPlayingTTS
  }

  reset(): void {
    this.mode = 'user-speaking'
    this.ttsQueue = []
    this.isPlayingTTS = false
    this.vad.reset()
  }
}

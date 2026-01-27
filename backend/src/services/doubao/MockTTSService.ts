export class MockTTSService {
  private isPlaying = false
  private stopSignal = false

  async *synthesizeStream(text: string): AsyncIterable<ArrayBuffer> {
    if (this.isPlaying) {
      throw new Error('TTS service is already playing')
    }

    this.isPlaying = true
    this.stopSignal = false

    try {
      const words = text.split('')

      for (const word of words) {
        if (this.stopSignal) {
          break
        }

        // 模拟音频块生成延迟
        await this.delay(50)

        // 生成模拟音频数据
        yield this.generateMockAudio(word)
      }
    } finally {
      this.isPlaying = false
    }
  }

  stop(): void {
    if (this.isPlaying) {
      this.stopSignal = true
    }
  }

  private generateMockAudio(word: string): ArrayBuffer {
    // 生成模拟音频数据（16kHz, 16bit, mono）
    const samplesPerFrame = 800 // 50ms at 16kHz
    const buffer = new ArrayBuffer(samplesPerFrame * 2)
    const view = new Int16Array(buffer)

    // 生成简单的正弦波作为模拟音频
    const frequency = 440 + (word.charCodeAt(0) % 200) // 根据字符变化频率
    for (let i = 0; i < samplesPerFrame; i++) {
      const t = i / 16000
      view[i] = Math.floor(Math.sin(2 * Math.PI * frequency * t) * 16000)
    }

    return buffer
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  isPlayingAudio(): boolean {
    return this.isPlaying
  }

  reset(): void {
    this.stop()
    this.stopSignal = false
  }
}

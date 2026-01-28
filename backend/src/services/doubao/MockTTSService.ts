export type TTSPriority = 'HIGH' | 'MEDIUM' | 'LOW'

interface TTSQueueItem {
  text: string
  priority: TTSPriority
  resolve: (value: AsyncIterable<ArrayBuffer>) => void
  reject: (error: Error) => void
}

export class MockTTSService {
  private isPlaying = false
  private stopSignal = false
  private queue: TTSQueueItem[] = []
  private currentResolve: ((value: AsyncIterable<ArrayBuffer>) => void) | null = null

  async *synthesizeStream(text: string, priority: TTSPriority = 'MEDIUM'): AsyncIterable<ArrayBuffer> {
    // 如果当前正在播放低优先级音频，且新请求是高优先级，则停止当前播放
    if (this.isPlaying && priority === 'HIGH' && this.currentResolve) {
      this.stop()
    }

    // 等待轮到当前请求
    await this.waitForTurn(text, priority)

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
      this.processNext()
    }
  }

  private async waitForTurn(text: string, priority: TTSPriority): Promise<void> {
    return new Promise((resolve) => {
      const item: TTSQueueItem = {
        text,
        priority,
        resolve: resolve as any,
        reject: () => {}
      }

      // 按优先级插入队列
      if (priority === 'HIGH') {
        // 高优先级插入到队列前面（在已有的 HIGH 之后）
        const lastHighIndex = this.queue.map(i => i.priority).lastIndexOf('HIGH')
        this.queue.splice(lastHighIndex + 1, 0, item)
      } else {
        // 中低优先级加到队列末尾
        this.queue.push(item)
      }

      // 如果当前没有在播放，立即处理
      if (!this.isPlaying) {
        this.processNext()
      }
    })
  }

  private processNext(): void {
    if (this.queue.length === 0) {
      this.isPlaying = false
      this.currentResolve = null
      return
    }

    const item = this.queue.shift()!
    this.isPlaying = true
    this.stopSignal = false
    this.currentResolve = item.resolve

    // 解析 Promise，允许 synthesizeStream 继续
    item.resolve(undefined as any)
  }

  stop(): void {
    if (this.isPlaying) {
      this.stopSignal = true
    }
  }

  clearQueue(): void {
    this.queue = []
    this.stop()
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

  getQueueLength(): number {
    return this.queue.length
  }

  reset(): void {
    this.clearQueue()
    this.stopSignal = false
  }
}

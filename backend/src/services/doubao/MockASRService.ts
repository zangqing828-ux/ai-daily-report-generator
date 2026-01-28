export class MockASRService {
  private transcripts: string[] = []
  private isProcessing = false
  private callCount = 0

  // 确定性的模拟文本序列
  private static readonly MOCK_TEXTS = [
    '今天完成了用户认证模块的开发',
    '修复了登录接口的一个 bug',
    '和产品经理讨论了新功能需求',
    '优化了数据库查询性能',
    '编写了单元测试用例'
  ] as const

  async *processAudioStream(audioStream: AsyncIterable<ArrayBuffer>): AsyncIterable<string> {
    if (this.isProcessing) {
      throw new Error('ASR service is already processing')
    }

    this.isProcessing = true
    this.transcripts = []

    try {
      for await (const chunk of audioStream) {
        // 模拟识别延迟
        await this.delay(100)

        // 模拟识别结果（确定性，按顺序返回）
        const mockText = this.getMockRecognition()
        yield mockText
        this.transcripts.push(mockText)
      }
    } finally {
      this.isProcessing = false
      this.callCount = 0 // 重置计数器
    }
  }

  private getMockRecognition(): string {
    const text = MockASRService.MOCK_TEXTS[this.callCount % MockASRService.MOCK_TEXTS.length]
    this.callCount++
    return text
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getFullTranscript(): string {
    return this.transcripts.join('，')
  }

  getTranscripts(): string[] {
    return [...this.transcripts]
  }

  reset(): void {
    this.transcripts = []
    this.isProcessing = false
  }
}

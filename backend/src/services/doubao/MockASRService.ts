export class MockASRService {
  private transcripts: string[] = []
  private isProcessing = false

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

        // 模拟识别结果
        const mockText = this.getMockRecognition()
        yield mockText
        this.transcripts.push(mockText)
      }
    } finally {
      this.isProcessing = false
    }
  }

  private getMockRecognition(): string {
    const mockTexts = [
      '今天完成了用户认证模块的开发',
      '修复了登录接口的一个 bug',
      '和产品经理讨论了新功能需求',
      '优化了数据库查询性能',
      '编写了单元测试用例',
      '参与了代码评审会议',
      '研究了新的前端框架',
      '更新了项目文档',
      '部署了测试环境',
      '排查了一个内存泄漏问题'
    ]
    return mockTexts[Math.floor(Math.random() * mockTexts.length)]
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

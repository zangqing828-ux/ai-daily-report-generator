interface ConversationMessage {
  role: string
  content: string
}

export class MockLLMService {
  async *chat(history: ConversationMessage[]): AsyncIterable<string> {
    const response = this.generateMockResponse(history)
    const words = response.split('')

    for (const word of words) {
      await this.delay(50)
      yield word
    }
  }

  private generateMockResponse(history: ConversationMessage[]): string {
    if (history.length === 0) {
      return '您好，我是日报助手。今天想从哪个项目开始？'
    }

    const lastUserMessage = history[history.length - 1]?.content || ''

    // 根据关键词生成响应
    if (lastUserMessage.includes('项目')) {
      return `明白了。请告诉我这个项目今天具体完成了哪些工作？`
    }

    if (lastUserMessage.includes('完成') || lastUserMessage.includes('开发') || lastUserMessage.includes('实现')) {
      return `很好。那明天有什么计划吗？`
    }

    if (lastUserMessage.includes('明天') || lastUserMessage.includes('计划')) {
      return `已经记录下来了。还有其他项目需要汇报吗？`
    }

    if (lastUserMessage.includes('没有了') || lastUserMessage.includes('没了') || lastUserMessage.includes('结束')) {
      return `好的，我已经整理好了您的日报。感谢您的汇报！`
    }

    // 默认响应
    const defaultResponses = [
      '请继续',
      '明白了，还有其他工作内容吗？',
      '好的，请继续',
      '了解'
    ]
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async generateResponse(history: ConversationMessage[]): Promise<string> {
    const chunks: string[] = []
    for await (const chunk of this.chat(history)) {
      chunks.push(chunk)
    }
    return chunks.join('')
  }
}

import type { ConversationMessage } from '../../services/doubao/MockLLMService'
import { userMessageSchema, projectNameSchema } from '../../utils/validation'
import { logger } from '../../utils/logger'

type ConversationStage = 'greeting' | 'today' | 'tomorrow' | 'summary' | 'complete'

export class QuestionGenerator {
  getNextQuestion(project: string, stage: ConversationStage, history: ConversationMessage[]): string {
    const templates = {
      greeting: this.getGreetingQuestion(project, history),
      today: this.getTodayQuestion(project, history),
      tomorrow: this.getTomorrowQuestion(project, history),
      summary: this.getSummaryQuestion(project, history),
      complete: this.getCompleteMessage(project, history)
    }

    return templates[stage] || '请继续'
  }

  private getGreetingQuestion(project: string, history: ConversationMessage[]): string {
    if (history.length === 0) {
      return '您好，我是日报助手。今天想从哪个项目开始？'
    }

    const lastMessage = history[history.length - 1]?.content ?? ''

    if (project) {
      return `好的，我们来记录 ${project} 的工作。请告诉我今天具体完成了哪些工作？`
    }

    return '请告诉我项目名称'
  }

  private getTodayQuestion(project: string, history: ConversationMessage[]): string {
    const responses = [
      `明白了。那 ${project} 明天有什么计划？`,
      `很好。${project} 明天打算做什么？`,
      `收到。明天的计划呢？`
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private getTomorrowQuestion(project: string, history: ConversationMessage[]): string {
    const responses = [
      `已经记录下来了。还有其他项目需要汇报吗？`,
      `好的。还有其他项目的工作内容吗？`,
      `了解。需要汇报其他项目吗？`
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private getSummaryQuestion(project: string, history: ConversationMessage[]): string {
    return '我已经整理好了今天的日报，需要我为您总结一下吗？'
  }

  private getCompleteMessage(project: string, history: ConversationMessage[]): string {
    return '好的，日报已完成。感谢您的汇报！'
  }

  shouldSwitchStage(currentStage: ConversationStage, userMessage: string): boolean {
    // 验证输入
    const validation = userMessageSchema.safeParse({ role: 'user', content: userMessage })
    if (!validation.success) {
      logger.error('Invalid user message', validation.error, { message: userMessage })
      return false
    }

    // 使用更严格的正则
    switch (currentStage) {
      case 'greeting':
        // 匹配"项目：xxx"或"项目xxx"格式，1-50个字符
        return /^项目\s*[:：]?\s*[\u4e00-\u9fa5a-zA-Z0-9_\s-]{1,50}$/.test(userMessage.trim())
      case 'today':
        return /(完成|开发|实现|修复|优化|部署|测试|编写|创建|添加)/.test(userMessage)
      case 'tomorrow':
        return /(明天|计划|打算|后续|下一步|将要|准备)/.test(userMessage)
      case 'summary':
        return /(总结|好的|可以)/.test(userMessage)
      default:
        return false
    }
  }
}

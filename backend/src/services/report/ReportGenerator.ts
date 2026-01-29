import { ConversationMessage } from '../doubao/MockLLMService'

export interface WorkItem {
  content: string
  category: WorkCategory
  priority: Priority
  tags: string[]
}

export type WorkCategory = '开发' | '会议' | '沟通' | '学习' | '风险' | '其他'
export type Priority = '高' | '中' | '低'

export interface DailyReportInput {
  projectName: string
  conversationHistory: ConversationMessage[]
  duration: string
  date: string
}

export interface GeneratedReport {
  projectName: string
  date: string
  duration: string
  todayWork: {
    [key in WorkCategory]?: string[]
  }
  tomorrowPlan: string[]
  summary: string
  highlights: string[]
  risks: string[]
}

export class ReportGenerator {
  /**
   * 从对话历史生成日报
   */
  async generateReport(input: DailyReportInput): Promise<GeneratedReport> {
    const { projectName, conversationHistory, duration, date } = input

    // 1. 提取所有工作内容
    const allWorkItems = this.extractWorkItems(conversationHistory)

    // 2. 按类别分组
    const categorizedWork = this.categorizeWork(allWorkItems)

    // 3. 按优先级排序
    const sortedWork = this.sortByPriority(categorizedWork)

    // 4. 提取明日计划
    const tomorrowPlan = this.extractTomorrowPlan(conversationHistory)

    // 5. 生成摘要
    const summary = this.generateSummary(sortedWork, tomorrowPlan, projectName)

    // 6. 提取亮点
    const highlights = this.extractHighlights(allWorkItems)

    // 7. 识别风险
    const risks = this.identifyRisks(allWorkItems)

    return {
      projectName,
      date,
      duration,
      todayWork: sortedWork,
      tomorrowPlan,
      summary,
      highlights,
      risks
    }
  }

  /**
   * 从对话中提取工作项
   */
  private extractWorkItems(history: ConversationMessage[]): WorkItem[] {
    const items: WorkItem[] = []

    for (const message of history) {
      if (message.role === 'user') {
        // 分割用户消息为多个工作项
        const sentences = this.splitIntoSentences(message.content)

        for (const sentence of sentences) {
          const workItem = this.analyzeSentence(sentence)
          if (workItem) {
            items.push(workItem)
          }
        }
      }
    }

    return items
  }

  /**
   * 将文本分割为句子
   */
  private splitIntoSentences(text: string): string[] {
    // 按照句号、分号、换行分割
    const sentences = text
      .replace(/([。；\n]+)/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 2) // 过滤太短的句子

    return sentences
  }

  /**
   * 分析句子并识别为工作项
   */
  private analyzeSentence(sentence: string): WorkItem | null {
    // 关键词匹配规则
    const categoryRules: Record<WorkCategory, string[]> = {
      '开发': ['完成', '实现', '修复', '优化', '重构', '部署', '搭建', '编写', '调试', '测试'],
      '会议': ['开会', '讨论', '沟通', '会议', '对齐', '评审', '演示'],
      '沟通': ['协调', '跟进', '反馈', '确认', '汇报', '通知'],
      '学习': ['学习', '研究', '阅读', '调研', '了解', '掌握'],
      '风险': ['问题', '风险', '错误', '异常', '故障', '延迟', '阻塞'],
      '其他': []
    }

    const priorityRules: Record<Priority, string[]> = {
      '高': ['紧急', '重要', '关键', '核心', '优先', '必须', '立即'],
      '中': [],
      '低': ['可选', '后续', '计划', '可能', '考虑']
    }

    // 识别类别
    let category: WorkCategory = '其他'
    for (const [cat, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(keyword => sentence.includes(keyword))) {
        category = cat as WorkCategory
        break
      }
    }

    // 识别优先级
    let priority: Priority = '中'
    for (const [pri, keywords] of Object.entries(priorityRules)) {
      if (keywords.some(keyword => sentence.includes(keyword))) {
        priority = pri as Priority
        break
      }
    }

    // 提取标签
    const tags = this.extractTags(sentence)

    return {
      content: sentence,
      category,
      priority,
      tags
    }
  }

  /**
   * 提取标签
   */
  private extractTags(sentence: string): string[] {
    const tags: string[] = []

    // 技术栈标签
    const techKeywords = ['React', 'Vue', 'TypeScript', 'Node.js', 'Python', 'Java', 'Docker', 'Kubernetes', 'AWS', '数据库', 'API', '前端', '后端']
    for (const keyword of techKeywords) {
      if (sentence.includes(keyword)) {
        tags.push(keyword)
      }
    }

    return tags
  }

  /**
   * 按类别分组
   */
  private categorizeWork(items: WorkItem[]): Record<string, WorkItem[]> {
    const categorized: Record<string, WorkItem[]> = {
      '开发': [],
      '会议': [],
      '沟通': [],
      '学习': [],
      '风险': [],
      '其他': []
    }

    for (const item of items) {
      categorized[item.category].push(item)
    }

    return categorized
  }

  /**
   * 按优先级排序
   */
  private sortByPriority(categorized: Record<string, WorkItem[]>): GeneratedReport['todayWork'] {
    const sorted: GeneratedReport['todayWork'] = {}

    const priorityOrder: Record<string, number> = { '高': 0, '中': 1, '低': 2 }

    for (const [category, items] of Object.entries(categorized)) {
      if (items.length > 0) {
        sorted[category as WorkCategory] = items
          .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
          .map(item => item.content)
      }
    }

    return sorted
  }

  /**
   * 提取明日计划
   */
  private extractTomorrowPlan(history: ConversationMessage[]): string[] {
    const plans: string[] = []
    const planKeywords = ['明天', '计划', '接下来', '后续', '之后', '还要']

    for (const message of history) {
      if (message.role === 'user') {
        const sentences = this.splitIntoSentences(message.content)

        for (const sentence of sentences) {
          if (planKeywords.some(keyword => sentence.includes(keyword))) {
            plans.push(sentence)
          }
        }
      }
    }

    // 按优先级排序（如果有"重要"、"紧急"等关键词）
    return plans.sort((a, b) => {
      const aHasUrgent = a.includes('重要') || a.includes('紧急')
      const bHasUrgent = b.includes('重要') || b.includes('紧急')
      if (aHasUrgent && !bHasUrgent) return -1
      if (!aHasUrgent && bHasUrgent) return 1
      return 0
    })
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    todayWork: GeneratedReport['todayWork'],
    tomorrowPlan: string[],
    projectName: string
  ): string {
    const totalWork = Object.values(todayWork).flat().length
    const categories = Object.keys(todayWork).filter(key => {
      const items = todayWork[key as WorkCategory]
      return items !== undefined && items.length > 0
    })

    // 统计各类型工作数量
    const workStats = categories
      .map(cat => {
        const items = todayWork[cat as WorkCategory]
        return `${cat} ${items?.length || 0} 项`
      })
      .join('、')

    // 提取关键亮点
    const highlights = Object.values(todayWork)
      .flat()
      .slice(0, 3)
      .map(work => work.replace(/^[，。]*/, ''))
      .join('；')

    return `今日在【${projectName}】上完成了 ${totalWork} 项工作，主要包括${workStats}。${highlights ? '主要完成：' + highlights + '。' : ''}明日计划完成 ${tomorrowPlan.length} 项任务。`
  }

  /**
   * 提取亮点
   */
  private extractHighlights(items: WorkItem[]): string[] {
    const highlights: string[] = []

    // 高优先级的工作项
    const highPriorityItems = items.filter(item => item.priority === '高')

    // 包含"完成"、"实现"等关键词的工作项
    const completedItems = items.filter(item =>
      item.content.includes('完成') || item.content.includes('实现') || item.content.includes('上线')
    )

    // 技术亮点（包含新技术、框架等）
    const techHighlights = items.filter(item => item.tags.length > 0)

    highlights.push(...highPriorityItems.slice(0, 2).map(i => i.content))
    highlights.push(...completedItems.slice(0, 2).map(i => i.content))
    highlights.push(...techHighlights.slice(0, 2).map(i => i.content))

    // 去重并限制数量
    return [...new Set(highlights)].slice(0, 5)
  }

  /**
   * 识别风险
   */
  private identifyRisks(items: WorkItem[]): string[] {
    return items
      .filter(item => item.category === '风险')
      .map(item => item.content)
  }
}

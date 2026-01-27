export interface ConversationData {
  role: string
  content: string
}

export interface WorkItem {
  content: string
  timestamp?: Date
}

export interface CategorizedWork {
  development: WorkItem[]
  meetings: WorkItem[]
  learning: WorkItem[]
  bugfixes: WorkItem[]
  other: WorkItem[]
}

export interface GeneratedReport {
  date: string
  project: string
  todayWork: CategorizedWork
  tomorrowPlan: string[]
  summary: string
  statistics: {
    totalTasks: number
    developmentCount: number
    meetingCount: number
    learningCount: number
    bugfixCount: number
  }
}

export class DailyReportGenerator {
  generate(conversationData: ConversationData[], project: string): GeneratedReport {
    const todayWork = this.extractTodayWork(conversationData)
    const tomorrowPlan = this.extractTomorrowPlan(conversationData)

    return {
      date: new Date().toISOString().split('T')[0],
      project,
      todayWork: this.categorizeWork(todayWork),
      tomorrowPlan: this.prioritizePlan(tomorrowPlan),
      summary: this.generateSummary(todayWork, tomorrowPlan, project),
      statistics: this.generateStatistics(todayWork)
    }
  }

  private extractTodayWork(conversation: ConversationData[]): WorkItem[] {
    return conversation
      .filter((msg: ConversationData) => msg.role === 'user')
      .map((msg: ConversationData) => ({
        content: msg.content,
        timestamp: new Date()
      }))
  }

  private extractTomorrowPlan(conversation: ConversationData[]): string[] {
    const plans: string[] = []

    conversation.forEach((msg: ConversationData) => {
      if (msg.role === 'user') {
        // 提取包含"明天"、"计划"、"打算"等关键词的句子
        const sentences = msg.content.split(/[，。！？；]/)
        sentences.forEach(sentence => {
          if (this.isTomorrowPlan(sentence)) {
            plans.push(sentence.trim())
          }
        })
      }
    })

    return plans
  }

  private isTomorrowPlan(text: string): boolean {
    const keywords = ['明天', '计划', '打算', '后续', '下一步', '将要', '准备']
    return keywords.some(keyword => text.includes(keyword))
  }

  private categorizeWork(workItems: WorkItem[]): CategorizedWork {
    const categorized: CategorizedWork = {
      development: [],
      meetings: [],
      learning: [],
      bugfixes: [],
      other: []
    }

    workItems.forEach(item => {
      const content = item.content.toLowerCase()

      if (this.containsAny(content, ['开发', '实现', '编写', '创建', '添加', '完成', '部署'])) {
        categorized.development.push(item)
      } else if (this.containsAny(content, ['会议', '讨论', '评审', '沟通', '对接'])) {
        categorized.meetings.push(item)
      } else if (this.containsAny(content, ['学习', '研究', '调研', '阅读', '文档'])) {
        categorized.learning.push(item)
      } else if (this.containsAny(content, ['修复', 'bug', '问题', '解决', '排查', '优化'])) {
        categorized.bugfixes.push(item)
      } else {
        categorized.other.push(item)
      }
    })

    return categorized
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }

  private prioritizePlan(plans: string[]): string[] {
    return plans.sort((a, b) => {
      // 紧急和重要的任务优先
      const urgentKeywords = ['紧急', '重要', '优先', '关键', '核心']
      const aHasUrgent = urgentKeywords.some(kw => a.includes(kw))
      const bHasUrgent = urgentKeywords.some(kw => b.includes(kw))

      if (aHasUrgent && !bHasUrgent) return -1
      if (!aHasUrgent && bHasUrgent) return 1

      return 0
    })
  }

  private generateSummary(todayWork: WorkItem[], tomorrowPlan: string[], project: string): string {
    const categorized = this.categorizeWork(todayWork)
    const stats = this.generateStatistics(todayWork)

    const summaryParts = [
      `【${project}日报】`,
      `今日完成 ${stats.totalTasks} 项工作：`,
      `- 开发任务 ${stats.developmentCount} 项`,
      `- 修复问题 ${stats.bugfixCount} 项`,
      stats.meetingCount > 0 ? `- 参与会议 ${stats.meetingCount} 项` : '',
      stats.learningCount > 0 ? `- 学习研究 ${stats.learningCount} 项` : '',
      ``,
      `明日计划 ${tomorrowPlan.length} 项工作`
    ]

    return summaryParts.filter(part => part !== '').join('\n')
  }

  private generateStatistics(todayWork: WorkItem[]) {
    const categorized = this.categorizeWork(todayWork)

    return {
      totalTasks: todayWork.length,
      developmentCount: categorized.development.length,
      meetingCount: categorized.meetings.length,
      learningCount: categorized.learning.length,
      bugfixCount: categorized.bugfixes.length
    }
  }

  generateMarkdown(report: GeneratedReport): string {
    const lines = [
      `# ${report.project} 日报`,
      `**日期**: ${report.date}`,
      ``,
      `## 今日工作`,
      ``,
      `### 开发任务`,
      ...report.todayWork.development.map(item => `- ${item.content}`),
      report.todayWork.development.length === 0 ? ['(无)'] : [],
      ``,
      `### 问题修复`,
      ...report.todayWork.bugfixes.map(item => `- ${item.content}`),
      report.todayWork.bugfixes.length === 0 ? ['(无)'] : [],
      ``,
      `### 会议沟通`,
      ...report.todayWork.meetings.map(item => `- ${item.content}`),
      report.todayWork.meetings.length === 0 ? ['(无)'] : [],
      ``,
      `### 学习研究`,
      ...report.todayWork.learning.map(item => `- ${item.content}`),
      report.todayWork.learning.length === 0 ? ['(无)'] : [],
      ``,
      `## 明日计划`,
      ...report.tomorrowPlan.map(plan => `- ${plan}`),
      report.tomorrowPlan.length === 0 ? ['(无)'] : [],
      ``,
      `## 总结`,
      report.summary
    ]

    return lines.filter(line => line !== '').join('\n')
  }
}

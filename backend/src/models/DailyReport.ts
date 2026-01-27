interface WorkCategory {
  development: string[]
  meetings: string[]
  learning: string[]
  bugfixes: string[]
  other: string[]
}

export interface DailyReportData {
  id?: string
  date: string
  userId: string
  project: string
  todayWork: WorkCategory
  tomorrowPlan: string[]
  summary: string
  statistics: {
    totalTasks: number
    developmentCount: number
    meetingCount: number
    learningCount: number
    bugfixCount: number
  }
  createdAt?: Date
  updatedAt?: Date
}

export class DailyReport {
  id: string
  date: string
  userId: string
  project: string
  todayWork: WorkCategory
  tomorrowPlan: string[]
  summary: string
  statistics: {
    totalTasks: number
    developmentCount: number
    meetingCount: number
    learningCount: number
    bugfixCount: number
  }
  createdAt: Date
  updatedAt: Date

  constructor(data: DailyReportData) {
    this.id = data.id || this.generateId()
    this.date = data.date
    this.userId = data.userId
    this.project = data.project
    this.todayWork = data.todayWork
    this.tomorrowPlan = data.tomorrowPlan
    this.summary = data.summary
    this.statistics = data.statistics
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  private generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  toJSON() {
    return {
      id: this.id,
      date: this.date,
      userId: this.userId,
      project: this.project,
      todayWork: this.todayWork,
      tomorrowPlan: this.tomorrowPlan,
      summary: this.summary,
      statistics: this.statistics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

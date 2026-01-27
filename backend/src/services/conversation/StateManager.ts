export type ConversationStage = 'greeting' | 'today' | 'tomorrow' | 'summary' | 'complete'

export interface ConversationState {
  currentProject: string
  conversationStage: ConversationStage
  roundCount: number
  projects: string[]
  todayWork: string[]
  tomorrowPlan: string[]
}

export class StateManager {
  private state: ConversationState

  constructor() {
    this.state = {
      currentProject: '',
      conversationStage: 'greeting',
      roundCount: 0,
      projects: [],
      todayWork: [],
      tomorrowPlan: []
    }
  }

  getState(): ConversationState {
    return { ...this.state }
  }

  updateProject(project: string): void {
    this.state.currentProject = project
    if (!this.state.projects.includes(project)) {
      this.state.projects.push(project)
    }
  }

  advanceStage(): void {
    const stages: ConversationStage[] = ['greeting', 'today', 'tomorrow', 'summary', 'complete']
    const currentIndex = stages.indexOf(this.state.conversationStage)

    if (currentIndex < stages.length - 1) {
      this.state.conversationStage = stages[currentIndex + 1]
    }

    if (this.state.conversationStage === 'today') {
      this.state.roundCount++
    }
  }

  setStage(stage: ConversationStage): void {
    this.state.conversationStage = stage
  }

  canFinish(): boolean {
    return this.state.roundCount >= 5 || this.state.conversationStage === 'complete'
  }

  addTodayWork(work: string): void {
    this.state.todayWork.push(work)
  }

  addTomorrowPlan(plan: string): void {
    this.state.tomorrowPlan.push(plan)
  }

  getProjects(): string[] {
    return [...this.state.projects]
  }

  getTodayWork(): string[] {
    return [...this.state.todayWork]
  }

  getTomorrowPlan(): string[] {
    return [...this.state.tomorrowPlan]
  }

  getCurrentProject(): string {
    return this.state.currentProject
  }

  getStage(): ConversationStage {
    return this.state.conversationStage
  }

  reset(): void {
    this.state = {
      currentProject: '',
      conversationStage: 'greeting',
      roundCount: 0,
      projects: [],
      todayWork: [],
      tomorrowPlan: []
    }
  }
}

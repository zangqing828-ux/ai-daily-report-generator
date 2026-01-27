import { MockASRService } from '../doubao/MockASRService'
import { MockLLMService, ConversationMessage } from '../doubao/MockLLMService'
import { QuestionGenerator } from './QuestionGenerator'
import { StateManager, ConversationStage } from './StateManager'

export class ConversationEngine {
  private conversationHistory: ConversationMessage[] = []
  private currentProject: string = ''

  constructor(
    private asr: MockASRService,
    private llm: MockLLMService,
    private questions: QuestionGenerator,
    private state: StateManager
  ) {}

  async *processUserAudio(audioStream: AsyncIterable<ArrayBuffer>): AsyncGenerator<string, void, unknown> {
    // 处理音频流并获取识别结果
    const transcriptGenerator = this.asr.processAudioStream(audioStream)

    let fullText = ''
    for await (const transcript of transcriptGenerator) {
      fullText += transcript + ' '
      yield transcript // 实时返回识别的文本
    }

    // 添加到对话历史
    if (fullText.trim()) {
      this.conversationHistory.push({
        role: 'user',
        content: fullText.trim()
      })

      // 更新状态
      this.updateConversationState(fullText)
    }
  }

  async *generateResponse(): AsyncGenerator<string, void, unknown> {
    // 生成 AI 响应
    const responseGenerator = this.llm.chat(this.conversationHistory)

    let fullResponse = ''
    for await (const chunk of responseGenerator) {
      fullResponse += chunk
      yield chunk // 实时返回响应文本
    }

    // 添加到对话历史
    if (fullResponse.trim()) {
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse.trim()
      })
    }
  }

  private updateConversationState(userMessage: string): void {
    const stage = this.state.getStage()

    // 检查是否需要切换项目
    const projectMatch = userMessage.match(/项目\s*[:：]?\s*([^\s，。]+)/)
    if (projectMatch) {
      this.switchProject(projectMatch[1])
    }

    // 提取工作内容
    if (stage === 'today') {
      this.state.addTodayWork(userMessage)
    } else if (stage === 'tomorrow') {
      this.state.addTomorrowPlan(userMessage)
    }

    // 检查是否需要切换阶段
    if (this.questions.shouldSwitchStage(stage, userMessage)) {
      this.state.advanceStage()
    }
  }

  switchProject(projectName: string): void {
    this.currentProject = projectName
    this.state.updateProject(projectName)
    this.state.setStage('today')
  }

  async getNextQuestion(): Promise<string> {
    const stage = this.state.getStage()
    const project = this.state.getCurrentProject() || this.currentProject

    return this.questions.getNextQuestion(project, stage, this.conversationHistory)
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  getState() {
    return this.state.getState()
  }

  canFinish(): boolean {
    return this.state.canFinish()
  }

  reset(): void {
    this.conversationHistory = []
    this.currentProject = ''
    this.state.reset()
    this.asr.reset()
  }

  getSummary(): {
    projects: string[]
    todayWork: Record<string, string[]>
    tomorrowPlan: Record<string, string[]>
  } {
    const state = this.state.getState()
    const projects = state.projects

    const todayWork: Record<string, string[]> = {}
    const tomorrowPlan: Record<string, string[]> = {}

    // 简单的分配逻辑：假设所有工作都分配给当前项目
    // 实际实现中需要更复杂的项目关联逻辑
    if (this.currentProject) {
      todayWork[this.currentProject] = state.todayWork
      tomorrowPlan[this.currentProject] = state.tomorrowPlan
    }

    return {
      projects,
      todayWork,
      tomorrowPlan
    }
  }
}

import { describe, it, expect } from 'vitest'
import { ConversationEngine } from '../src/services/conversation/ConversationEngine'
import { MockASRService } from '../src/services/doubao/MockASRService'
import { MockLLMService } from '../src/services/doubao/MockLLMService'
import { QuestionGenerator } from '../src/services/conversation/QuestionGenerator'
import { StateManager } from '../src/services/conversation/StateManager'

describe('ConversationEngine', () => {
  it('processes conversation and generates next question', async () => {
    const asr = new MockASRService()
    const llm = new MockLLMService()
    const questions = new QuestionGenerator()
    const state = new StateManager()

    const engine = new ConversationEngine(asr, llm, questions, state)

    // 测试生成下一个问题
    const nextQuestion = await engine.getNextQuestion()
    expect(nextQuestion).toBeDefined()
    expect(typeof nextQuestion).toBe('string')
  })

  it('tracks conversation state correctly', () => {
    const asr = new MockASRService()
    const llm = new MockLLMService()
    const questions = new QuestionGenerator()
    const state = new StateManager()

    const engine = new ConversationEngine(asr, llm, questions, state)

    const currentState = engine.getState()
    expect(currentState).toBeDefined()
    expect(currentState.conversationStage).toBe('greeting')
  })

  it('switches project correctly', () => {
    const asr = new MockASRService()
    const llm = new MockLLMService()
    const questions = new QuestionGenerator()
    const state = new StateManager()

    const engine = new ConversationEngine(asr, llm, questions, state)

    engine.switchProject('测试项目')

    expect(state.getCurrentProject()).toBe('测试项目')
  })
})

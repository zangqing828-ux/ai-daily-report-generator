/**
 * 访谈状态机核心实现
 * 
 * 管理访谈的完整生命周期，包括：
 * - 7个标准阶段的流转控制
 * - 事件驱动的状态变更通知
 * - 用户输入处理和响应分析
 * - 数据收集和上下文管理
 */

import { EventEmitter } from 'events';
import {
  InterviewPhase,
  InterviewContext,
  CollectedData,
  ResponseAnalysis,
  NextAction,
  ResponseQuality,
} from './types';

/**
 * 创建初始化的已收集数据结构
 */
function createInitialCollectedData(): CollectedData {
  return {
    progress: [],
    blockers: [],
    nextSteps: [],
    timeSpent: {},
  };
}

/**
 * 创建初始化的响应分析
 */
function createInitialResponseAnalysis(): ResponseAnalysis {
  return {
    quality: ResponseQuality.GOOD,
    completeness: 0.5,
    clarity: 0.5,
    relevance: 0.5,
    depth: 0.5,
    overall: 0.5,
    missingElements: [],
  };
}

/**
 * 访谈状态机类
 * 
 * 继承 EventEmitter 以支持事件通知
 */
export class InterviewStateMachine extends EventEmitter {
  private context: InterviewContext;
  private _isActive: boolean = false;

  /**
   * 构造函数
   * @param userId - 用户ID
   * @param projectId - 项目ID
   * @param sessionId - 会话ID（可选，自动生成）
   */
  constructor(
    private userId: string,
    private projectId: string,
    private sessionId: string = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  ) {
    super();

    const now = new Date();
    this.context = {
      sessionId: this.sessionId,
      userId: this.userId,
      date: now,
      currentPhase: InterviewPhase.GREETING,
      phaseHistory: [],
      askedQuestions: [],
      followUpCount: 0,
      collectedData: createInitialCollectedData(),
      lastUserInput: '',
      lastAnalysis: null,
      startedAt: now,
      updatedAt: now,
      isCompleted: false,
      metadata: {},
    };
  }

  /**
   * 开始访谈
   * 设置状态为活跃并触发 started 事件
   */
  start(): void {
    if (this._isActive) {
      throw new Error('Interview is already active');
    }

    this._isActive = true;
    this.context.startedAt = new Date();
    this.context.updatedAt = new Date();

    this.emit('started', {
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      startedAt: this.context.startedAt,
    });

    // 触发第一个问题事件
    this.emit('question', {
      phase: this.context.currentPhase,
      questionId: `greeting_${Date.now()}`,
      text: '你好！我是你的日报助手。今天想和你聊聊今天的工作情况，我们开始吧？',
      type: 'opening',
    });
  }

  /**
   * 处理用户输入
   * @param input - 用户输入的文本
   * @returns 下一步行动
   */
  processUserInput(input: string): NextAction {
    if (!this._isActive) {
      throw new Error('Interview is not active. Call start() first.');
    }

    // 更新上下文
    this.context.lastUserInput = input;
    this.context.updatedAt = new Date();

    // 简单的响应分析（实际应由 ResponseAnalyzer 处理）
    const analysis = this.analyzeResponse(input, this.context.currentPhase);
    this.context.lastAnalysis = analysis;

    // 根据当前阶段决定下一步行动
    const action = this.determineNextAction(input, analysis);

    // 执行行动
    this.executeAction(action);

    return action;
  }

  /**
   * 简单的响应分析
   * @param input - 用户输入
   * @param phase - 当前阶段（用于阶段特定的分析）
   * @returns 响应分析结果
   */
  private analyzeResponse(input: string, phase?: InterviewPhase): ResponseAnalysis {
    const length = input.length;
    const hasDetail = length > 30;
    const hasSpecifics = /\d+/.test(input) || /(完成|实现|解决|修复|添加|更新|做了|写了|改了)/.test(input);
    
    // 问候阶段和总结确认阶段可以容忍较短的回复
    const isShortAcceptable = phase === InterviewPhase.GREETING || 
                              phase === InterviewPhase.SUMMARY_CONFIRM ||
                              phase === InterviewPhase.CLOSING;

    let quality = ResponseQuality.GOOD;
    let completeness = 0.6;
    let clarity = 0.6;
    let depth = 0.5;

    // 非常短的回复（少于4个字符）在非特定阶段标记为信息不足
    if (length < 4 && !isShortAcceptable) {
      quality = ResponseQuality.INSUFFICIENT;
      completeness = 0.2;
      clarity = 0.4;
    } else if (length < 10 && !isShortAcceptable && !hasSpecifics) {
      // 短回复且没有具体信息
      quality = ResponseQuality.INSUFFICIENT;
      completeness = 0.3;
      clarity = 0.5;
    } else if (isShortAcceptable && length >= 2) {
      // 对于短回复可接受的阶段，给予更好的评分
      quality = ResponseQuality.GOOD;
      completeness = 0.7;
      clarity = 0.8;
      depth = 0.6;
    } else if (hasDetail && hasSpecifics) {
      quality = ResponseQuality.EXCELLENT;
      completeness = 0.9;
      clarity = 0.9;
      depth = 0.85;
    } else if (hasDetail) {
      quality = ResponseQuality.GOOD;
      completeness = 0.75;
      clarity = 0.8;
      depth = 0.7;
    }

    return {
      quality,
      completeness,
      clarity,
      relevance: 0.8,
      depth,
      overall: (completeness + clarity + 0.8 + depth) / 4,
      missingElements: hasSpecifics ? [] : ['具体工作细节', '时间或数量信息'],
    };
  }

  /**
   * 确定下一步行动
   * @param input - 用户输入
   * @param analysis - 响应分析
   * @returns 下一步行动
   */
  private determineNextAction(input: string, analysis: ResponseAnalysis): NextAction {
    const currentPhase = this.context.currentPhase;

    // 检查是否需要追问
    if (analysis.quality === ResponseQuality.INSUFFICIENT || 
        analysis.quality === ResponseQuality.POOR) {
      if (this.context.followUpCount < 3) {
        this.context.followUpCount++;
        return {
          type: 'followUp',
          questionTemplate: '能详细说说吗？比如具体做了哪些工作？',
          reason: '用户回复信息不足，需要追问',
        };
      }
    }

    // 根据阶段决定行动
    switch (currentPhase) {
      case InterviewPhase.GREETING:
        return {
          type: 'transition',
          targetPhase: InterviewPhase.PROJECT_CONFIRM,
          questionTemplate: '好的！今天我们主要进行哪些项目或任务呢？',
          reason: '完成问候，进入项目确认阶段',
        };

      case InterviewPhase.PROJECT_CONFIRM:
        // 收集项目信息
        this.context.collectedData.progress.push(input);
        return {
          type: 'transition',
          targetPhase: InterviewPhase.PROGRESS_REVIEW,
          questionTemplate: '了解了。那今天在这些任务上取得了哪些进展呢？',
          reason: '已确认项目，进入进度回顾',
        };

      case InterviewPhase.PROGRESS_REVIEW:
        this.context.collectedData.progress.push(input);
        return {
          type: 'transition',
          targetPhase: InterviewPhase.BLOCKERS,
          questionTemplate: '在推进过程中有遇到什么困难或阻碍吗？',
          reason: '已了解进度，询问阻碍',
        };

      case InterviewPhase.BLOCKERS:
        this.context.collectedData.blockers.push(input);
        return {
          type: 'transition',
          targetPhase: InterviewPhase.NEXT_STEPS,
          questionTemplate: '接下来有什么计划？明天打算做什么？',
          reason: '已了解阻碍，进入下一步计划',
        };

      case InterviewPhase.NEXT_STEPS:
        this.context.collectedData.nextSteps.push(input);
        return {
          type: 'transition',
          targetPhase: InterviewPhase.SUMMARY_CONFIRM,
          questionTemplate: '好的，让我总结一下今天的访谈内容。我们今天讨论了[项目]，完成了[进度]，遇到了[阻碍]，计划[下一步]。这个总结准确吗？',
          reason: '已收集所有信息，进入确认阶段',
        };

      case InterviewPhase.SUMMARY_CONFIRM:
        return {
          type: 'transition',
          targetPhase: InterviewPhase.CLOSING,
          questionTemplate: '好的！感谢你今天的时间。日报已经生成，祝你工作顺利！',
          reason: '用户确认总结，进入结束阶段',
        };

      case InterviewPhase.CLOSING:
        return {
          type: 'close',
          reason: '访谈已完成',
        };

      default:
        return {
          type: 'ask',
          questionTemplate: '能详细说说吗？',
          reason: '默认追问',
        };
    }
  }

  /**
   * 执行行动
   * @param action - 下一步行动
   */
  private executeAction(action: NextAction): void {
    // 重置追问计数器
    if (action.type === 'transition') {
      this.context.followUpCount = 0;

      // 记录阶段历史
      if (!this.context.phaseHistory.includes(this.context.currentPhase)) {
        this.context.phaseHistory.push(this.context.currentPhase);
      }

      // 更新当前阶段
      if (action.targetPhase) {
        const oldPhase = this.context.currentPhase;
        this.context.currentPhase = action.targetPhase;

        // 触发阶段变更事件
        this.emit('phaseChanged', {
          oldPhase,
          newPhase: action.targetPhase,
          reason: action.reason,
        });
      }
    }

    // 触发问题事件
    if (action.type === 'ask' || action.type === 'followUp' || action.type === 'transition') {
      this.emit('question', {
        phase: this.context.currentPhase,
        type: action.type,
        text: action.questionTemplate,
        reason: action.reason,
      });
    }

    // 触发行动事件
    this.emit('action', {
      type: action.type,
      reason: action.reason,
      targetPhase: action.targetPhase,
    });

    // 处理关闭
    if (action.type === 'close') {
      this.end();
    }
  }

  /**
   * 获取当前上下文
   * @returns 访谈上下文
   */
  getContext(): InterviewContext {
    return {
      ...this.context,
      collectedData: { ...this.context.collectedData },
      metadata: { ...this.context.metadata }
    };
  }

  /**
   * 检查访谈是否活跃
   * @returns 是否活跃
   */
  isActive(): boolean {
    return this._isActive;
  }

  /**
   * 结束访谈
   */
  end(): void {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;
    this.context.isCompleted = true;
    this.context.updatedAt = new Date();

    this.emit('ended', {
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      completedAt: new Date(),
      collectedData: this.context.collectedData,
      phaseHistory: this.context.phaseHistory,
    });
  }

  /**
   * 获取已收集的数据
   * @returns 收集的数据（深拷贝）
   */
  getCollectedData(): CollectedData {
    return {
      progress: [...this.context.collectedData.progress],
      blockers: [...this.context.collectedData.blockers],
      nextSteps: [...this.context.collectedData.nextSteps],
      timeSpent: { ...this.context.collectedData.timeSpent },
    };
  }

  /**
   * 获取当前阶段
   * @returns 当前阶段
   */
  getCurrentPhase(): InterviewPhase {
    return this.context.currentPhase;
  }

  /**
   * 获取阶段历史
   * @returns 阶段历史数组
   */
  getPhaseHistory(): InterviewPhase[] {
    return [...this.context.phaseHistory];
  }
}
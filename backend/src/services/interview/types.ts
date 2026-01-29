/**
 * 访谈对话系统的类型定义
 * 定义状态机、响应分析、问题生成等所需的所有类型
 */

/**
 * 访谈阶段枚举
 * 定义7个标准访谈阶段，用于状态机流转
 */
export enum InterviewPhase {
  /** 开场问候阶段：建立友好氛围，介绍访谈目的 */
  GREETING = 'GREETING',
  /** 项目确认阶段：确认当日负责的项目和任务 */
  PROJECT_CONFIRM = 'PROJECT_CONFIRM',
  /** 进度回顾阶段：了解已完成的工作内容 */
  PROGRESS_REVIEW = 'PROGRESS_REVIEW',
  /** 障碍困难阶段：识别阻碍和需要支持的地方 */
  BLOCKERS = 'BLOCKERS',
  /** 下步计划阶段：明确接下来的工作安排 */
  NEXT_STEPS = 'NEXT_STEPS',
  /** 总结确认阶段：确认日报内容准确完整 */
  SUMMARY_CONFIRM = 'SUMMARY_CONFIRM',
  /** 结束收尾阶段：礼貌结束访谈 */
  CLOSING = 'CLOSING',
}

/**
 * 响应质量等级枚举
 * 用于评估用户回复的质量，指导追问策略
 */
export enum ResponseQuality {
  /** 优秀：信息完整、清晰、切题且有深度 */
  EXCELLENT = 'EXCELLENT',
  /** 良好：信息较为完整，略有不足 */
  GOOD = 'GOOD',
  /** 可接受：基本信息已提供，但需要补充 */
  ADEQUATE = 'ADEQUATE',
  /** 不足：信息明显缺失，需要引导 */
  INSUFFICIENT = 'INSUFFICIENT',
  /** 差：与问题无关或无法理解 */
  POOR = 'POOR',
}

/**
 * 已收集数据接口
 * 存储访谈过程中提取的结构化信息
 */
export interface CollectedData {
  /** 已完成的工作内容和进度描述 */
  progress: string[];
  /** 遇到的阻碍和困难 */
  blockers: string[];
  /** 下一步计划和待办事项 */
  nextSteps: string[];
  /** 各任务花费的时间（小时或描述） */
  timeSpent: Record<string, string>;
}

/**
 * 响应分析接口
 * 用于存储对用户回复的多维度质量评估
 */
export interface ResponseAnalysis {
  /** 整体质量等级 */
  quality: ResponseQuality;
  /** 信息完整性评分（0-1） */
  completeness: number;
  /** 表达清晰度评分（0-1） */
  clarity: number;
  /** 与问题相关性评分（0-1） */
  relevance: number;
  /** 内容深度评分（0-1） */
  depth: number;
  /** 综合得分（0-1） */
  overall: number;
  /** 缺失的关键元素列表 */
  missingElements: string[];
}

/**
 * 阶段配置接口
 * 定义每个访谈阶段的配置参数
 */
export interface PhaseConfig {
  /** 阶段标识符 */
  phase: InterviewPhase;
  /** 阶段显示名称 */
  name: string;
  /** 阶段描述 */
  description: string;
  /** 是否允许跳过此阶段 */
  skippable: boolean;
  /** 最大追问次数 */
  maxFollowUps: number;
  /** 进入此阶段所需的前置阶段 */
  requiredPrevPhases: InterviewPhase[];
  /** 从此阶段可转移到的下一阶段 */
  allowedNextPhases: InterviewPhase[];
}

/**
 * 问题接口
 * 定义访谈过程中的问题结构
 */
export interface Question {
  /** 问题唯一标识 */
  id: string;
  /** 所属阶段 */
  phase: InterviewPhase;
  /** 问题文本内容 */
  text: string;
  /** 问题类型：开场、核心、追问、过渡 */
  type: 'opening' | 'core' | 'followUp' | 'transition';
  /** 问题目的描述 */
  purpose: string;
  /** 期望收集的数据类型 */
  expectedData: string[];
  /** 可选：追问问题列表 */
  followUpQuestions?: string[];
}

/**
 * 下一步行动接口
 * 定义状态机决策后的行动
 */
export interface NextAction {
  /** 行动类型 */
  type: 'ask' | 'followUp' | 'transition' | 'summarize' | 'close';
  /** 目标阶段（如果是转移） */
  targetPhase?: InterviewPhase;
  /** 要使用的问题ID或生成的新问题 */
  questionId?: string;
  /** 生成问题的模板 */
  questionTemplate?: string;
  /** 行动的原因说明 */
  reason: string;
}

/**
 * 访谈上下文接口
 * 完整的对话状态定义，用于状态机管理
 */
export interface InterviewContext {
  /** 唯一会话ID */
  sessionId: string;
  /** 当前用户ID */
  userId: string;
  /** 访谈日期 */
  date: Date;
  /** 当前阶段 */
  currentPhase: InterviewPhase;
  /** 之前经过的阶段历史 */
  phaseHistory: InterviewPhase[];
  /** 当前阶段已问的问题ID列表 */
  askedQuestions: string[];
  /** 当前追问次数 */
  followUpCount: number;
  /** 已收集的结构化数据 */
  collectedData: CollectedData;
  /** 最后一次用户输入 */
  lastUserInput: string;
  /** 最后一次响应分析 */
  lastAnalysis: ResponseAnalysis | null;
  /** 会话开始时间 */
  startedAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 元数据（扩展用） */
  metadata: Record<string, unknown>;
}

/**
 * 访谈配置接口
 * 全局访谈系统配置
 */
export interface InterviewConfig {
  /** 是否启用追问 */
  enableFollowUp: boolean;
  /** 默认最大追问次数 */
  defaultMaxFollowUps: number;
  /** 质量阈值（低于此值触发追问） */
  qualityThreshold: number;
  /** 是否自动阶段推进 */
  autoAdvance: boolean;
  /** 各阶段具体配置 */
  phaseConfigs: Record<InterviewPhase, PhaseConfig>;
  /** 问题模板配置 */
  questionTemplates: Record<string, string[]>;
  /** 追问模板配置 */
  followUpTemplates: Record<ResponseQuality, string[]>;
}

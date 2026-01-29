/**
 * 访谈对话系统模块入口
 * 
 * 导出所有类型定义和核心类
 * 包括状态机、响应分析器、问题生成器等组件
 */

// 导出所有类型定义
export * from './types';

// 导出 InterviewStateMachine
export { InterviewStateMachine } from './InterviewStateMachine';

// 导出响应分析器
export { ResponseAnalyzer } from './ResponseAnalyzer';

// 导出分析结果类型
export type { AnalysisResult, FollowUpSuggestion } from './ResponseAnalyzer';

/**
 * 问题生成器类
 * 
 * 根据当前状态生成合适的问题，包括：
 * - 主问题生成
 * - 追问问题生成
 * - 过渡问题生成
 * 
 * 实现基于模板的动态问题生成
 */
export { QuestionGenerator, TemplateContext } from './QuestionGenerator';
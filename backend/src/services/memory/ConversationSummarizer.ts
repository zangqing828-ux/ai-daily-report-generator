/**
 * 对话摘要生成器
 * 使用 LLM 从对话历史生成结构化的摘要和洞察
 */

import { PrismaClient } from '@prisma/client';
import { InterviewContext } from '../interview/types';

const prisma = new PrismaClient();

// 对话摘要结构
export interface ConversationSummary {
  overview: string;           // 整体概述（1-2句话）
  keyTopics: string[];          // 主要话题
  accomplishments: string[];    // 完成的工作
  blockers: string[];           // 遇到的问题
  nextSteps: string[];          // 下一步计划
  insights: string[];           // AI 观察到的洞察
}

// 行动项
export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

// 完整的对话摘要数据
export interface ConversationSummaryData {
  sessionId: string;
  date: Date;
  duration: number;
  summary: ConversationSummary;
  actionItems: ActionItem[];
  userFeedback?: {
    satisfaction: 1 | 2 | 3 | 4 | 5;
    comments?: string;
    wouldRecommend: boolean;
  };
}

export class ConversationSummarizer {
  /**
   * 生成对话摘要
   * 
   * 注意：这是简化实现，实际应该调用 LLM API（如 GPT-4）
   * 来进行智能摘要生成
   */
  async generateSummary(
    sessionId: string,
    context: InterviewContext,
    transcript: Array<{ speaker: 'user' | 'assistant'; content: string; timestamp: Date }>
  ): Promise<ConversationSummaryData> {
    
    // 提取用户发言（简化处理）
    const userMessages = transcript
      .filter(t => t.speaker === 'user')
      .map(t => t.content);

    // 基于 InterviewContext 生成摘要（简化版）
    // 实际应该使用 LLM 分析完整对话
    const summary: ConversationSummary = {
      overview: this.generateOverview(context, userMessages),
      keyTopics: this.extractTopics(context),
      accomplishments: context.collectedData.progress,
      blockers: context.collectedData.blockers,
      nextSteps: context.collectedData.nextSteps,
      insights: this.generateInsights(context)
    };

    // 提取行动项
    const actionItems = this.extractActionItems(context);

    // 计算对话时长
    const duration = this.calculateDuration(transcript);

    return {
      sessionId,
      date: new Date(),
      duration,
      summary,
      actionItems
    };
  }

  /**
   * 存储对话摘要
   */
  async storeSummary(
    userId: string,
    projectId: string,
    data: ConversationSummaryData
  ): Promise<void> {
    // 使用 MemoryService 存储
    const { MemoryService } = require('./MemoryService');
    const memoryService = new MemoryService();

    await memoryService.storeConversationSummary(
      userId,
      projectId,
      data.sessionId,
      {
        date: data.date,
        duration: data.duration,
        summary: data.summary,
        actionItems: data.actionItems,
        userFeedback: data.userFeedback
      }
    );
  }

  // ============= 私有辅助方法 =============

  private generateOverview(context: InterviewContext, userMessages: string[]): string {
    const progress = context.collectedData.progress.length;
    const blockers = context.collectedData.blockers.length;
    const nextSteps = context.collectedData.nextSteps.length;

    let overview = `本次对话收集了${progress}项工作进展`;
    if (blockers > 0) {
      overview += `，${blockers}个遇到的问题`;
    }
    if (nextSteps > 0) {
      overview += `，${nextSteps}项明日计划`;
    }
    overview += '。';

    return overview;
  }

  private extractTopics(context: InterviewContext): string[] {
    const topics: string[] = [];
    
    // 从工作进展中提取主题
    context.collectedData.progress.forEach(p => {
      if (p.includes('开发') || p.includes('实现')) topics.push('开发工作');
      if (p.includes('bug') || p.includes('修复')) topics.push('Bug修复');
      if (p.includes('优化')) topics.push('性能优化');
    });

    // 去重
    return [...new Set(topics)];
  }

  private generateInsights(context: InterviewContext): string[] {
    const insights: string[] = [];
    
    // 基于数据生成洞察
    if (context.collectedData.blockers.length > 0) {
      insights.push('当前存在一些阻碍，建议优先解决以保障进度。');
    }
    
    if (context.collectedData.progress.length >= 3) {
      insights.push('今日工作产出丰富，涵盖了多个方面的进展。');
    }

    return insights;
  }

  private extractActionItems(context: InterviewContext): ActionItem[] {
    // 从阻碍中提取行动项
    const actionItems: ActionItem[] = [];
    
    context.collectedData.blockers.forEach((blocker, index) => {
      actionItems.push({
        id: `blocker-${index}`,
        description: `解决阻碍: ${blocker.substring(0, 50)}...`,
        assignee: 'self',
        status: 'pending',
        priority: 'high'
      });
    });

    // 从明日计划中提取行动项
    context.collectedData.nextSteps.forEach((step, index) => {
      actionItems.push({
        id: `next-${index}`,
        description: step,
        assignee: 'self',
        status: 'pending',
        priority: 'medium'
      });
    });

    return actionItems;
  }

  private calculateDuration(transcript: Array<{ timestamp: Date }>): number {
    if (transcript.length === 0) return 0;
    
    const start = transcript[0].timestamp;
    const end = transcript[transcript.length - 1].timestamp;
    
    return Math.floor((end.getTime() - start.getTime()) / 1000); // 秒
  }
}

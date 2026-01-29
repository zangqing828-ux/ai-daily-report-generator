/**
 * 记忆服务
 * 管理长期记忆检索、项目上下文维护和对话历史查询
 */

import { PrismaClient } from '@prisma/client';
import { InterviewContext } from '../interview/types';

const prisma = new PrismaClient();

// 记忆检索结果
export interface MemoryRetrievalResult {
  relevance: number;  // 相关性 0-1
  source: string;     // 来源
  data: any;          // 数据内容
  context?: string;   // 上下文说明
  timestamp: Date;
}

// 记忆查询参数
export interface MemoryQuery {
  type: 'project' | 'conversation' | 'preference' | 'pattern';
  filters?: {
    projectId?: string;
    dateRange?: { start: Date; end: Date };
    keywords?: string[];
  };
  limit?: number;
}

export class MemoryService {
  /**
   * 检索相关记忆
   */
  async retrieveMemories(
    userId: string,
    query: MemoryQuery,
    currentContext?: InterviewContext
  ): Promise<MemoryRetrievalResult[]> {
    const results: MemoryRetrievalResult[] = [];

    switch (query.type) {
      case 'project':
        results.push(...await this.retrieveProjectContext(userId, query));
        break;
      case 'conversation':
        results.push(...await this.retrieveConversationHistory(userId, query));
        break;
      case 'preference':
        results.push(...await this.retrieveUserPreferences(userId));
        break;
      case 'pattern':
        results.push(...await this.retrieveWorkPatterns(userId, query));
        break;
    }

    // 根据当前上下文相关性排序
    if (currentContext) {
      results.sort((a, b) => {
        const scoreA = this.calculateRelevance(a, currentContext);
        const scoreB = this.calculateRelevance(b, currentContext);
        return scoreB - scoreA;
      });
    }

    // 限制结果数量
    const limit = query.limit || 5;
    return results.slice(0, limit);
  }

  /**
   * 更新项目上下文
   */
  async updateProjectContext(
    projectId: string,
    contextData: {
      keyAccomplishments?: any[];
      ongoingTasks?: any[];
      blockers?: any[];
      healthMetrics?: any;
    }
  ): Promise<void> {
    const existing = await prisma.projectContext.findUnique({
      where: { projectId }
    });

    if (existing) {
      // 合并新数据
      const currentData = existing as any;
      
      await prisma.projectContext.update({
        where: { projectId },
        data: {
          keyAccomplishments: [
            ...(currentData.keyAccomplishments || []),
            ...(contextData.keyAccomplishments || [])
          ].slice(-50), // 保留最近50条
          ongoingTasks: contextData.ongoingTasks || currentData.ongoingTasks,
          blockers: [
            ...(currentData.blockers || []),
            ...(contextData.blockers || [])
          ],
          healthMetrics: contextData.healthMetrics || currentData.healthMetrics,
          lastUpdatedAt: new Date()
        }
      });
    } else {
      // 创建新的上下文
      await prisma.projectContext.create({
        data: {
          projectId,
          metadata: {},
          keyAccomplishments: contextData.keyAccomplishments || [],
          ongoingTasks: contextData.ongoingTasks || [],
          blockers: contextData.blockers || [],
          stakeholders: [],
          healthMetrics: contextData.healthMetrics
        }
      });
    }
  }

  /**
   * 存储对话摘要
   */
  async storeConversationSummary(
    userId: string,
    projectId: string,
    sessionId: string,
    summaryData: {
      date: Date;
      duration: number;
      summary: any;
      actionItems: any[];
      userFeedback?: any;
    }
  ): Promise<void> {
    await prisma.conversationSummary.create({
      data: {
        userId,
        projectId,
        sessionId,
        date: summaryData.date,
        duration: summaryData.duration,
        summary: summaryData.summary,
        actionItems: summaryData.actionItems,
        userFeedback: summaryData.userFeedback
      }
    });
  }

  // ============= 私有辅助方法 =============

  private async retrieveProjectContext(
    userId: string,
    query: MemoryQuery
  ): Promise<MemoryRetrievalResult[]> {
    const projectId = query.filters?.projectId;
    if (!projectId) return [];

    const context = await prisma.projectContext.findUnique({
      where: { projectId }
    });

    if (!context) return [];

    return [{
      relevance: 0.9,
      source: 'projectContext',
      data: context,
      context: '项目历史上下文',
      timestamp: context.lastUpdatedAt
    }];
  }

  private async retrieveConversationHistory(
    userId: string,
    query: MemoryQuery
  ): Promise<MemoryRetrievalResult[]> {
    const projectId = query.filters?.projectId;
    const dateRange = query.filters?.dateRange;

    const where: any = { userId };
    if (projectId) where.projectId = projectId;
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const summaries = await prisma.conversationSummary.findMany({
      where,
      orderBy: { date: 'desc' },
      take: query.limit || 5
    });

    return summaries.map(s => ({
      relevance: 0.7,
      source: 'conversationSummary',
      data: s,
      context: '历史对话摘要',
      timestamp: s.date
    }));
  }

  private async retrieveUserPreferences(
    userId: string
  ): Promise<MemoryRetrievalResult[]> {
    // 从 UserProfileService 获取，这里返回空
    return [];
  }

  private async retrieveWorkPatterns(
    userId: string,
    query: MemoryQuery
  ): Promise<MemoryRetrievalResult[]> {
    // 从对话历史中推断工作模式
    const recentSummaries = await prisma.conversationSummary.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 10
    });

    if (recentSummaries.length === 0) return [];

    // 分析时间分布、任务类型等
    const patterns = this.analyzeWorkPatterns(recentSummaries);

    return [{
      relevance: 0.8,
      source: 'workPatternAnalysis',
      data: patterns,
      context: '工作模式和习惯分析',
      timestamp: new Date()
    }];
  }

  private analyzeWorkPatterns(summaries: any[]): any {
    // 简单分析实现
    const hourDistribution = new Array(24).fill(0);
    const dayDistribution = new Array(7).fill(0);

    summaries.forEach(s => {
      const date = new Date(s.date);
      hourDistribution[date.getHours()]++;
      dayDistribution[date.getDay()]++;
    });

    return {
      hourDistribution,
      dayDistribution,
      totalConversations: summaries.length
    };
  }

  private calculateRelevance(result: MemoryRetrievalResult, context: InterviewContext): number {
    // 基于当前上下文计算相关性
    let score = result.relevance;

    // 如果是当前项目，增加相关性
    if (context.projectId && result.data?.projectId === context.projectId) {
      score += 0.1;
    }

    // 根据时间衰减
    const age = Date.now() - result.timestamp.getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    score -= daysOld * 0.01; // 每天衰减 0.01

    return Math.min(Math.max(score, 0), 1);
  }
}

/**
 * 用户档案服务
 * 管理用户偏好、工作习惯和长期记忆
 */

import { PrismaClient } from '@prisma/client';
import { InterviewContext } from '../interview/types';

const prisma = new PrismaClient();

// 工作风格偏好
export interface WorkStylePreferences {
  reportingStyle: 'detailed' | 'concise' | 'bullet-points';
  preferredTime: {
    start: number; // 小时，如 17 表示下午5点
    end: number;
  };
  interactionStyle: {
    proactiveLevel: 'low' | 'medium' | 'high';
    reminderTolerance: number;
    interruptionTolerance: 'none' | 'low' | 'high';
  };
  contentPreferences: {
    includeTimeSpent: boolean;
    includeBlockers: boolean;
    includeLearning: boolean;
    trackTechnicalDebt: boolean;
  };
}

// 工作模式
export interface WorkPattern {
  type: 'deep-work' | 'meeting-heavy' | 'mixed';
  typicalHours: {
    start: number;
    end: number;
  };
  productiveDays: number[]; // 0=周日, 1=周一, ...
}

// 沟通风格
export interface CommunicationStyle {
  responseLatency: 'immediate' | 'relaxed' | 'async';
  detailLevel: 'minimal' | 'moderate' | 'extensive';
  feedbackPreference: 'direct' | 'suggestive' | 'exploratory';
}

// 用户档案数据
export interface UserProfileData {
  preferences: WorkStylePreferences;
  workPatterns: WorkPattern[];
  communicationStyle: CommunicationStyle;
  commonPhrases: {
    phrase: string;
    meaning: string;
    frequency: number;
  }[];
}

export class UserProfileService {
  /**
   * 获取或创建用户档案
   */
  async getOrCreateProfile(userId: string): Promise<UserProfileData> {
    const existing = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (existing) {
      return this.parseProfileData(existing.preferences);
    }

    // 创建默认档案
    const defaultProfile = this.createDefaultProfile();
    await prisma.userProfile.create({
      data: {
        userId,
        preferences: defaultProfile as any
      }
    });

    return defaultProfile;
  }

  /**
   * 更新用户偏好
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<WorkStylePreferences>
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    
    const updated = {
      ...profile,
      preferences: {
        ...profile.preferences,
        ...preferences
      }
    };

    await prisma.userProfile.update({
      where: { userId },
      data: { preferences: updated as any }
    });
  }

  /**
   * 从对话中学习用户模式
   */
  async learnFromConversation(
    userId: string,
    context: InterviewContext
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    // 分析常用表达
    const newPhrases = this.extractCommonPhrases(context);
    
    // 更新工作模式
    const workPattern = this.inferWorkPattern(context);

    // 合并学习结果
    const updated: UserProfileData = {
      ...profile,
      commonPhrases: this.mergePhrases(profile.commonPhrases, newPhrases),
      workPatterns: this.updateWorkPatterns(profile.workPatterns, workPattern)
    };

    await prisma.userProfile.update({
      where: { userId },
      data: { preferences: updated as any }
    });
  }

  /**
   * 获取适合用户的提问风格建议
   */
  async getQuestionStyleAdvice(userId: string): Promise<{
    tone: 'gentle' | 'neutral' | 'direct';
    detailLevel: 'low' | 'medium' | 'high';
    shouldProbe: boolean;
  }> {
    const profile = await this.getOrCreateProfile(userId);
    
    const { preferences, communicationStyle } = profile;

    return {
      tone: this.mapToTone(communicationStyle.feedbackPreference),
      detailLevel: this.mapToDetailLevel(communicationStyle.detailLevel),
      shouldProbe: preferences.interactionStyle.proactiveLevel !== 'low'
    };
  }

  // ============= 私有辅助方法 =============

  private createDefaultProfile(): UserProfileData {
    return {
      preferences: {
        reportingStyle: 'detailed',
        preferredTime: { start: 17, end: 19 },
        interactionStyle: {
          proactiveLevel: 'medium',
          reminderTolerance: 3,
          interruptionTolerance: 'low'
        },
        contentPreferences: {
          includeTimeSpent: true,
          includeBlockers: true,
          includeLearning: true,
          trackTechnicalDebt: true
        }
      },
      workPatterns: [{
        type: 'mixed',
        typicalHours: { start: 9, end: 18 },
        productiveDays: [1, 2, 3, 4, 5]
      }],
      communicationStyle: {
        responseLatency: 'relaxed',
        detailLevel: 'moderate',
        feedbackPreference: 'suggestive'
      },
      commonPhrases: []
    };
  }

  private parseProfileData(data: any): UserProfileData {
    // 确保返回的数据符合 UserProfileData 接口
    return data as UserProfileData;
  }

  private extractCommonPhrases(context: InterviewContext): Array<{phrase: string; meaning: string; frequency: number}> {
    // 从对话历史中提取常用短语
    // 这是一个简化实现，实际应该使用 NLP 技术
    return [];
  }

  private inferWorkPattern(context: InterviewContext): WorkPattern {
    // 从对话中推断工作模式
    return {
      type: 'mixed',
      typicalHours: { start: 9, end: 18 },
      productiveDays: [1, 2, 3, 4, 5]
    };
  }

  private mergePhrases(
    existing: Array<{phrase: string; meaning: string; frequency: number}>,
    newPhrases: Array<{phrase: string; meaning: string; frequency: number}>
  ): Array<{phrase: string; meaning: string; frequency: number}> {
    // 合并短语列表，增加频率
    const merged = [...existing];
    
    for (const newPhrase of newPhrases) {
      const existingIndex = merged.findIndex(p => p.phrase === newPhrase.phrase);
      if (existingIndex >= 0) {
        merged[existingIndex].frequency += newPhrase.frequency;
      } else {
        merged.push(newPhrase);
      }
    }
    
    // 按频率排序，只保留前20个
    return merged.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  }

  private updateWorkPatterns(
    existing: WorkPattern[],
    newPattern: WorkPattern
  ): WorkPattern[] {
    // 更新工作模式列表
    // 如果类型相同，更新该模式；否则添加新模式
    const existingIndex = existing.findIndex(p => p.type === newPattern.type);
    
    if (existingIndex >= 0) {
      const updated = [...existing];
      updated[existingIndex] = newPattern;
      return updated;
    } else {
      return [...existing, newPattern];
    }
  }

  private mapToTone(feedbackPreference: string): 'gentle' | 'neutral' | 'direct' {
    switch (feedbackPreference) {
      case 'direct': return 'direct';
      case 'exploratory': return 'gentle';
      default: return 'neutral';
    }
  }

  private mapToDetailLevel(detailLevel: string): 'low' | 'medium' | 'high' {
    switch (detailLevel) {
      case 'minimal': return 'low';
      case 'extensive': return 'high';
      default: return 'medium';
    }
  }
}

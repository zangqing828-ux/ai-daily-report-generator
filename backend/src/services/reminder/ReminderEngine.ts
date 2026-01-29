/**
 * 提醒引擎
 * 实现7/10/15分钟提醒机制，支持智能延迟和渐进式提醒策略
 */

import { EventEmitter } from 'events';
import { InterviewPhase, InterviewContext } from '../interview/types';

// 提醒任务
export interface ReminderTask {
  id: string;
  type: ReminderType;
  context: InterviewContext;
  schedule: {
    createdAt: Date;
    nextTriggerAt: Date;
    attemptCount: number;
    maxAttempts: number;
  };
  status: 'pending' | 'triggered' | 'responded' | 'ignored' | 'completed';
  history: {
    timestamp: Date;
    type: 'scheduled' | 'triggered' | 'delayed' | 'cancelled' | 'responded';
    reason?: string;
  }[];
}

// 提醒类型
export enum ReminderType {
  COMPLETION = 'completion',
  CONTEXT = 'context',
  TIME_BASED = 'time_based',
  PROGRESSION = 'progression',
  SILENCE_WAKEUP = 'silence_wakeup'
}

// 提醒消息
export interface ReminderMessage {
  text: string;
  tone: 'gentle' | 'neutral' | 'prompt';
  urgency: 'low' | 'medium' | 'high';
  suggestedAction?: string;
  alternativeOptions?: string[];
  estimatedTime?: string;
}

// 提醒调度器配置
export interface ReminderSchedulerConfig {
  timeWindows: {
    initialWait: number;        // 初始等待时间（秒）
    followUpIntervals: number[];  // 跟进间隔（秒）[420, 600, 900] = 7,10,15分钟
    maxAttempts: number;        // 最大尝试次数（3次）
    abandonmentThreshold: number; // 放弃阈值（15分钟后仍无响应）
  };
  smartDelay: {
    enabled: boolean;
    voiceActivityDelay: {
      enabled: boolean;
      threshold: number;
      delayDuration: number;
    };
    completionPatternDelay: {
      enabled: boolean;
      patterns: string[];
      delayDuration: number;
    };
    userSilenceTimeout: {
      enabled: boolean;
      threshold: number;
    };
  };
  escalationStrategy: {
    gentle: {
      tone: 'friendly';
      messageTemplate: string[];
      maxDuration: number;
    };
    neutral: {
      tone: 'professional';
      messageTemplate: string[];
      maxDuration: number;
    };
    direct: {
      tone: 'urgent';
      messageTemplate: string[];
    };
  };
}

export class ReminderEngine extends EventEmitter {
  private activeReminders: Map<string, ReminderTask> = new Map();
  private config: ReminderSchedulerConfig;

  constructor(config?: Partial<ReminderSchedulerConfig>) {
    super();
    this.config = this.mergeWithDefaultConfig(config);
  }

  /**
   * 创建提醒任务
   */
  createReminder(
    type: ReminderType,
    context: InterviewContext,
    delaySeconds: number = this.config.timeWindows.initialWait
  ): ReminderTask {
    const taskId = `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ReminderTask = {
      id: taskId,
      type,
      context,
      schedule: {
        createdAt: new Date(),
        nextTriggerAt: new Date(Date.now() + delaySeconds * 1000),
        attemptCount: 0,
        maxAttempts: this.config.timeWindows.maxAttempts
      },
      status: 'pending',
      history: [{
        timestamp: new Date(),
        type: 'scheduled',
        reason: `将在 ${delaySeconds} 秒后触发`
      }]
    };

    this.activeReminders.set(taskId, task);
    this.scheduleReminder(task);
    
    return task;
  }

  /**
   * 取消提醒任务
   */
  cancelReminder(taskId: string): boolean {
    const task = this.activeReminders.get(taskId);
    if (!task) return false;

    task.status = 'ignored';
    task.history.push({
      timestamp: new Date(),
      type: 'cancelled',
      reason: '用户取消或对话结束'
    });

    this.activeReminders.delete(taskId);
    return true;
  }

  /**
   * 处理用户响应
   */
  handleUserResponse(taskId: string, response: string): boolean {
    const task = this.activeReminders.get(taskId);
    if (!task) return false;

    // 检查是否是延迟触发（用户正在说话）
    if (this.shouldDelayReminder(task, response)) {
      this.delayReminder(task);
      return true;
    }

    // 用户已响应，标记为完成
    task.status = 'responded';
    task.history.push({
      timestamp: new Date(),
      type: 'responded',
      reason: '用户已响应提醒'
    });

    this.emit('reminder:responded', task, response);
    this.activeReminders.delete(taskId);
    return true;
  }

  /**
   * 获取所有活跃的提醒任务
   */
  getActiveReminders(): ReminderTask[] {
    return Array.from(this.activeReminders.values());
  }

  // ============= 私有方法 =============

  private mergeWithDefaultConfig(
    config?: Partial<ReminderSchedulerConfig>
  ): ReminderSchedulerConfig {
    const defaultConfig: ReminderSchedulerConfig = {
      timeWindows: {
        initialWait: 60,           // 1分钟初始等待
        followUpIntervals: [420, 600, 900], // 7, 10, 15分钟
        maxAttempts: 3,
        abandonmentThreshold: 900   // 15分钟后放弃
      },
      smartDelay: {
        enabled: true,
        voiceActivityDelay: {
          enabled: true,
          threshold: 0.1,         // 音频阈值
          delayDuration: 30       // 延迟30秒
        },
        completionPatternDelay: {
          enabled: true,
          patterns: ['完成', '结束', '就这样', '没别的了', '先这样'],
          delayDuration: 60       // 延迟60秒
        },
        userSilenceTimeout: {
          enabled: true,
          threshold: 420         // 7分钟静默后触发
        }
      },
      escalationStrategy: {
        gentle: {
          tone: 'friendly',
          messageTemplate: [
            '你刚才提到的{topic}，能再详细说说吗？',
            '关于{topic}，还有什么想补充的吗？',
            '方便分享一下{topic}的具体情况吗？'
          ],
          maxDuration: 420         // 7分钟后升级
        },
        neutral: {
          tone: 'professional',
          messageTemplate: [
            '注意到关于{topic}的信息还不够完整，能否补充一下？',
            '为了更好地记录，还需要了解{topic}的具体内容。',
            '{topic}部分的信息缺失，方便现在补充吗？'
          ],
          maxDuration: 600         // 10分钟后升级
        },
        direct: {
          tone: 'urgent',
          messageTemplate: [
            '关于{topic}的信息确实比较重要，能否现在说明一下？',
            '需要补充{topic}的信息才能生成完整的日报。',
            '如果不方便详细说明{topic}，可以先简单概括一下。'
          ]
        }
      }
    };

    return {
      ...defaultConfig,
      ...config,
      timeWindows: { ...defaultConfig.timeWindows, ...config?.timeWindows },
      smartDelay: { ...defaultConfig.smartDelay, ...config?.smartDelay }
    };
  }

  private scheduleReminder(task: ReminderTask): void {
    // 计算下一次触发时间
    const now = Date.now();
    const nextTrigger = task.schedule.nextTriggerAt.getTime();
    const delay = Math.max(0, nextTrigger - now);

    setTimeout(() => {
      this.triggerReminder(task);
    }, delay);
  }

  private triggerReminder(task: ReminderTask): void {
    if (task.status !== 'pending') return;

    task.status = 'triggered';
    task.schedule.attemptCount++;
    task.history.push({
      timestamp: new Date(),
      type: 'triggered',
      reason: `第 ${task.schedule.attemptCount} 次提醒`
    });

    // 生成提醒消息
    const message = this.generateReminderMessage(task);

    // 触发事件
    this.emit('reminder:triggered', task, message);

    // 检查是否需要继续跟进
    if (task.schedule.attemptCount < task.schedule.maxAttempts) {
      // 安排下一次提醒
      const nextInterval = this.config.timeWindows.followUpIntervals[
        task.schedule.attemptCount - 1
      ] || 900;
      
      task.schedule.nextTriggerAt = new Date(Date.now() + nextInterval * 1000);
      task.status = 'pending';
      task.history.push({
        timestamp: new Date(),
        type: 'scheduled',
        reason: `下次提醒将在 ${nextInterval} 秒后`
      });

      this.scheduleReminder(task);
    } else {
      // 达到最大尝试次数，标记为忽略
      task.status = 'ignored';
      task.history.push({
        timestamp: new Date(),
        type: 'cancelled',
        reason: '达到最大提醒次数，用户未响应'
      });
      
      this.emit('reminder:abandoned', task);
      this.activeReminders.delete(task.id);
    }
  }

  private shouldDelayReminder(task: ReminderTask, userResponse: string): boolean {
    if (!this.config.smartDelay.enabled) return false;

    // 检测完成模式
    const completionPatterns = this.config.smartDelay.completionPatternDelay.patterns;
    if (completionPatterns.some(pattern => userResponse.includes(pattern))) {
      return true;
    }

    return false;
  }

  private delayReminder(task: ReminderTask): void {
    const delayDuration = this.config.smartDelay.completionPatternDelay.delayDuration * 1000;
    
    task.schedule.nextTriggerAt = new Date(Date.now() + delayDuration);
    task.history.push({
      timestamp: new Date(),
      type: 'delayed',
      reason: `检测到完成模式，延迟 ${delayDuration / 1000} 秒`
    });

    this.emit('reminder:delayed', task);
    this.scheduleReminder(task);
  }

  private generateReminderMessage(task: ReminderTask): ReminderMessage {
    // 根据尝试次数选择升级策略
    const attempt = task.schedule.attemptCount;
    const strategy = this.selectEscalationStrategy(attempt);
    
    // 选择消息模板
    const templates = this.config.escalationStrategy[strategy].messageTemplate;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // 替换变量
    const topic = this.extractTopicFromContext(task.context);
    const text = template.replace(/{topic}/g, topic);

    return {
      text,
      tone: this.config.escalationStrategy[strategy].tone as 'gentle' | 'neutral' | 'prompt',
      urgency: attempt === 1 ? 'low' : attempt === 2 ? 'medium' : 'high',
      estimatedTime: '只需1分钟',
      alternativeOptions: attempt >= 2 ? ['跳过此部分', '稍后补充', '结束通话'] : undefined
    };
  }

  private selectEscalationStrategy(attempt: number): 'gentle' | 'neutral' | 'direct' {
    if (attempt === 1) return 'gentle';
    if (attempt === 2) return 'neutral';
    return 'direct';
  }

  private extractTopicFromContext(context: InterviewContext): string {
    // 基于当前阶段提取话题
    switch (context.phase) {
      case InterviewPhase.PROGRESS_REVIEW:
        return '今天的工作进展';
      case InterviewPhase.BLOCKERS:
        return '遇到的问题';
      case InterviewPhase.NEXT_STEPS:
        return '明天的计划';
      default:
        return '工作内容';
    }
  }
}

/**
 * 问题生成器
 * 
 * 基于模板系统生成访谈问题的核心类
 * 支持开场问题、追问问题、澄清问题的动态生成
 */

import {
  InterviewPhase,
  InterviewContext,
  ResponseQuality,
  Question,
} from './types';

/**
 * 模板上下文接口
 */
export interface TemplateContext {
  /** 用户名称 */
  userName?: string;
  /** 项目名称 */
  projectName?: string;
  /** 当前阶段名称 */
  phaseName?: string;
  /** 日期 */
  date?: string;
  /** 额外变量 */
  [key: string]: string | undefined;
}

/**
 * 问题生成器类
 * 
 * 负责根据当前访谈状态生成合适的问题
 * 包括开场问题、追问问题和澄清问题
 */
export class QuestionGenerator {
  /** 开场问题模板映射 */
  private openingTemplates: Map<InterviewPhase, string[]>;
  
  /** 追问问题模板 */
  private probeTemplates: string[];
  
  /** 澄清问题模板 */
  private clarificationTemplates: string[];
  
  /** 字段特定追问模板 */
  private fieldProbeTemplates: Map<string, string[]>;

  /**
   * 构造函数
   * 初始化所有问题模板
   */
  constructor() {
    this.openingTemplates = new Map();
    this.probeTemplates = [];
    this.clarificationTemplates = [];
    this.fieldProbeTemplates = new Map();
    
    this.initializeTemplates();
  }

  /**
   * 初始化所有阶段的问题模板
   * 为每个访谈阶段配置开场问题和相关模板
   */
  private initializeTemplates(): void {
    // 开场问候阶段
    this.openingTemplates.set(InterviewPhase.GREETING, [
      '你好，{{userName}}！我是你的日报助手。今天过得怎么样？',
      '嗨，{{userName}}！准备好回顾一下今天的工作了吗？',
      '你好！我是来帮你整理{{date}}工作日报的助手。开始吧？',
    ]);

    // 项目确认阶段
    this.openingTemplates.set(InterviewPhase.PROJECT_CONFIRM, [
      '今天主要在哪个项目上工作呢？',
      '先确认一下，你今天负责的是{{projectName}}吗？',
      '今天的工作主要围绕哪个项目展开？',
    ]);

    // 进度回顾阶段
    this.openingTemplates.set(InterviewPhase.PROGRESS_REVIEW, [
      '今天完成了哪些具体工作？',
      '关于{{projectName}}，今天取得了什么进展？',
      '能详细描述一下今天完成的主要任务吗？',
    ]);

    // 障碍困难阶段
    this.openingTemplates.set(InterviewPhase.BLOCKERS, [
      '今天遇到了什么困难或阻碍吗？',
      '在推进{{projectName}}时，有什么卡住的地方吗？',
      '有什么需要支持或帮助解决的问题吗？',
    ]);

    // 下步计划阶段
    this.openingTemplates.set(InterviewPhase.NEXT_STEPS, [
      '接下来的计划是什么？',
      '明天或下周有什么安排？',
      '关于{{projectName}}，下一步准备做什么？',
    ]);

    // 总结确认阶段
    this.openingTemplates.set(InterviewPhase.SUMMARY_CONFIRM, [
      '让我总结一下今天的内容，你看看是否准确完整？',
      '基于我们的对话，这是整理出的日报，请确认一下？',
      '这是今天的日报草稿，有什么需要补充或修改的吗？',
    ]);

    // 结束收尾阶段
    this.openingTemplates.set(InterviewPhase.CLOSING, [
      '感谢你的配合！日报已经生成好了。',
      '今天辛苦了！日报已保存，祝你工作顺利！',
      '访谈结束，记得查看生成的日报哦。再见！',
    ]);

    // 初始化追问模板
    this.probeTemplates = [
      '能再详细说说{{topic}}吗？',
      '关于{{topic}}，还有其他细节吗？',
      '具体是如何进行的？',
      '花了多长时间？',
      '和谁一起完成的？',
      '遇到了什么具体的挑战？',
      '最后是怎么解决的？',
      '结果如何？',
    ];

    // 初始化澄清问题模板
    this.clarificationTemplates = [
      '抱歉，我没太理解。你能换个说法描述{{topic}}吗？',
      '关于{{topic}}，你能举一个具体的例子吗？',
      '为了准确记录，能再解释一下{{topic}}吗？',
      '我理解得对吗：{{topic}}？',
    ];

    // 初始化字段特定追问模板
    this.fieldProbeTemplates.set('progress', [
      '今天具体完成了哪些功能或任务？',
      '能描述一下工作的具体产出吗？',
      '代码提交了多少？测试通过了吗？',
    ]);

    this.fieldProbeTemplates.set('blockers', [
      '这个阻碍是什么造成的？',
      '目前有解决方案吗？',
      '需要谁的支持来解决？',
    ]);

    this.fieldProbeTemplates.set('nextSteps', [
      '明天的首要任务是什么？',
      '预计什么时候能完成？',
      '有什么需要提前准备的吗？',
    ]);

    this.fieldProbeTemplates.set('timeSpent', [
      '这项任务花了多长时间？',
      '时间分配是否合理？',
      '有超时或提前完成吗？',
    ]);
  }

  /**
   * 生成开场问题
   * 根据当前阶段和上下文生成合适的开场问题
   * 
   * @param phase - 当前访谈阶段
   * @param context - 模板上下文，包含用户名、项目名等变量
   * @returns 生成的问题对象
   */
  generateOpeningQuestion(phase: InterviewPhase, context: TemplateContext): Question {
    const templates = this.openingTemplates.get(phase);
    
    if (!templates || templates.length === 0) {
      // 如果没有找到模板，返回一个通用问题
      return {
        id: `opening-${phase}-${Date.now()}`,
        phase,
        text: '请告诉我今天的工作情况。',
        type: 'opening',
        purpose: '收集工作日报信息',
        expectedData: ['progress', 'blockers', 'nextSteps'],
      };
    }

    // 随机选择一个模板
    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = this.interpolateTemplate(template, context);

    return {
      id: `opening-${phase}-${Date.now()}`,
      phase,
      text,
      type: 'opening',
      purpose: this.getPhasePurpose(phase),
      expectedData: this.getPhaseExpectedData(phase),
    };
  }

  /**
   * 生成追问问题
   * 根据上下文、缺失字段和追问深度生成追问问题
   * 
   * @param context - 模板上下文
   * @param missingFields - 缺失的字段列表
   * @param depth - 当前追问深度（0开始）
   * @returns 生成的问题对象
   */
  generateProbeQuestion(
    context: TemplateContext,
    missingFields: string[],
    depth: number = 0
  ): Question {
    // 如果有特定缺失字段，优先生成字段特定的追问
    if (missingFields.length > 0) {
      const field = missingFields[0];
      const fieldTemplates = this.fieldProbeTemplates.get(field);
      
      if (fieldTemplates && fieldTemplates.length > 0) {
        const template = fieldTemplates[depth % fieldTemplates.length];
        const text = this.interpolateTemplate(template, context);
        
    return {
      id: `probe-field-${field}-${Date.now()}`,
      phase: (context.currentPhase as InterviewPhase) || InterviewPhase.PROGRESS_REVIEW,
      text,
      type: 'followUp',
      purpose: `收集缺失的${field}信息`,
      expectedData: [field],
    };
      }
    }

    // 使用通用追问模板
    if (this.probeTemplates.length > 0) {
      const template = this.probeTemplates[depth % this.probeTemplates.length];
      const text = this.interpolateTemplate(template, context);
      
    return {
      id: `probe-${Date.now()}`,
      phase: (context.currentPhase as InterviewPhase) || InterviewPhase.PROGRESS_REVIEW,
      text,
      type: 'followUp',
      purpose: '获取更详细的信息',
      expectedData: ['details'],
    };
    }

    // 备用问题
    return {
      id: `probe-fallback-${Date.now()}`,
      phase: (context.currentPhase as InterviewPhase) || InterviewPhase.PROGRESS_REVIEW,
      text: '能再详细说说吗？',
      type: 'followUp',
      purpose: '获取更详细的信息',
      expectedData: ['details'],
    };
  }

  /**
   * 生成澄清问题
   * 当用户回复不清楚或无法理解时，生成澄清问题
   * 
   * @param context - 模板上下文
   * @param reason - 需要澄清的原因
   * @returns 生成的问题对象
   */
  generateClarificationQuestion(context: TemplateContext, reason: string): Question {
    if (this.clarificationTemplates.length > 0) {
      // 根据原因选择模板
      let templateIndex = 0;
      if (reason.includes('不理解') || reason.includes('unclear')) {
        templateIndex = 0;
      } else if (reason.includes('例子') || reason.includes('example')) {
        templateIndex = 1;
      } else if (reason.includes('准确') || reason.includes('accurate')) {
        templateIndex = 2;
      } else {
        templateIndex = Math.floor(Math.random() * this.clarificationTemplates.length);
      }
      
      const template = this.clarificationTemplates[templateIndex % this.clarificationTemplates.length];
      const text = this.interpolateTemplate(template, context);
      
      return {
        id: `clarify-${Date.now()}`,
        phase: (context.currentPhase as InterviewPhase) || InterviewPhase.PROGRESS_REVIEW,
        text,
        type: 'followUp',
        purpose: `澄清：${reason}`,
        expectedData: ['clarification'],
      };
    }

    // 备用问题
    return {
      id: `clarify-fallback-${Date.now()}`,
      phase: (context.currentPhase as InterviewPhase) || InterviewPhase.PROGRESS_REVIEW,
      text: '抱歉，我没太理解。你能再解释一下吗？',
      type: 'followUp',
      purpose: `澄清：${reason}`,
      expectedData: ['clarification'],
    };
  }

  /**
   * 模板变量替换
   * 将模板中的变量（如{{userName}}）替换为实际值
   * 
   * @param template - 包含变量的模板字符串
   * @param context - 包含变量值的上下文
   * @returns 替换后的字符串
   */
  interpolateTemplate(template: string, context: TemplateContext): string {
    let result = template;
    
    // 替换标准变量
    const variables: Record<string, string | undefined> = {
      userName: context.userName || '用户',
      projectName: context.projectName || '项目',
      phaseName: context.phaseName || '当前阶段',
      date: context.date || new Date().toLocaleDateString('zh-CN'),
    };
    
    // 合并自定义变量
    Object.assign(variables, context);
    
    // 执行替换
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    }
    
    // 清理未匹配的变量占位符
    result = result.replace(/\{\{\w+\}\}/g, '');
    
    return result;
  }

  /**
   * 获取阶段目的
   * @param phase - 访谈阶段
   * @returns 阶段目的描述
   */
  private getPhasePurpose(phase: InterviewPhase): string {
    const purposes: Record<InterviewPhase, string> = {
      [InterviewPhase.GREETING]: '建立友好氛围，介绍访谈目的',
      [InterviewPhase.PROJECT_CONFIRM]: '确认当日负责的项目和任务',
      [InterviewPhase.PROGRESS_REVIEW]: '了解已完成的工作内容',
      [InterviewPhase.BLOCKERS]: '识别阻碍和需要支持的地方',
      [InterviewPhase.NEXT_STEPS]: '明确接下来的工作安排',
      [InterviewPhase.SUMMARY_CONFIRM]: '确认日报内容准确完整',
      [InterviewPhase.CLOSING]: '礼貌结束访谈',
    };
    return purposes[phase] || '收集工作日报信息';
  }

  /**
   * 获取阶段期望收集的数据
   * @param phase - 访谈阶段
   * @returns 期望数据字段列表
   */
  private getPhaseExpectedData(phase: InterviewPhase): string[] {
    const expectedDataMap: Record<InterviewPhase, string[]> = {
      [InterviewPhase.GREETING]: ['mood', 'availability'],
      [InterviewPhase.PROJECT_CONFIRM]: ['projectName', 'tasks'],
      [InterviewPhase.PROGRESS_REVIEW]: ['progress', 'completedTasks', 'timeSpent'],
      [InterviewPhase.BLOCKERS]: ['blockers', 'challenges', 'supportNeeded'],
      [InterviewPhase.NEXT_STEPS]: ['nextSteps', 'plans', 'priorities'],
      [InterviewPhase.SUMMARY_CONFIRM]: ['confirmation', 'feedback'],
      [InterviewPhase.CLOSING]: ['satisfaction'],
    };
    return expectedDataMap[phase] || ['general'];
  }
}

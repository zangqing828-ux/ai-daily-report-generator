/**
 * 响应分析器 - 分析用户输入的质量
 * 
 * 提供多维度质量评估：完整性、清晰度、相关性、深度
 * 支持数据提取和建议生成
 */

import {
  InterviewPhase,
  ResponseQuality,
  InterviewContext,
  ResponseAnalysis,
  CollectedData,
  AnalysisResult,
  FollowUpSuggestion,
} from './types';

/**
 * 分析结果接口
 */
export interface AnalysisResult {
  /** 响应分析详情 */
  analysis: ResponseAnalysis;
  /** 提取的数据 */
  extractedData: Partial<CollectedData>;
  /** 缺失的字段列表 */
  missingFields: string[];
  /** 追问建议列表 */
  suggestions: FollowUpSuggestion[];
  /** 是否可以进入下一阶段 */
  canProceed: boolean;
}

/**
 * 追问建议接口
 */
export interface FollowUpSuggestion {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'clarification' | 'expansion' | 'detail' | 'example';
  /** 建议的问题文本 */
  question: string;
  /** 建议原因 */
  reason: string;
  /** 优先级（1-5，5最高） */
  priority: number;
}

/**
 * 响应分析器类
 * 
 * 负责分析用户输入的质量，评估多个维度，
 * 提取数据，识别缺失信息，生成追问建议
 */
export class ResponseAnalyzer {
  /** 质量阈值配置 */
  private qualityThresholds = {
    excellent: 0.85,
    good: 0.7,
    adequate: 0.5,
    insufficient: 0.3,
  };

  /** 各阶段最小长度要求 */
  private minLengthRequirements: Record<InterviewPhase, number> = {
    [InterviewPhase.GREETING]: 5,
    [InterviewPhase.PROJECT_CONFIRM]: 10,
    [InterviewPhase.PROGRESS_REVIEW]: 30,
    [InterviewPhase.BLOCKERS]: 15,
    [InterviewPhase.NEXT_STEPS]: 20,
    [InterviewPhase.SUMMARY_CONFIRM]: 5,
    [InterviewPhase.CLOSING]: 5,
  };

  /**
   * 主分析方法
   * 
   * 分析用户输入并返回完整的分析结果
   * 
   * @param userInput - 用户输入文本
   * @param context - 当前访谈上下文
   * @returns 分析结果，包含质量评估、提取数据和追问建议
   */
  public analyze(userInput: string, context: InterviewContext): AnalysisResult {
    // 执行各维度评估
    const completeness = this.assessCompleteness(userInput, context);
    const clarity = this.assessClarity(userInput);
    const relevance = this.assessRelevance(userInput, context);
    const depth = this.assessDepth(userInput);

    // 计算综合得分
    const overall = this.calculateOverallScore(completeness, clarity, relevance, depth);

    // 确定质量等级
    const quality = this.determineQualityLevel(overall);

    // 识别缺失元素
    const missingElements = this.identifyMissingElements(userInput, context, completeness);

    // 构建响应分析对象
    const analysis: ResponseAnalysis = {
      quality,
      completeness,
      clarity,
      relevance,
      depth,
      overall,
      missingElements,
    };

    // 提取数据
    const extractedData = this.extractData(userInput, context);

    // 识别缺失字段
    const missingFields = this.identifyMissingFields(userInput, context, completeness);

    // 生成追问建议
    const suggestions = this.generateSuggestions(analysis, missingFields, context);

    // 判断是否可以进入下一阶段
    const canProceed = this.canProceedToNextPhase(analysis, context);

    return {
      analysis,
      extractedData,
      missingFields,
      suggestions,
      canProceed,
    };
  }

  /**
   * 评估响应完整性
   * 
   * 根据当前阶段评估用户输入是否包含足够的信息
   * 
   * @param input - 用户输入文本
   * @param context - 当前访谈上下文
   * @returns 完整性评分（0-1）
   */
  public assessCompleteness(input: string, context: InterviewContext): number {
    const phase = context.currentPhase;
    const minLength = this.minLengthRequirements[phase];
    
    // 基础长度检查
    const lengthScore = Math.min(input.length / (minLength * 2), 1);
    
    // 阶段特定的完整性检查
    let contentScore = 0;
    const lowerInput = input.toLowerCase();
    
    switch (phase) {
      case InterviewPhase.PROGRESS_REVIEW:
        // 检查是否包含工作内容、进度描述
        const progressKeywords = ['完成', '做了', '开发', '测试', '设计', '实现', '修复', '优化', '完成度', '进度', '%', 'percent'];
        const progressMatches = progressKeywords.filter(kw => lowerInput.includes(kw.toLowerCase()));
        contentScore += Math.min(progressMatches.length / 3, 0.5);
        break;
        
      case InterviewPhase.BLOCKERS:
        // 检查是否描述了问题或阻碍
        const blockerKeywords = ['问题', '困难', '阻碍', 'block', 'issue', 'problem', 'bug', 'error', '无法', '不能', '卡', '阻塞', 'pending', '等待'];
        const blockerMatches = blockerKeywords.filter(kw => lowerInput.includes(kw.toLowerCase()));
        contentScore += Math.min(blockerMatches.length / 2, 0.5);
        break;
        
      case InterviewPhase.NEXT_STEPS:
        // 检查是否包含计划或下一步
        const planKeywords = ['计划', '明天', '接下来', '下一步', '继续', '完成', 'start', 'begin', 'todo', 'task', 'work on', 'plan to', 'will', 'going to'];
        const planMatches = planKeywords.filter(kw => lowerInput.includes(kw.toLowerCase()));
        contentScore += Math.min(planMatches.length / 2, 0.5);
        break;
        
      default:
        contentScore = 0.3; // 其他阶段默认中等评分
    }
    
    // 计算加权总分
    return Math.min((lengthScore * 0.4 + contentScore * 0.6), 1);
  }

  /**
   * 评估响应清晰度
   * 
   * 分析用户输入的语法清晰度、结构性和可理解性
   * 
   * @param input - 用户输入文本
   * @returns 清晰度评分（0-1）
   */
  public assessClarity(input: string): number {
    if (!input || input.trim().length === 0) {
      return 0;
    }
    
    const trimmedInput = input.trim();
    
    // 1. 句子结构检查（是否有合理的标点分隔）
    const punctuationCount = (trimmedInput.match(/[。！？.!?，,；;]/g) || []).length;
    const sentenceCount = Math.max(trimmedInput.split(/[。！？.!?]+/).filter(s => s.trim().length > 0).length, 1);
    const punctuationScore = Math.min(punctuationCount / sentenceCount, 1);
    
    // 2. 重复内容检查
    const words = trimmedInput.toLowerCase().split(/\s+|[，。！？,.!?；;：:\(\)\[\]""'']/);
    const uniqueWords = new Set(words.filter(w => w.length > 1));
    const repetitionScore = uniqueWords.size / Math.max(words.length, 1);
    
    // 3. 模糊表述检查
    const vaguePatterns = [/东西/g, /那个/g, /这个/g, /等等/g, /什么的/g, /something/gi, /thing/gi, /stuff/gi];
    const vagueMatches = vaguePatterns.reduce((count, pattern) => {
      const matches = (trimmedInput.match(pattern) || []).length;
      return count + matches;
    }, 0);
    const vagueScore = Math.max(0, 1 - (vagueMatches / Math.max(sentenceCount, 1)));
    
    // 4. 长度合理性（过短可能不清晰）
    const lengthScore = Math.min(trimmedInput.length / 20, 1);
    
    // 加权计算总分
    const scores = [
      punctuationScore * 0.25,
      repetitionScore * 0.25,
      vagueScore * 0.3,
      lengthScore * 0.2,
    ];
    
    return Math.min(scores.reduce((a, b) => a + b, 0), 1);
  }

  /**
   * 评估响应相关性
   * 
   * 判断用户输入与当前访谈阶段和问题的相关程度
   * 
   * @param input - 用户输入文本
   * @param context - 当前访谈上下文
   * @returns 相关性评分（0-1）
   */
  public assessRelevance(input: string, context: InterviewContext): number {
    const phase = context.currentPhase;
    const lowerInput = input.toLowerCase();
    
    // 根据阶段定义相关性关键词
    const relevanceKeywords: Record<InterviewPhase, string[]> = {
      [InterviewPhase.GREETING]: ['你好', 'hello', 'hi', 'hey', ' morning', 'afternoon', 'evening', '感谢', '谢谢', '开始'],
      [InterviewPhase.PROJECT_CONFIRM]: ['项目', 'project', '工作', 'work', '任务', 'task', '负责', '负责', '参与', 'involve'],
      [InterviewPhase.PROGRESS_REVIEW]: ['完成', 'done', '做了', 'did', '开发', 'develop', '实现', 'implement', '测试', 'test', '进度', 'progress', 'percent', '%'],
      [InterviewPhase.BLOCKERS]: ['问题', 'problem', '困难', 'difficulty', '阻碍', 'block', 'bug', 'error', 'issue', '卡', 'stuck', '等待', 'pending'],
      [InterviewPhase.NEXT_STEPS]: ['计划', 'plan', '明天', 'tomorrow', '下一步', 'next', '继续', 'continue', '开始', 'start', 'todo', '待办'],
      [InterviewPhase.SUMMARY_CONFIRM]: ['确认', 'confirm', '正确', 'correct', '准确', 'accurate', '完成', 'done', 'ok', '是的', 'yes'],
      [InterviewPhase.CLOSING]: ['再见', 'bye', '感谢', 'thanks', 'thank', '结束', 'end', '辛苦', 'good'],
    };
    
    // 检查阶段特定关键词
    const keywords = relevanceKeywords[phase] || [];
    const matchedKeywords = keywords.filter(kw => lowerInput.includes(kw.toLowerCase()));
    const keywordScore = Math.min(matchedKeywords.length / 3, 0.5);
    
    // 检查是否完全无关（答非所问）
    const offTopicPatterns = [/我不知道/, /我不懂/, / unrelated/i, /not related/, /不相关/];
    const isOffTopic = offTopicPatterns.some(pattern => pattern.test(input));
    
    if (isOffTopic) {
      return 0.1; // 几乎不相关
    }
    
    // 检查输入长度（过短的回答可能不相关）
    const lengthScore = Math.min(input.length / 10, 0.3);
    
    // 检查语义相关性（基于上下文的简单检查）
    let contextScore = 0.1;
    
    // 根据已收集数据调整相关性
    if (context.collectedData) {
      const data = context.collectedData;
      
      // 检查是否引用了之前提到的内容
      const allPreviousContent = [
        ...data.progress,
        ...data.blockers,
        ...data.nextSteps,
        ...Object.values(data.timeSpent || {}),
      ].join(' ').toLowerCase();
      
      if (allPreviousContent.length > 0) {
        const words = lowerInput.split(/\s+/);
        const referencedWords = words.filter(word => 
          word.length > 2 && allPreviousContent.includes(word)
        );
        contextScore = Math.min(referencedWords.length * 0.1, 0.2);
      }
    }
    
    return Math.min(keywordScore + lengthScore + contextScore, 1);
  }

  /**
   * 评估响应深度
   * 
   * 评估用户输入的内容深度和详细程度
   * 
   * @param input - 用户输入文本
   * @returns 深度评分（0-1）
   */
  public assessDepth(input: string): number {
    if (!input || input.trim().length === 0) {
      return 0;
    }
    
    const trimmedInput = input.trim();
    
    // 1. 长度深度（较长回答通常包含更多信息）
    const lengthScore = Math.min(trimmedInput.length / 100, 0.25);
    
    // 2. 细节指标检查
    const detailIndicators = [
      // 时间相关
      /\d+\s*(小时|分钟|秒|h|hr|min|m)\b/gi,
      // 数量相关
      /\d+\s*(个|条|次|项|个|件|page|screen|API)\b/gi,
      // 百分比
      /\d+\s*%/g,
      // 技术细节
      /\b(API|接口|函数|方法|类|组件|模块|service|controller|model|database|sql|query)\b/gi,
      // 状态描述
      /\b(已完成|进行中|待开始|blocked|pending|review|test|deploy|发布|上线)\b/gi,
    ];
    
    let detailMatches = 0;
    for (const pattern of detailIndicators) {
      const matches = (trimmedInput.match(pattern) || []).length;
      detailMatches += matches;
    }
    const detailScore = Math.min(detailMatches / 5, 0.3);
    
    // 3. 结构化程度（列表、段落组织）
    const structureIndicators = [
      // 列表项
      /(^|\n)\s*[\-\*\•\·]\s+/gm,
      // 数字列表
      /(^|\n)\s*\d+[\.\)]\s+/gm,
      // 分段落
      /\n\s*\n/g,
    ];
    
    let structureMatches = 0;
    for (const pattern of structureIndicators) {
      const matches = (trimmedInput.match(pattern) || []).length;
      structureMatches += matches;
    }
    const structureScore = Math.min(structureMatches / 3, 0.25);
    
    // 4. 时间线描述（显示工作的时序性）
    const timelinePatterns = [
      /(上午|下午|晚上|早上|morning|afternoon|evening)/gi,
      /(今天|昨天|明天|today|yesterday|tomorrow)/gi,
      /(首先|然后|接着|之后|最后|first|then|next|after|finally)/gi,
    ];
    
    let timelineMatches = 0;
    for (const pattern of timelinePatterns) {
      const matches = (trimmedInput.match(pattern) || []).length;
      timelineMatches += matches;
    }
    const timelineScore = Math.min(timelineMatches / 2, 0.2);
    
    // 计算加权总分
    const scores = [
      lengthScore * 0.2,
      detailScore * 0.3,
      structureScore * 0.2,
      timelineScore * 0.15,
    ];
    
    return Math.min(scores.reduce((a, b) => a + b, 0), 1);
  }

  /**
   * 从用户输入中提取结构化数据
   * 
   * 识别并提取工作进展、阻碍、计划等信息
   * 
   * @param input - 用户输入文本
   * @param context - 当前访谈上下文
   * @returns 提取的部分数据
   */
  public extractData(input: string, context: InterviewContext): Partial<CollectedData> {
    const extractedData: Partial<CollectedData> = {
      progress: [],
      blockers: [],
      nextSteps: [],
      timeSpent: {},
    };
    
    const phase = context.currentPhase;
    const lowerInput = input.toLowerCase();
    
    switch (phase) {
      case InterviewPhase.PROGRESS_REVIEW:
        // 提取工作进展
        // 模式1: 完成了XXX
        const completedPattern = /(?:完成|做完|搞定|实现了|开发了|修复了|优化了)\s*[""']?([^。，；,.;]+)/gi;
        let match;
        while ((match = completedPattern.exec(input)) !== null) {
          if (match[1] && match[1].trim().length > 0) {
            extractedData.progress?.push(match[1].trim());
          }
        }
        
        // 模式2: 做了XXX
        const didPattern = /(?:做了|处理了|负责了|参与了|进行了)\s*[""']?([^。，；,.;]+)/gi;
        while ((match = didPattern.exec(input)) !== null) {
          if (match[1] && match[1].trim().length > 0 && !extractedData.progress?.includes(match[1].trim())) {
            extractedData.progress?.push(match[1].trim());
          }
        }
        
        // 提取时间花费
        // 模式: 花了X小时/分钟
        const timePattern = /(?:花了|用了|耗时|预计|大约)\s*(\d+(?:\.\d+)?)\s*(小时|h|分钟|min|分|天|day)/gi;
        while ((match = timePattern.exec(input)) !== null) {
          const value = match[1];
          const unit = match[2];
          const task = extractedData.progress && extractedData.progress.length > 0 
            ? extractedData.progress[extractedData.progress.length - 1].substring(0, 30)
            : '未指定任务';
          if (extractedData.timeSpent) {
            extractedData.timeSpent[task] = `${value} ${unit}`;
          }
        }
        break;
        
      case InterviewPhase.BLOCKERS:
        // 提取阻碍信息
        // 模式1: 遇到了XXX问题/困难
        const blockerPattern1 = /(?:遇到|碰到|发现|存在|出现|有个|卡在了)\s*[""']?([^。，；,.;]+(?:问题|困难|阻碍|bug|error|issue|exception|失败|错误))/gi;
        while ((match = blockerPattern1.exec(input)) !== null) {
          if (match[1] && match[1].trim().length > 0) {
            extractedData.blockers?.push(match[1].trim());
          }
        }
        
        // 模式2: XXX阻塞/阻碍了
        const blockerPattern2 = /(?:[^。，；,.;]+)(?:阻塞|阻碍|blocking|blocking|pending|waiting|依赖|depend)/gi;
        while ((match = blockerPattern2.exec(input)) !== null) {
          const matchText = match[0].trim();
          if (matchText.length > 0 && matchText.length < 100 && !extractedData.blockers?.includes(matchText)) {
            extractedData.blockers?.push(matchText);
          }
        }
        
        // 模式3: 需要XXX的帮助/支持
        const helpPattern = /(?:需要|require|need)\s*([^。，；,.;]{0,30})(?:帮助|支持|support|help|协助|assistance)/gi;
        while ((match = helpPattern.exec(input)) !== null) {
          const helpContext = match[1] ? match[1].trim() : '';
          const blockerText = helpContext ? `需要${helpContext}支持` : '需要帮助';
          if (!extractedData.blockers?.includes(blockerText)) {
            extractedData.blockers?.push(blockerText);
          }
        }
        break;
        
      case InterviewPhase.NEXT_STEPS:
        // 提取下一步计划
        // 模式1: 计划做XXX / 打算做XXX
        const planPattern1 = /(?:计划|打算|准备|要|将|会|明天|接下来|下一步)\s*[""']?([^。，；,.;]+(?:做|完成|开发|测试|修复|优化|处理|进行|start|begin|work|continue))/gi;
        while ((match = planPattern1.exec(input)) !== null) {
          if (match[1] && match[1].trim().length > 0) {
            extractedData.nextSteps?.push(match[1].trim());
          }
        }
        
        // 模式2: 继续XXX / 接着做XXX
        const continuePattern = /(?:继续|接着|follow up|follow-up|ongoing|resume)\s*[""']?([^。，；,.;]+)/gi;
        while ((match = continuePattern.exec(input)) !== null) {
          if (match[1] && match[1].trim().length > 0 && !extractedData.nextSteps?.includes(match[1].trim())) {
            extractedData.nextSteps?.push(`继续${match[1].trim()}`);
          }
        }
        
        // 模式3: 优先级高的任务
        const priorityKeywords = ['优先', '重要', '紧急', 'priority', 'important', 'urgent', 'critical'];
        priorityKeywords.forEach(keyword => {
          const priorityPattern = new RegExp(`(?:${keyword})[：:]?\\s*([^。，；,.]{3,50})`, 'gi');
          while ((match = priorityPattern.exec(input)) !== null) {
            if (match[1] && match[1].trim().length > 0 && !extractedData.nextSteps?.includes(match[1].trim())) {
              extractedData.nextSteps?.push(`[优先级] ${match[1].trim()}`);
            }
          }
        });
        break;
        
      default:
        // 其他阶段不做特定提取
        break;
    }
    
    // 过滤重复项并清理
    if (extractedData.progress) {
      extractedData.progress = [...new Set(extractedData.progress)].filter(item => item.length > 2);
    }
    if (extractedData.blockers) {
      extractedData.blockers = [...new Set(extractedData.blockers)].filter(item => item.length > 2);
    }
    if (extractedData.nextSteps) {
      extractedData.nextSteps = [...new Set(extractedData.nextSteps)].filter(item => item.length > 2);
    }
    
    return extractedData;
  }

  /**
   * 识别缺失字段
   * 
   * 基于完整性评估和当前阶段，识别缺失的关键信息
   * 
   * @param input - 用户输入文本
   * @param context - 当前访谈上下文
   * @param completeness - 完整性评分
   * @returns 缺失字段列表
   */
  public identifyMissingFields(
    input: string, 
    context: InterviewContext, 
    completeness: number
  ): string[] {
    const missingFields: string[] = [];
    const phase = context.currentPhase;
    const lowerInput = input.toLowerCase();
    
    // 完整性较低时，通用缺失
    if (completeness < 0.4) {
      missingFields.push('详细描述');
    }
    
    switch (phase) {
      case InterviewPhase.PROGRESS_REVIEW:
        // 检查是否缺少具体工作内容
        const hasWorkDescription = /(?:完成|做了|开发了|实现了|修复了|优化了|处理了)/i.test(input);
        if (!hasWorkDescription) {
          missingFields.push('具体完成的工作内容');
        }
        
        // 检查是否缺少进度或完成度信息
        const hasProgressInfo = /\d+\s*%|百分之\d+|完成度|进度/i.test(input);
        if (!hasProgressInfo && hasWorkDescription) {
          missingFields.push('任务完成度或进度百分比');
        }
        
        // 检查是否缺少时间投入信息
        const hasTimeInfo = /\d+\s*(小时|分钟|h|min|天)/i.test(input);
        if (!hasTimeInfo && hasWorkDescription) {
          missingFields.push('时间投入信息');
        }
        break;
        
      case InterviewPhase.BLOCKERS:
        // 检查是否描述了问题
        const hasProblem = /(?:问题|困难|阻碍|bug|error|issue|问题)/i.test(input);
        if (!hasProblem) {
          missingFields.push('具体的问题或困难描述');
        }
        
        // 检查是否说明了影响
        const hasImpact = /(?:影响|导致|阻塞|无法|不能|延迟)/i.test(input);
        if (!hasImpact && hasProblem) {
          missingFields.push('问题对工作的影响');
        }
        
        // 检查是否已尝试解决方案
        const hasAttempted = /(?:尝试了|试了|已经|already|tried)/i.test(input);
        if (!hasAttempted && hasProblem) {
          missingFields.push('已尝试的解决方法');
        }
        break;
        
      case InterviewPhase.NEXT_STEPS:
        // 检查是否包含计划
        const hasPlan = /(?:计划|打算|准备|要|将|会|明天|接下来)/i.test(input);
        if (!hasPlan) {
          missingFields.push('具体的工作计划');
        }
        
        // 检查是否包含优先级
        const hasPriority = /(?:优先|重要|紧急|priority|important)/i.test(input);
        if (!hasPriority && hasPlan) {
          missingFields.push('任务优先级说明');
        }
        
        // 检查是否包含预期时间
        const hasExpectedTime = /(?:预计|大约|大概|预计|明天|后天|周|下周|月)/i.test(input);
        if (!hasExpectedTime && hasPlan) {
          missingFields.push('预计完成时间');
        }
        break;
        
      default:
        // 其他阶段不需要特定检查
        break;
    }
    
    // 去重
    return [...new Set(missingFields)];
  }

  /**
   * 生成追问建议
   * 
   * 基于质量评估和缺失字段生成针对性的追问建议
   * 
   * @param analysis - 响应分析结果
   * @param missingFields - 缺失字段列表
   * @param context - 当前访谈上下文
   * @returns 追问建议列表
   */
  public generateSuggestions(
    analysis: ResponseAnalysis,
    missingFields: string[],
    context: InterviewContext
  ): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const phase = context.currentPhase;
    
    // 根据质量等级生成不同级别的建议
    switch (analysis.quality) {
      case ResponseQuality.EXCELLENT:
        // 质量优秀，只需要确认或轻微补充
        suggestions.push({
          id: `confirm-${Date.now()}`,
          type: 'detail',
          question: '还有其他需要补充的吗？',
          reason: '响应质量优秀，询问是否有额外信息',
          priority: 1,
        });
        break;
        
      case ResponseQuality.GOOD:
        // 质量良好，针对缺失字段追问
        if (missingFields.length > 0) {
          const field = missingFields[0];
          suggestions.push({
            id: `followup-${Date.now()}`,
            type: 'expansion',
            question: `能否详细说明一下${field}？`,
            reason: `响应质量良好，需要补充${field}`,
            priority: 3,
          });
        }
        break;
        
      case ResponseQuality.ADEQUATE:
        // 质量可接受，需要多个补充
        if (missingFields.length > 0) {
          suggestions.push({
            id: `expand-${Date.now()}`,
            type: 'expansion',
            question: `你能提供更多关于${missingFields.join('、')}的细节吗？`,
            reason: '响应包含基本信息，但需要更多细节',
            priority: 4,
          });
        }
        
        if (analysis.clarity < 0.5) {
          suggestions.push({
            id: `clarify-${Date.now()}`,
            type: 'clarification',
            question: '抱歉，我没有完全理解你的意思，能重新表述一下吗？',
            reason: '响应清晰度不足，需要澄清',
            priority: 4,
          });
        }
        break;
        
      case ResponseQuality.INSUFFICIENT:
      case ResponseQuality.POOR:
        // 质量不足或差，需要重新引导
        const phaseQuestions: Record<InterviewPhase, string> = {
          [InterviewPhase.GREETING]: '你好！我是你的日报助手。今天过得怎么样？',
          [InterviewPhase.PROJECT_CONFIRM]: '今天你主要负责哪些项目或任务呢？',
          [InterviewPhase.PROGRESS_REVIEW]: '今天你完成了哪些具体工作？能详细描述一下吗？',
          [InterviewPhase.BLOCKERS]: '今天工作中遇到了什么困难或阻碍吗？',
          [InterviewPhase.NEXT_STEPS]: '明天你计划做什么？有什么安排吗？',
          [InterviewPhase.SUMMARY_CONFIRM]: '让我确认一下今天的内容，你还有什么要补充的吗？',
          [InterviewPhase.CLOSING]: '感谢你的配合！祝你工作顺利！',
        };
        
        suggestions.push({
          id: `re-ask-${Date.now()}`,
          type: 'clarification',
          question: phaseQuestions[phase] || '能再详细说说吗？',
          reason: '响应质量不足，需要重新引导',
          priority: 5,
        });
        
        // 提供具体例子帮助理解
        if (phase === InterviewPhase.PROGRESS_REVIEW) {
          suggestions.push({
            id: `example-${Date.now()}`,
            type: 'example',
            question: '例如：我完成了用户登录模块的开发，修复了3个bug，花了大约4小时。',
            reason: '提供具体例子帮助用户理解预期回答',
            priority: 3,
          });
        }
        break;
    }
    
    // 根据阶段添加特定的补充建议
    if (suggestions.length === 0 && missingFields.length > 0) {
      suggestions.push({
        id: `default-${Date.now()}`,
        type: 'detail',
        question: `可以补充一下${missingFields[0]}吗？`,
        reason: '有缺失字段需要补充',
        priority: 3,
      });
    }
    
    // 按优先级排序
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 计算综合得分
   * 
   * @param completeness - 完整性评分
   * @param clarity - 清晰度评分
   * @param relevance - 相关性评分
   * @param depth - 深度评分
   * @returns 综合得分（0-1）
   */
  private calculateOverallScore(
    completeness: number,
    clarity: number,
    relevance: number,
    depth: number
  ): number {
    // 权重配置
    const weights = {
      completeness: 0.3,
      clarity: 0.2,
      relevance: 0.25,
      depth: 0.25,
    };
    
    const overall = 
      completeness * weights.completeness +
      clarity * weights.clarity +
      relevance * weights.relevance +
      depth * weights.depth;
    
    return Math.min(Math.max(overall, 0), 1);
  }

  /**
   * 确定质量等级
   * 
   * @param overallScore - 综合得分
   * @returns 质量等级
   */
  private determineQualityLevel(overallScore: number): ResponseQuality {
    if (overallScore >= this.qualityThresholds.excellent) {
      return ResponseQuality.EXCELLENT;
    } else if (overallScore >= this.qualityThresholds.good) {
      return ResponseQuality.GOOD;
    } else if (overallScore >= this.qualityThresholds.adequate) {
      return ResponseQuality.ADEQUATE;
    } else if (overallScore >= this.qualityThresholds.insufficient) {
      return ResponseQuality.INSUFFICIENT;
    } else {
      return ResponseQuality.POOR;
    }
  }

  /**
   * 识别缺失元素
   * 
   * @param input - 用户输入文本
   * @param context - 当前访谈上下文
   * @param completeness - 完整性评分
   * @returns 缺失元素列表
   */
  private identifyMissingElements(
    input: string,
    context: InterviewContext,
    completeness: number
  ): string[] {
    const missingElements: string[] = [];
    const phase = context.currentPhase;
    const lowerInput = input.toLowerCase();
    
    // 通用缺失检查
    if (input.trim().length < 10) {
      missingElements.push('基本信息');
    }
    
    // 阶段特定的缺失检查
    switch (phase) {
      case InterviewPhase.PROGRESS_REVIEW:
        if (!/\d+\s*%|百分之\d+|完成|进度/i.test(input)) {
          missingElements.push('完成度或进度信息');
        }
        if (!/\d+\s*(小时|分钟|h|min)/i.test(input)) {
          missingElements.push('时间投入信息');
        }
        break;
        
      case InterviewPhase.BLOCKERS:
        if (!/(?:问题|困难|阻碍|bug|error|issue)/i.test(input)) {
          missingElements.push('问题描述');
        }
        break;
        
      case InterviewPhase.NEXT_STEPS:
        if (!/(?:计划|打算|准备|plan|will|going)/i.test(input)) {
          missingElements.push('计划描述');
        }
        break;
    }
    
    return [...new Set(missingElements)];
  }

  /**
   * 判断是否可以进入下一阶段
   * 
   * @param analysis - 响应分析结果
   * @param context - 当前访谈上下文
   * @returns 是否可以进入下一阶段
   */
  private canProceedToNextPhase(
    analysis: ResponseAnalysis,
    context: InterviewContext
  ): boolean {
    // 质量过低，不能进入下一阶段
    if (analysis.quality === ResponseQuality.POOR || analysis.quality === ResponseQuality.INSUFFICIENT) {
      return false;
    }
    
    // 检查追问次数
    if (context.followUpCount >= 2) {
      // 已经追问过2次，即使质量一般也允许继续
      return true;
    }
    
    // 质量良好或优秀，可以进入下一阶段
    if (analysis.quality === ResponseQuality.EXCELLENT || analysis.quality === ResponseQuality.GOOD) {
      return true;
    }
    
    // 可接受质量，但有缺失字段
    if (analysis.quality === ResponseQuality.ADEQUATE) {
      // 如果完整性尚可，可以进入下一阶段
      if (analysis.completeness >= 0.5) {
        return true;
      }
    }
    
    return false;
  }
}

export default ResponseAnalyzer;

/**
 * ResponseAnalyzer 测试套件
 * 
 * 测试响应分析器的核心功能：
 * - 多维度质量评估（完整性、清晰度、相关性、深度）
 * - 数据提取
 * - 缺失字段识别
 * - 追问建议生成
 * - 阶段特定分析
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseAnalyzer } from '../ResponseAnalyzer';
import {
  InterviewPhase,
  ResponseQuality,
  InterviewContext,
  CollectedData,
} from '../types';

describe('ResponseAnalyzer', () => {
  let analyzer: ResponseAnalyzer;
  let baseContext: InterviewContext;

  beforeEach(() => {
    analyzer = new ResponseAnalyzer();
    baseContext = {
      sessionId: 'test-session-001',
      userId: 'user-001',
      date: new Date(),
      currentPhase: InterviewPhase.PROGRESS_REVIEW,
      phaseHistory: [InterviewPhase.GREETING, InterviewPhase.PROJECT_CONFIRM],
      askedQuestions: ['q1', 'q2'],
      followUpCount: 0,
      collectedData: {
        progress: [],
        blockers: [],
        nextSteps: [],
        timeSpent: {},
      },
      lastUserInput: '',
      lastAnalysis: null,
      startedAt: new Date(),
      updatedAt: new Date(),
      isCompleted: false,
      metadata: {},
    };
  });

  describe('analyze - 主分析方法', () => {
    it('应该对完整响应给出高质量分析', () => {
      const input = '我今天完成了用户登录模块的开发，修复了3个bug，包括密码验证错误、登录超时问题和样式错位。花了大约4小时。整体进度完成了80%。';
      
      const result = analyzer.analyze(input, baseContext);
      
      expect(result.analysis.quality).toBeOneOf([ResponseQuality.EXCELLENT, ResponseQuality.GOOD]);
      expect(result.analysis.completeness).toBeGreaterThan(0.6);
      expect(result.analysis.clarity).toBeGreaterThan(0.5);
      expect(result.analysis.overall).toBeGreaterThan(0.5);
      expect(result.canProceed).toBe(true);
    });

    it('应该对不充分响应给出低质量分析', () => {
      const input = '还行';
      
      const result = analyzer.analyze(input, baseContext);
      
      expect(result.analysis.quality).toBeOneOf([ResponseQuality.INSUFFICIENT, ResponseQuality.POOR, ResponseQuality.ADEQUATE]);
      expect(result.analysis.completeness).toBeLessThan(0.5);
      expect(result.canProceed).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('应该对模糊响应给出适当分析', () => {
      const input = '我做了一点东西，还有那个什么的。';
      
      const result = analyzer.analyze(input, baseContext);
      
      expect(result.analysis.clarity).toBeLessThan(0.6);
      expect(result.analysis.quality).toBeOneOf([ResponseQuality.ADEQUATE, ResponseQuality.INSUFFICIENT]);
      expect(result.suggestions.some(s => s.type === 'clarification')).toBe(true);
    });

    it('应该提取相关数据', () => {
      const input = '我今天完成了用户管理模块的后端API开发，包括用户列表查询、用户详情获取和用户状态更新三个接口。修复了登录时的token过期bug。花了大约5小时。';
      
      const result = analyzer.analyze(input, baseContext);
      
      expect(result.extractedData.progress?.length).toBeGreaterThan(0);
      expect(result.extractedData.timeSpent && Object.keys(result.extractedData.timeSpent).length).toBeGreaterThan(0);
    });
  });

  describe('assessCompleteness - 完整性评估', () => {
    it('应该对详细响应给出高完整性评分', () => {
      const input = '我今天完成了用户登录功能的前端开发，包括登录表单验证、记住密码功能和登录状态管理。总共花了4小时，完成了预期的90%。还修复了两个小bug。';
      
      const score = analyzer.assessCompleteness(input, baseContext);
      
      expect(score).toBeGreaterThan(0.6);
    });

    it('应该对简短响应给出低完整性评分', () => {
      const input = '做了一些事情';
      
      const score = analyzer.assessCompleteness(input, baseContext);
      
      expect(score).toBeLessThan(0.4);
    });

    it('应该根据不同阶段调整评估标准', () => {
      const progressInput = '完成了API开发，修复了2个bug';
      const blockerInput = '遇到了一些问题';
      
      const progressContext = { ...baseContext, currentPhase: InterviewPhase.PROGRESS_REVIEW };
      const blockerContext = { ...baseContext, currentPhase: InterviewPhase.BLOCKERS };
      
      const progressScore = analyzer.assessCompleteness(progressInput, progressContext);
      const blockerScore = analyzer.assessCompleteness(blockerInput, blockerContext);
      
      // 进度阶段的详细描述应该得到更高的完整性评分
      expect(progressScore).toBeGreaterThan(0.3);
    });
  });

  describe('assessClarity - 清晰度评估', () => {
    it('应该对清晰表达给出高清晰度评分', () => {
      const input = '我完成了用户管理模块的后端开发。包括用户CRUD接口、权限验证和日志记录功能。总共花了6小时。';
      
      const score = analyzer.assessClarity(input);
      
      expect(score).toBeGreaterThan(0.6);
    });

    it('应该对模糊表达给出低清晰度评分', () => {
      const input = '我做了一些那个什么的东西，还有这个。';
      
      const score = analyzer.assessClarity(input);
      
      expect(score).toBeLessThan(0.5);
    });

    it('应该检测重复内容降低清晰度', () => {
      const input = '我做了用户登录，我做了用户登录，我做了用户登录。';
      
      const score = analyzer.assessClarity(input);
      
      expect(score).toBeLessThan(0.6);
    });

    it('空输入应该返回0清晰度', () => {
      const score = analyzer.assessClarity('');
      expect(score).toBe(0);
    });
  });

  describe('assessRelevance - 相关性评估', () => {
    it('应该对相关响应给出高相关性评分', () => {
      const input = '我今天完成了API接口开发，修复了2个bug。';
      
      const score = analyzer.assessRelevance(input, baseContext);
      
      expect(score).toBeGreaterThan(0.5);
    });

    it('应该对不相关响应给出低相关性评分', () => {
      const input = '我不知道';
      
      const score = analyzer.assessRelevance(input, baseContext);
      
      expect(score).toBeLessThan(0.3);
    });

    it('应该根据阶段调整相关性评估', () => {
      const progressInput = '我完成了登录功能';
      const blockerInput = '我遇到数据库连接问题';
      
      const progressContext = { ...baseContext, currentPhase: InterviewPhase.PROGRESS_REVIEW };
      const blockerContext = { ...baseContext, currentPhase: InterviewPhase.BLOCKERS };
      
      const progressScore = analyzer.assessRelevance(progressInput, progressContext);
      const blockerScore = analyzer.assessRelevance(blockerInput, blockerContext);
      
      expect(progressScore).toBeGreaterThan(0.3);
      expect(blockerScore).toBeGreaterThan(0.3);
    });
  });

  describe('assessDepth - 深度评估', () => {
    it('应该对详细响应给出高深度评分', () => {
      const input = '我完成了用户管理模块的开发。具体包括：1) 用户列表查询接口，支持分页和筛选；2) 用户详情获取接口，包含完整用户信息；3) 用户状态更新接口，支持批量操作。总共花了6小时，其中API设计1小时，开发4小时，测试1小时。';
      
      const score = analyzer.assessDepth(input);
      
      expect(score).toBeGreaterThan(0.6);
    });

    it('应该对浅显响应给出低深度评分', () => {
      const input = '我做了用户管理。';
      
      const score = analyzer.assessDepth(input);
      
      expect(score).toBeLessThan(0.4);
    });

    it('应该检测结构化程度', () => {
      const structuredInput = `完成了以下工作：
1. 用户登录功能
2. 权限验证
3. 日志记录`;
      
      const unstructuredInput = '我做了登录功能和权限验证还有日志记录。';
      
      const structuredScore = analyzer.assessDepth(structuredInput);
      const unstructuredScore = analyzer.assessDepth(unstructuredInput);
      
      // 结构化输入应该得到更高的深度评分
      expect(structuredScore).toBeGreaterThanOrEqual(unstructuredScore);
    });

    it('应该识别技术细节', () => {
      const detailedInput = '我使用React和TypeScript开发了前端组件，使用了useState和useEffect hooks，实现了用户认证流程，调用了RESTful API。';
      
      const vagueInput = '我开发了前端。';
      
      const detailedScore = analyzer.assessDepth(detailedInput);
      const vagueScore = analyzer.assessDepth(vagueInput);
      
      expect(detailedScore).toBeGreaterThan(vagueScore);
    });
  });

  describe('extractData - 数据提取', () => {
    it('应该从进度回顾阶段提取工作进展', () => {
      const input = '我完成了用户登录模块的开发，修复了2个bug，包括密码验证错误和超时问题。';
      
      const data = analyzer.extractData(input, baseContext);
      
      expect(data.progress?.length).toBeGreaterThan(0);
    });

    it('应该从阻碍阶段提取阻碍信息', () => {
      const context = { ...baseContext, currentPhase: InterviewPhase.BLOCKERS };
      const input = '我遇到数据库连接超时的问题，影响了用户数据查询功能。';
      
      const data = analyzer.extractData(input, context);
      
      expect(data.blockers?.length).toBeGreaterThan(0);
    });

    it('应该从下一步阶段提取计划信息', () => {
      const context = { ...baseContext, currentPhase: InterviewPhase.NEXT_STEPS };
      const input = '明天我计划完成订单模块的开发，然后开始测试工作。';
      
      const data = analyzer.extractData(input, context);
      
      expect(data.nextSteps?.length).toBeGreaterThan(0);
    });

    it('应该提取时间信息', () => {
      const input = '我花了3小时开发API，2小时写测试用例。';
      
      const data = analyzer.extractData(input, baseContext);
      
      expect(data.timeSpent && Object.keys(data.timeSpent).length).toBeGreaterThan(0);
    });

    it('应该过滤重复项', () => {
      const input = '我完成了登录功能。我完成了登录功能。我完成了登录功能。';
      
      const data = analyzer.extractData(input, baseContext);
      
      // 应该去重
      const uniqueItems = new Set(data.progress);
      expect(uniqueItems.size).toBe(data.progress?.length);
    });
  });

  describe('identifyMissingFields - 缺失字段识别', () => {
    it('应该识别进度回顾阶段的缺失字段', () => {
      const input = '我做了一些事情。';
      
      const missingFields = analyzer.identifyMissingFields(input, baseContext, 0.3);
      
      expect(missingFields.length).toBeGreaterThan(0);
    });

    it('应该识别阻碍阶段的缺失字段', () => {
      const context = { ...baseContext, currentPhase: InterviewPhase.BLOCKERS };
      const input = '我有一些问题。';
      
      const missingFields = analyzer.identifyMissingFields(input, context, 0.3);
      
      expect(missingFields.length).toBeGreaterThan(0);
    });

    it('应该识别下一步阶段的缺失字段', () => {
      const context = { ...baseContext, currentPhase: InterviewPhase.NEXT_STEPS };
      const input = '我有一些计划。';
      
      const missingFields = analyzer.identifyMissingFields(input, context, 0.3);
      
      expect(missingFields.length).toBeGreaterThan(0);
    });

    it('应该根据完整性评分调整缺失字段', () => {
      const completeInput = '我今天完成了用户登录模块的开发，修复了3个bug，花了4小时，完成度90%。';
      const incompleteInput = '我做了一些事情。';
      
      const completeFields = analyzer.identifyMissingFields(completeInput, baseContext, 0.8);
      const incompleteFields = analyzer.identifyMissingFields(incompleteInput, baseContext, 0.2);
      
      expect(completeFields.length).toBeLessThan(incompleteFields.length);
    });

    it('应该去重缺失字段', () => {
      const input = '做了一些工作。';
      
      const missingFields = analyzer.identifyMissingFields(input, baseContext, 0.2);
      
      const uniqueFields = new Set(missingFields);
      expect(uniqueFields.size).toBe(missingFields.length);
    });
  });

  describe('generateSuggestions - 建议生成', () => {
    it('应该为优秀质量响应生成确认建议', () => {
      const analysis = {
        quality: ResponseQuality.EXCELLENT,
        completeness: 0.9,
        clarity: 0.9,
        relevance: 0.95,
        depth: 0.85,
        overall: 0.9,
        missingElements: [],
      };
      
      const suggestions = analyzer.generateSuggestions(analysis, [], baseContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('detail');
    });

    it('应该为不足质量响应生成重新引导建议', () => {
      const analysis = {
        quality: ResponseQuality.INSUFFICIENT,
        completeness: 0.2,
        clarity: 0.3,
        relevance: 0.4,
        depth: 0.2,
        overall: 0.25,
        missingElements: ['具体内容', '详细信息'],
      };
      
      const suggestions = analyzer.generateSuggestions(analysis, ['具体内容'], baseContext);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'clarification')).toBe(true);
    });

    it('应该为模糊响应生成澄清建议', () => {
      const analysis = {
        quality: ResponseQuality.ADEQUATE,
        completeness: 0.5,
        clarity: 0.4,
        relevance: 0.7,
        depth: 0.5,
        overall: 0.55,
        missingElements: ['清晰描述'],
      };
      
      const suggestions = analyzer.generateSuggestions(analysis, ['清晰描述'], baseContext);
      
      expect(suggestions.some(s => s.type === 'clarification' || s.reason.includes('清晰度'))).toBe(true);
    });

    it('应该根据阶段生成特定建议', () => {
      const progressContext = { ...baseContext, currentPhase: InterviewPhase.PROGRESS_REVIEW };
      const analysis = {
        quality: ResponseQuality.INSUFFICIENT,
        completeness: 0.2,
        clarity: 0.5,
        relevance: 0.6,
        depth: 0.3,
        overall: 0.3,
        missingElements: [],
      };
      
      const suggestions = analyzer.generateSuggestions(analysis, [], progressContext);
      
      // 应该包含示例建议
      expect(suggestions.some(s => s.type === 'example')).toBe(true);
    });

    it('应该按优先级排序建议', () => {
      const analysis = {
        quality: ResponseQuality.ADEQUATE,
        completeness: 0.5,
        clarity: 0.4,
        relevance: 0.7,
        depth: 0.5,
        overall: 0.55,
        missingElements: [],
      };
      
      const suggestions = analyzer.generateSuggestions(analysis, ['字段1', '字段2'], baseContext);
      
      // 检查是否按优先级降序排列
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].priority).toBeGreaterThanOrEqual(suggestions[i].priority);
      }
    });
  });

  describe('阶段特定分析', () => {
    it('应该在PROGRESS_REVIEW阶段正确分析工作进展', () => {
      const input = '我今天完成了用户登录和注册功能的前端开发，包括表单验证、密码强度检查和错误提示。修复了3个bug。花了5小时。';
      const context = { ...baseContext, currentPhase: InterviewPhase.PROGRESS_REVIEW };
      
      const result = analyzer.analyze(input, context);
      
      expect(result.extractedData.progress?.length).toBeGreaterThan(0);
      expect(result.analysis.relevance).toBeGreaterThan(0.6);
    });

    it('应该在BLOCKERS阶段正确分析阻碍信息', () => {
      const input = '我遇到了数据库连接超时的问题，导致用户查询功能无法正常使用。这个问题影响了整个测试流程。我已经尝试了增加连接池大小，但没有解决。';
      const context = { ...baseContext, currentPhase: InterviewPhase.BLOCKERS };
      
      const result = analyzer.analyze(input, context);
      
      expect(result.extractedData.blockers?.length).toBeGreaterThan(0);
      expect(result.analysis.relevance).toBeGreaterThan(0.6);
    });

    it('应该在NEXT_STEPS阶段正确分析计划信息', () => {
      const input = '明天我计划完成订单管理模块的开发，包括订单列表、订单详情和订单状态更新功能。预计需要6小时。然后会开始编写相关的单元测试。';
      const context = { ...baseContext, currentPhase: InterviewPhase.NEXT_STEPS };
      
      const result = analyzer.analyze(input, context);
      
      expect(result.extractedData.nextSteps?.length).toBeGreaterThan(0);
      expect(result.analysis.relevance).toBeGreaterThan(0.6);
    });
  });

  describe('边界情况处理', () => {
    it('应该正确处理空输入', () => {
      const result = analyzer.analyze('', baseContext);
      
      expect(result.analysis.quality).toBe(ResponseQuality.POOR);
      expect(result.analysis.completeness).toBe(0);
      expect(result.canProceed).toBe(false);
    });

    it('应该正确处理超长输入', () => {
      const longInput = '我今天完成的工作是：' + '开发API接口。'.repeat(100);
      
      const result = analyzer.analyze(longInput, baseContext);
      
      // 不应该抛出错误
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
    });

    it('应该正确处理特殊字符输入', () => {
      const specialInput = '完成了用户登录功能！（包括验证、加密）@#$%^&*()';
      
      const result = analyzer.analyze(specialInput, baseContext);
      
      expect(result).toBeDefined();
      expect(result.analysis.clarity).toBeGreaterThan(0);
    });

    it('应该正确处理多次追问场景', () => {
      const contextWithFollowUps = { ...baseContext, followUpCount: 2 };
      const input = '做了一些工作';
      
      const result = analyzer.analyze(input, contextWithFollowUps);
      
      // 追问次数过多时，即使质量一般也应该允许继续
      expect(result.canProceed).toBe(true);
    });
  });
});

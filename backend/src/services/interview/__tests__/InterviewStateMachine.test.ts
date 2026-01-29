/**
 * InterviewStateMachine 单元测试
 * 
 * 测试覆盖：
 * - 初始化状态
 * - start() 方法和事件
 * - 阶段转换
 * - 数据收集
 * - end() 方法
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InterviewStateMachine } from '../InterviewStateMachine';
import { InterviewPhase, ResponseQuality } from '../types';

describe('InterviewStateMachine', () => {
  let stateMachine: InterviewStateMachine;
  const testUserId = 'user_123';
  const testProjectId = 'project_456';
  const testSessionId = 'session_test_789';

  beforeEach(() => {
    stateMachine = new InterviewStateMachine(
      testUserId,
      testProjectId,
      testSessionId
    );
  });

  afterEach(() => {
    if (stateMachine.isActive()) {
      stateMachine.end();
    }
  });

  describe('初始化状态', () => {
    it('应该正确初始化所有属性', () => {
      const context = stateMachine.getContext();

      expect(context.sessionId).toBe(testSessionId);
      expect(context.userId).toBe(testUserId);
      expect(context.currentPhase).toBe(InterviewPhase.GREETING);
      expect(context.phaseHistory).toEqual([]);
      expect(context.askedQuestions).toEqual([]);
      expect(context.followUpCount).toBe(0);
      expect(context.isCompleted).toBe(false);
      expect(context.lastUserInput).toBe('');
      expect(context.lastAnalysis).toBeNull();
    });

    it('isActive() 应该返回 false', () => {
      expect(stateMachine.isActive()).toBe(false);
    });

    it('应该生成唯一的 sessionId', () => {
      const sm1 = new InterviewStateMachine('user1', 'proj1');
      const sm2 = new InterviewStateMachine('user2', 'proj2');

      expect(sm1.getContext().sessionId).not.toBe(sm2.getContext().sessionId);
    });
  });

  describe('start() 方法', () => {
    it('应该设置 isActive 为 true', () => {
      stateMachine.start();
      expect(stateMachine.isActive()).toBe(true);
    });

    it('应该触发 started 事件', () => {
      const startedHandler = vi.fn();
      stateMachine.on('started', startedHandler);

      stateMachine.start();

      expect(startedHandler).toHaveBeenCalledTimes(1);
      expect(startedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: testSessionId,
          userId: testUserId,
          startedAt: expect.any(Date),
        })
      );
    });

    it('应该触发 question 事件', () => {
      const questionHandler = vi.fn();
      stateMachine.on('question', questionHandler);

      stateMachine.start();

      expect(questionHandler).toHaveBeenCalledTimes(1);
      expect(questionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: InterviewPhase.GREETING,
          type: 'opening',
          text: expect.any(String),
        })
      );
    });

    it('多次调用 start() 应该抛出错误', () => {
      stateMachine.start();
      expect(() => stateMachine.start()).toThrow('Interview is already active');
    });
  });

  describe('processUserInput() 方法', () => {
    beforeEach(() => {
      stateMachine.start();
    });

    it('未 start 时应该抛出错误', () => {
      const newSM = new InterviewStateMachine('user', 'proj');
      expect(() => newSM.processUserInput('test')).toThrow('Interview is not active');
    });

    it('应该更新 lastUserInput', () => {
      stateMachine.processUserInput('今天完成了登录功能');
      const context = stateMachine.getContext();
      expect(context.lastUserInput).toBe('今天完成了登录功能');
    });

    it('应该返回 NextAction', () => {
      const action = stateMachine.processUserInput('好的，开始吧');

      expect(action).toMatchObject({
        type: expect.any(String),
        reason: expect.any(String),
      });
    });

    it('应该触发 action 事件', () => {
      const actionHandler = vi.fn();
      stateMachine.on('action', actionHandler);

      stateMachine.processUserInput('今天完成了API开发');

      expect(actionHandler).toHaveBeenCalled();
    });

    it('应该触发 phaseChanged 事件', () => {
      const phaseHandler = vi.fn();
      stateMachine.on('phaseChanged', phaseHandler);

      stateMachine.processUserInput('好的，开始吧');

      expect(phaseHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          oldPhase: InterviewPhase.GREETING,
          newPhase: expect.any(String),
        })
      );
    });

    it('信息不足时应该返回 followUp', () => {
      // 先进入 PROJECT_CONFIRM 阶段（GREETING 阶段允许短回复）
      stateMachine.processUserInput('好的');
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.PROJECT_CONFIRM);
      
      // 在 PROJECT_CONFIRM 阶段发送短回复
      const action = stateMachine.processUserInput('还行');
      expect(action.type).toBe('followUp');
    });

    it('详细回答时应该阶段推进', () => {
      stateMachine.processUserInput('好的，开始吧'); // 从 GREETING 到 PROJECT_CONFIRM
      const context1 = stateMachine.getContext();
      expect(context1.currentPhase).toBe(InterviewPhase.PROJECT_CONFIRM);

      const action = stateMachine.processUserInput('今天主要做API开发');
      expect(action.type).toBe('transition');
    });
  });

  describe('阶段转换', () => {
    beforeEach(() => {
      stateMachine.start();
    });

    it('应该记录阶段历史', () => {
      stateMachine.processUserInput('好的'); // GREETING -> PROJECT_CONFIRM
      stateMachine.processUserInput('API开发'); // PROJECT_CONFIRM -> PROGRESS_REVIEW

      const history = stateMachine.getPhaseHistory();
      expect(history).toContain(InterviewPhase.GREETING);
    });

    it('不应该重复记录相同阶段', () => {
      stateMachine.processUserInput('好的');
      stateMachine.processUserInput('API开发');
      stateMachine.processUserInput('完成了用户模块');

      const history = stateMachine.getPhaseHistory();
      const greetingCount = history.filter(p => p === InterviewPhase.GREETING).length;
      expect(greetingCount).toBe(1);
    });

    it('应该按顺序经过所有阶段', () => {
      // 模拟完整访谈流程
      stateMachine.processUserInput('好的'); // GREETING -> PROJECT_CONFIRM
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.PROJECT_CONFIRM);

      stateMachine.processUserInput('今天主要做后台API'); // PROJECT_CONFIRM -> PROGRESS_REVIEW
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.PROGRESS_REVIEW);

      stateMachine.processUserInput('完成了登录接口'); // PROGRESS_REVIEW -> BLOCKERS
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.BLOCKERS);

      stateMachine.processUserInput('数据库连接有点慢'); // BLOCKERS -> NEXT_STEPS
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.NEXT_STEPS);

      stateMachine.processUserInput('明天做注册接口'); // NEXT_STEPS -> SUMMARY_CONFIRM
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.SUMMARY_CONFIRM);

      stateMachine.processUserInput('准确'); // SUMMARY_CONFIRM -> CLOSING
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.CLOSING);
    });
  });

  describe('数据收集', () => {
    beforeEach(() => {
      stateMachine.start();
    });

    it('应该收集进度信息', () => {
      stateMachine.processUserInput('好的');
      stateMachine.processUserInput('今天完成了三个任务：登录API、用户查询、权限验证');

      const data = stateMachine.getCollectedData();
      expect(data.progress.length).toBeGreaterThan(0);
    });

    it('应该收集阻碍信息', () => {
      // 快速到达 BLOCKERS 阶段
      stateMachine.processUserInput('好的');
      stateMachine.processUserInput('API开发');
      stateMachine.processUserInput('完成了登录功能');

      stateMachine.processUserInput('第三方接口返回太慢，需要优化');

      const data = stateMachine.getCollectedData();
      expect(data.blockers.length).toBeGreaterThan(0);
      expect(data.blockers[data.blockers.length - 1]).toContain('第三方');
    });

    it('应该收集下一步计划', () => {
      // 快速到达 NEXT_STEPS 阶段
      stateMachine.processUserInput('好的');
      stateMachine.processUserInput('API开发');
      stateMachine.processUserInput('完成登录');
      stateMachine.processUserInput('没有问题');

      stateMachine.processUserInput('明天做注册功能，预计需要半天');

      const data = stateMachine.getCollectedData();
      expect(data.nextSteps.length).toBeGreaterThan(0);
    });

    it('getCollectedData 应该返回数据副本', () => {
      const data1 = stateMachine.getCollectedData();
      data1.progress.push('modified');

      const data2 = stateMachine.getCollectedData();
      expect(data2.progress).not.toContain('modified');
    });
  });

  describe('end() 方法', () => {
    it('应该设置 isActive 为 false', () => {
      stateMachine.start();
      expect(stateMachine.isActive()).toBe(true);

      stateMachine.end();
      expect(stateMachine.isActive()).toBe(false);
    });

    it('应该触发 ended 事件', () => {
      const endedHandler = vi.fn();
      stateMachine.on('ended', endedHandler);

      stateMachine.start();
      stateMachine.end();

      expect(endedHandler).toHaveBeenCalledTimes(1);
      expect(endedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: testSessionId,
          userId: testUserId,
          completedAt: expect.any(Date),
          collectedData: expect.any(Object),
          phaseHistory: expect.any(Array),
        })
      );
    });

    it('应该设置 isCompleted 为 true', () => {
      stateMachine.start();
      stateMachine.end();

      const context = stateMachine.getContext();
      expect(context.isCompleted).toBe(true);
    });

    it('多次调用 end() 应该安全处理', () => {
      stateMachine.start();
      stateMachine.end();
      stateMachine.end(); // 不应该抛出错误

      expect(stateMachine.isActive()).toBe(false);
    });

    it('未 start 时调用 end() 应该安全处理', () => {
      expect(() => stateMachine.end()).not.toThrow();
      expect(stateMachine.isActive()).toBe(false);
    });
  });

  describe('getContext() 方法', () => {
    it('应该返回上下文副本', () => {
      const context1 = stateMachine.getContext();
      context1.metadata.test = 'modified';

      const context2 = stateMachine.getContext();
      expect(context2.metadata.test).toBeUndefined();
    });

    it('应该包含所有必需字段', () => {
      const context = stateMachine.getContext();

      expect(context).toHaveProperty('sessionId');
      expect(context).toHaveProperty('userId');
      expect(context).toHaveProperty('date');
      expect(context).toHaveProperty('currentPhase');
      expect(context).toHaveProperty('phaseHistory');
      expect(context).toHaveProperty('askedQuestions');
      expect(context).toHaveProperty('followUpCount');
      expect(context).toHaveProperty('collectedData');
      expect(context).toHaveProperty('lastUserInput');
      expect(context).toHaveProperty('lastAnalysis');
      expect(context).toHaveProperty('startedAt');
      expect(context).toHaveProperty('updatedAt');
      expect(context).toHaveProperty('isCompleted');
      expect(context).toHaveProperty('metadata');
    });
  });

  describe('辅助方法', () => {
    beforeEach(() => {
      stateMachine.start();
    });

    it('getCurrentPhase 应该返回当前阶段', () => {
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.GREETING);

      stateMachine.processUserInput('好的');
      expect(stateMachine.getCurrentPhase()).toBe(InterviewPhase.PROJECT_CONFIRM);
    });

    it('getPhaseHistory 应该返回阶段历史副本', () => {
      stateMachine.processUserInput('好的');
      
      const history1 = stateMachine.getPhaseHistory();
      history1.push(InterviewPhase.BLOCKERS);

      const history2 = stateMachine.getPhaseHistory();
      expect(history2).not.toContain(InterviewPhase.BLOCKERS);
    });
  });

  describe('事件系统', () => {
    it('应该正确注册和触发事件监听器', () => {
      const handler = vi.fn();
      stateMachine.on('started', handler);

      stateMachine.start();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('应该支持多个监听器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      stateMachine.on('started', handler1);
      stateMachine.on('started', handler2);

      stateMachine.start();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('应该支持移除监听器', () => {
      const handler = vi.fn();
      stateMachine.on('started', handler);
      stateMachine.off('started', handler);

      stateMachine.start();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
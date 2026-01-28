# 代码质量改进计划

## 概述
修复剩余的 26 个代码质量问题，分为三批次执行。

## 第一批：HIGH 优先级问题（5项）

### 1. 实现 Zustand 状态管理
**问题**: 前端使用 useState 存在状态管理混乱和 race conditions
**解决方案**:
- 安装 Zustand（已安装）
- 创建 `frontend/src/store/useCallStore.ts`
- 迁移录音状态、对话状态、连接状态
- 替换组件中的 useState
- 添加状态持久化

**文件**:
- `frontend/src/store/useCallStore.ts` (新建)
- `frontend/src/components/CallScreen.tsx` (修改)
- `frontend/src/hooks/useWebRTC.ts` (修改)

### 2. 配置 ICE 服务器
**问题**: WebRTC 在 NAT 环境下连接失败率高
**解决方案**:
- 配置公共 STUN/TURN 服务器
- 添加 Google STUN 服务器
- (可选) 配置 TURN 服务器

**文件**:
- `frontend/src/hooks/useWebRTC.ts` (修改)

### 3. Mock 服务确定化
**问题**: Mock 服务返回随机数据，难以测试
**解决方案**:
- MockASRService: 固定返回识别文本
- MockLLMService: 固定返回预设响应
- MockTTSService: 固定返回音频数据

**文件**:
- `backend/src/services/doubao/MockASRService.ts` (修改)
- `backend/src/services/doubao/MockLLMService.ts` (修改)
- `backend/src/services/doubao/MockTTSService.ts` (修改)

### 4. 实现请求速率限制
**问题**: API 端点缺少速率限制，易受攻击
**解决方案**:
- 安装 `express-rate-limit`
- 配置速率限制中间件
- 对音频上传、Socket.IO 连接应用限制

**文件**:
- `backend/src/middleware/rateLimit.ts` (新建)
- `backend/src/index.ts` (修改)

### 5. TTS 队列优先级机制
**问题**: TTS 播放无优先级，可能覆盖重要音频
**解决方案**:
- 实现优先级队列（HIGH/MEDIUM/LOW）
- 取消低优先级播放
- 添加播放状态管理

**文件**:
- `backend/src/services/doubao/MockTTSService.ts` (修改)

## 第二批：MEDIUM 优先级问题（核心优化）

### 6. 统一日志工具
**文件**: `backend/src/utils/logger.ts` (新建)
- 实现分级日志（info/warn/error）
- 添加时间戳和上下文
- 支持日志级别过滤

### 7. Socket.IO 重连配置
**文件**: `frontend/src/hooks/useWebRTC.ts`
- 配置指数退避重连
- 添加最大重试次数
- 实现重连状态提示

### 8. 移除 console.log（27处）
**文件**: 多个文件
- 统一替换为 logger
- 前端使用适当的日志方案

### 9. API 响应验证
**文件**: `backend/src/utils/validation.ts` (扩展)
- 使用 Zod 验证所有 API 响应
- 添加响应类型定义

### 10. 对话状态机优化
**文件**: `backend/src/services/conversation/StateManager.ts`
- 添加状态转换验证
- 实现状态回滚机制

## 第三批：MEDIUM/LOW 优先级问题（细节优化）

### 11. VAD 配置参数化
**文件**: `backend/src/services/audio/VADService.ts`
- 配置化 VAD 阈值
- 支持动态调整

### 12. 移除硬编码值
**文件**: 多个
- 提取配置到环境变量
- 创建配置对象

### 13. Prisma 迁移
**文件**: `backend/prisma/migrations/`
- 创建初始迁移
- 生成 Prisma Client

### 14. 错误处理增强
**文件**: 多个
- 统一错误处理中间件
- 添加用户友好错误消息

### 15. 类型定义统一
**文件**: `backend/src/types/`, `frontend/src/types/`
- 创建共享类型定义
- 移除重复类型

### 16. Emoji 图标替换
**文件**: `frontend/src/components/CallScreen.tsx`
- 使用 SVG 图标或图标库
- 提升可访问性

### 17. 添加 JSDoc 文档
**文件**: 核心服务文件
- 添加函数文档
- 参数和返回值说明

### 18. 暂停/恢复功能
**文件**: `frontend/src/components/CallScreen.tsx`
- 实现暂停录音
- 实现恢复录音
- 状态持久化

## 验证计划

每批修复完成后：
1. 运行 TypeScript 检查：`npm run build`
2. 运行代码审查：使用 code-reviewer agent
3. 手动测试核心功能
4. 提交 Git commit

## 完成标准

- ✅ 所有 HIGH 问题修复
- ✅ 关键 MEDIUM 问题修复（日志、重连、console.log、API 验证）
- ✅ 代码通过 TypeScript 严格检查
- ✅ 无 console.log 残留
- ✅ 核心功能可正常运行

# 豆包 Realtime API 集成计划

## 日期: 2025-01-28

---

## 一、集成目标

将现有的 Mock AI 服务替换为豆包端到端实时语音大模型 Realtime API，实现：

1. ✅ 实时语音识别 (ASR)
2. ✅ 智能对话生成 (LLM)
3. ✅ 高质量语音合成 (TTS)
4. ✅ 全双工语音对话（支持打断）
5. ✅ 对话上下文管理（20轮记忆）

---

## 二、豆包 API 核心信息

### API 端点

```
wss://openspeech.bytedance.com/api/v3/realtime/dialogue
```

### 认证方式

| Header | 说明 | 示例值 |
|--------|------|--------|
| X-Api-App-ID | 应用ID | 123456789 |
| X-Api-Access-Key | 访问密钥 | your-access-key |
| X-Api-Resource-Id | 固定值 | volc.speech.dialog |
| X-Api-App-Key | 固定值 | PlgvMymc7f3tQnJ6 |

### 模型版本

| 版本 | 特点 | 推荐场景 |
|------|------|----------|
| O | 精品音色、通用对话 | 日报生成助手 |
| O2.0 | 唱歌能力、热修复 | 增强版助手 |
| SC | 声音复刻、角色扮演 | 特定角色场景 |
| SC2.0 | 角色演绎增强 | 高级角色扮演 |

**推荐**: 使用 **O版本**，适合日报助手场景

### 音色选择 (O版本)

1. `zh_female_vv_jupiter_bigtts` - 活泼灵动女声（默认）
2. `zh_female_xiaohe_jupiter_bigtts` - 甜美活泼女声（台湾口音）
3. `zh_male_yunzhou_jupiter_bigtts` - 清爽沉稳男声
4. `zh_male_xiaotian_jupiter_bigtts` - 清爽磁性男声

**推荐**: `zh_male_yunzhou_jupiter_bigtts` (专业助手形象)

---

## 三、二进制协议规范

### 帧结构

```
| Header (4 bytes) | Optional | Payload Size (4 bytes) | Payload |
```

### Header 字节定义

```
Byte 0:
  - Left 4-bit: Protocol Version (0b0001)
  - Right 4-bit: Header Size (0b0001)

Byte 1:
  - Left 4-bit: Message Type
  - Right 4-bit: Message Type Specific Flags

Byte 2:
  - Left 4-bit: Serialization Method (0b0001=JSON, 0b0000=Raw)
  - Right 4-bit: Compression Method (0b0000=无压缩, 0b0001=gzip)

Byte 3:
  - Reserved (0x00)
```

### Message Type

| Type | 含义 | 说明 |
|------|------|------|
| 0b0001 | Full-client request | 客户端文本事件 |
| 0b1001 | Full-server response | 服务端文本事件 |
| 0b0010 | Audio-only request | 客户端音频数据 |
| 0b1011 | Audio-only response | 服务端音频数据 |
| 0b1111 | Error information | 错误事件 |

### 客户端事件

| 事件ID | 事件名称 | 用途 |
|--------|----------|------|
| 1 | StartConnection | 建立连接 |
| 100 | StartSession | 创建会话（核心） |
| 102 | FinishSession | 结束会话 |
| 200 | TaskRequest | 上传音频（核心） |
| 2 | FinishConnection | 断开连接 |

### 服务端事件

| 事件ID | 事件名称 | 用途 |
|--------|----------|------|
| 50 | ConnectionStarted | 连接成功 |
| 150 | SessionStarted | 会话创建成功 |
| 352 | TTSResponse | 返回音频数据（核心） |
| 451 | ASRResponse | 识别结果（核心） |
| 550 | ChatResponse | 模型回复文本（核心） |
| 459 | ASREnded | 用户说话结束 |
| 559 | ChatEnded | 模型回复结束 |

---

## 四、实施步骤

### Phase 1: 基础服务实现 (Week 1)

#### Step 1.1: 创建豆包服务类

**文件**: `backend/src/services/doubao/DoubaoRealtimeService.ts`

**功能**:
- [ ] WebSocket 连接管理
- [ ] 二进制协议编解码
- [ ] 事件发送（StartSession, TaskRequest等）
- [ ] 事件监听（TTSResponse, ASRResponse等）
- [ ] 错误处理

**依赖**:
- `ws` 库 (WebSocket 客户端)
- `uuid` 库 (生成 session ID)

---

#### Step 1.2: 实现二进制协议编解码

**文件**: `backend/src/services/doubao/BinaryProtocol.ts`

**功能**:
- [ ] encodeFrame() - 编码二进制帧
- [ ] decodeFrame() - 解码二进制帧
- [ ] encodeAudioFrame() - 编码音频帧
- [ ] encodeJsonEvent() - 编码JSON事件

---

#### Step 1.3: 更新 Signaling Service

**文件**: `backend/src/services/webrtc/signaling.ts`

**改动**:
- [ ] 移除 Mock 实现
- [ ] 集成 DoubaoRealtimeService
- [ ] 实现 audio-stream 事件转发
- [ ] 实现 TTS/ASR 响应转发到前端
- [ ] 添加错误处理和日志

---

#### Step 1.4: 环境变量配置

**文件**: `backend/.env`

**添加**:
```env
# 豆包 Realtime API
DOUBAO_APP_ID=your-app-id
DOUBAO_ACCESS_KEY=your-access-key
DOUBAO_MODEL=O
DOUBAO_DEFAULT_SPEAKER=zh_male_yunzhou_jupiter_bigtts
```

---

### Phase 2: 前端适配 (Week 1)

#### Step 2.1: 更新 WebRTC Hook

**文件**: `frontend/src/hooks/useWebRTC.ts`

**改动**:
- [ ] 移除 Mock 音频生成逻辑
- [ ] 接收真实 TTS 音频并播放
- [ ] 优化音频处理流程

---

#### Step 2.2: 优化 CallScreen 组件

**文件**: `frontend/src/components/CallScreen.tsx`

**改动**:
- [ ] 添加连接状态指示（连接中/已连接/断开）
- [ ] 显示识别到的实时文字
- [ ] 优化音频可视化（基于真实音频数据）
- [ ] 添加错误提示和重连逻辑

---

### Phase 3: 测试与优化 (Week 2)

#### Step 3.1: 单元测试

**测试文件**:
- `backend/src/services/doubao/__tests__/BinaryProtocol.test.ts`
- `backend/src/services/doubao/__tests__/DoubaoRealtimeService.test.ts`

**测试覆盖**:
- [ ] 二进制编解码正确性
- [ ] 事件发送和接收
- [ ] 错误处理逻辑

---

#### Step 3.2: 集成测试

**测试场景**:
- [ ] 完整对话流程（StartSession → 对话 → FinishSession）
- [ ] 音频流传输
- [ ] 打断场景
- [ ] 网络断开重连
- [ ] 并发多用户

---

#### Step 3.3: 性能优化

- [ ] 音频数据缓冲优化（20ms一包）
- [ ] 延迟监控和优化
- [ ] 内存管理（音频数据清理）
- [ ] WebSocket 连接池管理

---

### Phase 4: 文档和部署 (Week 2)

#### Step 4.1: 更新文档

- [ ] API 集成文档
- [ ] 环境变量说明
- [ ] 部署指南
- [ ] 故障排查手册

---

#### Step 4.2: 部署配置

- [ ] 生产环境配置
- [ ] 监控和告警
- [ ] 日志收集
- [ ] 成本监控

---

## 五、关键技术点

### 1. 二进制协议实现

```typescript
function encodeFrame(eventId: number, sessionId: string, payload: any): Buffer {
  const payloadJson = JSON.stringify(payload)
  const payloadBytes = Buffer.from(payloadJson, 'utf-8')

  // Header (4 bytes)
  const header = Buffer.alloc(4)
  header[0] = 0b00010001  // Protocol Version + Header Size
  header[1] = 0b00010100  // Message Type + Event Flag
  header[2] = 0b00010000  // JSON + No Compression
  header[3] = 0x00        // Reserved

  // Optional fields
  const sessionIdBytes = Buffer.from(sessionId, 'utf-8')
  const sessionIdSize = Buffer.alloc(4)
  sessionIdSize.writeUInt32BE(sessionIdBytes.length)

  // Payload size
  const payloadSize = Buffer.alloc(4)
  payloadSize.writeUInt32BE(payloadBytes.length)

  return Buffer.concat([header, sessionIdSize, sessionIdBytes, payloadSize, payloadBytes])
}
```

### 2. 音频流处理

```typescript
// 20ms 音频包 (16kHz, int16, mono)
const SAMPLE_RATE = 16000
const BITS_PER_SAMPLE = 16
const CHANNELS = 1
const CHUNK_DURATION_MS = 20

const bytesPerChunk = (SAMPLE_RATE * BITS_PER_SAMPLE * CHANNELS / 8) * (CHUNK_DURATION_MS / 1000)
// = 640 bytes per 20ms chunk

function sendAudioStream(audioBuffer: Buffer): void {
  const chunkSize = 640
  for (let i = 0; i < audioBuffer.length; i += chunkSize) {
    const chunk = audioBuffer.subarray(i, i + chunkSize)
    doubaoService.sendAudio(chunk)
    await sleep(20) // 20ms 间隔
  }
}
```

### 3. 对话上下文管理

豆包自动维护最近20轮QA对，可通过 `dialog_id` 参数接续历史对话：

```typescript
startSession({
  dialog_id: 'previous-dialog-id',  // 可选，接续历史对话
  bot_name: '日报助手',
  system_role: '你是专业的日报助手，帮助用户整理日常工作内容'
})
```

---

## 六、风险和注意事项

### 1. API 限流

- **QPM限制**: 默认 60 queries/minute
- **TPM限制**: 默认 10,000 tokens/minute

**解决方案**:
- 实现请求队列
- 监控用量并告警
- 考虑并发计费模式

### 2. 音频延迟

- **目标延迟**: <500ms
- **影响因素**: 网络抖动、服务器负载

**解决方案**:
- 使用 UDP 替代 TCP (如果豆包支持)
- 实现音频预加载
- 客户端音频缓冲优化

### 3. 安全性

- **密钥管理**: 不要将 Access Key 暴露到前端
- **内容审核**: 启用 `strict_audit` 参数
- **用户隔离**: 为每个用户维护独立的会话

### 4. 成本控制

- **计费方式**:
  - 输入音频: 80元/百万token
  - 输入文本(cached): 5元/百万token

**优化策略**:
- 设置会话时长限制
- 实现用量监控和告警
- 考虑并发计费模式

---

## 七、验证标准

### 功能验证

- [ ] 可以正常连接和断开
- [ ] 实时语音识别准确率 >95%
- [ ] 对话生成流畅自然
- [ ] 语音合成清晰可懂
- [ ] 支持打断和继续
- [ ] 对话历史正确保存
- [ ] 日报生成逻辑正常

### 性能验证

- [ ] 首次响应延迟 <1s
- [ ] 平均对话延迟 <500ms
- [ ] 音频延迟 <300ms
- [ ] 并发支持 >10用户
- [ ] 内存占用稳定

### 稳定性验证

- [ ] 长时间通话不中断 (>10分钟)
- [ ] 网络波动自动重连
- [ ] 异常情况优雅降级
- [ ] 错误信息清晰友好

---

## 八、后续优化方向

1. **多模型支持**: 支持用户选择 O/SC 版本
2. **个性化音色**: 支持用户上传自定义克隆音色
3. **情感识别**: 基于豆包情感能力优化对话体验
4. **智能打断**: 更精准的打断检测逻辑
5. **离线缓存**: 缓存常见问题的回复
6. **数据统计**: 收集对话数据用于优化

---

## 九、参考资料

- [豆包端到端实时语音大模型API文档](https://www.volcengine.com/docs/6561/1594356?lang=zh)
- [豆包语音计费说明](https://www.volcengine.com/docs/6561/1359370)
- [WebSocket协议规范](https://tools.ietf.org/html/rfc6455)
- [WebRTC最佳实践](https://webrtc.org/)

---

**下一步**: 等待用户提供豆包 API 凭据（APP ID 和 Access Key），然后开始实施 Phase 1。

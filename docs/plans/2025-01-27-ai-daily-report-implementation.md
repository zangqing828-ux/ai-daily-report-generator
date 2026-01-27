# AI 日报生成器 - 第一阶段实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 构建一个面向解决方案架构师的访谈式 AI 日报生成器移动端 Web 应用，支持全双工实时语音对话，集成豆包 API，具备智能引导和自动整理功能。

**架构:** 前后端分离的移动端 Web 应用，使用 WebRTC 实现实时音频流通信，通过 Node.js 媒体服务器调用豆包 API（ASR/LLM/TTS），实现全双工实时对话，支持打断和插话，自动生成结构化日报。

**技术栈:**
- 前端: React 18 + Vite + TypeScript + Tailwind CSS + PWA + WebRTC
- 后端: Node.js + Express + TypeScript + Socket.io + Prisma + PostgreSQL + Redis
- API: 豆包语音识别、对话生成、语音合成 SDK

---

## 项目结构

```
ai-daily-report/
├── frontend/                 # React 前端应用
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── hooks/           # 自定义 hooks
│   │   ├── lib/             # WebRTC 工具
│   │   ├── services/        # API 调用
│   │   └── types/           # TypeScript 类型
│   ├── public/              # 静态资源
│   └── vite.config.ts
├── backend/                  # Node.js 后端服务
│   ├── src/
│   │   ├── services/        # 业务逻辑
│   │   │   ├── webrtc/      # WebRTC 信令
│   │   │   ├── doubao/      # 豆包 API 集成
│   │   │   └── conversation # 对话引擎
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # API 路由
│   │   └── db/              # 数据库
│   └── prisma/
├── docs/                     # 文档
└── tests/                    # 测试
```

---

## Task 1: 项目初始化

**Files:**
- Create: `frontend/package.json`
- Create: `backend/package.json`
- Create: `README.md`
- Create: `.gitignore`

**Step 1: 创建前端项目**
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install -D tailwindcss postcss autoprefixer
npm install zustand @headlessui/react
npm install -D vite-plugin-pwa
npx tailwindcss init -p
```

**Step 2: 配置 PWA**
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    }
  })]
})
```

**Step 3: 创建后端项目**
```bash
cd backend
npm init -y
npm install express socket.io typescript @types/node @types/express ts-node prisma @prisma/client ioredis
npm install -D ts-node-dev @types/cors
npm install cors dotenv
```

**Step 4: 配置 TypeScript**
```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

**Step 5: 初始化数据库**
```bash
cd backend
npx prisma init
npx prisma migrate dev --name init
```

**Step 6: 提交**
```bash
git add .
git commit -m "feat: initialize project structure with frontend and backend"
```

---

## Task 2: 前端通话界面 UI

**Files:**
- Create: `frontend/src/components/CallScreen.tsx`
- Create: `frontend/src/hooks/useWebRTC.ts`
- Create: `frontend/src/lib/webrtc-adapter.ts`
- Create: `frontend/src/types/conversation.ts`

**Step 1: 创建通话界面组件**

```tsx
// frontend/src/components/CallScreen.tsx
import { useState } from 'react'
import { useWebRTC } from '../hooks/useWebRTC'

export default function CallScreen() {
  const { status, startCall, endCall, audioLevel, currentProject } = useWebRTC()
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col">
      {/* 状态栏 */}
      <div className="h-[10%] flex items-center justify-between px-4">
        <span className="text-white text-lg">{currentProject}</span>
        <span className="text-gray-400">通话时长: {status.duration}</span>
      </div>

      {/* 中央对话区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* AI 头像 */}
        <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center mb-8 animate-pulse">
          {status.aiState === 'listening' && <span className="text-4xl">👂</span>}
          {status.aiState === 'thinking' && <span className="text-4xl">🤔</span>}
          {status.aiState === 'speaking' && <span className="text-4xl">🔊</span>}
        </div>

        {/* 实时字幕 */}
        <div className="text-white text-2xl mb-4 fade-out">
          {status.lastTranscript}
        </div>

        {/* 音频波形 */}
        {audioLevel > 0 && (
          <div className="flex gap-1 items-end h-8">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full"
                style={{ height: `${Math.random() * audioLevel * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 控制区 */}
      <div className="h-[20%] flex items-center justify-center gap-8">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="w-16 h-16 rounded-full bg-gray-700 text-white"
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>

        <button
          onClick={endCall}
          className="w-20 h-20 rounded-full bg-red-600 text-white text-xl"
        >
          📞
        </button>
      </div>
    </div>
  )
}
```

**Step 2: 创建 WebRTC Hook**

```typescript
// frontend/src/hooks/useWebRTC.ts
import { useState, useCallback } from 'react'
import { createWebRTCConnection } from '../lib/webrtc-adapter'

interface CallStatus {
  aiState: 'idle' | 'listening' | 'thinking' | 'speaking'
  duration: string
  lastTranscript: string
  currentProject: string
}

export function useWebRTC() {
  const [status, setStatus] = useState<CallStatus>({
    aiState: 'idle',
    duration: '0:00',
    lastTranscript: '',
    currentProject: '项目 A'
  })
  const [audioLevel, setAudioLevel] = useState(0)

  const startCall = useCallback(async () => {
    const connection = await createWebRTCConnection()
    // 处理音频流和信令
  }, [])

  const endCall = useCallback(() => {
    // 清理连接
  }, [])

  return { status, startCall, endCall, audioLevel, currentProject: status.currentProject }
}
```

**Step 3: WebRTC 适配器**

```typescript
// frontend/src/lib/webrtc-adapter.ts
import { RTCPeerConnection, RTCSessionDescription } from 'webrtc-adapter'

export async function createWebRTCConnection() {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  const pc = new RTCPeerConnection(configuration)

  // 获取用户音频流
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000
    }
  })

  // 添加音频轨道
  stream.getAudioTracks().forEach(track => {
    pc.addTrack(track, stream)
  })

  return { pc, stream }
}
```

**Step 4: 提交**
```bash
git add frontend/src
git commit -m "feat: implement call screen UI with WebRTC hook"
```

---

## Task 3: 后端信令服务器

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/services/webrtc/signaling.ts`
- Create: `backend/src/routes/signaling.ts`

**Step 1: 创建 Express 服务器**

```typescript
// backend/src/index.ts
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { SignalingService } from './services/webrtc/signaling'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
})

const signaling = new SignalingService(io)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  signaling.handleConnection(socket)
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`)
})
```

**Step 2: WebRTC 信令服务**

```typescript
// backend/src/services/webrtc/signaling.ts
import { Socket } from 'socket.io'

export class SignalingService {
  constructor(private io: SocketIOServer) {}

  handleConnection(socket: Socket) {
    socket.on('offer', async (data) => {
      // 处理 SDP offer
      socket.emit('answer', await this.createAnswer(data))
    })

    socket.on('ice-candidate', (candidate) => {
      // 转发 ICE candidate
      socket.broadcast.emit('ice-candidate', candidate)
    })
  }

  private async createAnswer(offer: RTCSessionDescriptionInit) {
    // 创建 answer
    return { type: 'answer', sdp: 'mock-sdp' }
  }
}
```

**Step 3: 提交**
```bash
git add backend/src
git commit -m "feat: implement WebRTC signaling server"
```

---

## Task 4: 豆包 API 集成（Mock 层）

**Files:**
- Create: `backend/src/services/doubao/MockASRService.ts`
- Create: `backend/src/services/doubao/MockLLMService.ts`
- Create: `backend/src/services/doubao/MockTTSService.ts`
- Create: `backend/src/services/doubao/index.ts`

**Step 1: Mock ASR 服务**

```typescript
// backend/src/services/doubao/MockASRService.ts
export class MockASRService {
  private transcripts: string[] = []

  async *processAudioStream(audioStream: AsyncIterable<ArrayBuffer>): AsyncIterable<string> {
    for await (const chunk of audioStream) {
      // 模拟识别延迟
      await this.delay(100)

      // 模拟识别结果
      const mockText = this.getMockRecognition()
      yield mockText
      this.transcripts.push(mockText)
    }
  }

  private getMockRecognition(): string {
    const mockTexts = [
      '今天完成了用户认证模块的开发',
      '修复了登录接口的一个 bug',
      '和产品经理讨论了新功能需求'
    ]
    return mockTexts[Math.floor(Math.random() * mockTexts.length)]
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getFullTranscript(): string {
    return this.transcripts.join(' ')
  }
}
```

**Step 2: Mock LLM 服务**

```typescript
// backend/src/services/doubao/MockLLMService.ts
export class MockLLMService {
  async *chat(history: Array<{role: string, content: string}>): AsyncIterable<string> {
    const response = this.generateMockResponse(history)
    const words = response.split(' ')

    for (const word of words) {
      await this.delay(100)
      yield word + ' '
    }
  }

  private generateMockResponse(history: Array<{role: string, content: string}>): string {
    const lastUserMessage = history[history.length - 1].content

    if (lastUserMessage.includes('今天')) {
      return '明白了。那您明天有什么计划呢？'
    } else if (lastUserMessage.includes('明天')) {
      return '好的，我已经记录下来。还有其他项目需要记录吗？'
    }

    return '请继续'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

**Step 3: Mock TTS 服务**

```typescript
// backend/src/services/doubao/MockTTSService.ts
export class MockTTSService {
  private isPlaying = false
  private stopSignal = false

  async *synthesizeStream(text: string): AsyncIterable<ArrayBuffer> {
    this.isPlaying = true
    this.stopSignal = false

    const words = text.split(' ')

    for (const word of words) {
      if (this.stopSignal) break

      // 模拟音频块
      await this.delay(300)
      yield this.generateMockAudio(word)
    }

    this.isPlaying = false
  }

  stop() {
    this.stopSignal = true
  }

  private generateMockAudio(word: string): ArrayBuffer {
    // 返回模拟音频数据
    const buffer = new ArrayBuffer(1024)
    return buffer
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

**Step 4: 提交**
```bash
git add backend/src/services/doubao
git commit -m "feat: implement mock Doubao API services (ASR, LLM, TTS)"
```

---

## Task 5: 对话引擎

**Files:**
- Create: `backend/src/services/conversation/ConversationEngine.ts`
- Create: `backend/src/services/conversation/StateManager.ts`
- Create: `backend/src/services/conversation/QuestionGenerator.ts`

**Step 1: 对话引擎**

```typescript
// backend/src/services/conversation/ConversationEngine.ts
import { MockASRService } from '../doubao/MockASRService'
import { MockLLMService } from '../doubao/MockLLMService'
import { QuestionGenerator } from './QuestionGenerator'

export class ConversationEngine {
  private currentProject: string = '项目 A'
  private stage: 'greeting' | 'today' | 'tomorrow' | 'summary'
  private conversationHistory: Array<{role: string, content: string}> = []

  constructor(
    private asr: MockASRService,
    private llm: MockLLMService,
    private questions: QuestionGenerator
  ) {}

  async processUserAudio(audioStream: AsyncIterable<ArrayBuffer>) {
    const transcript = await this.asr.processAudioStream(audioStream)
    const fullText = this.asr.getFullTranscript()

    this.conversationHistory.push({ role: 'user', content: fullText })

    // 生成下一个问题或回复
    const response = this.llm.chat(this.conversationHistory)

    return response
  }

  async generateResponse() {
    const question = this.questions.getNextQuestion(
      this.currentProject,
      this.stage,
      this.conversationHistory
    )

    return question
  }

  switchProject(projectName: string) {
    this.currentProject = projectName
  }
}
```

**Step 2: 状态管理**

```typescript
// backend/src/services/conversation/StateManager.ts
export class StateManager {
  private state = {
    currentProject: '',
    conversationStage: 'greeting',
    roundCount: 0,
    projects: [] as string[]
  }

  updateProject(project: string) {
    this.state.currentProject = project
    if (!this.state.projects.includes(project)) {
      this.state.projects.push(project)
    }
  }

  advanceStage() {
    const stages = ['greeting', 'today', 'tomorrow', 'summary']
    const currentIndex = stages.indexOf(this.state.conversationStage)
    if (currentIndex < stages.length - 1) {
      this.state.conversationStage = stages[currentIndex + 1] as any
    }
  }

  canFinish(): boolean {
    return this.state.roundCount >= 5
  }
}
```

**Step 3: 问题生成器**

```typescript
// backend/src/services/conversation/QuestionGenerator.ts
export class QuestionGenerator {
  getNextQuestion(project: string, stage: string, history: any[]): string {
    const templates = {
      greeting: `您好，我是日报助手。今天想从哪个项目开始？`,
      today: `好的。请告诉我 ${project} 今天的具体工作内容。`,
      tomorrow: `明白了。那 ${project} 明天有什么计划？`,
      summary: `我已经整理好了今天的日报，需要我为您总结一下吗？`
    }

    return templates[stage] || '请继续'
  }
}
```

**Step 4: 提交**
```bash
git add backend/src/services/conversation
git commit -m "feat: implement conversation engine with state management"
```

---

## Task 6: 全双工控制逻辑

**Files:**
- Create: `backend/src/services/webrtc/DuplexController.ts`
- Create: `backend/src/services/audio/VADService.ts`

**Step 1: VAD 服务**

```typescript
// backend/src/services/audio/VADService.ts
export class VADService {
  private threshold = 0.01
  private silenceDuration = 0
  private maxSilenceDuration = 1500

  detect(audioData: Float32Array): boolean {
    const energy = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length
    const isSpeech = energy > this.threshold

    if (isSpeech) {
      this.silenceDuration = 0
    } else {
      this.silenceDuration += 20 // 假设每 20ms 一帧
    }

    return {
      isSpeech,
      isSilence: this.silenceDuration > this.maxSilenceDuration
    }
  }
}
```

**Step 2: 全双工控制器**

```typescript
// backend/src/services/webrtc/DuplexController.ts
import { VADService } from '../audio/VADService'
import { MockTTSService } from '../doubao/MockTTSService'

export class DuplexController {
  private mode: 'user-speaking' | 'ai-speaking' = 'user-speaking'
  private vad = new VADService()
  private ttsQueue: Array<any> = []

  constructor(private tts: MockTTSService) {}

  async processAudioFrame(audioData: Float32Array) {
    const { isSpeech, isSilence } = this.vad.detect(audioData)

    if (isSpeech) {
      this.mode = 'user-speaking'
      this.tts.stop()
      this.ttsQueue = []
    }

    if (isSilence && this.mode === 'user-speaking') {
      // 用户停顿，AI 可以回复
      this.mode = 'ai-speaking'
      await this.playQueuedTTS()
    }

    return { isSpeech, isSilence }
  }

  async queueTTS(text: string) {
    this.ttsQueue.push(text)
    if (this.mode === 'ai-speaking') {
      await this.playQueuedTTS()
    }
  }

  private async playQueuedTTS() {
    while (this.ttsQueue.length > 0 && this.mode === 'ai-speaking') {
      const text = this.ttsQueue.shift()
      for await (const chunk of this.tts.synthesizeStream(text)) {
        if (this.mode === 'user-speaking') break
        // 发送音频到前端
      }
    }
  }
}
```

**Step 3: 提交**
```bash
git add backend/src/services/webrtc backend/src/services/audio
git commit -m "feat: implement duplex controller with VAD"
```

---

## Task 7: 前后端集成

**Files:**
- Modify: `frontend/src/hooks/useWebRTC.ts`
- Create: `frontend/src/services/api.ts`
- Create: `backend/src/routes/index.ts`

**Step 1: 前端 API 服务**

```typescript
// frontend/src/services/api.ts
const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001'

export async function startCall() {
  const res = await fetch(`${API_BASE}/api/call/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function sendAudio(audioChunk: ArrayBuffer) {
  const res = await fetch(`${API_BASE}/api/audio/stream`, {
    method: 'POST',
    body: audioChunk,
    headers: { 'Content-Type': 'application/octet-stream' }
  })
  return res.json()
}
```

**Step 2: 后端路由**

```typescript
// backend/src/routes/index.ts
import { Router } from 'express'
import { DuplexController } from '../services/webrtc/DuplexController'

const router = Router()

router.post('/api/call/start', async (req, res) => {
  // 启动通话会话
  res.json({ sessionId: 'mock-session-123' })
})

router.post('/api/audio/stream', async (req, res) => {
  // 处理音频流
  const chunks: Buffer[] = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', async () => {
    const audioBuffer = Buffer.concat(chunks)
    // 处理音频
    res.json({ transcript: 'mock transcript' })
  })
})

export default router
```

**Step 3: 提交**
```bash
git add frontend/src/services backend/src/routes
git commit -m "feat: integrate frontend and backend APIs"
```

---

## Task 8: 日报生成逻辑

**Files:**
- Create: `backend/src/services/report/DailyReportGenerator.ts`
- Create: `backend/src/models/DailyReport.ts`

**Step 1: 日报生成器**

```typescript
// backend/src/services/report/DailyReportGenerator.ts
export class DailyReportGenerator {
  generate(conversationData: any, project: string) {
    const todayWork = this.extractTodayWork(conversationData)
    const tomorrowPlan = this.extractTomorrowPlan(conversationData)

    return {
      date: new Date().toISOString().split('T')[0],
      project,
      todayWork: this.categorizeWork(todayWork),
      tomorrowPlan: this.prioritizePlan(tomorrowPlan),
      summary: this.generateSummary(todayWork, tomorrowPlan)
    }
  }

  private extractTodayWork(conversation: any): any[] {
    // 从对话中提取今日工作
    return conversation
      .filter((msg: any) => msg.role === 'user')
      .map((msg: any) => msg.content)
  }

  private categorizeWork(workItems: string[]): any {
    return {
      development: workItems.filter(item =>
        item.includes('开发') || item.includes('实现')
      ),
      meetings: workItems.filter(item =>
        item.includes('会议') || item.includes('讨论')
      ),
      learning: workItems.filter(item =>
        item.includes('学习') || item.includes('研究')
      )
    }
  }

  private prioritizePlan(plans: string[]): string[] {
    // 优先级排序
    return plans.sort((a, b) => {
      if (a.includes('紧急') || a.includes('重要')) return -1
      if (b.includes('紧急') || b.includes('重要')) return 1
      return 0
    })
  }

  private generateSummary(today: any, tomorrow: any): string {
    return `今日完成 ${today.development?.length || 0} 个开发任务，${today.meetings?.length || 0} 个会议。明日计划 ${tomorrow?.length || 0} 项工作。`
  }
}
```

**Step 2: 数据模型**

```typescript
// backend/src/models/DailyReport.ts
export class DailyReport {
  id: string
  date: string
  userId: string
  project: string
  todayWork: Record<string, string[]>
  tomorrowPlan: string[]
  summary: string
  createdAt: Date
  updatedAt: Date
}
```

**Step 3: 提交**
```bash
git add backend/src/services/report backend/src/models
git commit -m "feat: implement daily report generation logic"
```

---

## Task 9: PWA 配置

**Files:**
- Create: `frontend/public/manifest.json`
- Create: `frontend/public/sw.js`
- Create: `frontend/vite.config.ts` (已修改)

**Step 1: PWA Manifest**

```json
// frontend/public/manifest.json
{
  "name": "AI 日报助手",
  "short_name": "日报助手",
  "description": "面向解决方案架构师的访谈式 AI 日报生成器",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Service Worker**

```javascript
// frontend/public/sw.js
const CACHE_NAME = 'ai-daily-report-v1'
const urlsToCache = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
})
```

**Step 3: 注册 Service Worker**

```typescript
// frontend/src/main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

**Step 4: 提交**
```bash
git add frontend/public frontend/src/main.tsx
git commit -m "feat: configure PWA with manifest and service worker"
```

---

## Task 10: 测试与部署

**Files:**
- Create: `frontend/tests/call-screen.test.tsx`
- Create: `backend/tests/conversation.test.ts`
- Create: `vercel.json`
- Create: `railway.json`

**Step 1: 前端测试**

```typescript
// frontend/tests/call-screen.test.tsx
import { render, screen } from '@testing-library/react'
import CallScreen from '../src/components/CallScreen'

test('displays call screen with correct initial state', () => {
  render(<CallScreen />)

  expect(screen.getByText('项目 A')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /📞/ })).toBeInTheDocument()
})

test('toggles pause state', () => {
  render(<CallScreen />)

  const pauseButton = screen.getByRole('button', { name: /⏸️/ })
  fireEvent.click(pauseButton)

  expect(screen.getByRole('button', { name: /▶️/ })).toBeInTheDocument()
})
```

**Step 2: 后端测试**

```typescript
// backend/tests/conversation.test.ts
import { ConversationEngine } from '../src/services/conversation/ConversationEngine'

test('processes conversation and generates next question', async () => {
  const engine = new ConversationEngine(mockASR, mockLLM, mockQuestions)

  const response = await engine.processUserAudio(mockAudioStream)

  expect(response).toBeDefined()
})
```

**Step 3: Vercel 配置**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

**Step 4: Railway 配置**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

**Step 5: 提交**
```bash
git add tests vercel.json railway.json
git commit -m "test: add tests and deployment configs"
```

---

## 总结

本实现计划包含 **10 个主要任务**，涵盖：
- 项目初始化
- 前端通话界面
- 后端信令服务器
- 豆包 API Mock 层
- 对话引擎
- 全双工控制逻辑
- 前后端集成
- 日报生成
- PWA 配置
- 测试与部署

每个任务包含多个步骤，每个步骤预计 2-5 分钟完成。

**下一步**: 使用 `superpowers:executing-plans` 开始任务 1。

**预计时间**: 3-4 周完成第一阶段。

---

**文档创建时间**: 2025-01-27
**文档版本**: 1.0

/**
 * 豆包端到端实时语音大模型服务
 *
 * 负责与豆包 Realtime API 进行 WebSocket 通信
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  encodeJsonEvent,
  encodeAudioFrame,
  decodeFrame,
  decodeJsonEvent,
  generateUUID,
  ClientEventId,
  ServerEventId,
} from './BinaryProtocol';

export interface DoubaoConfig {
  appId: string;
  accessKey: string;
  apiEndpoint?: string;
  model?: 'O' | 'O2.0' | 'SC' | 'SC2.0';
  defaultSpeaker?: string;
}

export interface SessionOptions {
  botName?: string;
  systemRole?: string;
  speakingStyle?: string;
  dialogId?: string;
  model?: 'O' | 'O2.0' | 'SC' | 'SC2.0';
  speaker?: string;
}

export interface AudioChunk {
  data: Buffer;
  sampleRate: number;
  channels: number;
}

type EventHandler = (data: any) => void;

/**
 * 豆包实时语音服务类
 */
export class DoubaoRealtimeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<DoubaoConfig>;
  private currentSessionId: string | null = null;
  private audioSequence = 0;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(config: DoubaoConfig) {
    super();
    this.config = {
      appId: config.appId,
      accessKey: config.accessKey,
      apiEndpoint: config.apiEndpoint || 'wss://openspeech.bytedance.com/api/v3/realtime/dialogue',
      model: config.model || 'O',
      defaultSpeaker: config.defaultSpeaker || 'zh_male_yunzhou_jupiter_bigtts',
    };
  }

  /**
   * 连接到豆包 Realtime API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const connectId = generateUUID();

        this.ws = new WebSocket(this.config.apiEndpoint!, {
          headers: {
            'X-Api-App-ID': this.config.appId,
            'X-Api-Access-Key': this.config.accessKey,
            'X-Api-Resource-Id': 'volc.speech.dialog',
            'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
            'X-Api-Connect-Id': connectId,
          },
        });

        this.ws.on('open', () => {
          console.log('[Doubao] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // 发送 StartConnection 事件
          this.sendEvent(ClientEventId.StartConnection, undefined, {});

          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('[Doubao] WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[Doubao] WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.currentSessionId = null;

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Doubao] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
              this.connect().catch((err) => {
                this.emit('error', err);
              });
            }, 2000);
          } else {
            this.emit('disconnected', { code, reason });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws && this.isConnected) {
      this.sendEvent(ClientEventId.FinishConnection, undefined, {});
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * 开始会话
   */
  startSession(options: SessionOptions = {}): void {
    if (!this.isConnected || !this.currentSessionId) {
      throw new Error('Not connected or no session ID');
    }

    const payload: any = {
      dialog: {
        bot_name: options.botName || '日报助手',
        system_role: options.systemRole || '你是专业的日报助手，帮助用户整理日常工作内容',
        speaking_style: options.speakingStyle || '专业、友好、简洁',
        dialog_id: options.dialogId || '',
        extra: {
          model: options.model || this.config.model,
          input_mod: 'audio', // 音频输入模式
          enable_volc_websearch: false, // 关闭联网搜索
          enable_music: false, // 关闭唱歌能力
          strict_audit: true, // 开启严格审核
        },
      },
      tts: {
        speaker: options.speaker || this.config.defaultSpeaker,
      },
      asr: {
        audio_info: {
          format: 'speech_opus', // 接受 Opus 格式（前端发送的 WebM 包含 Opus 编码）
          sample_rate: 16000,
          channel: 1,
        },
      },
    };

    this.sendEvent(ClientEventId.StartSession, this.currentSessionId, payload);
    console.log('[Doubao] Session started with Opus format');
  }

  /**
   * 结束会话
   */
  finishSession(): void {
    if (this.currentSessionId) {
      this.sendEvent(ClientEventId.FinishSession, this.currentSessionId, {});
      console.log('[Doubao] Session finished');
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 发送音频数据
   */
  sendAudio(audioData: Buffer): void {
    console.log('[Doubao] sendAudio called', {
      connected: this.isConnected,
      hasWs: !!this.ws,
      wsReadyState: this.ws?.readyState,
      sessionId: this.currentSessionId,
      audioSize: audioData.length
    });

    if (!this.isConnected) {
      console.error('[Doubao] Cannot send audio - not connected', {
        connected: this.isConnected,
        wsState: this.ws?.readyState
      });
      throw new Error('Not connected');
    }

    if (this.audioSequence === 0) {
      console.log('[Doubao] Sending first audio frame', {
        sessionId: this.currentSessionId,
        audioSize: audioData.length
      });
    }

    try {
      const frame = encodeAudioFrame(audioData, this.audioSequence);
      console.log('[Doubao] Sending audio frame to WebSocket', {
        frameSize: frame.length,
        sequence: this.audioSequence
      });
      this.ws?.send(frame);
      console.log('[Doubao] Audio frame sent successfully', {
        sequence: this.audioSequence
      });
      this.audioSequence++;
    } catch (error) {
      console.error('[Doubao] Failed to send audio frame', error);
      throw error;
    }
  }

  /**
   * 发送文本查询
   */
  sendTextQuery(text: string): void {
    if (!this.currentSessionId) {
      throw new Error('No active session');
    }

    const payload = {
      content: text,
    };

    this.sendEvent(ClientEventId.ChatTextQuery, this.currentSessionId, payload);
  }

  /**
   * 生成新的会话 ID
   */
  createSessionId(): string {
    this.currentSessionId = generateUUID();
    return this.currentSessionId;
  }

  /**
   * 获取当前会话 ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 发送事件
   */
  private sendEvent(eventId: number, sessionId: string | undefined, payload: any): void {
    if (!this.ws) {
      throw new Error('WebSocket not initialized');
    }

    const frame = encodeJsonEvent(eventId, sessionId, payload);
    this.ws.send(frame);
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: Buffer): void {
    try {
      const frame = decodeFrame(data);

      // 如果没有 eventId，跳过
      if (frame.eventId === undefined) {
        return;
      }

      // 处理音频响应
      if (frame.eventId === ServerEventId.TTSResponse && frame.payload) {
        console.log('[Doubao] TTS audio response received', {
          payloadSize: frame.payload.length
        });
        this.emit('tts-audio', frame.payload);
        return;
      }

      // 解析 JSON 事件
      const eventData = decodeJsonEvent(frame);
      if (!eventData) {
        return;
      }

      console.log('[Doubao] Event received:', {
        eventId: frame.eventId,
        eventType: ServerEventId[frame.eventId],
        eventData
      });

      // 根据事件类型分发
      switch (frame.eventId) {
        case ServerEventId.ConnectionStarted:
          this.handleConnectionStarted(eventData);
          break;

        case ServerEventId.ConnectionFailed:
          this.handleConnectionFailed(eventData);
          break;

        case ServerEventId.SessionStarted:
          this.handleSessionStarted(eventData);
          break;

        case ServerEventId.SessionFailed:
          this.handleSessionFailed(eventData);
          break;

        case ServerEventId.ASRResponse:
          this.handleASRResponse(eventData);
          break;

        case ServerEventId.ASREnded:
          this.handleASREnded(eventData);
          break;

        case ServerEventId.ChatResponse:
          this.handleChatResponse(eventData);
          break;

        case ServerEventId.ChatEnded:
          this.handleChatEnded(eventData);
          break;

        case ServerEventId.DialogCommonError:
          this.handleError(eventData);
          break;

        case ServerEventId.UsageResponse:
          this.handleUsage(eventData);
          break;

        default:
          console.log(`[Doubao] Unhandled event ${frame.eventId}:`, eventData);
      }
    } catch (error) {
      console.error('[Doubao] Failed to handle message:', error);
    }
  }

  /**
   * 处理连接成功
   */
  private handleConnectionStarted(data: any): void {
    console.log('[Doubao] Connection started', data);
    // 连接成功后，创建会话 ID
    const sessionId = this.createSessionId();
    console.log('[Doubao] Created session ID:', sessionId);
  }

  /**
   * 处理连接失败
   */
  private handleConnectionFailed(data: any): void {
    console.error('[Doubao] Connection failed:', data);
    this.emit('error', new Error(data.error || 'Connection failed'));
  }

  /**
   * 处理会话启动成功
   */
  private handleSessionStarted(data: any): void {
    console.log('[Doubao] Session started successfully', {
      dialogId: data.dialog_id,
      fullData: data
    });
    this.emit('session-started', { dialogId: data.dialog_id });
  }

  /**
   * 处理会话失败
   */
  private handleSessionFailed(data: any): void {
    console.error('[Doubao] Session failed:', data);
    this.emit('error', new Error(data.error || 'Session failed'));
  }

  /**
   * 处理语音识别结果
   */
  private handleASRResponse(data: any): void {
    console.log('[Doubao] ASR response received:', data);
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const text = result.text;
      const isInterim = result.is_interim || false;

      console.log('[Doubao] Emitting asr-text event:', { text, isInterim });
      this.emit('asr-text', { text, isInterim });
    }
  }

  /**
   * 处理语音识别结束
   */
  private handleASREnded(data: any): void {
    console.log('[Doubao] ASR ended:', data);
    this.emit('asr-ended', data);
  }

  /**
   * 处理对话响应
   */
  private handleChatResponse(data: any): void {
    console.log('[Doubao] Chat response received:', {
      content: data.content,
      questionId: data.question_id,
      replyId: data.reply_id
    });
    const content = data.content;
    const questionId = data.question_id;
    const replyId = data.reply_id;

    console.log('[Doubao] Emitting chat-response event');
    this.emit('chat-response', { content, questionId, replyId });
  }

  /**
   * 处理对话结束
   */
  private handleChatEnded(data: any): void {
    this.emit('chat-ended', data);
  }

  /**
   * 处理错误
   */
  private handleError(data: any): void {
    console.error('[Doubao] Error:', data);
    this.emit('error', new Error(data.message || 'Unknown error'));
  }

  /**
   * 处理用量信息
   */
  private handleUsage(data: any): void {
    this.emit('usage', data.usage);
  }
}

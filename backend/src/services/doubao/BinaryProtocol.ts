/**
 * 豆包 Realtime API 二进制协议编解码器
 *
 * 协议规范：
 * - Header (4 bytes) + Optional + Payload Size (4 bytes) + Payload
 */

export enum MessageType {
  FullClientRequest = 0b0001,
  FullServerResponse = 0b1001,
  AudioOnlyRequest = 0b0010,
  AudioOnlyResponse = 0b1011,
  ErrorInformation = 0b1111,
}

export enum SerializationMethod {
  Raw = 0b0000,
  JSON = 0b0001,
}

export enum CompressionMethod {
  None = 0b0000,
  Gzip = 0b0001,
}

export enum ClientEventId {
  StartConnection = 1,
  FinishConnection = 2,
  StartSession = 100,
  FinishSession = 102,
  TaskRequest = 200,
  SayHello = 300,
  ChatTTSText = 500,
  ChatTextQuery = 501,
  ChatRAGText = 502,
  ConversationCreate = 510,
  ConversationUpdate = 511,
  ConversationRetrieve = 512,
  ConversationDelete = 514,
}

export enum ServerEventId {
  ConnectionStarted = 50,
  ConnectionFailed = 51,
  ConnectionFinished = 52,
  SessionStarted = 150,
  SessionFinished = 152,
  SessionFailed = 153,
  UsageResponse = 154,
  TTSSentenceStart = 350,
  TTSSentenceEnd = 351,
  TTSResponse = 352,
  TTSEnded = 359,
  ASRInfo = 450,
  ASRResponse = 451,
  ASREnded = 459,
  ChatResponse = 550,
  ChatTextQueryConfirmed = 553,
  ChatEnded = 559,
  ConversationCreated = 567,
  ConversationUpdated = 568,
  ConversationRetrieved = 569,
  ConversationDeleted = 571,
  DialogCommonError = 599,
}

export interface BinaryFrame {
  messageType: MessageType;
  serialization: SerializationMethod;
  compression: CompressionMethod;
  sequence?: number;
  eventId?: number;
  connectId?: string;
  sessionId?: string;
  errorCode?: number;
  payload?: Buffer;
}

/**
 * 编码二进制帧
 */
export function encodeFrame(frame: BinaryFrame): Buffer {
  const buffers: Buffer[] = [];

  // 1. Header (4 bytes)
  const header = Buffer.alloc(4);
  header[0] = 0b00010001; // Protocol Version (0b0001) + Header Size (0b0001)

  // Byte 1: Message Type + Flags
  const hasSequence = frame.sequence !== undefined;
  const hasEventId = frame.eventId !== undefined;
  const hasConnectId = frame.connectId !== undefined;
  const hasSessionId = frame.sessionId !== undefined;
  const hasErrorCode = frame.errorCode !== undefined;

  let flags = 0;
  if (hasErrorCode) flags = 0b1111;
  else if (hasSequence && (frame.sequence!) > 0) flags = 0b0001;
  else if (hasSequence && (frame.sequence!) === -1) flags = 0b0011;
  else if (hasEventId) flags = 0b0100;

  header[1] = (frame.messageType << 4) | flags;

  // Byte 2: Serialization + Compression
  header[2] = (frame.serialization << 4) | frame.compression;

  // Byte 3: Reserved
  header[3] = 0x00;

  buffers.push(header);

  // 2. Optional fields
  if (frame.errorCode !== undefined) {
    const errorCodeBuf = Buffer.alloc(4);
    errorCodeBuf.writeUInt32BE(frame.errorCode, 0);
    buffers.push(errorCodeBuf);
  }

  if (frame.sequence !== undefined && frame.sequence !== -1) {
    const sequenceBuf = Buffer.alloc(4);
    sequenceBuf.writeInt32BE(frame.sequence as number, 0);
    buffers.push(sequenceBuf);
  }

  if (frame.eventId !== undefined) {
    const eventIdBuf = Buffer.alloc(4);
    eventIdBuf.writeUInt32BE(frame.eventId, 0);
    buffers.push(eventIdBuf);
  }

  if (frame.connectId !== undefined) {
    const connectIdBytes = Buffer.from(frame.connectId, 'utf-8');
    const connectIdSizeBuf = Buffer.alloc(4);
    connectIdSizeBuf.writeUInt32BE(connectIdBytes.length, 0);
    buffers.push(connectIdSizeBuf);
    buffers.push(connectIdBytes);
  }

  if (frame.sessionId !== undefined) {
    const sessionIdBytes = Buffer.from(frame.sessionId, 'utf-8');
    const sessionIdSizeBuf = Buffer.alloc(4);
    sessionIdSizeBuf.writeUInt32BE(sessionIdBytes.length, 0);
    buffers.push(sessionIdSizeBuf);
    buffers.push(sessionIdBytes);
  }

  // 3. Payload Size + Payload
  if (frame.payload) {
    const payloadSizeBuf = Buffer.alloc(4);
    payloadSizeBuf.writeUInt32BE(frame.payload.length, 0);
    buffers.push(payloadSizeBuf);
    buffers.push(frame.payload);
  }

  return Buffer.concat(buffers);
}

/**
 * 解码二进制帧
 */
export function decodeFrame(data: Buffer): BinaryFrame {
  if (data.length < 4) {
    throw new Error('Invalid frame: too short');
  }

  let offset = 0;

  // 1. Header (4 bytes)
  const header = data.subarray(offset, offset + 4);
  offset += 4;

  const protocolVersion = (header[0] >> 4) & 0b00001111;
  const headerSize = header[0] & 0b00001111;
  const messageType = (header[1] >> 4) & 0b00001111;
  const flags = header[1] & 0b00001111;
  const serialization = (header[2] >> 4) & 0b00001111;
  const compression = header[2] & 0b00001111;

  const frame: BinaryFrame = {
    messageType,
    serialization,
    compression,
  };

  // 2. Optional fields
  const hasErrorCode = flags === 0b1111;
  const hasSequence = flags === 0b0001 || flags === 0b0011;
  const hasEventId = flags === 0b0100;

  if (hasErrorCode) {
    frame.errorCode = data.readUInt32BE(offset);
    offset += 4;
  }

  if (hasSequence) {
    frame.sequence = data.readInt32BE(offset);
    offset += 4;
  }

  if (hasEventId) {
    frame.eventId = data.readUInt32BE(offset);
    offset += 4;

    // Check for session ID (present for Session events)
    if (offset + 4 <= data.length) {
      const sessionIdSize = data.readUInt32BE(offset);
      offset += 4;

      if (sessionIdSize > 0 && offset + sessionIdSize <= data.length) {
        frame.sessionId = data.subarray(offset, offset + sessionIdSize).toString('utf-8');
        offset += sessionIdSize;
      }
    }
  }

  // 3. Payload
  if (offset + 4 <= data.length) {
    const payloadSize = data.readUInt32BE(offset);
    offset += 4;

    if (payloadSize > 0 && offset + payloadSize <= data.length) {
      frame.payload = data.subarray(offset, offset + payloadSize);
      offset += payloadSize;
    }
  }

  return frame;
}

/**
 * 编码 JSON 事件
 */
export function encodeJsonEvent(
  eventId: number,
  sessionId: string | undefined,
  payload: any
): Buffer {
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = Buffer.from(payloadJson, 'utf-8');

  return encodeFrame({
    messageType: MessageType.FullClientRequest,
    serialization: SerializationMethod.JSON,
    compression: CompressionMethod.None,
    eventId,
    sessionId,
    payload: payloadBytes,
  });
}

/**
 * 编码音频帧
 */
export function encodeAudioFrame(audioData: Buffer, sequence: number): Buffer {
  return encodeFrame({
    messageType: MessageType.AudioOnlyRequest,
    serialization: SerializationMethod.Raw,
    compression: CompressionMethod.None,
    sequence,
    payload: audioData,
  });
}

/**
 * 解码 JSON 事件
 */
export function decodeJsonEvent(frame: BinaryFrame): any {
  if (!frame.payload) {
    return null;
  }

  if (frame.serialization === SerializationMethod.JSON) {
    const jsonStr = frame.payload.toString('utf-8');
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse JSON payload:', error);
      return null;
    }
  }

  return null;
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

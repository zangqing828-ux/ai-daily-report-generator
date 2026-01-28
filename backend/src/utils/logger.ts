export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel
  private context?: string

  constructor(level: LogLevel = LogLevel.INFO, context?: string) {
    this.level = level
    this.context = context
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString()
    const contextStr = this.context ? `[${this.context}]` : ''
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} ${level}${contextStr} ${message}${metaStr}`
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, meta))
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, meta))
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta))
    }
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMeta = error instanceof Error
        ? { ...meta, error: error.message, stack: error.stack }
        : { ...meta, error }

      console.error(this.formatMessage('ERROR', message, errorMeta))
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setContext(context: string): Logger {
    return new Logger(this.level, context)
  }

  child(context: string): Logger {
    return new Logger(this.level, this.context ? `${this.context}:${context}` : context)
  }
}

// 默认 logger 实例
const defaultLevel = Object.keys(LogLevel).includes(process.env['LOG_LEVEL'] || '')
  ? LogLevel[process.env['LOG_LEVEL'] as keyof typeof LogLevel]
  : LogLevel.INFO

export const logger = new Logger(defaultLevel)

export default Logger

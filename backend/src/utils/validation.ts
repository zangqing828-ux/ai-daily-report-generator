import { z } from 'zod'

// 用户消息验证 schema
export const userMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
    .max(1000, 'Message too long (max 1000 characters)')
    .refine(
      (msg) => !/<script|javascript:|onerror=/i.test(msg),
      'Invalid characters detected'
    )
    .refine(
      (msg) => msg.trim().length > 0,
      'Message cannot be empty'
    )
})

// 项目名称验证
export const projectNameSchema = z.string()
  .min(1, 'Project name cannot be empty')
  .max(50, 'Project name too long (max 50 characters)')
  .regex(/^[\u4e00-\u9fa5a-zA-Z0-9_\s-]+$/, 'Invalid project name format')

// Session ID 验证
export const sessionIdSchema = z.string()
  .uuid('Invalid session ID format')

// API 请求验证
export const startCallSchema = z.object({
  projectName: projectNameSchema.optional().default('项目 A')
})

export const endCallSchema = z.object({
  sessionId: sessionIdSchema
})

// API 响应验证 schemas
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional()
})

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional()
})

export const startCallResponseSchema = z.object({
  success: z.literal(true),
  sessionId: sessionIdSchema,
  message: z.string(),
  serverTime: z.string()
})

export const endCallResponseSchema = z.object({
  success: z.literal(true),
  message: z.string()
})

export const callStatusResponseSchema = z.object({
  success: z.literal(true),
  sessionId: sessionIdSchema,
  status: z.enum(['active', 'ended', 'error']),
  duration: z.number().int().min(0)
})

// 导出类型
export type UserMessage = z.infer<typeof userMessageSchema>
export type ProjectName = z.infer<typeof projectNameSchema>
export type SessionId = z.infer<typeof sessionIdSchema>
export type SuccessResponse = z.infer<typeof successResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>

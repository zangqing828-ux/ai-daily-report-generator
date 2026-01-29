import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { ReportGenerator, DailyReportInput } from '../services/report/ReportGenerator'
import { ReportTemplate } from '../services/report/ReportTemplate'

const router = Router()
const reportGenerator = new ReportGenerator()
const reportTemplate = new ReportTemplate()

// TODO: 添加认证中间件
// router.use(authenticateToken)

/**
 * POST /api/reports/generate
 * 生成日报（不保存）
 */
router.post('/generate', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { projectName, conversationHistory, duration } = req.body

    if (!projectName || !conversationHistory) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数：projectName, conversationHistory'
      })
    }

    // 生成今日日期
    const date = new Date().toISOString().split('T')[0]

    // 调用生成服务
    const report = await reportGenerator.generateReport({
      projectName,
      conversationHistory,
      duration: duration || '0:00',
      date
    })

    res.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error generating report:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '生成日报失败'
    })
  }
})

/**
 * POST /api/reports
 * 生成并保存日报
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { projectName, conversationHistory, duration, projectId } = req.body

    if (!projectName || !conversationHistory || !projectId) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数：projectName, conversationHistory, projectId'
      })
    }

    // 生成今日日期
    const date = new Date().toISOString().split('T')[0]

    // 检查是否已存在今日日报
    const existing = await prisma.dailyReport.findFirst({
      where: {
        userId,
        projectId,
        date
      }
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        error: '今日已生成日报',
        data: existing
      })
    }

    // 生成日报内容
    const report = await reportGenerator.generateReport({
      projectName,
      conversationHistory,
      duration: duration || '0:00',
      date
    })

    // 保存到数据库
    const savedReport = await prisma.dailyReport.create({
      data: {
        date,
        userId,
        projectId,
        summary: report.summary,
        todayWork: report.todayWork,
        tomorrowPlan: report.tomorrowPlan,
        conversation: { history: conversationHistory },
        duration
      }
    })

    res.status(201).json({
      success: true,
      data: savedReport
    })
  } catch (error) {
    console.error('Error creating report:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '保存日报失败'
    })
  }
})

/**
 * GET /api/reports/:id
 * 获取日报详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'

    const report = await prisma.dailyReport.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!report) {
      return res.status(404).json({
        success: false,
        error: '日报不存在'
      })
    }

    res.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error fetching report:', error)
    res.status(500).json({
      success: false,
      error: '获取日报失败'
    })
  }
})

/**
 * GET /api/reports
 * 获取日报列表（支持筛选）
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { projectId, startDate, endDate, limit = 20 } = req.query

    const where: any = {
      userId
    }

    if (projectId) {
      where.projectId = projectId as string
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      take: Number(limit),
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: reports
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({
      success: false,
      error: '获取日报列表失败'
    })
  }
})

/**
 * PUT /api/reports/:id
 * 更新日报
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { todayWork, tomorrowPlan, summary } = req.body

    // 验证权限
    const existing = await prisma.dailyReport.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '日报不存在'
      })
    }

    // 更新日报
    const updated = await prisma.dailyReport.update({
      where: {
        id
      },
      data: {
        ...(todayWork && { todayWork }),
        ...(tomorrowPlan && { tomorrowPlan }),
        ...(summary && { summary })
      }
    })

    res.json({
      success: true,
      data: updated
    })
  } catch (error) {
    console.error('Error updating report:', error)
    res.status(500).json({
      success: false,
      error: '更新日报失败'
    })
  }
})

/**
 * DELETE /api/reports/:id
 * 删除日报
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'

    // 验证权限
    const existing = await prisma.dailyReport.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '日报不存在'
      })
    }

    await prisma.dailyReport.delete({
      where: {
        id
      }
    })

    res.json({
      success: true,
      message: '日报已删除'
    })
  } catch (error) {
    console.error('Error deleting report:', error)
    res.status(500).json({
      success: false,
      error: '删除日报失败'
    })
  }
})

export default router

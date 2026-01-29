import { Router } from 'express'
import { ProjectService } from '../services/project/ProjectService'

const router = Router()
const projectService = new ProjectService()

// TODO: 添加认证中间件
// router.use(authenticateToken)

/**
 * GET /api/projects
 * 获取用户的所有项目
 */
router.get('/', async (req, res) => {
  try {
    // TODO: 从 JWT 中获取 userId
    const userId = req.headers['x-user-id'] as string || 'default-user'

    const projects = await projectService.getUserProjects(userId)

    res.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取项目列表失败'
    })
  }
})

/**
 * GET /api/projects/:id
 * 获取单个项目详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'

    const project = await projectService.getProjectById(id, userId)

    res.json({
      success: true,
      data: project
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    const statusCode = error instanceof Error && error.message === '项目不存在或无权访问' ? 404 : 500
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : '获取项目详情失败'
    })
  }
})

/**
 * POST /api/projects
 * 创建新项目
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { name, description } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空'
      })
    }

    const project = await projectService.createProject({
      name: name.trim(),
      description: description?.trim(),
      userId
    })

    res.status(201).json({
      success: true,
      data: project
    })
  } catch (error) {
    console.error('Error creating project:', error)
    const statusCode = error instanceof Error && error.message === '项目名称已存在' ? 409 : 500
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : '创建项目失败'
    })
  }
})

/**
 * PUT /api/projects/:id
 * 更新项目
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'
    const { name, description } = req.body

    if (name && name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空'
      })
    }

    const project = await projectService.updateProject(id, userId, {
      name: name?.trim(),
      description: description?.trim()
    })

    res.json({
      success: true,
      data: project
    })
  } catch (error) {
    console.error('Error updating project:', error)
    const statusCode = error instanceof Error && error.message === '项目不存在或无权访问' ? 404 : 500
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : '更新项目失败'
    })
  }
})

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.headers['x-user-id'] as string || 'default-user'

    await projectService.deleteProject(id, userId)

    res.json({
      success: true,
      message: '项目已删除'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    const statusCode = error instanceof Error && error.message === '项目不存在或无权访问' ? 404 : 500
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : '删除项目失败'
    })
  }
})

export default router

import { prisma } from '../../lib/prisma'

export interface CreateProjectInput {
  name: string
  description?: string
  userId: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
}

export class ProjectService {
  /**
   * 创建项目
   */
  async createProject(input: CreateProjectInput) {
    const { name, description, userId } = input

    // 检查项目名是否已存在
    const existing = await prisma.project.findFirst({
      where: {
        userId,
        name
      }
    })

    if (existing) {
      throw new Error('项目名称已存在')
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId
      }
    })

    return project
  }

  /**
   * 获取用户的所有项目
   */
  async getUserProjects(userId: string) {
    const projects = await prisma.project.findMany({
      where: {
        userId
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        _count: {
          select: {
            reports: true
          }
        }
      }
    })

    return projects
  }

  /**
   * 获取单个项目详情
   */
  async getProjectById(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      },
      include: {
        reports: {
          orderBy: {
            date: 'desc'
          },
          take: 10 // 最近10条日报
        }
      }
    })

    if (!project) {
      throw new Error('项目不存在或无权访问')
    }

    return project
  }

  /**
   * 更新项目
   */
  async updateProject(projectId: string, userId: string, input: UpdateProjectInput) {
    // 验证权限
    const existing = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    })

    if (!existing) {
      throw new Error('项目不存在或无权访问')
    }

    // 如果要修改名称，检查新名称是否已存在
    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.project.findFirst({
        where: {
          userId,
          name: input.name
        }
      })

      if (duplicate) {
        throw new Error('项目名称已存在')
      }
    }

    const project = await prisma.project.update({
      where: {
        id: projectId
      },
      data: input
    })

    return project
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string, userId: string) {
    // 验证权限
    const existing = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId
      }
    })

    if (!existing) {
      throw new Error('项目不存在或无权访问')
    }

    // 删除项目（级联删除相关的日报）
    await prisma.project.delete({
      where: {
        id: projectId
      }
    })

    return { success: true }
  }
}

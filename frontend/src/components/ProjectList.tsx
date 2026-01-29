import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCallStore } from '../store/useCallStore'
import { getProjects, type Project } from '../services/project'

export default function ProjectList() {
  const navigate = useNavigate()
  const { setCurrentProject, setCurrentProjectId } = useCallStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project.name)
    setCurrentProjectId(project.id)
    navigate('/call')
  }

  const handleCreateProject = () => {
    navigate('/projects/create')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-gray-900 text-lg font-semibold">选择项目</h1>
        <button
          onClick={handleCreateProject}
          className="text-gray-900 text-sm font-medium hover:text-gray-600 transition-colors"
        >
          + 新建项目
        </button>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadProjects}
                className="px-6 py-2 rounded-lg bg-gray-900 text-white"
              >
                重试
              </button>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">还没有项目，创建一个开始吧！</p>
              <button
                onClick={handleCreateProject}
                className="px-6 py-2 rounded-lg bg-gray-900 text-white"
              >
                创建项目
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-8 px-6">
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="w-full text-left p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-gray-900 text-base font-medium group-hover:text-gray-900">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-gray-400 text-xs">
                      {project._count?.reports || 0} 份日报
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/projects/${project.id}`)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="h-16 border-t border-gray-200 flex items-center justify-between px-6">
        <p className="text-gray-400 text-sm">
          选择一个项目开始语音日报
        </p>
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          查看历史记录 →
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getReports, type SavedReport } from '../services/report'
import { getProjects, type Project } from '../services/project'

export default function HistoryList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 筛选条件
  const projectFilter = searchParams.get('project')

  useEffect(() => {
    loadProjects()
    loadReports()
  }, [projectFilter])

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error('加载项目失败:', err)
    }
  }

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const filters: {
        projectId?: string
        limit?: number
      } = {
        limit: 50
      }

      if (projectFilter) {
        filters.projectId = projectFilter
      }

      const data = await getReports(filters)
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载日报失败')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterByProject = (projectId: string | null) => {
    if (projectId) {
      setSearchParams({ project: projectId })
    } else {
      setSearchParams({})
    }
  }

  const handleViewReport = (reportId: string) => {
    navigate(`/history/${reportId}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-600 text-sm hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="text-gray-900 text-lg font-semibold">历史日报</h1>
        <div className="w-16"></div>
      </div>

      {/* 筛选栏 */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 whitespace-nowrap">筛选项目:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleFilterByProject(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !projectFilter
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                全部
              </button>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleFilterByProject(project.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    projectFilter === project.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 日报列表 */}
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
                onClick={loadReports}
                className="px-6 py-2 rounded-lg bg-gray-900 text-white"
              >
                重试
              </button>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {projectFilter ? '该项目还没有日报记录' : '还没有日报记录'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 rounded-lg bg-gray-900 text-white"
              >
                创建日报
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8 px-6">
            <div className="space-y-4">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleViewReport(report.id)}
                  className="w-full text-left p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-gray-900 text-lg font-medium group-hover:text-gray-900 mb-2">
                        {report.projectName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{report.date}</span>
                        {report.duration && (
                          <span>时长: {report.duration}</span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors flex-shrink-0 ml-4"
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

                  {report.summary && (
                    <p className="text-gray-600 text-sm line-clamp-2 mt-3 pt-3 border-t border-gray-100">
                      {report.summary}
                    </p>
                  )}

                  {/* 工作分类标签 */}
                  {Object.keys(report.todayWork).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.keys(report.todayWork).slice(0, 3).map((category) => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {category} {report.todayWork[category]?.length || 0}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

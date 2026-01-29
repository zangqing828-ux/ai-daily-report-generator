import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, updateProject, deleteProject, type Project } from '../services/project'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project & { reports?: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (id) {
      loadProject()
    }
  }, [id])

  const loadProject = async () => {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const data = await getProject(id)
      setProject(data)
      setEditName(data.name)
      setEditDescription(data.description || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!id || !editName.trim()) {
      setError('项目名称不能为空')
      return
    }

    setSaving(true)
    setError('')

    try {
      const updated = await updateProject(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      })

      setProject(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新项目失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteProject(id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除项目失败')
      setShowDeleteConfirm(false)
    }
  }

  const handleStartConversation = () => {
    navigate('/call')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 text-sm hover:text-gray-900 transition-colors"
          >
            ← 返回
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 rounded-lg bg-gray-900 text-white"
            >
              返回项目列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return null
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
        <h1 className="text-gray-900 text-lg font-semibold">项目详情</h1>
        <div className="w-16"></div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isEditing ? (
            // 编辑模式
            <div className="space-y-6">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-900 mb-2">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-900 mb-2">
                  项目描述
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(project.name)
                    setEditDescription(project.description || '')
                    setError('')
                  }}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="flex-1 px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            // 查看模式
            <div className="space-y-8">
              {/* 项目信息 */}
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{project.name}</h2>
                {project.description && (
                  <p className="text-gray-600">{project.description}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>{project._count?.reports || 0} 份日报</span>
                  <span>创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
                >
                  编辑项目
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-3 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 active:scale-95 transition-all duration-200 font-medium"
                >
                  删除项目
                </button>
              </div>

              <button
                onClick={handleStartConversation}
                className="w-full px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium"
              >
                开始日报对话
              </button>

              {/* 查看该项目的所有历史日报 */}
              <button
                onClick={() => navigate(`/history?project=${id}`)}
                className="w-full px-6 py-3 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
              >
                查看该项目历史日报
              </button>

              {/* 历史日报 */}
              {project.reports && project.reports.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">最近日报</h3>
                  <div className="space-y-3">
                    {project.reports.slice(0, 3).map((report: any) => (
                      <div
                        key={report.id}
                        onClick={() => navigate(`/history/${report.id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-900 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-gray-900">{report.date}</span>
                          {report.duration && (
                            <span className="text-xs text-gray-500">{report.duration}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{report.summary}</p>
                      </div>
                    ))}
                  </div>
                  {project.reports.length > 3 && (
                    <button
                      onClick={() => navigate(`/history?project=${id}`)}
                      className="w-full mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      查看全部 {project._count?.reports || project.reports.length} 份日报 →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 删除确认对话框 */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
                <p className="text-gray-600 mb-6">
                  确定要删除项目 "{project.name}" 吗？此操作将同时删除该项目的所有日报，且无法恢复。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all duration-200 font-medium"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

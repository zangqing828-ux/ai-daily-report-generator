import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProject } from '../services/project'

export default function CreateProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('项目名称不能为空')
      return
    }

    setLoading(true)

    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined
      })

      // 创建成功，返回项目列表
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败')
    } finally {
      setLoading(false)
    }
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
          取消
        </button>
        <h1 className="text-gray-900 text-lg font-semibold">创建项目</h1>
        <div className="w-16"></div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 项目名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：客户管理系统"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* 项目描述 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                项目描述 <span className="text-gray-400">(可选)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述项目的目标和范围..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '创建中...' : '创建项目'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

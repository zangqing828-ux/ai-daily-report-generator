import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getReport, updateReport, deleteReport, type SavedReport } from '../services/report'

export default function HistoryDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editSummary, setEditSummary] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      loadReport()
    }
  }, [id])

  const loadReport = async () => {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const data = await getReport(id)
      setReport(data)
      setEditSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载日报失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!report || !id) return

    setSaving(true)
    setError('')

    try {
      const updated = await updateReport(id, {
        summary: editSummary
      })
      setReport(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新日报失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return

    setIsDeleting(true)
    setError('')

    try {
      await deleteReport(id)
      navigate('/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除日报失败')
      setIsDeleting(false)
    }
  }

  const handleExport = (format: 'md' | 'txt' | 'pdf') => {
    if (!report) return

    if (format === 'pdf') {
      alert('PDF 导出功能即将上线')
      return
    }

    // 格式化为 Markdown
    const lines: string[] = []
    lines.push(`# ${report.projectName} - 日报\n`)
    lines.push(`**日期**: ${report.date}\n`)
    lines.push(`**时长**: ${report.duration}\n`)

    if (report.summary) {
      lines.push(`## 摘要\n`)
      lines.push(`${report.summary}\n`)
    }

    const categories = Object.keys(report.todayWork)
    if (categories.length > 0) {
      lines.push(`## 今日工作\n`)
      for (const category of categories) {
        const items = report.todayWork[category]
        if (items && items.length > 0) {
          lines.push(`### ${category}\n`)
          items.forEach((item, index) => {
            lines.push(`${index + 1}. ${item}`)
          })
          lines.push('')
        }
      }
    }

    if (report.highlights && report.highlights.length > 0) {
      lines.push(`## 亮点\n`)
      report.highlights.forEach((highlight, index) => {
        lines.push(`${index + 1}. ${highlight}`)
      })
      lines.push('')
    }

    if (report.risks && report.risks.length > 0) {
      lines.push(`## 风险与问题\n`)
      report.risks.forEach((risk, index) => {
        lines.push(`${index + 1}. ${risk}`)
      })
      lines.push('')
    }

    if (report.tomorrowPlan && report.tomorrowPlan.length > 0) {
      lines.push(`## 明日计划\n`)
      report.tomorrowPlan.forEach((plan, index) => {
        lines.push(`${index + 1}. ${plan}`)
      })
      lines.push('')
    }

    lines.push(`---\n`)
    lines.push(`*本日报由 AI 日报助手自动生成*`)

    const content = format === 'md' ? lines.join('\n') : report.summary
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.projectName}-${report.date}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <button
            onClick={() => navigate('/history')}
            className="text-gray-600 text-sm hover:text-gray-900 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-2 rounded-lg bg-gray-900 text-white"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!report) {
    return null
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <button
          onClick={() => navigate('/history')}
          className="text-gray-600 text-sm hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="text-gray-900 text-lg font-semibold">日报详情</h1>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              编辑
            </button>
          )}
        </div>
      </div>

      {/* 日报内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 元信息 */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{report.projectName}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{report.date}</span>
              {report.duration && <span>时长: {report.duration}</span>}
            </div>
          </div>

          {/* 摘要（可编辑） */}
          {isEditing ? (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                摘要
              </label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                disabled={saving}
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditSummary(report.summary)
                    setError('')
                  }}
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium disabled:opacity-50"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editSummary.trim()}
                  className="px-6 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            report.summary && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">摘要</h3>
                <p className="text-gray-700 leading-relaxed">{report.summary}</p>
              </div>
            )
          )}

          {/* 今日工作 */}
          {Object.keys(report.todayWork).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">今日工作</h3>
              {Object.entries(report.todayWork).map(([category, items]) => (
                items && items.length > 0 && (
                  <div key={category} className="mb-6 last:mb-0">
                    <h4 className="text-base font-medium text-gray-800 mb-3">{category}</h4>
                    <ul className="space-y-2">
                      {items.map((item, index) => (
                        <li key={index} className="text-gray-700 pl-4 border-l-2 border-gray-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
          )}

          {/* 亮点 */}
          {report.highlights && report.highlights.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">亮点</h3>
              <ul className="space-y-2">
                {report.highlights.map((highlight, index) => (
                  <li key={index} className="text-gray-700 pl-4 border-l-2 border-blue-200">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 风险与问题 */}
          {report.risks && report.risks.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">风险与问题</h3>
              <ul className="space-y-2">
                {report.risks.map((risk, index) => (
                  <li key={index} className="text-gray-700 pl-4 border-l-2 border-red-200">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 明日计划 */}
          {report.tomorrowPlan && report.tomorrowPlan.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">明日计划</h3>
              <ul className="space-y-2">
                {report.tomorrowPlan.map((plan, index) => (
                  <li key={index} className="text-gray-700 pl-4 border-l-2 border-gray-200">
                    {plan}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 危险操作区 */}
          {!isEditing && (
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  if (window.confirm('确定要删除这份日报吗？此操作无法撤销。')) {
                    handleDelete()
                  }
                }}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 active:scale-95 transition-all duration-200 font-medium disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '删除日报'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      {!isEditing && (
        <div className="h-20 border-t border-gray-200 flex items-center justify-center gap-3 bg-gray-50 px-6">
          <button
            onClick={() => handleExport('md')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
          >
            导出 Markdown
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:scale-95 transition-all duration-200 font-medium"
          >
            导出文本
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-6 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all duration-200 font-medium"
          >
            导出 PDF
          </button>
        </div>
      )}
    </div>
  )
}

import { useNavigate, useLocation } from 'react-router-dom'
import { useCallStore } from '../store/useCallStore'
import type { SavedReport } from '../services/report'

export default function ReportPreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const { reset } = useCallStore()
  const report = location.state?.report as SavedReport

  // 如果没有传递报告数据，返回首页
  if (!report) {
    navigate('/')
    return null
  }

  // 格式化为 Markdown
  const formatMarkdown = (report: SavedReport): string => {
    const lines: string[] = []

    // 标题
    lines.push(`# ${report.projectName} - 日报\n`)
    lines.push(`**日期**: ${report.date}\n`)
    lines.push(`**时长**: ${report.duration}\n`)

    // 摘要
    if (report.summary) {
      lines.push(`## 摘要\n`)
      lines.push(`${report.summary}\n`)
    }

    // 今日工作
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

    // 亮点
    if (report.highlights && report.highlights.length > 0) {
      lines.push(`## 亮点\n`)
      report.highlights.forEach((highlight, index) => {
        lines.push(`${index + 1}. ${highlight}`)
      })
      lines.push('')
    }

    // 风险
    if (report.risks && report.risks.length > 0) {
      lines.push(`## 风险与问题\n`)
      report.risks.forEach((risk, index) => {
        lines.push(`${index + 1}. ${risk}`)
      })
      lines.push('')
    }

    // 明日计划
    if (report.tomorrowPlan && report.tomorrowPlan.length > 0) {
      lines.push(`## 明日计划\n`)
      report.tomorrowPlan.forEach((plan, index) => {
        lines.push(`${index + 1}. ${plan}`)
      })
      lines.push('')
    }

    // 页脚
    lines.push(`---\n`)
    lines.push(`*本日报由 AI 日报助手自动生成*`)

    return lines.join('\n')
  }

  const markdown = formatMarkdown(report)

  const handleExport = (format: 'md' | 'txt' | 'pdf') => {
    if (format === 'pdf') {
      alert('PDF 导出功能即将上线')
      return
    }

    const content = format === 'md' ? markdown : report.summary
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

  const handleBack = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
        <button
          onClick={handleBack}
          className="text-gray-600 text-sm hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="text-gray-900 text-lg font-semibold">日报预览</h1>
        <div className="w-16"></div>
      </div>

      {/* 日报内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* 元信息 */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{report.projectName}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{report.date}</span>
              <span>时长: {report.duration}</span>
            </div>
          </div>

          {/* 摘要 */}
          {report.summary && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">摘要</h3>
              <p className="text-gray-700 leading-relaxed">{report.summary}</p>
            </div>
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
        </div>
      </div>

      {/* 底部操作栏 */}
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
    </div>
  )
}

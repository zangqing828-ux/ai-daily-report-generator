import { GeneratedReport } from './ReportGenerator'

export class ReportTemplate {
  /**
   * 渲染为 Markdown 格式
   */
  renderMarkdown(report: GeneratedReport): string {
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
        const items = report.todayWork[category as keyof typeof report.todayWork]
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
    if (report.highlights.length > 0) {
      lines.push(`## 亮点\n`)
      report.highlights.forEach((highlight, index) => {
        lines.push(`${index + 1}. ${highlight}`)
      })
      lines.push('')
    }

    // 风险
    if (report.risks.length > 0) {
      lines.push(`## 风险与问题\n`)
      report.risks.forEach((risk, index) => {
        lines.push(`${index + 1}. ${risk}`)
      })
      lines.push('')
    }

    // 明日计划
    if (report.tomorrowPlan.length > 0) {
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

  /**
   * 渲染为纯文本格式
   */
  renderText(report: GeneratedReport): string {
    const lines: string[] = []

    // 标题
    lines.push(`${report.projectName} - 日报`)
    lines.push(`日期: ${report.date}`)
    lines.push(`时长: ${report.duration}`)
    lines.push('')

    // 摘要
    if (report.summary) {
      lines.push('【摘要】')
      lines.push(report.summary)
      lines.push('')
    }

    // 今日工作
    const categories = Object.keys(report.todayWork)
    if (categories.length > 0) {
      lines.push('【今日工作】')

      for (const category of categories) {
        const items = report.todayWork[category as keyof typeof report.todayWork]
        if (items && items.length > 0) {
          lines.push(`\n${category}:`)
          items.forEach((item, index) => {
            lines.push(`  ${index + 1}. ${item}`)
          })
        }
      }
      lines.push('')
    }

    // 明日计划
    if (report.tomorrowPlan.length > 0) {
      lines.push('【明日计划】')
      report.tomorrowPlan.forEach((plan, index) => {
        lines.push(`${index + 1}. ${plan}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 渲染为 HTML 格式（用于 PDF）
   */
  renderHTML(report: GeneratedReport): string {
    let html = ''

    // 样式
    html += `
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  h1 { font-size: 28px; font-weight: 600; margin-bottom: 10px; color: #111; }
  .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
  h2 { font-size: 22px; font-weight: 600; margin-top: 30px; margin-bottom: 15px; color: #222; }
  h3 { font-size: 18px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; color: #333; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 8px; }
  .summary { background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0; }
  .highlights { background: #e8f4fd; padding: 16px; border-radius: 8px; margin: 20px 0; }
  .risks { background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; }
  .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; }
</style>
`

    // 内容
    html += `<div class="container">`

    // 标题
    html += `<h1>${report.projectName} - 日报</h1>`
    html += `<div class="meta">日期: ${report.date} | 时长: ${report.duration}</div>`

    // 摘要
    if (report.summary) {
      html += `<div class="summary"><strong>摘要</strong><br/>${report.summary}</div>`
    }

    // 今日工作
    const categories = Object.keys(report.todayWork)
    if (categories.length > 0) {
      html += `<h2>今日工作</h2>`
      for (const category of categories) {
        const items = report.todayWork[category as keyof typeof report.todayWork]
        if (items && items.length > 0) {
          html += `<h3>${category}</h3><ul>`
          items.forEach(item => {
            html += `<li>${item}</li>`
          })
          html += `</ul>`
        }
      }
    }

    // 亮点
    if (report.highlights.length > 0) {
      html += `<div class="highlights"><h2>亮点</h2><ul>`
      report.highlights.forEach(highlight => {
        html += `<li>${highlight}</li>`
      })
      html += `</ul></div>`
    }

    // 风险
    if (report.risks.length > 0) {
      html += `<div class="risks"><h2>风险与问题</h2><ul>`
      report.risks.forEach(risk => {
        html += `<li>${risk}</li>`
      })
      html += `</ul></div>`
    }

    // 明日计划
    if (report.tomorrowPlan.length > 0) {
      html += `<h2>明日计划</h2><ul>`
      report.tomorrowPlan.forEach(plan => {
        html += `<li>${plan}</li>`
      })
      html += `</ul>`
    }

    // 页脚
    html += `<div class="footer">本日报由 AI 日报助手自动生成</div>`
    html += `</div>`

    return html
  }

  /**
   * 渲染为 JSON 格式（用于存储）
   */
  renderJSON(report: GeneratedReport): string {
    return JSON.stringify(report, null, 2)
  }
}

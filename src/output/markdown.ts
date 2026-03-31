import type { AggregateResult } from '../core/types.js'

export function formatMarkdown(result: AggregateResult): string {
  const lines: string[] = []
  const dateStr = result.fetchedAt.toLocaleDateString('zh-CN')

  lines.push(`# 📡 信息采集报告 · ${dateStr}`)
  lines.push('')

  // 按信息源分组
  const grouped = new Map<string, typeof result.items>()
  for (const item of result.items) {
    const key = item.sourceName
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  for (const [sourceName, items] of grouped) {
    lines.push(`## ${sourceName}`)
    lines.push('')
    lines.push('| 标题 | 时间 |')
    lines.push('|------|------|')

    for (const item of items) {
      const time = item.publishedAt
        ? item.publishedAt.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : ''
      lines.push(`| [${item.title}](${item.url}) | ${time} |`)
    }
    lines.push('')
  }

  // 统计
  const s = result.stats
  lines.push('---')
  lines.push(`📊 信息源: ${s.totalSources} | 成功: ${s.successSources} | 失败: ${s.failedSources} | 条目: ${s.totalItems}`)

  return lines.join('\n')
}

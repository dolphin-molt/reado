import Table from 'cli-table3'
import chalk from 'chalk'
import type { AggregateResult } from '../core/types.js'
import { timeAgo } from '../utils/time.js'

export function formatTable(result: AggregateResult): string {
  const lines: string[] = []

  // 标题
  lines.push('')
  lines.push(chalk.bold.cyan(`  📡 信息采集报告 · ${result.fetchedAt.toLocaleDateString('zh-CN')}`))
  lines.push('')

  // 按信息源分组输出
  const grouped = new Map<string, typeof result.items>()
  for (const item of result.items) {
    const key = item.sourceName
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  for (const [sourceName, items] of grouped) {
    const truncated = items.length > 10
    const countStr = truncated ? chalk.gray(`${items.length}`) : String(items.length)
    lines.push(chalk.bold.yellow(`  ▸ ${sourceName} `) + chalk.yellow(`(${countStr})`))

    const table = new Table({
      chars: {
        'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
        'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
        'right': '', 'right-mid': '', 'middle': ' │ ',
      },
      style: { 'padding-left': 0, 'padding-right': 0 },
      colWidths: [50, 12],
      wordWrap: true,
    })

    const TABLE_LIMIT = 10
    const displayed = items.slice(0, TABLE_LIMIT)
    for (const item of displayed) {
      const time = item.publishedAt ? timeAgo(item.publishedAt) : ''
      table.push([
        chalk.white(truncateStr(item.title, 48)),
        chalk.gray(time),
      ])
    }

    lines.push(table.toString())
    if (items.length > TABLE_LIMIT) {
      lines.push(chalk.gray(`  … 显示 ${TABLE_LIMIT}/${items.length} 条，使用 -f json 或 -f markdown 查看全部`))
    }
    lines.push('')
  }

  // 统计
  const s = result.stats
  const dedupNote = s.deduplicatedItems > 0 ? chalk.gray(` | 去重: ${s.deduplicatedItems}`) : ''
  lines.push(chalk.gray(`  📊 信息源: ${s.totalSources} | 成功: ${chalk.green(String(s.successSources))} | 失败: ${chalk.red(String(s.failedSources))} | 缓存: ${s.cachedSources} | 条目: ${s.totalItems}`) + dedupNote)

  // 失败信息源
  const failed = result.results.filter(r => r.error)
  if (failed.length > 0) {
    lines.push('')
    for (const r of failed) {
      lines.push(chalk.red(`  ❌ ${r.source.name}: ${r.error}`))
    }
  }

  lines.push('')
  return lines.join('\n')
}

function truncateStr(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

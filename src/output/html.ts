import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { exec } from 'node:child_process'
import { platform } from 'node:os'
import type { AggregateResult } from '../core/types.js'
import { timeAgo } from '../utils/time.js'
import { getTemplate, getTemplateNames } from './templates/index.js'
import type { TemplateData, TemplateGroup } from './templates/types.js'

export { getTemplateNames }

/**
 * 将采集结果格式化为 HTML 并写入文件
 * @returns 生成的文件路径
 */
export function exportHTML(
  result: AggregateResult,
  opts: {
    theme?: string
    outputPath?: string
    open?: boolean
  } = {}
): string {
  const theme = opts.theme || 'default'
  const templateFn = getTemplate(theme)

  if (!templateFn) {
    const available = getTemplateNames().join(', ')
    throw new Error(`未知模板: ${theme}，可用模板: ${available}`)
  }

  // 转换为模板数据
  const templateData = toTemplateData(result)

  // 渲染 HTML
  const html = templateFn(templateData)

  // 确定输出路径
  const outputDir = join(homedir(), '.reado', 'reports')
  mkdirSync(outputDir, { recursive: true })

  const dateStr = result.fetchedAt.toISOString().slice(0, 10)
  const timeStr = result.fetchedAt.toISOString().slice(11, 16).replace(':', '')
  const defaultPath = join(outputDir, `report-${dateStr}-${timeStr}-${theme}.html`)

  let filePath = defaultPath
  if (opts.outputPath) {
    filePath = resolve(opts.outputPath)
    // 安全检查：禁止写入系统目录
    const homeDir = homedir()
    const cwd = process.cwd()
    if (!filePath.startsWith(homeDir) && !filePath.startsWith(cwd) && !filePath.startsWith('/tmp')) {
      throw new Error(`输出路径不安全: ${filePath}，只允许写入用户目录、当前目录或 /tmp`)
    }
  }

  // 写入文件
  writeFileSync(filePath, html, 'utf-8')

  // 自动打开浏览器
  if (opts.open) {
    openInBrowser(filePath)
  }

  return filePath
}

function toTemplateData(result: AggregateResult): TemplateData {
  // 按信息源分组
  const groupMap = new Map<string, TemplateGroup>()

  for (const item of result.items) {
    if (!groupMap.has(item.source)) {
      groupMap.set(item.source, {
        sourceName: item.sourceName,
        sourceId: item.source,
        itemCount: 0,
        items: [],
      })
    }
    const group = groupMap.get(item.source)!
    group.items.push({
      title: item.title,
      url: item.url,
      summary: item.summary,
      time: item.publishedAt
        ? item.publishedAt.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
      timeAgo: item.publishedAt ? timeAgo(item.publishedAt) : '',
    })
    group.itemCount = group.items.length
  }

  const failures = result.results
    .filter(r => r.error)
    .map(r => ({ sourceName: r.source.name, error: r.error! }))

  return {
    title: '信息采集报告',
    fetchedAt: result.fetchedAt.toLocaleString('zh-CN'),
    date: result.fetchedAt.toLocaleDateString('zh-CN'),
    stats: result.stats,
    groups: [...groupMap.values()],
    failures,
  }
}

function openInBrowser(filePath: string): void {
  const cmd = platform() === 'darwin'
    ? `open "${filePath}"`
    : platform() === 'win32'
    ? `start "" "${filePath}"`
    : `xdg-open "${filePath}"`

  exec(cmd, (err) => {
    if (err) {
      // 静默失败，已经提示了文件路径
    }
  })
}

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { which } from '../utils/which.js'
import { SourceAdapter } from './base.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

const execAsync = promisify(exec)

/**
 * opencli adapter
 *
 * 通过调用 `opencli {command} -f json` 采集信息。
 * source.command 格式示例：
 *   ["hackernews", "top", "--limit", "20"]
 *   ["zhihu", "hot", "--limit", "20"]
 *   ["weibo", "hot", "--limit", "20"]
 *   ["v2ex", "hot", "--limit", "20"]
 *   ["producthunt", "hot", "--limit", "20"]
 *   ["bluesky", "trending", "--limit", "20"]
 *   ["36kr", "hot", "--limit", "20"]
 *   ["medium", "feed", "--limit", "20"]
 *   ["lobsters", "hot", "--limit", "20"]
 *   ["devto", "top", "--limit", "20"]
 *   ["twitter", "trending", "--limit", "20"]
 */

// 各平台 JSON 字段 → InfoItem 的映射规则
interface RawItem {
  [key: string]: unknown
}

function normalizeItem(raw: RawItem, sourceName: string, sourceId: string): InfoItem {
  // title 字段：title > name > word > topic > text (取前 120 字符)
  const rawTitle =
    (raw.title as string) ||
    (raw.name as string) ||
    (raw.word as string) ||
    (raw.topic as string) ||
    (raw.text as string) ||
    '(无标题)'
  const title = String(rawTitle).slice(0, 200)

  // url 字段
  const rawUrl = (raw.url as string) || (raw.link as string) || ''
  let url: string
  if (rawUrl.startsWith('http')) {
    url = rawUrl
  } else if (rawUrl.startsWith('/')) {
    // Bluesky 相对路径
    url = `https://bsky.app${rawUrl}`
  } else if (raw.id && typeof raw.id === 'string' && /^\d{4}\.\d+$/.test(raw.id)) {
    // HF Papers: arXiv ID → arXiv 链接
    url = `https://arxiv.org/abs/${raw.id}`
  } else {
    // bilibili / v2ex 等无 URL 的情况
    url = ''
  }

  // summary：description > tagline > 各类热度指标拼接
  const parts: string[] = []
  if (raw.description) parts.push(String(raw.description).slice(0, 200))
  else if (raw.tagline) parts.push(String(raw.tagline).slice(0, 200))
  else if (raw.text && raw.text !== rawTitle) parts.push(String(raw.text).slice(0, 200))

  // 附加数字指标
  const metrics: string[] = []
  if (raw.score != null) metrics.push(`↑${raw.score}`)
  if (raw.upvotes != null) metrics.push(`↑${raw.upvotes}`)
  if (raw.heat != null) metrics.push(`🔥${raw.heat}`)
  if (raw.hot_value != null) metrics.push(`🔥${raw.hot_value}`)
  if (raw.likes != null) metrics.push(`❤️${raw.likes}`)
  if (raw.reactions != null) metrics.push(`❤️${raw.reactions}`)
  if (raw.comments != null) metrics.push(`💬${raw.comments}`)
  if (raw.replies != null) metrics.push(`💬${raw.replies}`)
  if (raw.votes != null) metrics.push(`↑${raw.votes}`)
  if (raw.author) metrics.push(`@${raw.author}`)
  if (raw.category) metrics.push(`[${raw.category}]`)
  if (raw.tags) metrics.push(String(raw.tags).slice(0, 60))
  if (metrics.length > 0) parts.push(metrics.join(' '))

  return {
    title,
    url,
    summary: parts.join(' | ').slice(0, 400) || '',
    publishedAt: raw.date ? new Date(raw.date as string) : null,
    source: sourceId,
    sourceName,
  }
}

export class OpenCLIAdapter extends SourceAdapter {
  readonly type = 'opencli'

  private openCliPath: string | null = null

  private async resolveOpenCLI(): Promise<string> {
    if (this.openCliPath) return this.openCliPath
    const found = await which('opencli')
    if (!found) throw new Error('opencli 未安装，请先运行: npm install -g opencli')
    this.openCliPath = found
    return found
  }

  async fetch(source: SourceConfig, keyword?: string): Promise<InfoItem[]> {
    if (!source.command || source.command.length === 0) {
      console.warn(`[opencli] ${source.id}: 未配置 command 字段，跳过`)
      return []
    }

    // 如果有 searchCommand 且传入了 keyword，使用 searchCommand 替换 {keyword} 占位符
    const cmd = (keyword && source.searchCommand)
      ? source.searchCommand.map(s => s === '{keyword}' ? keyword : s)
      : source.command

    const binPath = await this.resolveOpenCLI()
    const args = [...cmd, '-f', 'json']
    const cmdStr = [binPath, ...args].join(' ')

    try {
      const { stdout } = await execAsync(cmdStr, {
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env },
      })

      const trimmed = stdout.trim()
      if (!trimmed || trimmed === 'null') return []

      const parsed = JSON.parse(trimmed)
      if (!Array.isArray(parsed)) return []

      return parsed
        .filter((item): item is RawItem => item != null && typeof item === 'object')
        .map(item => normalizeItem(item, source.name, source.id))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // opencli 命令属于尽力而为（需要浏览器 / 登录态 / CDP 连接）
      // 任何失败都静默跳过，不影响其他信息源
      const brief = msg.split('\n')[0].slice(0, 120)
      if (msg.includes('Browser Bridge not connected')) {
        console.warn(`[opencli] ${source.id}: 浏览器扩展未连接，跳过`)
      } else if (msg.includes('Not logged in')) {
        console.warn(`[opencli] ${source.id}: 需要登录，跳过`)
      } else {
        console.warn(`[opencli] ${source.id}: ${brief}，跳过`)
      }
      return []
    }
  }
}

import { SourceAdapter } from './base.js'
import { parseRSSFeed } from '../parsers/rss-parser.js'
import { httpGet } from '../utils/http.js'
import { logger } from '../utils/logger.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

/**
 * Telegram Channel adapter.
 *
 * url 字段填频道地址，支持以下格式：
 *   https://t.me/aibrief
 *   @aibrief
 *   aibrief
 *
 * 采集策略（按优先级降级）：
 *   1. tgstat.ru RSS — 免费公开接口
 *   2. t.me/s/ 公开预览页 — 直接解析 HTML（仅公开频道有效）
 */

function extractChannelId(url: string): string | null {
  const tmeMatch = url.match(/t\.me\/([A-Za-z0-9_]+)/)
  if (tmeMatch) return tmeMatch[1]
  const atMatch = url.match(/^@?([A-Za-z0-9_]+)$/)
  if (atMatch) return atMatch[1]
  return null
}

export class TelegramAdapter extends SourceAdapter {
  readonly type = 'telegram'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const channelId = extractChannelId(source.url)
    if (!channelId) {
      logger.warn(`[telegram] 无法解析频道 ID: ${source.url}`)
      return []
    }

    // Strategy 1: tgstat.ru RSS
    try {
      const rssUrl = `https://tgstat.ru/channel/@${channelId}/rss`
      const xml = await httpGet(rssUrl)
      if (xml && xml.includes('<item>')) {
        return parseRSSFeed(xml, source.name, source.id)
      }
    } catch {
      logger.debug(`[telegram] tgstat.ru 不可用，尝试 t.me/s/ 降级`)
    }

    // Strategy 2: t.me/s/ public preview page
    try {
      const html = await httpGet(`https://t.me/s/${channelId}`)
      return parseTelegramPreview(html, channelId, source.name, source.id)
    } catch {
      logger.warn(`[telegram] @${channelId} 所有采集方式均失败`)
      return []
    }
  }
}

/**
 * 解析 t.me/s/{channel} 公开预览页 HTML
 * 仅对公开频道有效，私有频道会返回空页面
 */
function parseTelegramPreview(
  html: string,
  channelId: string,
  sourceName: string,
  sourceId: string,
): InfoItem[] {
  const items: InfoItem[] = []

  // Match message blocks: each has a data-post attribute and text content
  const messagePattern = /data-post="([^"]+)"[\s\S]*?tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time[^>]*datetime="([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = messagePattern.exec(html)) !== null) {
    const postId = match[1]   // e.g. "aibrief/12345"
    const rawText = match[2]
    const datetime = match[3]

    // Strip HTML tags from text
    const text = rawText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    if (!text) continue

    // Use first line as title, rest as summary
    const lines = text.split('\n').filter(l => l.trim())
    const title = lines[0]?.slice(0, 200) || `@${channelId} post`
    const summary = lines.slice(1).join(' ').slice(0, 300) || ''

    items.push({
      title,
      url: `https://t.me/${postId}`,
      summary,
      publishedAt: new Date(datetime),
      source: sourceId,
      sourceName,
    })
  }

  if (items.length === 0) {
    logger.debug(`[telegram] @${channelId} 公开页面无消息（可能是私有频道）`)
  }

  return items
}

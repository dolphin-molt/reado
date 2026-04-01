import { SourceAdapter } from './base.js'
import { parseRSSFeed } from '../parsers/rss-parser.js'
import { httpGet } from '../utils/http.js'
import { logger } from '../utils/logger.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

/**
 * Telegram Channel adapter via tgstat.ru RSS endpoint.
 *
 * url 字段填频道地址，支持以下格式：
 *   https://t.me/aibrief
 *   @aibrief
 *   aibrief
 *
 * 数据来源：https://tgstat.ru/channel/@channel/rss
 * （免费公开接口，无需注册，可能有延迟 ~1h）
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

    try {
      const rssUrl = `https://tgstat.ru/channel/@${channelId}/rss`
      const xml = await httpGet(rssUrl)
      return parseRSSFeed(xml, source.name, source.id)
    } catch {
      logger.warn(`[telegram] @${channelId} 采集失败（tgstat.ru 不可用），跳过`)
      return []
    }
  }
}

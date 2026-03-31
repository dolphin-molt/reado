import { SourceAdapter } from './base.js'
import { parseRSSFeed } from '../parsers/rss-parser.js'
import { httpGet } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

/**
 * Twitter/X adapter via Nitter public instances.
 *
 * url 字段填 Twitter 用户主页：https://twitter.com/karpathy 或 https://x.com/karpathy
 * 适配器会自动轮询 nitter 实例列表，全部失败则返回空数组（不报错）。
 */

// 公共 nitter 实例，按稳定性排序（定期维护此列表）
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.1d4.us',
  'https://nitter.unixfox.eu',
  'https://nitter.catsarch.com',
  'https://lightbrd.com',
]

function extractUsername(url: string): string | null {
  // 支持 https://twitter.com/user、https://x.com/user、@user
  const match = url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/)
  if (match) return match[1]
  const atMatch = url.match(/^@?([A-Za-z0-9_]+)$/)
  if (atMatch) return atMatch[1]
  return null
}

export class TwitterAdapter extends SourceAdapter {
  readonly type = 'twitter'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const username = extractUsername(source.url)
    if (!username) {
      console.warn(`[twitter] 无法解析用户名: ${source.url}`)
      return []
    }

    for (const instance of NITTER_INSTANCES) {
      try {
        const rssUrl = `${instance}/${username}/rss`
        const xml = await httpGet(rssUrl)
        if (!xml || xml.trim().length === 0) continue
        const items = await parseRSSFeed(xml, source.name, source.id)
        return items
      } catch {
        // 实例不可用，尝试下一个
        continue
      }
    }

    // 所有实例失败 — 静默返回空，不影响其他源
    console.warn(`[twitter] @${username} 所有 nitter 实例均不可用，跳过`)
    return []
  }
}

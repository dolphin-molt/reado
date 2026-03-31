import { SourceAdapter } from './base.js'
import { httpGet } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

/**
 * GitHub Trending 适配器
 * 通过解析 HTML 获取趋势项目（无官方 API）
 */
export class GitHubTrendingAdapter extends SourceAdapter {
  readonly type = 'github-trending'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const html = await httpGet(source.url || 'https://github.com/trending')
    return parseTrendingHtml(html, source)
  }
}

function parseTrendingHtml(html: string, source: SourceConfig): InfoItem[] {
  const items: InfoItem[] = []

  // 匹配每个 trending repo 行
  // 使用正则提取，避免引入 cheerio 依赖
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g
  let match: RegExpExecArray | null

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1]

    // 提取项目链接和名称
    const nameMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/)
    if (!nameMatch) continue
    const repoPath = nameMatch[1].trim()
    const fullName = repoPath.replace(/^\//, '')

    // 提取描述
    const descMatch = block.match(/<p[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    // 提取语言
    const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)/)
    const language = langMatch ? langMatch[1].trim() : ''

    // 提取今日/本周 stars
    const starsMatch = block.match(/(\d[\d,]*)\s+stars?\s+today/i)
      || block.match(/(\d[\d,]*)\s+stars?\s+this\s+week/i)
    const starsGained = starsMatch ? starsMatch[1].replace(/,/g, '') : '0'

    items.push({
      title: fullName,
      url: `https://github.com${repoPath}`,
      summary: `${description}${language ? ` [${language}]` : ''} | +${starsGained} stars`,
      publishedAt: new Date(), // trending 没有具体时间
      source: source.id,
      sourceName: source.name,
    })
  }

  return items
}

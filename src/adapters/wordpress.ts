import { SourceAdapter } from './base.js'
import { httpGetJSON } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

interface WPPost {
  id: number
  date: string  // ISO 8601, site local time
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
}

export class WordPressAdapter extends SourceAdapter {
  readonly type = 'wordpress'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const baseUrl = source.url.replace(/\/$/, '')
    const url = `${baseUrl}/wp-json/wp/v2/posts?per_page=20&_fields=id,title,link,date,excerpt`

    const posts = await httpGetJSON<WPPost[]>(url)

    return posts.map(post => {
      // 清理 HTML 标签和 HTML 实体
      const rawExcerpt = post.excerpt?.rendered ?? ''
      const plainExcerpt = rawExcerpt
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z]+;|&#\d+;/g, m =>
          ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#8230;': '…', '&hellip;': '…', '&#91;': '[', '&#93;': ']' }[m] ?? m)
        )
        .replace(/\[…\]/g, '…')
        .trim()

      const title = post.title?.rendered
        ? post.title.rendered.replace(/&amp;/g, '&').replace(/&#\d+;/g, '').trim()
        : ''

      return {
        title,
        url: post.link,
        summary: plainExcerpt.slice(0, 120),
        publishedAt: post.date ? new Date(post.date) : null,
        source: source.id,
        sourceName: source.name,
      }
    })
  }
}

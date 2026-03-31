import { SourceAdapter } from './base.js'
import { httpGetJSON } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

interface HNItem {
  id: number
  title: string
  url?: string
  score: number
  by: string
  time: number
  descendants?: number
  type: string
}

export class HackerNewsAdapter extends SourceAdapter {
  readonly type = 'hackernews'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const baseUrl = source.url || 'https://hacker-news.firebaseio.com/v0'

    // 获取 top stories ID 列表
    const ids = await httpGetJSON<number[]>(`${baseUrl}/topstories.json`)
    const topIds = ids.slice(0, 30)

    // 并发获取前 30 条详情
    const items = await Promise.all(
      topIds.map(id =>
        httpGetJSON<HNItem>(`${baseUrl}/item/${id}.json`).catch(() => null)
      )
    )

    return items
      .filter((item): item is HNItem => item != null && item.type === 'story')
      .map(item => ({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        summary: `${item.score} points | ${item.descendants ?? 0} comments | by ${item.by}`,
        publishedAt: new Date(item.time * 1000),
        source: source.id,
        sourceName: source.name,
      }))
  }
}

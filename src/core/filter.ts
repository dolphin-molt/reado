import type { InfoItem } from './types.js'
import { getCutoffDate } from '../utils/time.js'

/**
 * 按时间窗口过滤
 */
export function filterByTime(items: InfoItem[], hours: number): InfoItem[] {
  const cutoff = getCutoffDate(hours)
  return items.filter(item => {
    if (!item.publishedAt) return true // 无时间的保留
    return item.publishedAt >= cutoff
  })
}

/**
 * 按关键词过滤（标题或摘要包含任一关键词）
 */
export function filterByTopics(items: InfoItem[], topics: string[]): InfoItem[] {
  if (topics.length === 0) return items

  const lowerTopics = topics.map(t => t.toLowerCase())
  return items.filter(item => {
    const text = `${item.title} ${item.summary}`.toLowerCase()
    return lowerTopics.some(topic => text.includes(topic))
  })
}

/**
 * 按 URL 去重（无 URL 的条目直接保留，不参与去重）
 */
export function deduplicateByUrl(items: InfoItem[]): InfoItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.url) return true   // 无 URL（如 bilibili hot）直接保留
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

/**
 * 按发布时间倒序排列
 */
export function sortByTime(items: InfoItem[]): InfoItem[] {
  return items.sort((a, b) => {
    const ta = a.publishedAt?.getTime() ?? 0
    const tb = b.publishedAt?.getTime() ?? 0
    return tb - ta
  })
}

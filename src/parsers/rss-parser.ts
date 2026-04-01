import { XMLParser } from 'fast-xml-parser'
import type { InfoItem } from '../core/types.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['item', 'entry'].includes(name),
  // 关闭实体展开：避免 GitHub Release Atom / Google News 超出 1000 实体上限
  // cleanHtml() 函数负责在文本层面解码 &amp; &lt; 等常见实体
  processEntities: false,
})

interface ParsedFeedItem {
  title: string
  link: string
  summary: string
  publishedAt: Date | null
  source?: string
}

/** XML 最大允许大小：5MB，超过视为异常数据 */
const MAX_XML_SIZE = 5 * 1024 * 1024

/**
 * 解析 RSS 2.0 / Atom / RDF feed XML
 * 返回归一化的条目列表
 */
export function parseRSSFeed(xml: string, sourceName: string, sourceId: string): InfoItem[] {
  if (xml.length > MAX_XML_SIZE) {
    throw new Error(`XML 数据过大 (${(xml.length / 1024 / 1024).toFixed(1)}MB)，已跳过解析`)
  }

  const doc = parser.parse(xml)

  // RSS 2.0
  if (doc.rss?.channel) {
    const channel = doc.rss.channel
    const items: any[] = channel.item || []
    return items.map(item => normalizeRSSItem(item, sourceName, sourceId))
  }

  // Atom
  if (doc.feed) {
    const entries: any[] = doc.feed.entry || []
    return entries.map(entry => normalizeAtomEntry(entry, sourceName, sourceId))
  }

  // RDF (RSS 1.0)
  const rdf = doc['rdf:RDF'] || doc['RDF']
  if (rdf) {
    const items: any[] = rdf.item || []
    return items.map(item => normalizeRSSItem(item, sourceName, sourceId))
  }

  return []
}

function normalizeRSSItem(item: any, sourceName: string, sourceId: string): InfoItem {
  const rawTitle = extractText(item.title)
  const link = decodeXmlEntities(extractText(item.link) || item.guid?.['#text'] || extractText(item.guid))
  const desc = extractText(item.description) || extractText(item['content:encoded'])
  const pubDate = item.pubDate || item['dc:date']

  const cleanedDesc = cleanHtml(desc)
  // Mastodon 等平台 title 为空，回退到 description 前 100 字符
  const title = cleanHtml(rawTitle) || truncate(cleanedDesc, 100)

  return {
    title,
    url: link,
    summary: truncate(cleanedDesc, 200),
    publishedAt: parseDate(pubDate),
    source: sourceId,
    sourceName,
  }
}

function normalizeAtomEntry(entry: any, sourceName: string, sourceId: string): InfoItem {
  const title = extractText(entry.title)

  // Atom link 可能是对象或数组
  let link = ''
  if (typeof entry.link === 'string') {
    link = entry.link
  } else if (Array.isArray(entry.link)) {
    const alt = entry.link.find((l: any) => l['@_rel'] === 'alternate')
    link = (alt || entry.link[0])?.['@_href'] || ''
  } else if (entry.link?.['@_href']) {
    link = entry.link['@_href']
  }
  link = decodeXmlEntities(link)

  const rawSummary = extractText(entry.summary) || extractText(entry.content)
  const cleanedSummary = cleanHtml(rawSummary)
  const updated = entry.updated || entry.published
  // title 为空时（如 Mastodon）回退到 summary 前 100 字符
  const finalTitle = cleanHtml(title) || truncate(cleanedSummary, 100)

  return {
    title: finalTitle,
    url: link,
    summary: truncate(cleanedSummary, 200),
    publishedAt: parseDate(updated),
    source: sourceId,
    sourceName,
  }
}

function extractText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node['#text']) return String(node['#text'])
  if (node['@_type'] === 'html' && node['#text']) return String(node['#text'])
  return String(node)
}

function cleanHtml(text: string): string {
  // 先解码 HTML 实体（处理 &lt;a href=...&gt; 这类情况）
  let cleaned = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // 然后移除所有 HTML 标签
  cleaned = cleaned.replace(/<[^>]+>/g, '')

  // 清理残余实体和多余空白
  cleaned = cleaned
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

/**
 * 解码 URL 中的 XML 实体（processEntities:false 时 XML 解析器不会自动解码）
 * 只做 URL 安全的解码：&amp; → & 等
 */
function decodeXmlEntities(url: string): string {
  if (!url) return url
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseDate(value: any): Date | null {
  if (!value) return null
  const str = typeof value === 'string' ? value : String(value)

  // ISO 8601
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d

  // RFC 2822 (RSS pubDate)
  try {
    const rfc = new Date(str.replace(/\s+/g, ' '))
    if (!isNaN(rfc.getTime())) return rfc
  } catch { /* ignore */ }

  return null
}

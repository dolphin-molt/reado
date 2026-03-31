import { SourceAdapter } from './base.js'
import { parseRSSFeed } from '../parsers/rss-parser.js'
import { httpGet } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

export class RSSAdapter extends SourceAdapter {
  readonly type = 'rss'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    const xml = await httpGet(source.url)
    return parseRSSFeed(xml, source.name, source.id)
  }
}

import type { AggregateResult } from '../core/types.js'

export function formatJSON(result: AggregateResult): string {
  const output = {
    fetchedAt: result.fetchedAt.toISOString(),
    stats: result.stats,
    items: result.items.map(item => ({
      title: item.title,
      url: item.url,
      summary: item.summary,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      source: item.source,
      sourceName: item.sourceName,
    })),
  }
  return JSON.stringify(output, null, 2)
}

import pLimit from 'p-limit'
import { createHash } from 'node:crypto'
import { registry } from './registry.js'
import { filterByTime, filterByTopics, deduplicateByUrl, sortByTime } from './filter.js'
import { getCached, setCache } from '../utils/cache.js'
import { logger } from '../utils/logger.js'
import type { SourceConfig, InfoItem, FetchResult, AggregateResult } from './types.js'

/** Browser/cookie 策略的源并发上限，防止 WebSocket 排队超时 */
const BROWSER_CONCURRENCY = 3

/** 缓存 key = source.id + URL 的短 hash，URL 一变自动失效 */
function cacheKey(source: SourceConfig): string {
  const urlHash = createHash('md5').update(source.url).digest('hex').slice(0, 8)
  return `${source.id}-${urlHash}`
}

interface EngineOptions {
  concurrency: number
  cacheTTL: number
  noCache: boolean
  maxItems: number
  /**
   * 关键词优先级（高 → 低）：
   *   1. keywords     — CLI --topics / --keyword 临时覆盖
   *   2. sourceTopics — config.sourceTopics[source.id] 按源持久覆盖
   *   3. globalTopics — config.globalTopics 全局持久设置（仅对 source.topics 非空的源生效）
   *   4. source.topics — default-sources.json 默认值
   * undefined = 该层不生效，继续往下找
   * string[]  = 使用该词表（空数组 = 不过滤）
   */
  keywords?: string[]
  globalTopics?: string[]
  sourceTopics?: Record<string, string[]>
}

export async function fetchAll(
  sources: SourceConfig[],
  opts: EngineOptions,
): Promise<AggregateResult> {
  // cookie/browser 策略的源（opencli Bridge 是单 WebSocket，并行会排队超时）
  // 单独用低并发限制，其余源走正常并发
  const normalLimit = pLimit(opts.concurrency)
  const browserLimit = pLimit(BROWSER_CONCURRENCY)
  const fetchedAt = new Date()

  const promises = sources.map(source => {
    const isBrowser = source.adapter === 'opencli' && source.strategy === 'cookie'
    const limiter = isBrowser ? browserLimit : normalLimit
    return limiter(() => fetchSource(source, opts))
  })

  const settled = await Promise.allSettled(promises)

  const results: FetchResult[] = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      source: sources[i],
      items: [],
      error: String(result.reason),
      cached: false,
      durationMs: 0,
    }
  })

  // 合并所有条目
  let allItems = results.flatMap(r => r.items)
  const beforeDedup = allItems.length

  // 去重 + 排序
  allItems = deduplicateByUrl(allItems)
  allItems = sortByTime(allItems)

  const deduplicatedItems = beforeDedup - allItems.length

  // 截断
  if (opts.maxItems > 0) {
    allItems = allItems.slice(0, opts.maxItems)
  }

  const noError = results.filter(r => !r.error)
  const withItems = noError.filter(r => r.items.length > 0)
  const emptyOk = noError.filter(r => r.items.length === 0)

  const stats = {
    totalSources: sources.length,
    successSources: noError.length,
    failedSources: results.filter(r => !!r.error).length,
    cachedSources: results.filter(r => r.cached).length,
    /** 实际贡献了条目的源数量 */
    contributingSources: withItems.length,
    /** 成功但返回 0 条目的源 ID 列表 */
    emptySourceIds: emptyOk.map(r => r.source.id),
    /** 失败源 ID 列表 */
    failedSourceIds: results.filter(r => !!r.error).map(r => r.source.id),
    totalItems: allItems.length,
    deduplicatedItems,
  }

  return { items: allItems, results, stats, fetchedAt }
}

async function fetchSource(
  source: SourceConfig,
  opts: EngineOptions,
): Promise<FetchResult> {
  const start = Date.now()

  // 检查缓存（key 含 URL hash，URL 变更自动失效）
  if (!opts.noCache) {
    const cached = getCached<InfoItem[]>(cacheKey(source), opts.cacheTTL)
    if (cached) {
      // 对缓存数据也做时间过滤
      let items = cached.map(item => ({
        ...item,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      }))
      items = filterByTime(items, source.hours)
      return {
        source,
        items,
        cached: true,
        durationMs: Date.now() - start,
      }
    }
  }

  const adapter = registry.get(source.adapter)
  if (!adapter) {
    return {
      source,
      items: [],
      error: `未知适配器类型: ${source.adapter}`,
      cached: false,
      durationMs: Date.now() - start,
    }
  }

  try {
    let items = await adapter.fetch(source)

    // 时间过滤
    items = filterByTime(items, source.hours)

    // 主题过滤优先级: CLI --topics > sourceTopics[id] > globalTopics > source.topics
    // source.topics === [] 代表"纯 AI 源，无需过滤"，globalTopics 不覆盖它，
    // 避免把全局词表错误地应用到本来就该全量展示的源。
    const sourceHasFilter = source.topics.length > 0
    const effectiveTopics =
      opts.keywords !== undefined                          ? opts.keywords :
      opts.sourceTopics?.[source.id] !== undefined         ? opts.sourceTopics[source.id] :
      (opts.globalTopics !== undefined && sourceHasFilter) ? opts.globalTopics :
      source.topics
    items = filterByTopics(items, effectiveTopics)

    // 写入缓存
    if (!opts.noCache) {
      setCache(cacheKey(source), items)
    }

    return {
      source,
      items,
      cached: false,
      durationMs: Date.now() - start,
    }
  } catch (e) {
    logger.debug(`采集失败 [${source.id}]:`, e)
    return {
      source,
      items: [],
      error: e instanceof Error ? e.message : String(e),
      cached: false,
      durationMs: Date.now() - start,
    }
  }
}

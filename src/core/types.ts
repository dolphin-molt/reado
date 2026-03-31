import { z } from 'zod'

// ========== 信息条目 ==========

export interface InfoItem {
  title: string
  url: string
  summary: string
  publishedAt: Date | null
  source: string      // 信息源 ID
  sourceName: string  // 信息源显示名
  category?: string   // 所属板块
}

// ========== 信息源配置 ==========

export type AdapterType =
  | 'rss'
  | 'hackernews'
  | 'reddit'
  | 'github-trending'
  | 'github-release'
  | 'arxiv'
  | 'producthunt'
  | 'web-scraper'
  | 'opencli'
  | 'wordpress'
  | 'twitter'
  | 'telegram'

export interface SourceConfig {
  id: string
  name: string
  adapter: AdapterType
  url: string
  hours: number
  topics: string[]
  enabled: boolean
  category?: string
  /** Google News RSS 搜索词 (rss adapter 专用) */
  googleNewsQuery?: string
  /** opencli adapter 专用：命令参数，如 ["hackernews", "top", "--limit", "20"] */
  command?: string[]
  /**
   * opencli strategy 类型（来自 opencli --help 输出的 Strategy 字段）
   * "api"     → 直接 HTTP，可高并发
   * "cookie"  → 通过浏览器 Bridge，需要串行或低并发
   * "rss"     → 纯 RSS，高并发无压力
   */
  strategy?: 'api' | 'cookie' | 'rss'
  /** 是否支持关键词搜索（用于 reado search 界面过滤） */
  searchable?: boolean
  /** 搜索模式下使用的命令，{keyword} 为关键词占位符
   *  例: ["hackernews", "search", "{keyword}", "--limit", "20"]
   */
  searchCommand?: string[]
}

// ========== 用户配置 ==========

export const UserConfigSchema = z.object({
  categories: z.record(z.string(), z.array(z.string())).default({}),
  defaults: z.object({
    hours: z.number().default(24),
    format: z.enum(['table', 'json', 'markdown', 'html']).default('table'),
    maxItems: z.number().default(50),
    concurrency: z.number().default(5),
    cacheTTL: z.number().default(15), // minutes
  }).default({}),
  customSources: z.record(z.string(), z.any()).default({}),
  /** 用户手动开启的源 ID 列表（覆盖 default-sources.json 中的 enabled:false） */
  enabledOverrides: z.array(z.string()).default([]),
  /** 界面语言: zh = 中文, en = English */
  language: z.enum(['zh', 'en']).default('zh'),
  /**
   * 全局关键词过滤（持久化版 --keyword）
   * 非空时替代所有源的 topics 设置；空数组 = 不过滤（显示全部）
   * undefined = 不启用，各源使用自己的 topics
   */
  globalTopics: z.array(z.string()).optional(),
  /**
   * 按源 ID 单独覆盖 topics，优先级高于 globalTopics
   * 例: { "tmtpost": ["AI", "大模型"], "huxiu": [] }
   */
  sourceTopics: z.record(z.string(), z.array(z.string())).default({}),
})

export type UserConfig = z.infer<typeof UserConfigSchema>

// ========== 采集结果 ==========

export interface FetchResult {
  source: SourceConfig
  items: InfoItem[]
  error?: string
  cached: boolean
  durationMs: number
}

export interface AggregateResult {
  items: InfoItem[]
  results: FetchResult[]
  stats: {
    totalSources: number
    successSources: number
    failedSources: number
    cachedSources: number
    totalItems: number
  }
  fetchedAt: Date
}

// ========== 输出格式 ==========

export type OutputFormat = 'table' | 'json' | 'markdown' | 'html'

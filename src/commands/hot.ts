import ora from 'ora'
import chalk from 'chalk'
import { loadConfig, configExists, initConfig, resolveSourceConfigs } from '../core/config.js'
import { fetchAll } from '../core/engine.js'
import { formatOutput, exportHTML } from '../output/index.js'
import type { OutputFormat } from '../core/types.js'

/** 热榜源分组定义 */
const HOT_GROUPS: Array<{
  group: string
  sources: string[]
}> = [
  {
    group: '国内社交',
    sources: ['weibo-hot', 'zhihu-hot', 'bilibili-hot', '36kr-hot'],
  },
  {
    group: '开发者社区',
    sources: ['hackernews', 'hackernews-best', 'v2ex', 'lobsters', 'producthunt'],
  },
  {
    group: 'GitHub',
    sources: ['github-trending', 'github-trending-python'],
  },
  {
    group: 'Reddit',
    sources: ['reddit-locallama', 'reddit-ml', 'reddit-ainews', 'reddit-singularity', 'reddit-technology'],
  },
  {
    group: '国际社交',
    sources: ['bluesky-trending'],
  },
  {
    group: '金融',
    sources: ['xueqiu-hot', 'xueqiu-hot-stock'],
  },
]

interface HotCommandOptions {
  limit?: string
  concurrency?: string
  format?: string
  theme?: string
  open?: boolean
  output?: string
  noCache?: boolean
  cache?: boolean
}

export async function runHot(platform: string | undefined, opts: HotCommandOptions): Promise<void> {
  if (!configExists()) initConfig()
  const config = loadConfig()

  const overrides = config.enabledOverrides ?? []

  // 收集目标源 ID
  let targetIds: string[]
  if (platform) {
    // 按平台名模糊匹配 group 或 source id/name
    const q = platform.toLowerCase()
    const matched = HOT_GROUPS
      .filter(g =>
        g.group.toLowerCase().includes(q) ||
        g.sources.some(id => id.toLowerCase().includes(q))
      )
      .flatMap(g => g.sources)
    if (matched.length === 0) {
      console.log(chalk.red(`未找到平台: ${platform}`))
      console.log(chalk.gray('可用平台: ' + HOT_GROUPS.map(g => g.group).join(' / ')))
      return
    }
    targetIds = [...new Set(matched)]
  } else {
    targetIds = HOT_GROUPS.flatMap(g => g.sources)
  }

  // 允许 disabled 源（雪球、抖音等默认关闭但用户可能装了 opencli）
  const sources = resolveSourceConfigs(targetIds, true, overrides)
  if (sources.length === 0) {
    console.log(chalk.yellow('没有可用的热榜信息源'))
    return
  }

  const limit = opts.limit ? parseInt(opts.limit, 10) : 10
  const concurrency = opts.concurrency ? parseInt(opts.concurrency, 10) : config.defaults.concurrency
  const noCache = opts.cache === false || opts.noCache === true
  const validFormats = ['table', 'json', 'markdown', 'html']
  const rawFormat = opts.format || 'table'
  const format = (validFormats.includes(rawFormat) ? rawFormat : 'table') as OutputFormat

  const spinner = ora({
    text: `正在获取 ${sources.length} 个热榜...`,
    color: 'cyan',
  }).start()

  try {
    const result = await fetchAll(sources, {
      concurrency,
      cacheTTL: config.defaults.cacheTTL,
      noCache,
      maxItems: 0,          // 不在引擎层截断，按源分组后再截断
      keywords: [],         // 热榜不做任何关键词过滤，强制全量
      globalTopics: undefined,
      sourceTopics: undefined,
    })

    spinner.stop()

    if (format === 'html') {
      const filePath = exportHTML(result, {
        theme: opts.theme || 'default',
        outputPath: opts.output,
        open: opts.open,
      })
      console.log(chalk.green(`✅ HTML 报告已生成: ${filePath}`))
      if (opts.open) console.log(chalk.gray('正在打开浏览器...'))
      const s = result.stats
      console.log(chalk.gray(`📊 信息源: ${s.totalSources} | 成功: ${s.successSources} | 条目: ${s.totalItems}`))
      return
    }

    if (format !== 'table') {
      console.log(formatOutput(result, format))
      return
    }

    // table 格式：按 group 分组，每组最多 limit 条
    const itemsBySource = new Map(result.results.map(r => [r.source.id, r]))

    console.log('')
    console.log(chalk.bold('  🔥 热榜汇总') + chalk.gray(` · ${new Date().toLocaleString('zh-CN')}`))
    console.log('')

    for (const group of HOT_GROUPS) {
      const groupSources = group.sources.filter(id => itemsBySource.has(id))
      if (groupSources.length === 0) continue

      const hasItems = groupSources.some(id => (itemsBySource.get(id)?.items.length ?? 0) > 0)
      if (!hasItems) continue

      console.log(chalk.bold.cyan(`  ── ${group.group} ──`))

      for (const sourceId of groupSources) {
        const res = itemsBySource.get(sourceId)
        if (!res || res.items.length === 0) continue

        const items = res.items.slice(0, limit)
        console.log(chalk.bold(`\n  📌 ${res.source.name}`))

        items.forEach((item, i) => {
          const num = chalk.gray(`  ${String(i + 1).padStart(2)}.`)
          const title = item.title.length > 60
            ? item.title.slice(0, 58) + '…'
            : item.title
          console.log(`${num} ${title}`)
        })
      }

      console.log('')
    }

    // 统计
    const totalItems = result.results.reduce((n, r) => n + r.items.length, 0)
    const failed = result.results.filter(r => !!r.error)
    console.log(chalk.gray(`  共 ${result.stats.successSources} 个平台 · ${totalItems} 条热榜`))
    if (failed.length > 0) {
      console.log(chalk.gray(`  未获取: ${failed.map(r => r.source.name).join(', ')}`))
    }
    console.log('')

  } catch (e) {
    spinner.fail('获取热榜失败')
    console.error(chalk.red(e instanceof Error ? e.message : String(e)))
    process.exit(1)
  }
}

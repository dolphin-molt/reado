import ora from 'ora'
import chalk from 'chalk'
import { loadConfig, initConfig, configExists, getSourceIdsForCategories, resolveSourceConfigs, getDefaultSources } from '../core/config.js'
import { fetchAll } from '../core/engine.js'
import { formatOutput, exportHTML } from '../output/index.js'
import { parseHours } from '../utils/time.js'
import { promptSourceSelection, promptSearchSourceSelection } from '../utils/interactive.js'
import { getBundles, getBundleSourceIds } from '../core/bundles.js'
import { setLanguage } from '../utils/i18n.js'
import { resolveTopics } from '../core/topics.js'
import type { OutputFormat } from '../core/types.js'

interface FetchCommandOptions {
  source?: string[]
  hours?: string
  format?: string
  limit?: string
  concurrency?: string
  noCache?: boolean
  /** Commander.js --no-cache sets this to false */
  cache?: boolean
  verbose?: boolean
  theme?: string
  open?: boolean
  output?: string
  /** 覆盖各信息源的关键词过滤；传 [''] 或 ['*'] 表示不过滤 */
  keyword?: string[]
  /** 话题预设或关键词 */
  topics?: string
  /** 主题包 ID */
  bundle?: string
}

export async function runSearch(categories: string[], opts: FetchCommandOptions): Promise<void> {
  // 确保配置存在
  if (!configExists()) {
    console.log(chalk.gray('首次运行，正在初始化配置...'))
    initConfig()
  }

  const config = loadConfig()

  // Apply language setting from user config
  if (config.language) {
    setLanguage(config.language)
  }

  const validFormats = ['table', 'json', 'markdown', 'html']
  const rawFormat = opts.format || config.defaults.format || 'table'
  if (opts.format && !validFormats.includes(opts.format)) {
    console.log(chalk.yellow(`⚠ 未知格式 "${opts.format}"，已回退到 table。可用格式: ${validFormats.join(' / ')}`))
  }
  const format = (validFormats.includes(rawFormat) ? rawFormat : 'table') as OutputFormat
  const hours = opts.hours ? parseHours(opts.hours) : config.defaults.hours
  const concurrency = opts.concurrency
    ? parseInt(opts.concurrency, 10)
    : config.defaults.concurrency
  // html 格式默认不限条目数（显示所有），其他格式用配置值
  const maxItems = opts.limit
    ? parseInt(opts.limit, 10)
    : format === 'html' ? 0 : config.defaults.maxItems
  // Commander.js 的 --no-cache 会把 opts.cache 设为 false（而非 opts.noCache）
  let noCache = opts.cache === false || opts.noCache === true

  // 当用户指定了比默认更长的时间窗口时，缓存的数据是按旧窗口过滤的，
  // 直接使用缓存会导致拿不到更早的数据，自动跳过缓存
  if (!noCache && opts.hours) {
    const defaultHours = config.defaults.hours ?? 24
    if (hours > defaultHours) {
      noCache = true
      console.log(chalk.gray(`⚠ 时间窗口扩大到 ${hours}h，自动跳过缓存以获取完整数据`))
    }
  }

  // 关键词过滤：
  //   --topics preset → resolveTopics(preset)
  //   --topics "kw1,kw2" → resolveTopics resolves each part
  //   --keyword foo bar → ['foo', 'bar'] (backward compat)
  //   nothing → undefined（各源使用自己的 topics）
  let keywords: string[] | undefined
  if (opts.topics !== undefined) {
    keywords = resolveTopics(opts.topics)
  } else if (opts.keyword !== undefined) {
    const kws = opts.keyword.flatMap((k: string) => k.split(/[,\s]+/)).filter(Boolean)
    keywords = (kws.length === 1 && (kws[0] === '*' || kws[0] === 'all')) ? [] : kws
  }

  const overrides = config.enabledOverrides ?? []

  // 解析信息源：--source > categories 参数 > 交互选择
  let sourceIds: string[]
  let explicitSource = false
  if (opts.source && opts.source.length > 0) {
    // 直接指定 source ID — 允许 enabled:false 的源（用户明确要求）
    sourceIds = opts.source
    explicitSource = true
    // 只对真正不存在于 default-sources 中的 ID 报错
    const allDefaultIds = new Set(getDefaultSources().map(s => s.id))
    const unknown = sourceIds.filter(id => !allDefaultIds.has(id))
    if (unknown.length > 0) {
      console.log(chalk.yellow(`⚠ 未知信息源 ID: ${unknown.join(', ')}`))
      console.log(chalk.gray('运行 reado sources list 查看所有可用 ID'))
    }
  } else if (opts.bundle) {
    // Use bundle sources (allowDisabled: true for explicit bundle selection)
    const bundleSourceIds = getBundleSourceIds(opts.bundle)
    if (bundleSourceIds.length === 0) {
      const available = getBundles().map(b => `  ${b.emoji} ${b.id.padEnd(12)} ${b.nameZh} / ${b.name}`).join('\n')
      console.log(chalk.red(`未找到主题包: ${opts.bundle}`))
      console.log(chalk.gray('可用主题包:\n' + available))
      return
    }
    sourceIds = bundleSourceIds
    explicitSource = true  // allow disabled sources in bundle
  } else if (categories.length > 0) {
    // 按板块名过滤
    sourceIds = getSourceIdsForCategories(config, categories)
    if (sourceIds.length === 0) {
      console.log(chalk.yellow('未找到匹配的信息源。'))
      console.log(chalk.gray('可用板块:'))
      for (const name of Object.keys(config.categories)) {
        console.log(chalk.gray(`  - ${name}`))
      }
      return
    }
  } else {
    // 什么都没指定 → 交互式选择（仅展示支持关键词搜索的源）
    const allSources = getDefaultSources()
    const result = await promptSearchSourceSelection(allSources)
    if (result.cancelled) {
      console.log(chalk.gray('已取消。'))
      return
    }
    sourceIds = result.sourceIds
    explicitSource = true  // 允许 enabled:false 的可搜索源
  }

  const sources = resolveSourceConfigs(sourceIds, explicitSource, overrides)
  if (sources.length === 0) {
    console.log(chalk.yellow('所有信息源均已禁用或未定义。'))
    return
  }

  // 开始采集
  const spinner = ora({
    text: `正在采集 ${sources.length} 个信息源...`,
    color: 'cyan',
  }).start()

  try {
    // 覆盖每个源的时间窗口（如果用户指定了 --hours）
    if (opts.hours) {
      for (const s of sources) {
        s.hours = hours
      }
    }

    // 如果有关键词且源支持 searchCommand，注入关键词到 command
    if (keywords && keywords.length > 0 && keywords[0] !== '*') {
      const kw = keywords[0]  // 取第一个关键词用于命令注入
      for (const s of sources) {
        if (s.searchCommand) {
          s.command = s.searchCommand.map(part => part === '{keyword}' ? kw : part)
        }
      }
    }

    const result = await fetchAll(sources, {
      concurrency,
      cacheTTL: config.defaults.cacheTTL,
      noCache,
      maxItems,
      keywords,
      // 持久化全局 topics（用户通过 reado config set topics 配置）
      globalTopics: config.globalTopics,
      // 按源覆盖 topics（用户通过 reado config set source-topics 配置）
      sourceTopics: config.sourceTopics,
    })

    spinner.stop()

    // HTML 格式特殊处理：写文件而非 stdout
    if (format === 'html') {
      const filePath = exportHTML(result, {
        theme: opts.theme || 'default',
        outputPath: opts.output,
        open: opts.open,
      })
      console.log(chalk.green(`✅ HTML 报告已生成: ${filePath}`))
      if (opts.open) {
        console.log(chalk.gray('正在打开浏览器...'))
      } else {
        console.log(chalk.gray('提示: 添加 --open 可自动打开浏览器'))
      }
      // 同时在终端显示简要统计
      const s = result.stats
      console.log(chalk.gray(`📊 信息源: ${s.totalSources} | 成功: ${s.successSources} | 条目: ${s.totalItems}`))
    } else {
      const output = formatOutput(result, format)
      console.log(output)
    }
  } catch (e) {
    spinner.fail('采集失败')
    console.error(chalk.red(e instanceof Error ? e.message : String(e)))
    process.exit(1)
  }
}

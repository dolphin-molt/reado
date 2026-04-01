import { Command, type Help } from 'commander'
import chalk from 'chalk'
import { registerAllAdapters } from './adapters/index.js'
import { getDefaultSources } from './core/config.js'
import { runInit } from './commands/init.js'
import { runSearch } from './commands/search.js'
import { runSourcesList, runSourcesTest, runSourcesEnable, runSourcesDisable } from './commands/sources.js'
import { runBundlesList, runBundlesShow } from './commands/bundles.js'
import { runConfigGet, runConfigSet, runConfigClear } from './commands/config.js'
import { runHot } from './commands/hot.js'
import { runTopicsList, runTopicsShow } from './commands/topics.js'
import { runOpencliPassthrough } from './utils/passthrough.js'
import { runBilibiliSearch } from './commands/bilibili-search.js'
import { loadWatchlist, addToWatchlist, removeFromWatchlist, getWatchlistPath, watchlistToSourceConfigs } from './core/twitter-watchlist.js'

/** 通用 options，所有数据命令共享 */
function addCommonOpts(cmd: Command): Command {
  return cmd
    .option('-t, --hours <hours>', '时间窗口 (如: 24, 48h, 7d)')
    .option('-f, --format <format>', '输出格式: table / json / markdown / html')
    .option('-l, --limit <limit>', '最大条目数')
    .option('-c, --concurrency <n>', '并发采集数')
    .option('--no-cache', '跳过缓存')
    .option('--theme <theme>', 'HTML 模板: default / dashboard / minimal')
    .option('--open', '自动打开浏览器')
    .option('-o, --output <path>', 'HTML 输出路径')
}

/** 快速注册只有 hot 动作的平台，如: weibo / zhihu / bilibili */
function addHotOnlyPlatform(
  program: Command,
  name: string,
  description: string,
  sourceIds: string[],
): void {
  const p = program.command(name).description(description)
  addCommonOpts(
    p.command('hot')
      .description(`${description}热榜`)
      .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
  ).action(async (opts) => {
    // hot 不走默认 source.topics 过滤，只有用户显式传 --topics 才过滤
    await runSearch([], { ...opts, source: sourceIds, keyword: opts.topics ? [opts.topics] : ['*'] })
  })
}

/** 快速注册有 hot + search 的平台 */
function addSearchHotPlatform(
  program: Command,
  name: string,
  description: string,
  hotSourceIds: string[],
  searchSourceIds?: string[],
): void {
  const p = program.command(name).description(description)

  addCommonOpts(
    p.command('hot')
      .description(`${description}热榜 / 热门`)
      .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
  ).action(async (opts) => {
    // hot 不走默认 source.topics 过滤，只有用户显式传 --topics 才过滤
    await runSearch([], { ...opts, source: hotSourceIds, keyword: opts.topics ? [opts.topics] : ['*'] })
  })

  addCommonOpts(
    p.command('search')
      .description(`搜索${description}内容`)
      .option('--topics <topics>', '话题预设或关键词')
  ).action(async (opts) => {
    const ids = searchSourceIds ?? hotSourceIds
    await runSearch([], { ...opts, source: ids, keyword: opts.topics ? [opts.topics] : undefined })
  })
}

/**
 * douyin hashtag 命令包装：内部强制 -f json，绕过 opencli table formatter
 * 在 API 返回 null 时会崩溃的 bug（hotspot_list / challenge_list 为 null）
 */
async function runDouyinHashtag(args: string[], format: string): Promise<void> {
  const { execSync } = await import('node:child_process')
  const { which } = await import('./utils/which.js')
  const bin = await which('opencli')
  if (!bin) {
    console.error(chalk.red('opencli 未安装'))
    process.exit(1)
  }
  let rows: Array<Record<string, unknown>> = []
  try {
    const raw = execSync([bin, ...args, '-f', 'json'].join(' '), {
      timeout: 20_000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env },
    }).toString().trim()
    const parsed = JSON.parse(raw)
    rows = Array.isArray(parsed) ? parsed : []
  } catch {
    // opencli 本身报错，已打印到 stderr，直接返回
    return
  }

  if (rows.length === 0) {
    console.log(chalk.yellow('\n  暂无数据（需要登录 creator.douyin.com 并开通创作者账号）\n'))
    return
  }

  if (format === 'json') {
    console.log(JSON.stringify(rows, null, 2))
    return
  }

  // 简单表格输出
  const Table = (await import('cli-table3')).default
  const keys = Object.keys(rows[0])
  const table = new Table({ head: keys.map(k => chalk.cyan(k)) })
  for (const row of rows) table.push(keys.map(k => String(row[k] ?? '')))
  console.log(table.toString())
  console.log(chalk.gray(`  共 ${rows.length} 条`))
}

export function createCLI(): Command {
  registerAllAdapters()

  // 源分组，用于 help 展示
  const SOURCE_GROUPS: Array<{
    label: string
    batchCmds: string[]          // 批量命令 (aicompany, media 等)
    platformCmds: string[]       // 平台命令 (reddit, twitter 等)
    categories: string[]         // 对应的 source category，用于展示 source IDs
  }> = [
    {
      label: 'AI & 科技内容',
      batchCmds: ['aicompany', 'media', 'developer', 'vc'],
      platformCmds: [],
      categories: ['AI公司', '科技媒体', '开发者', '创投'],
    },
    {
      label: '学术 & 工具',
      batchCmds: ['academic'],
      platformCmds: ['arxiv', 'huggingface', 'github'],
      categories: ['学术', 'GitHub'],
    },
    {
      label: '社区',
      batchCmds: [],
      platformCmds: ['hackernews', 'reddit', 'v2ex', 'lobsters', 'stackoverflow', 'substack', 'zsxq', 'devto'],
      categories: ['社区', 'Reddit'],
    },
    {
      label: '社交媒体',
      batchCmds: [],
      platformCmds: ['twitter', 'youtube', 'weibo', 'bilibili', 'zhihu', 'bluesky', 'telegram', 'mastodon', 'tiktok', 'instagram', 'facebook', 'xiaohongshu', 'jike', 'linkedin'],
      categories: ['社交媒体'],
    },
    {
      label: '产品 & 金融',
      batchCmds: [],
      platformCmds: ['producthunt', 'xueqiu', '36kr', 'bloomberg', 'reuters', 'yahoo-finance'],
      categories: ['产品发现', '金融'],
    },
    {
      label: '内容 & 阅读',
      batchCmds: [],
      platformCmds: ['medium', 'douban', 'weread', 'bbc', 'xiaoyuzhou'],
      categories: [],
    },
    {
      label: '中文社区',
      batchCmds: [],
      platformCmds: ['tieba', 'linux-do'],
      categories: [],
    },
    {
      label: '搜索 & 工具',
      batchCmds: [],
      platformCmds: ['google', 'wikipedia'],
      categories: [],
    },
    {
      label: '聚合',
      batchCmds: ['bundle'],
      platformCmds: [],
      categories: [],
    },
  ]
  const QUERY_CMDS   = ['search', 'hot']
  const MGMT_CMDS    = ['sources', 'bundles', 'topics', 'config', 'init']

  const program = new Command()
    .name('reado')
    .description('信息聚合 CLI — 一站式获取 AI 资讯、科技新闻、社区热点')
    .version('0.1.0')
    .configureHelp({
      formatHelp(cmd: Command, helper: Help): string {
        // 子命令用默认格式，只有根命令展示源分组
        if (cmd.parent !== null) {
          const termWidth = (helper.helpWidth ?? 80)
          const lines: string[] = []
          lines.push(`Usage:  ${cmd.parent?.name() ?? 'reado'} ${cmd.name()} ${cmd.usage()}`)
          lines.push('')
          if (cmd.description()) {
            lines.push(cmd.description())
            lines.push('')
          }
          const subcmds = helper.visibleCommands(cmd)
          if (subcmds.length) {
            lines.push(chalk.bold('Commands:'))
            for (const c of subcmds) {
              const aliases = c.aliases().length ? chalk.dim(` (alias: ${c.aliases().join(', ')})`) : ''
              lines.push('  ' + chalk.green(c.name().padEnd(18)) + chalk.white(c.description()) + aliases)
            }
            lines.push('')
          }
          const opts = helper.visibleOptions(cmd)
          if (opts.length) {
            lines.push(chalk.bold('Options:'))
            for (const o of opts) {
              lines.push('  ' + chalk.cyan(o.flags.padEnd(26)) + chalk.white(o.description))
            }
            lines.push('')
          }
          void termWidth
          return lines.join('\n')
        }

        const nameWidth = 13
        const lines: string[] = []

        // 构建 category → source IDs 映射
        const allSources = getDefaultSources()
        const enabledSet = new Set(allSources.filter(s => s.enabled !== false).map(s => s.id))
        const catSourceIds = new Map<string, string[]>()
        for (const s of allSources) {
          const cat = (s as any).category as string | undefined
          if (!cat) continue
          if (!catSourceIds.has(cat)) catSourceIds.set(cat, [])
          catSourceIds.get(cat)!.push(s.id)
        }

        lines.push('')
        lines.push(chalk.bold('Usage:') + '  reado <source> <action> [options]')
        lines.push('')
        lines.push(chalk.dim(cmd.description()))
        lines.push('')

        // Options
        const opts = helper.visibleOptions(cmd)
        if (opts.length) {
          lines.push(chalk.bold('Options:'))
          for (const o of opts) {
            lines.push('  ' + chalk.cyan(o.flags.padEnd(26)) + chalk.white(o.description))
          }
          lines.push('')
        }

        const allCmds = helper.visibleCommands(cmd)
        const cmdMap = new Map(allCmds.map(c => [c.name(), c]))

        const renderGroup = (title: string, names: string[]) => {
          lines.push(chalk.bold(title))
          for (const name of names) {
            const c = cmdMap.get(name)
            if (!c) continue
            lines.push('  ' + chalk.green(name.padEnd(nameWidth)) + chalk.white(c.description()))
          }
          lines.push('')
        }

        const colW = 16   // each source ID column width
        const cols = 5    // IDs per row

        // 源：按分组展示
        lines.push(chalk.bold('源 (reado <source> <action>):'))

        for (const group of SOURCE_GROUPS) {
          lines.push('')
          // Group header with batch + platform commands inline
          const allGroupCmds = [...group.batchCmds, ...group.platformCmds]
          const cmdTags = allGroupCmds.map(n => chalk.green(n)).join('  ')
          lines.push(chalk.dim(`  ── ${group.label}`) + (cmdTags ? '    ' + cmdTags : ''))

          // Collect source IDs for this group
          const groupSourceIds: string[] = []
          for (const cat of group.categories) {
            groupSourceIds.push(...(catSourceIds.get(cat) ?? []))
          }

          if (groupSourceIds.length > 0) {
            for (let i = 0; i < groupSourceIds.length; i += cols) {
              const row = groupSourceIds.slice(i, i + cols)
              const rowStr = row.map(id => {
                const padded = id.padEnd(colW)
                return enabledSet.has(id) ? chalk.green(padded) : chalk.dim(padded)
              }).join(' ')
              lines.push('     ' + rowStr)
            }
          }
        }
        lines.push('')

        renderGroup('通用查询:', QUERY_CMDS)
        renderGroup('管理命令:', MGMT_CMDS)

        const fetchCmd = cmdMap.get('fetch')
        if (fetchCmd) {
          lines.push(chalk.dim('  fetch         ' + fetchCmd.description()))
          lines.push('')
        }

        lines.push(chalk.dim('运行 reado <source> --help 查看可用动作'))
        lines.push('')
        return lines.join('\n')
      },
    })

  // ═══════════════════════════════════════════════════
  //  数据命令: reado <platform> <action> [params]
  // ═══════════════════════════════════════════════════

  // ── bundle ──────────────────────────────────────────
  const bundleCmd = program.command('bundle').description('主题包聚合查询')

  addCommonOpts(
    bundleCmd.command('search')
      .description('从主题包搜索内容')
      .option('--bundle <id>', '主题包 ID (如: ai / tech / china-tech，默认: ai)')
      .option('--topics <topics>', '话题预设或关键词 (如: ai 或 "GPT,Claude")')
  ).action(async (opts) => {
    const bundleId = opts.bundle || 'ai'
    await runSearch([], { ...opts, bundle: bundleId, keyword: opts.topics ? [opts.topics] : undefined })
  })

  addCommonOpts(
    bundleCmd.command('hot')
      .description('获取主题包热榜')
      .option('--bundle <id>', '主题包 ID')
  ).action(async (opts) => {
    await runHot(undefined, opts)
  })

  // ── reddit ───────────────────────────────────────────
  const redditCmd = program.command('reddit').description('Reddit 内容')

  addCommonOpts(
    redditCmd.command('hot [subreddit]')
      .description('Reddit 热门 (默认: 已启用的 AI/ML 版块)')
  ).action(async (subreddit: string | undefined, opts) => {
    if (subreddit) {
      const id = `reddit-${subreddit.replace(/^r\//, '').toLowerCase()}`
      await runSearch([], { ...opts, source: [id], keyword: opts.topics ? [opts.topics] : ['*'] })
    } else {
      // 直接传已启用的 reddit-* 源 ID（user config 里没有 "Reddit" 类别，只有 "社区"）
      const redditIds = getDefaultSources()
        .filter(s => (s as any).category === 'Reddit' && s.enabled !== false)
        .map(s => s.id)
      await runSearch([], { ...opts, source: redditIds, keyword: opts.topics ? [opts.topics] : ['*'] })
    }
  })

  redditCmd.command('search <query>').description('搜索帖子').option('--subreddit <r>', '限定版块').option('--sort <s>', 'relevance/hot/top/new', 'relevance').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (query, opts) => {
      const args = ['reddit', 'search', query, '--sort', opts.sort, '--limit', opts.limit, '-f', opts.format]
      if (opts.subreddit) args.splice(3, 0, '--subreddit', opts.subreddit)
      await runOpencliPassthrough(args)
    })
  redditCmd.command('read <post-id>').description('阅读帖子和评论').option('--limit <n>', '评论数', '25').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (postId, opts) => { await runOpencliPassthrough(['reddit', 'read', postId, '--limit', opts.limit, '-f', opts.format]) })
  redditCmd.command('subreddit <name>').description('版块帖子').option('--sort <s>', 'hot/new/top/rising', 'hot').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (name, opts) => { await runOpencliPassthrough(['reddit', 'subreddit', name, '--sort', opts.sort, '--limit', opts.limit, '-f', opts.format]) })
  redditCmd.command('frontpage').description('Reddit 首页 / r/all').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['reddit', 'frontpage', '--limit', opts.limit, '-f', opts.format]) })
  redditCmd.command('popular').description('Reddit 热门版块').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['reddit', 'popular', '--limit', opts.limit, '-f', opts.format]) })
  redditCmd.command('user <username>').description('用户帖子').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (username, opts) => { await runOpencliPassthrough(['reddit', 'user-posts', username, '--limit', opts.limit, '-f', opts.format]) })

  // ── github ───────────────────────────────────────────
  const githubCmd = program.command('github').description('GitHub 内容')

  addCommonOpts(
    githubCmd.command('trending [language]')
      .description('GitHub 趋势项目 (不传语言则全语言)')
  ).action(async (language: string | undefined, opts) => {
    const id = language ? `github-trending-${language.toLowerCase()}` : 'github-trending'
    await runSearch([], { ...opts, source: [id] })
  })

  addCommonOpts(
    githubCmd.command('releases')
      .description('关注项目的最新 Release')
      .option('--topics <topics>', '话题过滤')
  ).action(async (opts) => {
    await runSearch(['GitHub'], {
      ...opts,
      source: ['claude-code-release', 'n8n-release', 'dify-release', 'langchain-release'],
      keyword: opts.topics ? [opts.topics] : undefined,
    })
  })

  // ── hackernews ───────────────────────────────────────
  const hnCmd = program.command('hackernews').description('Hacker News 内容')

  addCommonOpts(hnCmd.command('top').description('Hacker News Top 故事'))
    .action(async (opts) => { await runSearch([], { ...opts, source: ['hackernews'] }) })

  addCommonOpts(hnCmd.command('best').description('Hacker News Best 故事'))
    .action(async (opts) => { await runSearch([], { ...opts, source: ['hackernews-best'] }) })

  hnCmd.command('search <query>').description('搜索 HN').option('--limit <n>', '数量', '20').option('--sort <s>', 'relevance / date', 'relevance').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (query, opts) => { await runOpencliPassthrough(['hackernews', 'search', query, '--limit', opts.limit, '--sort', opts.sort, '-f', opts.format]) })
  hnCmd.command('ask').description('Ask HN').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['hackernews', 'ask', '--limit', opts.limit, '-f', opts.format]) })
  hnCmd.command('show').description('Show HN').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['hackernews', 'show', '--limit', opts.limit, '-f', opts.format]) })
  hnCmd.command('jobs').description('HN 招聘').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['hackernews', 'jobs', '--limit', opts.limit, '-f', opts.format]) })
  hnCmd.command('new').description('最新故事').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['hackernews', 'new', '--limit', opts.limit, '-f', opts.format]) })

  // ── twitter ──────────────────────────────────────────
  const twitterCmd = program.command('twitter').description('Twitter/X 内容')

  addCommonOpts(
    twitterCmd.command('timeline [users...]')
      .description('Twitter 时间线 (不传则用监控清单，清单为空用预设账号)')
      .option('--topics <topics>', '话题过滤')
  ).action(async (users: string[], opts) => {
    if (users && users.length > 0) {
      // 临时查看指定用户，直接构造 SourceConfig
      const configs = watchlistToSourceConfigs(users.map(u => u.replace(/^@/, '').toLowerCase()))
      await runSearch([], { ...opts, sourcesOverride: configs, keyword: opts.topics ? [opts.topics] : undefined })
    } else {
      // 优先用监控清单，清单为空则降级到默认5人
      const watchlist = loadWatchlist()
      if (watchlist.length > 0) {
        const configs = watchlistToSourceConfigs(watchlist)
        await runSearch([], { ...opts, sourcesOverride: configs, keyword: opts.topics ? [opts.topics] : undefined })
      } else {
        await runSearch([], {
          ...opts,
          source: ['tw-karpathy', 'tw-ylecun', 'tw-sama', 'tw-swyx', 'tw-drjimfan'],
          keyword: opts.topics ? [opts.topics] : undefined,
        })
      }
    }
  })

  // ── twitter 监控清单管理 ──
  twitterCmd.command('watch <username>')
    .description('添加用户到监控清单')
    .action((username: string) => {
      const { added, normalized } = addToWatchlist(username)
      if (added) {
        console.log(chalk.green(`✅ 已添加 @${normalized} 到监控清单`))
      } else {
        console.log(chalk.yellow(`@${normalized} 已在监控清单中`))
      }
      console.log(chalk.gray(`清单文件: ${getWatchlistPath()}`))
    })

  twitterCmd.command('unwatch <username>')
    .description('从监控清单移除用户')
    .action((username: string) => {
      const { removed, normalized } = removeFromWatchlist(username)
      if (removed) {
        console.log(chalk.green(`✅ 已从监控清单移除 @${normalized}`))
      } else {
        console.log(chalk.yellow(`@${normalized} 不在监控清单中`))
      }
    })

  twitterCmd.command('watchlist')
    .description('查看监控清单')
    .action(() => {
      const list = loadWatchlist()
      if (list.length === 0) {
        console.log(chalk.gray('\n  监控清单为空'))
        console.log(chalk.gray('  添加: reado twitter watch <username>'))
        console.log(chalk.gray(`  或直接编辑: ${getWatchlistPath()}\n`))
        return
      }
      console.log('')
      console.log(chalk.bold(`  Twitter 监控清单 (${list.length} 人)`))
      console.log('')
      for (const name of list) {
        console.log(`  • @${name}`)
      }
      console.log('')
      console.log(chalk.gray(`  文件: ${getWatchlistPath()}`))
      console.log(chalk.gray('  运行 reado twitter timeline 获取最新内容'))
      console.log('')
    })

  twitterCmd.command('trending').description('热门话题').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['twitter', 'trending', '-f', opts.format]) })
  twitterCmd.command('search <query>').description('搜索推文').option('--filter <f>', 'top / live', 'top').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (query, opts) => { await runOpencliPassthrough(['twitter', 'search', query, '--filter', opts.filter, '--limit', opts.limit, '-f', opts.format]) })
  twitterCmd.command('profile [username]').description('用户资料（不填则看自己）').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (username, opts) => {
      const args = ['twitter', 'profile', '-f', opts.format]
      if (username) args.splice(2, 0, username)
      await runOpencliPassthrough(args)
    })
  twitterCmd.command('thread <tweet-id>').description('推文线程（原帖+所有回复）').option('--limit <n>', '数量', '50').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (tweetId, opts) => { await runOpencliPassthrough(['twitter', 'thread', tweetId, '--limit', opts.limit, '-f', opts.format]) })
  twitterCmd.command('notifications').description('通知').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (opts) => { await runOpencliPassthrough(['twitter', 'notifications', '--limit', opts.limit, '-f', opts.format]) })
  twitterCmd.command('followers [username]').description('粉丝列表').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (username, opts) => {
      const args = ['twitter', 'followers', '--limit', opts.limit, '-f', opts.format]
      if (username) args.splice(2, 0, username)
      await runOpencliPassthrough(args)
    })
  twitterCmd.command('download [username]').description('下载用户媒体（图片/视频）').option('--tweet-url <url>', '单条推文 URL').option('--limit <n>', '扫描推文数', '10').option('--output <dir>', '输出目录', './twitter-downloads')
    .action(async (username, opts) => {
      const args = ['twitter', 'download', '--limit', opts.limit, '--output', opts.output]
      if (username) args.splice(2, 0, username)
      if (opts.tweetUrl) args.push('--tweet-url', opts.tweetUrl)
      await runOpencliPassthrough(args)
    })
  twitterCmd.command('article <tweet-id>').description('读取 Twitter 长文').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (tweetId, opts) => { await runOpencliPassthrough(['twitter', 'article', tweetId, '-f', opts.format]) })

  // ── youtube ──────────────────────────────────────────
  const ytCmd = program.command('youtube').description('YouTube 内容')

  addCommonOpts(
    ytCmd.command('latest [channels...]')
      .description('最新视频 (不传则用预设频道: Lex/Yannic/TwoMinutePapers/3B1B/Karpathy)')
      .option('--topics <topics>', '话题过滤')
  ).action(async (channels: string[], opts) => {
    const defaultIds = ['yt-lex-fridman', 'yt-yannic-kilcher', 'yt-two-minute-papers', 'yt-3blue1brown', 'yt-andrej-karpathy']
    if (channels && channels.length > 0) {
      const ids = channels.map(c => `yt-${c.replace('@', '').toLowerCase()}`)
      await runSearch([], { ...opts, source: ids, keyword: opts.topics ? [opts.topics] : undefined })
    } else {
      await runSearch([], { ...opts, source: defaultIds, keyword: opts.topics ? [opts.topics] : undefined })
    }
  })
  ytCmd.command('search <query>').description('搜索 YouTube 视频').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (query, opts) => { await runOpencliPassthrough(['youtube', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
  ytCmd.command('channel <id>').description('频道信息和最新视频').option('--limit <n>', '视频数', '10').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (id, opts) => { await runOpencliPassthrough(['youtube', 'channel', id, '--limit', opts.limit, '-f', opts.format]) })
  ytCmd.command('video <url>').description('视频详情（标题/播放量/描述等）').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (url, opts) => { await runOpencliPassthrough(['youtube', 'video', url, '-f', opts.format]) })
  ytCmd.command('comments <url>').description('视频评论').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (url, opts) => { await runOpencliPassthrough(['youtube', 'comments', url, '--limit', opts.limit, '-f', opts.format]) })
  ytCmd.command('transcript <url>').description('视频字幕/文稿').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (url, opts) => { await runOpencliPassthrough(['youtube', 'transcript', url, '-f', opts.format]) })

  // ── telegram ─────────────────────────────────────────
  const tgCmd = program.command('telegram').description('Telegram 频道内容')

  addCommonOpts(
    tgCmd.command('latest [channels...]')
      .description('最新消息 (不传则用预设频道: aibrief/aigclink)')
      .option('--topics <topics>', '话题过滤')
  ).action(async (channels: string[], opts) => {
    if (channels && channels.length > 0) {
      const ids = channels.map(c => `tg-${c.replace('@', '').toLowerCase()}`)
      await runSearch([], { ...opts, source: ids, keyword: opts.topics ? [opts.topics] : undefined })
    } else {
      await runSearch([], {
        ...opts,
        source: ['tg-aibrief', 'tg-aigclink'],
        keyword: opts.topics ? [opts.topics] : undefined,
      })
    }
  })

  // ── bluesky ──────────────────────────────────────────
  {
    const bsky = program.command('bluesky').description('Bluesky')
    addCommonOpts(
      bsky.command('trending').alias('hot').description('热门话题').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['bluesky-trending'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    bsky.command('search <query>').description('搜索用户').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['bluesky', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    bsky.command('user <handle>').description('用户最近帖子').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (handle, opts) => { await runOpencliPassthrough(['bluesky', 'user', handle, '--limit', opts.limit, '-f', opts.format]) })
    bsky.command('profile <handle>').description('用户资料').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (handle, opts) => { await runOpencliPassthrough(['bluesky', 'profile', handle, '-f', opts.format]) })
    bsky.command('thread <uri>').description('帖子线程').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (uri, opts) => { await runOpencliPassthrough(['bluesky', 'thread', uri, '-f', opts.format]) })
    bsky.command('feeds').description('热门 Feed 生成器').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bluesky', 'feeds', '-f', opts.format]) })
  }

  // ── arxiv ────────────────────────────────────────────
  const arxivCmd = program.command('arxiv').description('arXiv 论文')

  addCommonOpts(
    arxivCmd.command('recent [category]')
      .description('最新论文 (默认: cs.AI。可选: cs.LG / cs.CL / cs.CV / stat.ML 等)')
      .option('--topics <topics>', '关键词过滤')
  ).action(async (category: string | undefined, opts) => {
    const catMap: Record<string, string> = {
      'cs.ai': 'arxiv-cs-ai', 'ai': 'arxiv-cs-ai',
      'cs.lg': 'arxiv-cs-lg', 'lg': 'arxiv-cs-lg',
      'cs.cl': 'arxiv-cs-cl', 'cl': 'arxiv-cs-cl', 'nlp': 'arxiv-cs-cl',
      'cs.cv': 'arxiv-cs-cv', 'cv': 'arxiv-cs-cv',
      'stat.ml': 'arxiv-stat-ml', 'stat': 'arxiv-stat-ml',
      'cs.ro': 'arxiv-cs-ro', 'robotics': 'arxiv-cs-ro',
    }
    const id = category ? (catMap[category.toLowerCase()] ?? `arxiv-${category.toLowerCase()}`) : 'arxiv-cs-ai'
    await runSearch([], { ...opts, source: [id], keyword: opts.topics ? [opts.topics] : undefined })
  })

  arxivCmd.command('search <query>').description('搜索 arXiv 论文').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (query, opts) => { await runOpencliPassthrough(['arxiv', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
  arxivCmd.command('paper <id>').description('论文详情（如 2301.07041）').option('-f, --format <fmt>', '输出格式', 'table')
    .action(async (id, opts) => { await runOpencliPassthrough(['arxiv', 'paper', id, '-f', opts.format]) })

  // ── huggingface ──────────────────────────────────────
  const hfCmd = program.command('huggingface').description('Hugging Face 内容')

  addCommonOpts(hfCmd.command('papers').description('HuggingFace 每日精选论文'))
    .action(async (opts) => { await runSearch([], { ...opts, source: ['hf-papers'] }) })

  addCommonOpts(hfCmd.command('blog').description('HuggingFace 官方博客'))
    .action(async (opts) => { await runSearch([], { ...opts, source: ['hf-blog'] }) })

  // ── v2ex ─────────────────────────────────────────────
  {
    const v2 = program.command('v2ex').description('V2EX')
    addCommonOpts(
      v2.command('hot').description('热门话题').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['v2ex'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    v2.command('latest').description('最新话题').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['v2ex', 'latest', '--limit', opts.limit, '-f', opts.format]) })
    v2.command('node <name>').description('节点话题（如: python / go）').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (name, opts) => { await runOpencliPassthrough(['v2ex', 'node', name, '--limit', opts.limit, '-f', opts.format]) })
    v2.command('topic <id>').description('话题详情和回复').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['v2ex', 'topic', id, '-f', opts.format]) })
    v2.command('member <username>').description('用户资料').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['v2ex', 'member', username, '-f', opts.format]) })
    v2.command('notifications').description('未读提醒').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['v2ex', 'notifications', '-f', opts.format]) })
  }

  // ── lobsters ─────────────────────────────────────────
  {
    const lb = program.command('lobsters').description('Lobste.rs')
    addCommonOpts(
      lb.command('hot').description('热门故事').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['lobsters'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    lb.command('newest').description('最新故事').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['lobsters', 'newest', '--limit', opts.limit, '-f', opts.format]) })
    lb.command('active').description('最活跃讨论').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['lobsters', 'active', '--limit', opts.limit, '-f', opts.format]) })
    lb.command('tag <tag>').description('按标签筛选（如: programming / ai）').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (tag, opts) => { await runOpencliPassthrough(['lobsters', 'tag', tag, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── producthunt ──────────────────────────────────────
  addHotOnlyPlatform(program, 'producthunt', 'Product Hunt', ['producthunt'])

  // ── mastodon ─────────────────────────────────────────
  addSearchHotPlatform(program, 'mastodon', 'Mastodon', ['mastodon-ai', 'mastodon-llm'])

  // ── weibo ─────────────────────────────────────────────
  {
    const wb = program.command('weibo').description('微博')
    addCommonOpts(
      wb.command('hot').description('微博热搜').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['weibo-hot'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    wb.command('search <keyword>').description('搜索微博').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['weibo', 'search', keyword, '--limit', opts.limit, '-f', opts.format]) })
    wb.command('user <id>').description('用户主页').option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['weibo', 'user', id, '-f', opts.format]) })
    wb.command('feed').description('关注用户动态').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['weibo', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    wb.command('post <id>').description('单条微博详情').option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['weibo', 'post', id, '-f', opts.format]) })
    wb.command('comments <id>').description('微博评论').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['weibo', 'comments', id, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── zhihu ─────────────────────────────────────────────
  {
    const zh = program.command('zhihu').description('知乎')

    // hot — 热榜（info 源，不走 topics 过滤）
    addCommonOpts(
      zh.command('hot')
        .description('知乎热榜')
        .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['zhihu-hot'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })

    // search — 搜索
    zh.command('search <query>')
      .description('搜索知乎内容')
      .option('--limit <n>', '结果数量', '10')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (query, opts) => {
        await runOpencliPassthrough(['zhihu', 'search', query, '--limit', opts.limit, '-f', opts.format])
      })

    // question — 问题详情和回答
    zh.command('question <id>')
      .description('问题详情和回答（问题 ID，如 URL 末尾数字）')
      .option('--limit <n>', '回答数量', '5')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (id, opts) => {
        await runOpencliPassthrough(['zhihu', 'question', id, '--limit', opts.limit, '-f', opts.format])
      })

    // download — 导出文章为 Markdown
    zh.command('download <url>')
      .description('导出知乎文章为 Markdown (zhuanlan.zhihu.com/p/xxx)')
      .option('--output <dir>', '输出目录', './zhihu-articles')
      .option('--download-images', '同时下载图片到本地')
      .action(async (url, opts) => {
        const args = ['zhihu', 'download', '--url', url, '--output', opts.output]
        if (opts.downloadImages) args.push('--download-images', 'true')
        await runOpencliPassthrough(args)
      })
  }

  // ── bilibili ──────────────────────────────────────────
  {
    const bili = program.command('bilibili').description('Bilibili')

    // hot — 热门视频（info 源，走 reado 格式化）
    addCommonOpts(
      bili.command('hot')
        .description('B站热门视频')
        .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['bilibili-hot'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })

    // ranking — 排行榜（info 源）
    addCommonOpts(
      bili.command('ranking')
        .description('B站视频排行榜')
        .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['bilibili-ranking'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })

    // search — 交互式搜索；加 --format 时直接格式化输出
    bili.command('search <query>')
      .description('搜索 B站 视频（交互式；--format html 直接导出）')
      .option('--type <type>', '搜索类型: video / user', 'video')
      .option('--limit <n>', '结果数量', '20')
      .option('--page <n>', '页码', '1')
      .option('--format <fmt>', '输出格式: html / json / markdown（不指定则交互式）')
      .option('--theme <theme>', 'HTML 模板: default / dashboard / minimal', 'default')
      .option('--open', '生成 HTML 后自动打开浏览器')
      .option('-o, --output <path>', '指定 HTML 输出路径')
      .action(async (query, opts) => {
        await runBilibiliSearch(query, opts)
      })

    // comments — 视频评论（直通 opencli）
    bili.command('comments <bvid>')
      .description('获取视频评论 (e.g. BV1xxxxx)')
      .option('--limit <n>', '评论数量 (max 50)', '20')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (bvid, opts) => {
        await runOpencliPassthrough([
          'bilibili', 'comments', bvid,
          '--limit', opts.limit,
          '-f', opts.format,
        ])
      })

    // subtitle — 视频字幕（直通 opencli）
    bili.command('subtitle <bvid>')
      .description('获取视频字幕 (e.g. BV1xxxxx)')
      .option('--lang <lang>', '字幕语言代码 (zh-CN / en-US / ai-zh)')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (bvid, opts) => {
        const args = ['bilibili', 'subtitle', bvid, '-f', opts.format]
        if (opts.lang) args.push('--lang', opts.lang)
        await runOpencliPassthrough(args)
      })

    // download — 下载视频（直通 opencli，需要 yt-dlp）
    bili.command('download <bvid>')
      .description('下载视频，需要安装 yt-dlp (e.g. BV1xxxxx)')
      .option('--output <dir>', '输出目录', './bilibili-downloads')
      .option('--quality <q>', '画质: best / 1080p / 720p / 480p', 'best')
      .action(async (bvid, opts) => {
        await runOpencliPassthrough([
          'bilibili', 'download', bvid,
          '--output', opts.output,
          '--quality', opts.quality,
        ])
      })
  }

  // ── douyin ────────────────────────────────────────────
  // 面向创作者平台，暂时隐藏，不对外开放
  if (false) {
    const dy = program.command('douyin').description('抖音（需登录 creator.douyin.com）')

    // hot — 热点话题（内部用 json 避免 opencli table formatter 在 null 数据时崩溃）
    dy.command('hot')
      .description('抖音热点话题')
      .option('--limit <n>', '数量', '20')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runDouyinHashtag(['douyin', 'hashtag', 'hot', '--limit', opts.limit], opts.format)
      })

    // search — 话题搜索
    dy.command('search <keyword>')
      .description('搜索话题')
      .option('--limit <n>', '数量', '20')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (keyword, opts) => {
        await runDouyinHashtag(['douyin', 'hashtag', 'search', '--keyword', keyword, '--limit', opts.limit], opts.format)
      })

    // profile — 账号信息
    dy.command('profile')
      .description('获取账号信息')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runOpencliPassthrough(['douyin', 'profile', '-f', opts.format])
      })

    // videos — 我的作品列表
    dy.command('videos')
      .description('获取作品列表')
      .option('--limit <n>', '数量', '20')
      .option('--page <n>', '页码', '1')
      .option('--status <s>', '状态: all / published / reviewing / scheduled', 'all')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runOpencliPassthrough(['douyin', 'videos', '--limit', opts.limit, '--page', opts.page, '--status', opts.status, '-f', opts.format])
      })

    // stats — 作品数据分析
    dy.command('stats <aweme_id>')
      .description('作品数据分析')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (awemeId, opts) => {
        await runOpencliPassthrough(['douyin', 'stats', awemeId, '-f', opts.format])
      })

    // user-videos — 指定用户视频
    dy.command('user-videos <sec_uid>')
      .description('获取用户视频列表（含下载地址和热门评论）')
      .option('--limit <n>', '数量', '20')
      .option('--comment-limit <n>', '每视频评论数', '10')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (secUid, opts) => {
        await runOpencliPassthrough([
          'douyin', 'user-videos', secUid,
          '--limit', opts.limit,
          '--comment_limit', opts.commentLimit ?? '10',
          '-f', opts.format,
        ])
      })

    // activities — 官方活动
    dy.command('activities')
      .description('官方活动列表')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runOpencliPassthrough(['douyin', 'activities', '-f', opts.format])
      })
  }

  // ── tiktok ────────────────────────────────────────────
  {
    const tk = program.command('tiktok').description('TikTok（需登录 www.tiktok.com）')

    // explore/hot — 热门视频（复用 tiktok-explore info 源，不走 topics 过滤）
    addCommonOpts(
      tk.command('explore')
        .alias('hot')
        .description('热门 / 探索视频')
        .option('--topics <topics>', '话题预设或关键词（不指定则显示全部）')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['tiktok-explore'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })

    // search — 搜索视频
    tk.command('search <query>')
      .description('搜索视频')
      .option('--limit <n>', '结果数量', '10')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (query, opts) => {
        await runOpencliPassthrough(['tiktok', 'search', query, '--limit', opts.limit, '-f', opts.format])
      })

    // user — 用户最近视频
    tk.command('user <username>')
      .description('获取用户最近视频（不含 @）')
      .option('--limit <n>', '数量', '10')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (username, opts) => {
        await runOpencliPassthrough(['tiktok', 'user', username, '--limit', opts.limit, '-f', opts.format])
      })

    // profile — 用户资料
    tk.command('profile <username>')
      .description('获取用户资料（不含 @）')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (username, opts) => {
        await runOpencliPassthrough(['tiktok', 'profile', username, '-f', opts.format])
      })

    // live — 直播列表
    tk.command('live')
      .description('当前直播列表')
      .option('--limit <n>', '数量', '10')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runOpencliPassthrough(['tiktok', 'live', '--limit', opts.limit, '-f', opts.format])
      })

    // notifications — 通知
    tk.command('notifications')
      .alias('notif')
      .description('获取通知（点赞/评论/提及/新粉丝）')
      .option('--limit <n>', '数量', '15')
      .option('--type <type>', '类型: all / likes / comments / mentions', 'all')
      .option('-f, --format <fmt>', '输出格式: table / json / csv', 'table')
      .action(async (opts) => {
        await runOpencliPassthrough(['tiktok', 'notifications', '--limit', opts.limit, '--type', opts.type, '-f', opts.format])
      })

    // comment — 评论视频
    tk.command('comment <url> <text>')
      .description('对视频发表评论')
      .action(async (url, text) => {
        await runOpencliPassthrough(['tiktok', 'comment', url, text])
      })
  }

  // ── xueqiu ───────────────────────────────────────────
  {
    const xq = program.command('xueqiu').description('雪球')
    addCommonOpts(
      xq.command('hot').description('热门动态').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['xueqiu-hot'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    addCommonOpts(
      xq.command('hot-stock').description('热门股票').option('--topics <topics>', '关键词')
    ).action(async (opts) => {
      await runSearch([], { ...opts, source: ['xueqiu-hot-stock'], keyword: opts.topics ? [opts.topics] : ['*'] })
    })
    xq.command('search <query>').description('搜索股票（代码或名称）').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['xueqiu', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    xq.command('stock <symbol>').description('股票实时行情 (如: AAPL, 600519)').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (symbol, opts) => { await runOpencliPassthrough(['xueqiu', 'stock', symbol, '-f', opts.format]) })
    xq.command('comments <symbol>').description('股票讨论动态').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (symbol, opts) => { await runOpencliPassthrough(['xueqiu', 'comments', symbol, '--limit', opts.limit, '-f', opts.format]) })
    xq.command('watchlist').description('自选股列表').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['xueqiu', 'watchlist', '-f', opts.format]) })
    xq.command('earnings-date <symbol>').description('财报发布日期').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (symbol, opts) => { await runOpencliPassthrough(['xueqiu', 'earnings-date', symbol, '-f', opts.format]) })
  }

  // ── 36kr ─────────────────────────────────────────────
  addSearchHotPlatform(program, '36kr', '36氪', ['36kr-hot'], ['36kr'])

  // ── xiaohongshu ──────────────────────────────────────
  {
    const xhs = program.command('xiaohongshu').alias('xhs').description('小红书')
    xhs.command('feed').description('首页推荐 Feed').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['xiaohongshu', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    xhs.command('search <query>').description('搜索笔记').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['xiaohongshu', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    xhs.command('user <id>').description('用户笔记列表').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['xiaohongshu', 'user', id, '--limit', opts.limit, '-f', opts.format]) })
    xhs.command('comments <note-id>').description('笔记评论').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (noteId, opts) => { await runOpencliPassthrough(['xiaohongshu', 'comments', noteId, '--limit', opts.limit, '-f', opts.format]) })
    xhs.command('download <note-id>').description('下载笔记图片/视频').option('--output <dir>', '输出目录', './xiaohongshu-downloads')
      .action(async (noteId, opts) => { await runOpencliPassthrough(['xiaohongshu', 'download', noteId, '--output', opts.output]) })
    xhs.command('creator-profile').description('创作者账号信息').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['xiaohongshu', 'creator-profile', '-f', opts.format]) })
    xhs.command('creator-notes').description('创作者笔记列表+数据').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['xiaohongshu', 'creator-notes', '--limit', opts.limit, '-f', opts.format]) })
    xhs.command('creator-stats').description('创作者数据总览').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['xiaohongshu', 'creator-stats', '-f', opts.format]) })
  }

  // ── google ────────────────────────────────────────────
  {
    const gg = program.command('google').description('Google 搜索')
    gg.command('search <keyword>').description('Google 搜索').option('--limit <n>', '数量', '10').option('--lang <lang>', '语言', 'zh').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['google', 'search', keyword, '--limit', opts.limit, '--lang', opts.lang, '-f', opts.format]) })
    gg.command('news [keyword]').description('Google 新闻').option('--limit <n>', '数量', '10').option('--lang <lang>', '语言', 'zh').option('--region <r>', '地区', 'CN').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => {
        const args = ['google', 'news', '--limit', opts.limit, '--lang', opts.lang, '--region', opts.region, '-f', opts.format]
        if (keyword) args.splice(2, 0, keyword)
        await runOpencliPassthrough(args)
      })
    gg.command('trends').description('Google 热门趋势').option('--region <r>', '地区', 'CN').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['google', 'trends', '--region', opts.region, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── wikipedia ────────────────────────────────────────
  {
    const wiki = program.command('wikipedia').alias('wiki').description('Wikipedia')
    wiki.command('search <query>').description('搜索文章').option('--limit <n>', '数量', '10').option('--lang <lang>', '语言', 'zh').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['wikipedia', 'search', query, '--limit', opts.limit, '--lang', opts.lang, '-f', opts.format]) })
    wiki.command('summary <title>').description('文章摘要').option('--lang <lang>', '语言', 'zh').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (title, opts) => { await runOpencliPassthrough(['wikipedia', 'summary', title, '--lang', opts.lang, '-f', opts.format]) })
    wiki.command('trending').description('昨日最多阅读').option('--limit <n>', '数量', '10').option('--lang <lang>', '语言', 'zh').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['wikipedia', 'trending', '--limit', opts.limit, '--lang', opts.lang, '-f', opts.format]) })
    wiki.command('random').description('随机文章').option('--lang <lang>', '语言', 'zh').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['wikipedia', 'random', '--lang', opts.lang, '-f', opts.format]) })
  }

  // ── zsxq ─────────────────────────────────────────────
  {
    const zs = program.command('zsxq').description('知识星球')
    zs.command('groups').description('已加入的星球列表').option('--limit <n>', '数量', '50').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['zsxq', 'groups', '--limit', opts.limit, '-f', opts.format]) })
    zs.command('topics').description('星球话题列表').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['zsxq', 'topics', '--limit', opts.limit, '-f', opts.format]) })
    zs.command('dynamics').description('所有星球最新动态').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['zsxq', 'dynamics', '--limit', opts.limit, '-f', opts.format]) })
    zs.command('search <keyword>').description('搜索星球内容').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['zsxq', 'search', keyword, '--limit', opts.limit, '-f', opts.format]) })
    zs.command('topic <id>').description('话题详情和评论').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['zsxq', 'topic', id, '-f', opts.format]) })
  }

  // ── substack ─────────────────────────────────────────
  {
    const ss = program.command('substack').description('Substack')
    ss.command('feed').description('热门文章 Feed').option('--category <c>', '分类: all/tech/business/science...', 'all').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['substack', 'feed', '--category', opts.category, '--limit', opts.limit, '-f', opts.format]) })
    ss.command('search <keyword>').description('搜索文章或 Newsletter').option('--type <t>', 'posts / publications', 'posts').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['substack', 'search', keyword, '--type', opts.type, '--limit', opts.limit, '-f', opts.format]) })
    ss.command('publication <url>').description('指定 Newsletter 最新文章').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (url, opts) => { await runOpencliPassthrough(['substack', 'publication', url, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── stackoverflow ────────────────────────────────────
  {
    const so = program.command('stackoverflow').alias('so').description('Stack Overflow')
    so.command('hot').description('热门问题').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['stackoverflow', 'hot', '--limit', opts.limit, '-f', opts.format]) })
    so.command('search <query>').description('搜索问题').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['stackoverflow', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    so.command('unanswered').description('未解决的高赞问题').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['stackoverflow', 'unanswered', '--limit', opts.limit, '-f', opts.format]) })
    so.command('bounties').description('悬赏问题').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['stackoverflow', 'bounties', '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── instagram ────────────────────────────────────────
  {
    const ig = program.command('instagram').description('Instagram（需登录 www.instagram.com）')
    ig.command('explore').description('探索页热门内容').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['instagram', 'explore', '--limit', opts.limit, '-f', opts.format]) })
    ig.command('search <query>').description('搜索用户').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['instagram', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    ig.command('user <username>').description('用户最近帖子').option('--limit <n>', '数量', '12').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['instagram', 'user', username, '--limit', opts.limit, '-f', opts.format]) })
    ig.command('profile <username>').description('用户资料').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['instagram', 'profile', username, '-f', opts.format]) })
    ig.command('followers <username>').description('粉丝列表').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['instagram', 'followers', username, '--limit', opts.limit, '-f', opts.format]) })
    ig.command('saved').description('我的收藏').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['instagram', 'saved', '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── facebook ─────────────────────────────────────────
  {
    const fb = program.command('facebook').description('Facebook（需登录 www.facebook.com）')
    fb.command('feed').description('首页信息流').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['facebook', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    fb.command('search <query>').description('搜索').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['facebook', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    fb.command('profile <username>').description('用户/主页资料').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['facebook', 'profile', username, '-f', opts.format]) })
    fb.command('events').description('活动列表').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['facebook', 'events', '--limit', opts.limit, '-f', opts.format]) })
    fb.command('groups').description('已加入的群组').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['facebook', 'groups', '--limit', opts.limit, '-f', opts.format]) })
    fb.command('notifications').description('通知').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['facebook', 'notifications', '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── medium ───────────────────────────────────────────
  {
    const md = program.command('medium').description('Medium 文章')
    md.command('feed').description('热门文章 Feed').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['medium', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    md.command('search <keyword>').description('搜索 Medium 文章').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['medium', 'search', keyword, '--limit', opts.limit, '-f', opts.format]) })
    md.command('user <username>').description('用户文章列表').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['medium', 'user', username, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── bloomberg ────────────────────────────────────────
  {
    const bb = program.command('bloomberg').description('Bloomberg 财经新闻 (RSS)')
    bb.command('main').description('Bloomberg 首页头条').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'main', '-f', opts.format]) })
    bb.command('markets').description('Bloomberg 市场新闻').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'markets', '-f', opts.format]) })
    bb.command('economics').description('Bloomberg 经济新闻').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'economics', '-f', opts.format]) })
    bb.command('tech').description('Bloomberg 科技新闻').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'tech', '-f', opts.format]) })
    bb.command('politics').description('Bloomberg 政治新闻').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'politics', '-f', opts.format]) })
    bb.command('industries').description('Bloomberg 行业新闻').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'industries', '-f', opts.format]) })
    bb.command('opinions').description('Bloomberg 评论观点').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'opinions', '-f', opts.format]) })
    bb.command('businessweek').description('商业周刊头条').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bloomberg', 'businessweek', '-f', opts.format]) })
    bb.command('news <url>').description('读取 Bloomberg 文章正文').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (url, opts) => { await runOpencliPassthrough(['bloomberg', 'news', url, '-f', opts.format]) })
  }

  // ── reuters ──────────────────────────────────────────
  {
    const rt = program.command('reuters').description('路透社新闻')
    rt.command('search <query>').description('搜索路透社新闻').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['reuters', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── douban ───────────────────────────────────────────
  {
    const db = program.command('douban').description('豆瓣（图书/电影）')
    db.command('movie-hot').description('豆瓣电影热门榜单').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['douban', 'movie-hot', '--limit', opts.limit, '-f', opts.format]) })
    db.command('book-hot').description('豆瓣图书热门榜单').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['douban', 'book-hot', '--limit', opts.limit, '-f', opts.format]) })
    db.command('top250').description('豆瓣电影 Top250').option('--limit <n>', '数量', '50').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['douban', 'top250', '--limit', opts.limit, '-f', opts.format]) })
    db.command('search <keyword>').description('搜索电影/图书/音乐').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['douban', 'search', keyword, '--limit', opts.limit, '-f', opts.format]) })
    db.command('subject <id>').description('电影详情').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['douban', 'subject', id, '-f', opts.format]) })
  }

  // ── tieba ────────────────────────────────────────────
  {
    const tb = program.command('tieba').description('百度贴吧')
    tb.command('hot').description('贴吧热门话题').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['tieba', 'hot', '--limit', opts.limit, '-f', opts.format]) })
    tb.command('posts <forum>').description('版块帖子').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (forum, opts) => { await runOpencliPassthrough(['tieba', 'posts', forum, '--limit', opts.limit, '-f', opts.format]) })
    tb.command('read <id>').description('阅读帖子').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['tieba', 'read', id, '-f', opts.format]) })
    tb.command('search <keyword>').description('搜索帖子').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (keyword, opts) => { await runOpencliPassthrough(['tieba', 'search', keyword, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── linux-do ─────────────────────────────────────────
  {
    const ld = program.command('linux-do').description('Linux.do 技术社区')
    ld.command('hot').description('热门话题').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['linux-do', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    ld.command('feed').description('话题列表').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['linux-do', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    ld.command('search <query>').description('搜索话题').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['linux-do', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    ld.command('topic <id>').description('话题详情和回复').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['linux-do', 'topic', id, '-f', opts.format]) })
    ld.command('tags').description('标签列表').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['linux-do', 'tags', '-f', opts.format]) })
    ld.command('user-posts <username>').description('用户帖子').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['linux-do', 'user-posts', username, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── weread ───────────────────────────────────────────
  {
    const wr = program.command('weread').description('微信读书')
    wr.command('ranking [category]').description('图书排行榜').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (category, opts) => {
        const args = ['weread', 'ranking', '--limit', opts.limit, '-f', opts.format]
        if (category) args.splice(2, 0, category)
        await runOpencliPassthrough(args)
      })
    wr.command('search <query>').description('搜索图书').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['weread', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    wr.command('book <book-id>').description('图书详情').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (bookId, opts) => { await runOpencliPassthrough(['weread', 'book', bookId, '-f', opts.format]) })
    wr.command('shelf').description('我的书架').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['weread', 'shelf', '-f', opts.format]) })
    wr.command('highlights <book-id>').description('我的划线').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (bookId, opts) => { await runOpencliPassthrough(['weread', 'highlights', bookId, '-f', opts.format]) })
    wr.command('notebooks').description('有笔记/划线的书').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['weread', 'notebooks', '-f', opts.format]) })
  }

  // ── bbc ──────────────────────────────────────────────
  {
    const bbc = program.command('bbc').description('BBC 新闻')
    bbc.command('news').description('BBC 新闻头条 (RSS)').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['bbc', 'news', '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── devto ─────────────────────────────────────────────
  {
    const dt = program.command('devto').description('DEV.to 开发者社区')
    dt.command('top').description('今日热门文章').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['devto', 'top', '--limit', opts.limit, '-f', opts.format]) })
    dt.command('tag <tag>').description('按标签浏览（如: javascript / python / ai）').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (tag, opts) => { await runOpencliPassthrough(['devto', 'tag', tag, '--limit', opts.limit, '-f', opts.format]) })
    dt.command('user <username>').description('用户最近文章').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['devto', 'user', username, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── jike ─────────────────────────────────────────────
  {
    const jk = program.command('jike').description('即刻')
    jk.command('feed').description('首页动态流').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['jike', 'feed', '--limit', opts.limit, '-f', opts.format]) })
    jk.command('search <query>').description('搜索帖子').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['jike', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
    jk.command('post <id>').description('帖子详情及评论').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['jike', 'post', id, '-f', opts.format]) })
    jk.command('user <username>').description('用户动态').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (username, opts) => { await runOpencliPassthrough(['jike', 'user', username, '--limit', opts.limit, '-f', opts.format]) })
    jk.command('topic <id>').description('话题/圈子帖子').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['jike', 'topic', id, '--limit', opts.limit, '-f', opts.format]) })
    jk.command('notifications').description('通知').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['jike', 'notifications', '-f', opts.format]) })
  }

  // ── linkedin ─────────────────────────────────────────
  {
    const li = program.command('linkedin').description('LinkedIn（需登录）')
    li.command('timeline').description('首页信息流').option('--limit <n>', '数量', '20').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (opts) => { await runOpencliPassthrough(['linkedin', 'timeline', '--limit', opts.limit, '-f', opts.format]) })
    li.command('search <query>').description('搜索职位').option('--limit <n>', '数量', '10').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (query, opts) => { await runOpencliPassthrough(['linkedin', 'search', query, '--limit', opts.limit, '-f', opts.format]) })
  }

  // ── xiaoyuzhou ───────────────────────────────────────
  {
    const xyz = program.command('xiaoyuzhou').description('小宇宙播客')
    xyz.command('podcast <id>').description('播客主页信息').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['xiaoyuzhou', 'podcast', id, '-f', opts.format]) })
    xyz.command('episodes <id>').description('播客最近单集').option('--limit <n>', '数量', '15').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['xiaoyuzhou', 'podcast-episodes', id, '--limit', opts.limit, '-f', opts.format]) })
    xyz.command('episode <id>').description('单集详情').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (id, opts) => { await runOpencliPassthrough(['xiaoyuzhou', 'episode', id, '-f', opts.format]) })
  }

  // ── yahoo-finance ────────────────────────────────────
  {
    const yf = program.command('yahoo-finance').description('Yahoo Finance')
    yf.command('quote <symbol>').description('股票行情（如: AAPL / TSLA）').option('-f, --format <fmt>', '输出格式', 'table')
      .action(async (symbol, opts) => { await runOpencliPassthrough(['yahoo-finance', 'quote', symbol, '-f', opts.format]) })
  }

  // ── aicompany ─────────────────────────────────────────
  {
    const p = program.command('aicompany').description('AI 公司官方博客 (OpenAI/Anthropic/Google/Meta 等)')
    addCommonOpts(
      p.command('search')
        .description('搜索 AI 公司博客内容')
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch(['AI公司'], { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
    })
  }

  // ── media ─────────────────────────────────────────────
  {
    const p = program.command('media').description('科技媒体 (TechCrunch/Verge/量子位/36氪 等)')
    addCommonOpts(
      p.command('search')
        .description('搜索科技媒体内容')
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch(['科技媒体'], { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
    })
  }

  // ── academic ──────────────────────────────────────────
  {
    const p = program.command('academic').description('学术内容 (arXiv/HuggingFace/AI Now 等)')
    addCommonOpts(
      p.command('search')
        .description('搜索学术内容')
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch(['学术'], { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
    })
    addCommonOpts(
      p.command('recent')
        .description('最新学术论文/博客')
    ).action(async (opts) => {
      await runSearch(['学术'], { ...opts })
    })
  }

  // ── developer ─────────────────────────────────────────
  {
    const p = program.command('developer').description('开发者博客 & 时事通讯 (Simon Willison/Lilian Weng/Stratechery 等)')
    addCommonOpts(
      p.command('search')
        .description('搜索开发者内容')
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch(['开发者'], { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
    })
  }

  // ── vc ────────────────────────────────────────────────
  {
    const p = program.command('vc').description('创投机构博客 (a16z/YC/TechCrunch Venture 等)')
    addCommonOpts(
      p.command('search')
        .description('搜索创投内容')
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch(['创投'], { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
    })
  }

  // ── 动态注册所有单个信息源命令 ─────────────────────────
  // 让用户可以直接 reado openai search、reado qbitai search 等
  // 跳过已经有专用命令的 source ID，避免重复注册
  const existingCmds = new Set(program.commands.map(c => c.name()))
  for (const source of getDefaultSources()) {
    if (existingCmds.has(source.id)) continue
    const srcCmd = program.command(source.id).description(source.name)
    addCommonOpts(
      srcCmd.command('search')
        .description(`获取 ${source.name} 最新内容`)
        .option('--topics <topics>', '话题预设或关键词')
    ).action(async (opts) => {
      await runSearch([], {
        ...opts,
        source: [source.id],
        keyword: opts.topics ? [opts.topics] : undefined,
      })
    })
  }

  // ═══════════════════════════════════════════════════
  //  通用 search 命令 (replaces fetch)
  // ═══════════════════════════════════════════════════
  addCommonOpts(
    program.command('search')
      .description('搜索信息 (通用命令，支持板块/源/主题包)')
      .argument('[categories...]', '要搜索的板块 (可多选，留空则全部)')
      .option('-s, --source <ids...>', '按信息源 ID 搜索 (可多选)')
      .option('--topics <topics>', '话题预设或关键词 (如: ai 或 "GPT,Claude")')
      .option('--bundle <id>', '主题包 (如: ai / tech / economics)')
      .option('-v, --verbose', '详细输出')
  ).action(async (categories: string[], opts) => {
    await runSearch(categories, { ...opts, keyword: opts.topics ? [opts.topics] : undefined })
  })

  // fetch = 向后兼容别名
  addCommonOpts(
    program.command('fetch')
      .description('[已更名为 search] 向后兼容')
      .argument('[categories...]', '')
      .option('-s, --source <ids...>', '')
      .option('-k, --keyword <words...>', '关键词过滤 (建议改用 --topics)')
      .option('--topics <topics>', '')
      .option('--bundle <id>', '')
      .option('-v, --verbose', '')
  ).action(async (categories: string[], opts) => {
    const keyword = opts.topics ? [opts.topics] : opts.keyword
    await runSearch(categories, { ...opts, keyword })
  })

  // ═══════════════════════════════════════════════════
  //  hot 快捷命令
  // ═══════════════════════════════════════════════════
  addCommonOpts(
    program.command('hot [platform]')
      .description('各平台热榜 (快捷命令)')
      .option('--bundle <id>', '主题包')
      .option('--topics <topics>', '关键词过滤 (如: AI 或 "GPT,Claude"，不指定则显示全部)')
  ).action(async (platform: string | undefined, opts) => {
    await runHot(platform, opts)
  })

  // ═══════════════════════════════════════════════════
  //  管理命令
  // ═══════════════════════════════════════════════════

  const sourcesCmd = program.command('sources').description('管理信息源')
  sourcesCmd.command('list [search]')
    .description('列出信息源 (可按名称/ID/板块搜索)')
    .option('--disabled', '只显示未开启的源')
    .option('--enabled', '只显示已开启的源')
    .action((search: string | undefined, opts) => runSourcesList({ search, ...opts }))

  sourcesCmd.command('enable [sourceId]')
    .description('开启信息源 (不传 ID 则进入交互式多选，自动归入对应板块)')
    .action(async (sourceId: string | undefined) => runSourcesEnable(sourceId, {}))

  sourcesCmd.command('disable <sourceId>')
    .description('关闭一个信息源')
    .action((sourceId: string) => runSourcesDisable(sourceId))

  sourcesCmd.command('test <sourceId>')
    .description('测试指定信息源')
    .action(async (sourceId: string) => runSourcesTest(sourceId))

  const bundlesMgmt = program.command('bundles').description('查看主题包')
  bundlesMgmt.command('list').description('列出所有主题包').action(() => runBundlesList())
  bundlesMgmt.command('show <bundleId>').description('查看主题包包含的信息源').action((id: string) => runBundlesShow(id))

  const topicsCmd = program.command('topics').description('话题预设管理')
  topicsCmd.command('list').description('列出所有话题预设').action(() => runTopicsList())
  topicsCmd.command('show <name>').description('查看话题预设的关键词').action((name: string) => runTopicsShow(name))

  const configCmd = program.command('config').description('查看或修改全局配置')
  configCmd.command('get [key]').description('查看配置项').action((key?: string) => runConfigGet(key))
  configCmd.command('set <key> <value>').description('修改配置项').action((key: string, value: string) => runConfigSet(key, value))
  configCmd.command('clear <key>').description('清除配置项').action((key: string) => runConfigClear(key))

  program.command('init').description('初始化配置文件').action(() => runInit())

  return program
}

import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { which } from '../utils/which.js'
import { runOpencliPassthrough } from '../utils/passthrough.js'
import { formatOutput, exportHTML } from '../output/index.js'
import chalk from 'chalk'
import select from '@inquirer/select'
import checkbox from '@inquirer/checkbox'
import type { InfoItem, AggregateResult, OutputFormat } from '../core/types.js'

interface BiliVideo {
  rank: number
  title: string
  author: string
  score: number
  url: string
  bvid: string
}

function extractBvid(url: string): string {
  const m = url.match(/\/video\/(BV\w+)/)
  return m ? m[1] : ''
}

function formatScore(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  return String(n)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function runJson(bin: string, args: string[]): unknown[] {
  try {
    const raw = execSync([bin, ...args, '-f', 'json'].join(' '), {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    }).toString().trim()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 把 BiliVideo[] 转成 AggregateResult，复用现有输出管道 */
function toAggregateResult(videos: BiliVideo[], query: string): AggregateResult {
  const items: InfoItem[] = videos.map(v => ({
    title: v.title,
    url: v.url,
    summary: `播放 ${formatScore(v.score)}  @${v.author}  ${v.bvid}`,
    publishedAt: null,
    source: 'bilibili-search',
    sourceName: `B站搜索: ${query}`,
    category: '社交媒体',
  }))
  return {
    items,
    results: [{
      source: {
        id: 'bilibili-search',
        name: `B站搜索: ${query}`,
        adapter: 'opencli',
        url: '',
        hours: 24,
        topics: [],
        enabled: true,
        category: '社交媒体',
      },
      items,
      cached: false,
      durationMs: 0,
    }],
    stats: {
      totalSources: 1,
      successSources: 1,
      failedSources: 0,
      cachedSources: 0,
      totalItems: items.length,
    },
    fetchedAt: new Date(),
  }
}

export async function runBilibiliSearch(query: string, opts: {
  type?: string
  limit?: string
  page?: string
  format?: string
  theme?: string
  open?: boolean
  output?: string
}): Promise<void> {
  const bin = await which('opencli')
  if (!bin) {
    console.error(chalk.red('opencli 未安装，请先运行: npm install -g opencli'))
    process.exit(1)
  }

  const limit = opts.limit ?? '20'
  const page = opts.page ?? '1'
  const type = opts.type ?? 'video'
  const format = opts.format as OutputFormat | undefined

  // ── 1. 抓取搜索结果 ────────────────────────────────────────
  process.stdout.write(chalk.gray(`正在搜索 "${query}"...`))
  let videos: BiliVideo[]
  try {
    const raw = execSync(
      `${bin} bilibili search ${JSON.stringify(query)} --type ${type} --limit ${limit} --page ${page} -f json`,
      { timeout: 30_000, maxBuffer: 5 * 1024 * 1024, env: { ...process.env } },
    ).toString().trim()
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    videos = parsed.map(v => ({
      rank: Number(v.rank ?? 0),
      title: String(v.title ?? ''),
      author: String(v.author ?? ''),
      score: Number(v.score ?? 0),
      url: String(v.url ?? ''),
      bvid: extractBvid(String(v.url ?? '')),
    })).filter(v => v.bvid)
    process.stdout.write('\r' + ' '.repeat(40) + '\r')
  } catch (e) {
    process.stdout.write('\n')
    console.error(chalk.red(`搜索失败: ${e instanceof Error ? e.message.split('\n')[0] : e}`))
    process.exit(1)
  }

  if (videos.length === 0) {
    console.log(chalk.yellow(`\n  没有找到与 "${query}" 相关的视频\n`))
    return
  }

  // ── 2a. 指定了 --format：直接格式化输出，不进入交互 ──────────
  if (format && format !== 'table') {
    const result = toAggregateResult(videos, query)
    if (format === 'html') {
      const filePath = exportHTML(result, {
        theme: opts.theme || 'default',
        outputPath: opts.output,
        open: opts.open,
      })
      console.log(chalk.green(`✅ HTML 已生成: ${filePath}`))
      if (opts.open) console.log(chalk.gray('正在打开浏览器...'))
      else console.log(chalk.gray('提示: 添加 --open 可自动打开浏览器'))
      console.log(chalk.gray(`📊 共 ${videos.length} 条结果`))
    } else {
      console.log(formatOutput(result, format))
    }
    return
  }

  // ── 2b. 无 --format：交互式流程 ────────────────────────────
  console.log('')
  console.log(chalk.bold(`  B站搜索: ${chalk.cyan(query)}  共 ${videos.length} 条结果\n`))

  for (const v of videos) {
    console.log(`  ${chalk.gray(String(v.rank).padStart(2) + '.')} ${chalk.white(truncate(v.title, 60))}`)
    console.log(`      ${chalk.gray('@' + truncate(v.author, 16) + '  ')}${chalk.yellow(formatScore(v.score))}${chalk.gray(' 播放  ')}${chalk.dim(v.bvid)}`)
  }
  console.log('')

  // ── 3. 选择视频 ────────────────────────────────────────────
  const selectedBvid = await select({
    message: '选择一个视频',
    choices: videos.map(v => ({
      name: `${String(v.rank).padStart(2)}. ${truncate(v.title, 55)}  ${chalk.gray('@' + truncate(v.author, 14))}`,
      value: v.bvid,
      description: `${v.url}  播放: ${formatScore(v.score)}`,
    })),
    pageSize: 12,
  })

  const selected = videos.find(v => v.bvid === selectedBvid)!
  console.log('')
  console.log(chalk.bold(`  已选: ${chalk.cyan(truncate(selected.title, 70))}`))
  console.log(chalk.gray(`  BV号: ${selected.bvid}  链接: ${selected.url}`))
  console.log('')

  // ── 4. 选择操作（多选） ────────────────────────────────────
  const actions = await checkbox({
    message: '选择操作（Space 选中，Enter 确认）',
    choices: [
      { name: '📦  打包下载  （视频 + 字幕 + 评论）', value: 'bundle' },
      { name: '⬇   仅下载视频', value: 'download' },
      { name: '💬  获取评论', value: 'comments' },
      { name: '📄  获取字幕', value: 'subtitle' },
    ],
  })

  if (actions.length === 0) {
    console.log(chalk.gray('\n  未选择任何操作，退出。\n'))
    return
  }

  const needDownload = actions.includes('bundle') || actions.includes('download')
  const needSubtitle = actions.includes('bundle') || actions.includes('subtitle')
  const needComments = actions.includes('bundle') || actions.includes('comments')

  // ── 5. 一次性收集所有参数，再执行 ─────────────────────────
  let quality = 'best'
  let subtitleLang = ''

  if (needDownload) {
    quality = await select({
      message: '选择画质',
      choices: [
        { name: 'best（最高画质）', value: 'best' },
        { name: '1080p', value: '1080p' },
        { name: '720p', value: '720p' },
        { name: '480p', value: '480p' },
      ],
      default: 'best',
    })
  }

  if (needSubtitle) {
    subtitleLang = await select({
      message: '选择字幕语言',
      choices: [
        { name: '自动（取第一个可用字幕）', value: '' },
        { name: '中文 (zh-CN)', value: 'zh-CN' },
        { name: 'AI 中文字幕 (ai-zh)', value: 'ai-zh' },
        { name: '英文 (en-US)', value: 'en-US' },
      ],
      default: '',
    })
  }

  console.log('')

  // ── 6. 执行 ───────────────────────────────────────────────
  if (actions.includes('bundle')) {
    await runBundle(bin, selected, quality, subtitleLang)
  } else {
    if (actions.includes('download')) {
      console.log(chalk.cyan(`── 下载视频 ──────────────────────────────────────`))
      await runOpencliPassthrough(['bilibili', 'download', selected.bvid, '--quality', quality])
    }
    if (actions.includes('comments')) {
      console.log(chalk.cyan(`\n── 评论 ───────────────────────────────────────────`))
      await runOpencliPassthrough(['bilibili', 'comments', selected.bvid, '--limit', '20'])
    }
    if (actions.includes('subtitle')) {
      console.log(chalk.cyan(`\n── 字幕 ───────────────────────────────────────────`))
      const subData = runJson(bin, ['bilibili', 'subtitle', selected.bvid, ...(subtitleLang ? ['--lang', subtitleLang] : [])])
      if (subData.length === 0) {
        console.log(chalk.yellow('  ⚠ 该视频没有可用字幕'))
        console.log(chalk.gray('  部分视频未开启字幕或需要 UP 主手动添加'))
      } else {
        await runOpencliPassthrough(['bilibili', 'subtitle', selected.bvid, ...(subtitleLang ? ['--lang', subtitleLang] : [])])
      }
    }
  }

  console.log('')
  console.log(chalk.green('✅ 完成'))
}

/** 打包下载：视频 + 字幕 + 评论，存到同一目录 */
async function runBundle(
  bin: string,
  video: BiliVideo,
  quality: string,
  subtitleLang: string,
): Promise<void> {
  const outDir = join(homedir(), 'bilibili-downloads', video.bvid)
  mkdirSync(outDir, { recursive: true })

  console.log(chalk.cyan(`── 打包下载: ${video.bvid} ────────────────────────────`))
  console.log(chalk.gray(`   输出目录: ${outDir}\n`))

  // 1. 下载视频
  console.log(chalk.bold('① 下载视频...'))
  await runOpencliPassthrough(['bilibili', 'download', video.bvid, '--quality', quality, '--output', outDir])

  // 2. 字幕
  console.log(chalk.bold('\n② 获取字幕...'))
  const subArgs = ['bilibili', 'subtitle', video.bvid, ...(subtitleLang ? ['--lang', subtitleLang] : [])]
  const subData = runJson(bin, subArgs)
  if (subData.length === 0) {
    console.log(chalk.yellow('   ⚠ 该视频没有可用字幕，跳过'))
  } else {
    // 保存为 SRT 格式
    const srt = (subData as Array<Record<string, unknown>>)
      .map((line, i) => {
        const from = formatSrtTime(Number(line.from ?? 0))
        const to = formatSrtTime(Number(line.to ?? 0))
        return `${i + 1}\n${from} --> ${to}\n${line.content}\n`
      })
      .join('\n')
    const langSuffix = subtitleLang || 'auto'
    const srtPath = join(outDir, `subtitle.${langSuffix}.srt`)
    writeFileSync(srtPath, srt, 'utf-8')
    console.log(chalk.green(`   ✓ 字幕已保存: subtitle.${langSuffix}.srt  (${subData.length} 行)`))
  }

  // 3. 评论
  console.log(chalk.bold('\n③ 获取评论...'))
  const commentData = runJson(bin, ['bilibili', 'comments', video.bvid, '--limit', '50'])
  if (commentData.length === 0) {
    console.log(chalk.yellow('   ⚠ 无法获取评论，跳过'))
  } else {
    // 保存为易读的纯文本
    const txt = (commentData as Array<Record<string, unknown>>)
      .map(c => `[${c.rank}] @${c.author}  👍${c.likes ?? 0}\n${c.text}\n`)
      .join('\n')
    const txtPath = join(outDir, 'comments.txt')
    writeFileSync(txtPath, txt, 'utf-8')
    console.log(chalk.green(`   ✓ 评论已保存: comments.txt  (${commentData.length} 条)`))
  }

  console.log(chalk.gray(`\n   📁 ${outDir}`))
}

/** 秒数转 SRT 时间格式 00:00:00,000 */
function formatSrtTime(seconds: number): string {
  // 支持 "1.42s" 字符串或纯数字
  const s = typeof seconds === 'string'
    ? parseFloat(String(seconds).replace('s', ''))
    : seconds
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

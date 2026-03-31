import checkbox, { Separator } from '@inquirer/checkbox'
import type { UserConfig, SourceConfig } from '../core/types.js'
import { resolveSourceConfigs } from '../core/config.js'

export interface SelectionResult {
  sourceIds: string[]
  cancelled: boolean
}

/**
 * 交互式多选信息源（fetch 用）
 * 按板块分组显示，Space 勾选，Enter 确认
 */
export async function promptSourceSelection(config: UserConfig): Promise<SelectionResult> {
  const overrides = config.enabledOverrides ?? []
  const choices: (typeof Separator.prototype | { name: string; value: string; checked: boolean })[] = []

  for (const [category, ids] of Object.entries(config.categories)) {
    // 只显示实际可采集的源（过滤掉 enabled:false 且未被用户覆盖的）
    const resolvable = resolveSourceConfigs(ids, false, overrides)
    if (resolvable.length === 0) continue
    choices.push(new Separator(`── ${category} ──`))
    for (const s of resolvable) {
      choices.push({ name: `${s.name}  (${s.id})`, value: s.id, checked: true })
    }
  }

  try {
    const selected = await checkbox({
      message: '选择要采集的信息源 (Space 勾选，A 全选/全不选，Enter 确认)',
      choices,
      pageSize: 20,
      loop: false,
    })

    if (selected.length === 0) {
      return { sourceIds: [], cancelled: true }
    }

    return { sourceIds: selected, cancelled: false }
  } catch {
    // Ctrl+C
    return { sourceIds: [], cancelled: true }
  }
}

export interface EnableResult {
  sourceIds: string[]
  category: string
  cancelled: boolean
}

/**
 * 将信息源按 ID 前缀归组（如 reddit-* → Reddit, arxiv-* → arXiv）
 */
function groupSourcesByPlatform(sources: SourceConfig[]): Map<string, SourceConfig[]> {
  const platformLabels: Record<string, string> = {
    hackernews: 'Hacker News',
    reddit: 'Reddit',
    arxiv: 'arXiv',
    medium: 'Medium',
    substack: 'Substack',
    xueqiu: '雪球',
    bilibili: 'Bilibili',
    zhihu: '知乎',
    weibo: '微博',
    youtube: 'YouTube',
    twitter: 'Twitter',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    boss: 'BOSS直聘',
    techcrunch: 'TechCrunch',
    'the-verge': 'The Verge',
    telegram: 'Telegram',
    mastodon: 'Mastodon',
    github: 'GitHub',
    yt: 'YouTube',
    tw: 'Twitter',
    tg: 'Telegram',
  }

  const groups = new Map<string, SourceConfig[]>()

  for (const source of sources) {
    let group = '其他'
    for (const [prefix, label] of Object.entries(platformLabels)) {
      if (source.id.startsWith(prefix + '-') || source.id === prefix) {
        group = label
        break
      }
    }
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(source)
  }

  // 按组名排序，"其他"放最后
  return new Map(
    [...groups.entries()].sort(([a], [b]) =>
      a === '其他' ? 1 : b === '其他' ? -1 : a.localeCompare(b, 'zh')
    )
  )
}

/**
 * 交互式搜索源选择（search 用）
 * 只展示 searchable === true 的源，按平台分组，默认全不选
 */
export async function promptSearchSourceSelection(
  allSources: SourceConfig[],
): Promise<SelectionResult> {
  const searchable = allSources.filter(s => s.searchable === true)

  if (searchable.length === 0) {
    return { sourceIds: [], cancelled: true }
  }

  const groups = groupSourcesByPlatform(searchable)
  const choices: (typeof Separator.prototype | { name: string; value: string; checked: boolean })[] = []

  for (const [groupName, sources] of groups) {
    choices.push(new Separator(`─── ${groupName} ───`))
    for (const s of sources) {
      const strategy = (s as any).strategy === 'cookie' ? ' 🔐' : ''
      choices.push({
        name: `${s.name}${strategy}  (${s.id})`,
        value: s.id,
        checked: false,
      })
    }
  }

  try {
    const selected = await checkbox({
      message: '选择要搜索的平台 (Space 勾选，Enter 确认)',
      choices,
      pageSize: 20,
      loop: false,
    })

    if (selected.length === 0) {
      return { sourceIds: [], cancelled: true }
    }

    return { sourceIds: selected, cancelled: false }
  } catch {
    // Ctrl+C
    return { sourceIds: [], cancelled: true }
  }
}

/**
 * 交互式开启信息源
 * 1. 多选要开启的源（按平台分组）
 * 2. 选择或新建加入的板块
 */
export async function promptSourceEnable(
  allSources: SourceConfig[],
  config: UserConfig,
): Promise<EnableResult> {
  const overrideSet = new Set(config.enabledOverrides ?? [])

  // 只显示当前未开启的源
  const available = allSources.filter(s => !s.enabled && !overrideSet.has(s.id))

  if (available.length === 0) {
    return { sourceIds: [], category: '', cancelled: true }
  }

  // Step 1: 多选信息源（按平台分组）
  const groups = groupSourcesByPlatform(available)
  const choices: (typeof Separator.prototype | { name: string; value: string; checked: boolean })[] = []

  for (const [groupName, sources] of groups) {
    choices.push(new Separator(`─── ${groupName} ───`))
    for (const s of sources) {
      const strategy = (s as any).strategy === 'cookie' ? ' 🔐' : ''
      choices.push({
        name: `${s.name}${strategy}  ${s.id}`,
        value: s.id,
        checked: false,
      })
    }
  }

  let selectedIds: string[]
  try {
    selectedIds = await checkbox({
      message: '选择要开启的信息源  (Space 勾选，/ 搜索，A 全选，Enter 确认)\n  🔐 = 需要浏览器登录 Cookie',
      choices,
      pageSize: 18,
      loop: false,
    })
  } catch {
    return { sourceIds: [], category: '', cancelled: true }
  }

  if (selectedIds.length === 0) {
    return { sourceIds: [], category: '', cancelled: true }
  }

  return { sourceIds: selectedIds, category: '', cancelled: false }
}

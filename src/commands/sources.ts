import chalk from 'chalk'
import Table from 'cli-table3'
import ora from 'ora'
import { getDefaultSources, loadConfig, configExists, initConfig, enableSource, disableSource } from '../core/config.js'
import { promptSourceEnable } from '../utils/interactive.js'
import { registry } from '../core/registry.js'

export async function runSourcesEnable(sourceId: string | undefined, opts: { category?: string }): Promise<void> {
  if (!configExists()) initConfig()
  const allSources = getDefaultSources()
  const config = loadConfig()

  if (!sourceId) {
    const result = await promptSourceEnable(allSources, config)
    if (result.cancelled || result.sourceIds.length === 0) {
      console.log(chalk.gray('已取消。'))
      return
    }
    for (const id of result.sourceIds) {
      enableSource(id)  // no category arg, uses source.category
    }
    console.log('')
    console.log(chalk.green(`✅ 已开启 ${result.sourceIds.length} 个信息源（已自动归入对应板块）`))
    for (const id of result.sourceIds) {
      const s = allSources.find(x => x.id === id)
      const cat = (s as any).category || '其他'
      console.log(chalk.gray(`   • ${s?.name ?? id}  → 板块「${cat}」`))
    }
    console.log('')
    console.log(chalk.cyan('运行: reado bundle search --topics ai'))
    return
  }

  const source = allSources.find(s => s.id === sourceId)
  if (!source) {
    console.log(chalk.red(`未找到信息源: ${sourceId}`))
    console.log(chalk.gray('运行 reado sources list 查看所有可用 ID'))
    return
  }
  enableSource(sourceId, opts.category)
  const cat = opts.category || (source as any).category || '其他'
  console.log(chalk.green(`✅ 已开启 ${chalk.bold(source.name)} (${sourceId}) → 板块「${cat}」`))
  console.log(chalk.cyan(`运行: reado bundle search --topics ai`))
}

export function runSourcesDisable(sourceId: string): void {
  if (!configExists()) initConfig()
  const allSources = getDefaultSources()
  const source = allSources.find(s => s.id === sourceId)
  if (!source) {
    console.log(chalk.red(`未找到信息源: ${sourceId}`))
    return
  }
  disableSource(sourceId)
  console.log(chalk.yellow(`⊘ 已关闭信息源 ${chalk.bold(source.name)} (${sourceId})`))
  console.log(chalk.gray('  已从所有板块中移除'))
}

export function runSourcesList(opts: { search?: string; disabled?: boolean; enabled?: boolean } = {}): void {
  if (!configExists()) initConfig()
  const config = loadConfig()
  const allSources = getDefaultSources()
  const overrideSet = new Set(config.enabledOverrides ?? [])

  // 构建源 → 板块的映射
  const sourceCategories = new Map<string, string[]>()
  for (const [cat, ids] of Object.entries(config.categories)) {
    for (const id of ids) {
      if (!sourceCategories.has(id)) sourceCategories.set(id, [])
      sourceCategories.get(id)!.push(cat)
    }
  }

  // 过滤
  let sources = allSources
  if (opts.search) {
    const q = opts.search.toLowerCase()
    sources = sources.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (sourceCategories.get(s.id) || []).some(c => c.toLowerCase().includes(q))
    )
  }
  if (opts.disabled) {
    sources = sources.filter(s => !s.enabled && !overrideSet.has(s.id))
  } else if (opts.enabled) {
    sources = sources.filter(s => s.enabled || overrideSet.has(s.id))
  }

  if (sources.length === 0) {
    console.log(chalk.yellow(`\n  没有匹配 "${opts.search}" 的信息源\n`))
    return
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('名称'),
      chalk.cyan('适配器'),
      chalk.cyan('板块'),
      chalk.cyan('状态'),
    ],
    colWidths: [26, 24, 16, 16, 10],
  })

  for (const source of sources) {
    const cats = sourceCategories.get(source.id) || []
    let statusStr: string
    if (source.enabled) {
      statusStr = chalk.green('✓ 默认')
    } else if (overrideSet.has(source.id)) {
      statusStr = chalk.blue('✓ 已开启')
    } else {
      statusStr = chalk.gray('✗ 关闭')
    }
    table.push([
      source.id,
      source.name,
      source.adapter,
      cats.join(', ') || chalk.gray('-'),
      statusStr,
    ])
  }

  const title = opts.search
    ? `  信息源列表（搜索: ${opts.search}）`
    : opts.disabled ? '  信息源列表（未开启）'
    : opts.enabled ? '  信息源列表（已开启）'
    : '  信息源列表'

  console.log('')
  console.log(chalk.bold(title))
  console.log(table.toString())
  const enabledCount = allSources.filter(s => s.enabled || overrideSet.has(s.id)).length
  if (!opts.search && !opts.disabled && !opts.enabled) {
    console.log(chalk.gray(`  共 ${allSources.length} 个信息源，${enabledCount} 个已启用`))
  } else {
    console.log(chalk.gray(`  显示 ${sources.length} 个，共 ${allSources.length} 个`))
  }
  console.log(chalk.gray('  reado sources enable <id>          开启信息源'))
  console.log(chalk.gray('  reado sources list --disabled       查看所有未开启的源'))
  console.log(chalk.gray('  reado sources list <关键词>         按名称/ID/板块搜索'))
  console.log('')
}

export async function runSourcesTest(sourceId: string): Promise<void> {
  const allSources = getDefaultSources()
  const source = allSources.find(s => s.id === sourceId)

  if (!source) {
    console.log(chalk.red(`未找到信息源: ${sourceId}`))
    console.log(chalk.gray('运行 `reado sources list` 查看所有可用信息源'))
    return
  }

  const adapter = registry.get(source.adapter)
  if (!adapter) {
    console.log(chalk.red(`未注册适配器: ${source.adapter}`))
    return
  }

  const spinner = ora(`测试 ${source.name} (${source.adapter})...`).start()

  try {
    const items = await adapter.fetch(source)
    spinner.succeed(`${source.name}: 获取到 ${items.length} 条`)

    if (items.length > 0) {
      console.log(chalk.gray('  最新 3 条:'))
      for (const item of items.slice(0, 3)) {
        console.log(chalk.white(`    • ${item.title}`))
        console.log(chalk.gray(`      ${item.url}`))
      }
    }
  } catch (e) {
    spinner.fail(`${source.name}: 失败`)
    console.log(chalk.red(`  ${e instanceof Error ? e.message : String(e)}`))
  }
}

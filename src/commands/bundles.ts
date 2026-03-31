import chalk from 'chalk'
import Table from 'cli-table3'
import { getBundles } from '../core/bundles.js'
import { getDefaultSources } from '../core/config.js'

export function runBundlesList(): void {
  const bundles = getBundles()

  console.log('')
  console.log(chalk.bold('  📦 可用主题包 / Available Bundles'))
  console.log('')

  for (const bundle of bundles) {
    console.log(chalk.bold(`  ${bundle.emoji} ${bundle.id}`) + chalk.gray(` — ${bundle.nameZh} / ${bundle.name}`))
    console.log(chalk.gray(`     ${bundle.description}`))
    console.log(chalk.gray(`     ${bundle.sources.length} 个信息源`))
    console.log('')
  }

  console.log(chalk.cyan('  用法:'))
  console.log(chalk.gray('    reado fetch --bundle ai           采集 AI 相关信息'))
  console.log(chalk.gray('    reado fetch --bundle tech          采集科技开发信息'))
  console.log(chalk.gray('    reado fetch --bundle economics     采集经济金融信息'))
  console.log(chalk.gray('    reado fetch --bundle ai -k "LLM"   主题包 + 关键词过滤'))
  console.log(chalk.gray('    reado bundles show ai              查看主题包包含的源'))
  console.log('')
}

export function runBundlesShow(bundleId: string): void {
  const bundles = getBundles()
  const bundle = bundles.find(b => b.id === bundleId)

  if (!bundle) {
    const ids = bundles.map(b => b.id).join(', ')
    console.log(chalk.red(`未找到主题包: ${bundleId}`))
    console.log(chalk.gray(`可用: ${ids}`))
    return
  }

  console.log('')
  console.log(chalk.bold(`  ${bundle.emoji} ${bundle.nameZh} / ${bundle.name}  (${bundle.id})`))
  console.log(chalk.gray(`  ${bundle.description}`))
  console.log('')

  const allSources = getDefaultSources()
  const sourceMap = new Map(allSources.map(s => [s.id, s]))

  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('ID'), chalk.cyan('名称'), chalk.cyan('状态')],
    colWidths: [5, 28, 24, 10],
  })

  bundle.sources.forEach((id, i) => {
    const src = sourceMap.get(id)
    const status = src?.enabled !== false ? chalk.green('✓') : chalk.gray('✗ 关闭')
    table.push([String(i + 1), id, src?.name ?? chalk.red('未找到'), status])
  })

  console.log(table.toString())
  console.log(chalk.gray(`  共 ${bundle.sources.length} 个信息源`))
  console.log('')
  console.log(chalk.cyan(`  运行: reado fetch --bundle ${bundle.id}`))
  console.log('')
}

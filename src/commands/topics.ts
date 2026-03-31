import chalk from 'chalk'
import { getTopicKeywords, getAllTopics } from '../core/topics.js'

export function runTopicsList(): void {
  const all = getAllTopics()
  console.log('')
  console.log(chalk.bold('  话题预设列表'))
  console.log('')
  for (const [name, keywords] of Object.entries(all)) {
    const preview = keywords.slice(0, 6).join(', ') + (keywords.length > 6 ? '...' : '')
    console.log(
      chalk.cyan(`  ${name.padEnd(12)}`),
      chalk.gray(`(${keywords.length}个关键词)`),
      chalk.white(preview)
    )
  }
  console.log('')
  console.log(chalk.gray('  用法: reado bundle search --topics ai'))
  console.log(chalk.gray('  用法: reado bundle search --topics "GPT,Claude"'))
  console.log('')
}

export function runTopicsShow(name: string): void {
  const keywords = getTopicKeywords(name)
  if (!keywords) {
    console.log(chalk.red(`未找到话题预设: ${name}`))
    console.log(chalk.gray('运行 reado topics list 查看所有预设'))
    return
  }
  console.log('')
  console.log(chalk.bold(`  话题: ${name}`) + chalk.gray(` (${keywords.length} 个关键词)`))
  console.log('')
  keywords.forEach((kw, i) => {
    process.stdout.write(chalk.white(`  ${kw}`) + (i < keywords.length - 1 ? chalk.gray('  ·  ') : ''))
  })
  console.log('\n')
}

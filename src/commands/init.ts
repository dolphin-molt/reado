import chalk from 'chalk'
import { configExists, initConfig, getConfigPath } from '../core/config.js'

export function runInit(): void {
  if (configExists()) {
    console.log(chalk.yellow(`配置文件已存在: ${getConfigPath()}`))
    console.log(chalk.gray('如需重置，请手动删除后重新运行 reado init'))
    return
  }

  const config = initConfig()
  console.log(chalk.green('✅ 初始化完成！'))
  console.log('')
  console.log(chalk.gray(`配置文件: ${getConfigPath()}`))
  console.log('')
  console.log('已配置板块:')
  for (const [name, sources] of Object.entries(config.categories)) {
    console.log(chalk.cyan(`  ${name}`) + chalk.gray(` → ${sources.join(', ')}`))
  }
  console.log('')
  console.log(chalk.gray('运行 `reado fetch` 开始采集'))
}

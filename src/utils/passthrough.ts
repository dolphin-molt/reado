import { spawn } from 'node:child_process'
import { which } from './which.js'
import chalk from 'chalk'

/**
 * 直接透传给 opencli，流式输出到终端
 * 用于 search/comments/subtitle/download 等直接操作命令
 */
export async function runOpencliPassthrough(args: string[]): Promise<void> {
  const bin = await which('opencli')
  if (!bin) {
    console.error(chalk.red('opencli 未安装，请先运行: npm install -g opencli'))
    process.exit(1)
  }

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: 'inherit',
      env: { ...process.env },
    })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else {
        // opencli 自己输出了错误，这里只退出
        process.exit(code ?? 1)
      }
    })
    child.on('error', (err) => {
      console.error(chalk.red(`执行失败: ${err.message}`))
      reject(err)
    })
  })
}

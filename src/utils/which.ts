import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** 查找可执行文件路径，找不到返回 null */
export async function which(name: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('which', [name])
    return stdout.trim() || null
  } catch {
    return null
  }
}

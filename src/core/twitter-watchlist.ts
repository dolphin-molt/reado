import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config.js'
import type { SourceConfig } from './types.js'

const WATCHLIST_FILE = 'twitter-watchlist.txt'

export function getWatchlistPath(): string {
  return join(getConfigDir(), WATCHLIST_FILE)
}

/** 读取监控清单，返回用户名数组（小写，去 @） */
export function loadWatchlist(): string[] {
  const filePath = getWatchlistPath()
  if (!existsSync(filePath)) return []

  const raw = readFileSync(filePath, 'utf-8')
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(name => name.replace(/^@/, '').toLowerCase())
    .filter((name, i, arr) => arr.indexOf(name) === i) // 去重
}

/** 添加用户到监控清单 */
export function addToWatchlist(username: string): { added: boolean; normalized: string } {
  const normalized = username.replace(/^@/, '').toLowerCase()
  const list = loadWatchlist()

  if (list.includes(normalized)) {
    return { added: false, normalized }
  }

  const filePath = getWatchlistPath()
  mkdirSync(getConfigDir(), { recursive: true })
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : ''
  const prefix = existing && !existing.endsWith('\n') ? '\n' : ''
  writeFileSync(filePath, existing + prefix + normalized + '\n', 'utf-8')

  return { added: true, normalized }
}

/** 从监控清单移除用户 */
export function removeFromWatchlist(username: string): { removed: boolean; normalized: string } {
  const normalized = username.replace(/^@/, '').toLowerCase()
  const filePath = getWatchlistPath()
  if (!existsSync(filePath)) return { removed: false, normalized }

  const raw = readFileSync(filePath, 'utf-8')
  const lines = raw.split('\n')
  const filtered = lines.filter(line => {
    const trimmed = line.trim().replace(/^@/, '').toLowerCase()
    return trimmed !== normalized
  })

  if (filtered.length === lines.length) {
    return { removed: false, normalized }
  }

  writeFileSync(filePath, filtered.join('\n'), 'utf-8')
  return { removed: true, normalized }
}

/**
 * 将用户名列表转为 SourceConfig 数组，用于直接传给 fetchAll。
 * 使用 opencli twitter search "from:username" 获取用户发言（需本地浏览器登录 Twitter）。
 */
export function watchlistToSourceConfigs(usernames: string[]): SourceConfig[] {
  return usernames.map(name => ({
    id: `tw-${name}`,
    name: `@${name}`,
    adapter: 'opencli' as const,
    url: `https://x.com/${name}`,
    hours: 24,
    topics: [],
    enabled: true,
    strategy: 'cookie' as const,
    command: ['twitter', 'search', `from:${name}`, '--limit', '20'],
  }))
}

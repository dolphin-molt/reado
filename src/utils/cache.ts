import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { logger } from './logger.js'

const CACHE_DIR = join(homedir(), '.reado', 'cache')

interface CacheEntry<T> {
  data: T
  fetchedAt: number
  etag?: string
}

function ensureCacheDir(): boolean {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }
    return true
  } catch (e) {
    logger.warn(`无法创建缓存目录 ${CACHE_DIR}: ${e instanceof Error ? e.message : e}`)
    return false
  }
}

function cacheFilePath(key: string): string {
  return join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`)
}

export function getCached<T>(key: string, ttlMinutes: number): T | null {
  const filePath = cacheFilePath(key)
  if (!existsSync(filePath)) return null

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(raw)
    const age = (Date.now() - entry.fetchedAt) / 1000 / 60
    if (age > ttlMinutes) return null
    return entry.data
  } catch {
    return null
  }
}

export function setCache<T>(key: string, data: T, etag?: string): void {
  if (!ensureCacheDir()) return

  const entry: CacheEntry<T> = {
    data,
    fetchedAt: Date.now(),
    etag,
  }
  try {
    writeFileSync(cacheFilePath(key), JSON.stringify(entry), 'utf-8')
  } catch (e) {
    logger.warn(`缓存写入失败 [${key}]: ${e instanceof Error ? e.message : e}`)
  }
}

import chalk from 'chalk'
import { loadConfig, saveConfig, configExists, initConfig } from '../core/config.js'

const SETTABLE_KEYS: Record<string, { description: string; values?: string[] }> = {
  language:              { description: '界面语言', values: ['zh', 'en'] },
  'defaults.hours':      { description: '默认时间窗口（小时）' },
  'defaults.format':     { description: '默认输出格式', values: ['table', 'json', 'markdown', 'html'] },
  'defaults.maxItems':   { description: '默认最大条目数' },
  'defaults.concurrency':{ description: '默认并发数' },
  'defaults.cacheTTL':   { description: '缓存有效期（分钟）' },
  'topics':              { description: '全局关键词过滤（逗号分隔，空字符串=不过滤，不设置=各源自己的 topics）' },
  'source-topics':       { description: '按源覆盖 topics，格式: <sourceId>:<关键词1,关键词2>  例: tmtpost:AI,大模型' },
}

export function runConfigGet(key?: string): void {
  if (!configExists()) initConfig()
  const config = loadConfig()

  if (!key) {
    console.log('')
    console.log(chalk.bold('  当前配置 / Current Config'))
    console.log('')
    console.log(chalk.gray(`  language            : `) + chalk.white(config.language ?? 'zh') + chalk.gray('  (zh = 中文, en = English)'))
    console.log(chalk.gray(`  defaults.hours      : `) + chalk.white(String(config.defaults.hours ?? 24)))
    console.log(chalk.gray(`  defaults.format     : `) + chalk.white(config.defaults.format ?? 'table'))
    console.log(chalk.gray(`  defaults.maxItems   : `) + chalk.white(String(config.defaults.maxItems ?? 50)))
    console.log(chalk.gray(`  defaults.concurrency: `) + chalk.white(String(config.defaults.concurrency ?? 5)))
    console.log(chalk.gray(`  defaults.cacheTTL   : `) + chalk.white(String(config.defaults.cacheTTL ?? 15)))

    // topics
    if (config.globalTopics !== undefined) {
      const display = config.globalTopics.length === 0 ? chalk.gray('（不过滤）') : chalk.white(config.globalTopics.join(', '))
      console.log(chalk.gray(`  topics              : `) + display)
    } else {
      console.log(chalk.gray(`  topics              : `) + chalk.gray('（各源自己的 topics）'))
    }

    // sourceTopics
    const st = config.sourceTopics ?? {}
    if (Object.keys(st).length > 0) {
      console.log(chalk.gray(`  source-topics       :`))
      for (const [id, kws] of Object.entries(st)) {
        const kw = kws.length === 0 ? chalk.gray('（不过滤）') : chalk.white(kws.join(', '))
        console.log(chalk.gray(`    ${id.padEnd(22)}: `) + kw)
      }
    } else {
      console.log(chalk.gray(`  source-topics       : `) + chalk.gray('（未配置）'))
    }

    console.log('')
    console.log(chalk.cyan('  修改示例:'))
    console.log(chalk.gray('    reado config set topics "AI,Claude,GPT,大模型,LLM"'))
    console.log(chalk.gray('    reado config set topics ""                    # 全量不过滤'))
    console.log(chalk.gray('    reado config clear topics                     # 恢复各源默认'))
    console.log(chalk.gray('    reado config set source-topics "tmtpost:AI,大模型"'))
    console.log('')
    return
  }

  if (key === 'topics') {
    if (config.globalTopics !== undefined) {
      console.log(config.globalTopics.length === 0 ? '（不过滤）' : config.globalTopics.join(', '))
    } else {
      console.log('（未设置，各源使用自己的 topics）')
    }
    return
  }

  if (key === 'source-topics') {
    const st = config.sourceTopics ?? {}
    if (Object.keys(st).length === 0) {
      console.log('（未配置）')
    } else {
      for (const [id, kws] of Object.entries(st)) {
        console.log(`${id}: ${kws.length === 0 ? '（不过滤）' : kws.join(', ')}`)
      }
    }
    return
  }

  const meta = SETTABLE_KEYS[key]
  if (!meta) {
    console.log(chalk.red(`未知配置项: ${key}`))
    console.log(chalk.gray('可用配置项: ' + Object.keys(SETTABLE_KEYS).join(', ')))
    return
  }

  if (key === 'language') {
    console.log(chalk.white(String(config.language ?? 'zh')))
  } else if (key.startsWith('defaults.')) {
    const sub = key.slice('defaults.'.length) as keyof typeof config.defaults
    console.log(chalk.white(String(config.defaults[sub] ?? '')))
  }
}

export function runConfigSet(key: string, value: string): void {
  if (!configExists()) initConfig()
  const config = loadConfig()

  // topics: 全局关键词
  if (key === 'topics') {
    const kws = value.trim() === '' ? [] : value.split(/[,，]+/).map(k => k.trim()).filter(Boolean)
    config.globalTopics = kws
    saveConfig(config)
    if (kws.length === 0) {
      console.log(chalk.green(`✅ 全局 topics 已设为空（不过滤，显示全部）`))
    } else {
      console.log(chalk.green(`✅ 全局 topics = ${kws.join(', ')}`))
      console.log(chalk.gray('   所有源将使用此词表过滤，忽略各源自己的 topics'))
      console.log(chalk.gray('   如需恢复各源默认: reado config clear topics'))
    }
    return
  }

  // source-topics: 按源覆盖，格式 "sourceId:kw1,kw2"
  if (key === 'source-topics') {
    const colonIdx = value.indexOf(':')
    if (colonIdx < 0) {
      console.log(chalk.red('格式错误，应为: <sourceId>:<关键词1,关键词2>'))
      console.log(chalk.gray('例: reado config set source-topics "tmtpost:AI,大模型"'))
      return
    }
    const sourceId = value.slice(0, colonIdx).trim()
    const kws = value.slice(colonIdx + 1).split(/[,，]+/).map(k => k.trim()).filter(Boolean)
    if (!config.sourceTopics) config.sourceTopics = {}
    config.sourceTopics[sourceId] = kws
    saveConfig(config)
    console.log(chalk.green(`✅ ${sourceId} topics = ${kws.length === 0 ? '（不过滤）' : kws.join(', ')}`))
    return
  }

  const meta = SETTABLE_KEYS[key]
  if (!meta) {
    console.log(chalk.red(`未知配置项: ${key}`))
    console.log(chalk.gray('可用配置项: ' + Object.keys(SETTABLE_KEYS).join(', ')))
    return
  }

  if (meta.values && !meta.values.includes(value)) {
    console.log(chalk.red(`无效值: ${value}`))
    console.log(chalk.gray(`${key} 可选值: ${meta.values.join(' / ')}`))
    return
  }

  if (key === 'language') {
    config.language = value as 'zh' | 'en'
  } else if (key.startsWith('defaults.')) {
    const sub = key.slice('defaults.'.length) as keyof typeof config.defaults
    const numKeys = ['hours', 'maxItems', 'concurrency', 'cacheTTL']
    if (numKeys.includes(sub)) {
      ;(config.defaults as Record<string, unknown>)[sub] = parseInt(value, 10)
    } else {
      ;(config.defaults as Record<string, unknown>)[sub] = value
    }
  }

  saveConfig(config)
  console.log(chalk.green(`✅ 已设置 ${key} = ${value}`))

  if (key === 'language') {
    console.log(chalk.gray(value === 'en'
      ? 'Interface language set to English. Changes take effect on next command.'
      : '界面语言已切换为中文。下次运行时生效。'))
  }
}

export function runConfigClear(key: string): void {
  if (!configExists()) initConfig()
  const config = loadConfig()

  if (key === 'topics') {
    delete config.globalTopics
    saveConfig(config)
    console.log(chalk.green('✅ 已清除全局 topics，各源恢复使用自己的 topics'))
    return
  }

  if (key === 'source-topics') {
    config.sourceTopics = {}
    saveConfig(config)
    console.log(chalk.green('✅ 已清除所有 source-topics 覆盖'))
    return
  }

  // 清除某个源的 source-topics
  if (config.sourceTopics?.[key] !== undefined) {
    delete config.sourceTopics[key]
    saveConfig(config)
    console.log(chalk.green(`✅ 已清除 ${key} 的 topics 覆盖，将恢复使用默认值`))
    return
  }

  console.log(chalk.red(`不支持 clear: ${key}`))
  console.log(chalk.gray('可 clear 的项: topics, source-topics, <sourceId>'))
}

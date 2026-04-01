import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { UserConfigSchema, type UserConfig, type SourceConfig } from './types.js'
import { ConfigError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import defaultSourcesData from '../../config/default-sources.json' with { type: 'json' }

const CONFIG_DIR = join(homedir(), '.reado')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getConfigPath(): string {
  return CONFIG_FILE
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE)
}

export function loadConfig(): UserConfig {
  if (!existsSync(CONFIG_FILE)) {
    return UserConfigSchema.parse({})
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8')
    const data = JSON.parse(raw)
    const config = UserConfigSchema.parse(data)

    const overrideSet = new Set(config.enabledOverrides ?? [])
    const allSources = getDefaultSources()
    const disabledIds = new Set(
      allSources.filter(s => s.enabled === false).map(s => s.id)
    )
    let migrated = false

    // 迁移 1：从板块中移除已禁用的源（enabledOverrides 中的源保留）
    for (const cat of Object.keys(config.categories)) {
      const before = config.categories[cat]
      const after = before.filter(id => !disabledIds.has(id) || overrideSet.has(id))
      if (after.length !== before.length) {
        config.categories[cat] = after
        migrated = true
      }
    }

    // 迁移 2：把 initConfig 默认分类中新增的源补入用户配置
    // （仅当用户已有该板块，且该源尚未出现在任何板块中）
    const allUserIds = new Set(Object.values(config.categories).flat())
    const defaultCats: Record<string, string[]> = {
      'AI公司': ['openai', 'anthropic', 'google-ai', 'deepmind', 'meta-ai', 'nvidia-ai', 'deepseek', 'mistral', 'xai', 'cohere', 'bytedance-ai', 'alibaba-ai'],
      '科技媒体': ['techcrunch-ai', 'the-verge-ai', 'mit-tech-review', 'wired-ai', 'the-decoder', 'ars-technica', 'bbc-tech', 'techmeme', 'qbitai', 'xinzhiyuan', 'tmtpost', 'leiphone', 'huxiu', '36kr', 'geekpark', 'sspai', 'aibase', '36kr-en'],
      'GitHub': ['github-trending', 'github-trending-python', 'claude-code-release', 'n8n-release', 'dify-release', 'langchain-release'],
      '社区': ['hackernews', 'hackernews-best', 'v2ex', 'lobsters', 'devto'],
      'Reddit': ['reddit-locallama', 'reddit-ml', 'reddit-ainews', 'reddit-singularity'],
      '学术': ['arxiv-cs-ai', 'arxiv-cs-lg', 'arxiv-cs-cl', 'hf-papers', 'hf-blog', 'ai-now'],
      '开发者': ['langchain-blog', 'simon-willison', 'lilian-weng', 'ai-snake-oil', 'aws-ml', 'stratechery', 'lenny-newsletter'],
      '产品发现': ['producthunt', 'medium-ai'],
      '创投': ['a16z-blog', 'yc-blog'],
      'YouTube': ['yt-lex-fridman', 'yt-yannic-kilcher', 'yt-two-minute-papers', 'yt-3blue1brown', 'yt-andrej-karpathy'],
      '社交媒体': ['zhihu-hot', 'weibo-hot', 'bilibili-hot', 'bluesky-trending', 'tw-karpathy', 'tw-ylecun', 'tw-sama', 'tw-swyx', 'tw-drjimfan', 'tg-aibrief', 'tg-aigclink', 'mastodon-ai', 'mastodon-llm'],
    }
    const sourceMap = new Map(allSources.map(s => [s.id, s]))
    for (const [cat, ids] of Object.entries(defaultCats)) {
      if (!config.categories[cat]) continue  // 用户没有这个板块则跳过
      for (const id of ids) {
        if (!allUserIds.has(id) && sourceMap.get(id)?.enabled !== false) {
          config.categories[cat].push(id)
          allUserIds.add(id)
          migrated = true
        }
      }
    }

    // 迁移 3：老用户没有 globalTopics 时，补上预设 AI 词表
    // 使用 'globalTopics' in data 区分"从未设置"和"用户主动清除"
    if (!('globalTopics' in data)) {
      config.globalTopics = [
        'AI', '人工智能', '大模型', 'LLM', 'AGI', '智能体', 'Agent',
        'Transformer', 'RAG', '多模态', '推理', '微调', '具身',
        'GPT', 'ChatGPT', 'Claude', 'Gemini', 'Llama', 'Grok',
        'Copilot', 'Sora', 'Midjourney', 'Stable Diffusion',
        'DeepSeek', '豆包', '通义', '文心', 'Kimi', '混元',
        'Qwen', '讯飞', '智谱', '月之暗面', 'MiniMax',
        'OpenAI', 'Anthropic', 'DeepMind', 'xAI', 'Mistral',
        '自动驾驶', '机器人', 'AI 编程', 'AI原生',
      ]
      migrated = true
    }

    // 迁移 4: 重命名旧分类名到新分类名，合并相关分类
    const catRenames: Record<string, string> = {
      'AI动态': 'AI公司',
      '中国AI': 'AI公司',
      '中文科技': '科技媒体',
      'Twitter': '社交媒体',
      'Telegram': '社交媒体',
      'Mastodon': '社交媒体',
    }
    for (const [oldCat, newCat] of Object.entries(catRenames)) {
      if (config.categories[oldCat]) {
        if (!config.categories[newCat]) config.categories[newCat] = []
        for (const id of config.categories[oldCat]) {
          if (!config.categories[newCat].includes(id)) {
            config.categories[newCat].push(id)
          }
        }
        delete config.categories[oldCat]
        migrated = true
      }
    }

    if (migrated) {
      logger.debug('配置已自动迁移并保存')
      saveConfig(config)
    }

    return config
  } catch (e) {
    throw new ConfigError(`配置文件解析失败: ${CONFIG_FILE}\n${e}`)
  }
}

export function saveConfig(config: UserConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function initConfig(): UserConfig {
  const defaultConfig: UserConfig = {
    categories: {
      'AI公司': ['openai', 'anthropic', 'google-ai', 'deepmind', 'meta-ai', 'nvidia-ai', 'deepseek', 'mistral', 'xai', 'cohere', 'bytedance-ai', 'alibaba-ai'],
      '科技媒体': ['techcrunch-ai', 'the-verge-ai', 'mit-tech-review', 'wired-ai', 'the-decoder', 'ars-technica', 'bbc-tech', 'techmeme', 'qbitai', 'xinzhiyuan', 'tmtpost', 'leiphone', 'huxiu', '36kr', 'geekpark', 'sspai', 'aibase', '36kr-en'],
      'GitHub': ['github-trending', 'github-trending-python', 'claude-code-release', 'n8n-release', 'dify-release', 'langchain-release'],
      '社区': ['hackernews', 'hackernews-best', 'v2ex', 'lobsters', 'devto'],
      'Reddit': ['reddit-locallama', 'reddit-ml', 'reddit-ainews', 'reddit-singularity'],
      '学术': ['arxiv-cs-ai', 'arxiv-cs-lg', 'arxiv-cs-cl', 'hf-papers', 'hf-blog', 'ai-now'],
      '开发者': ['langchain-blog', 'simon-willison', 'lilian-weng', 'ai-snake-oil', 'aws-ml', 'stratechery', 'lenny-newsletter'],
      '产品发现': ['producthunt', 'medium-ai'],
      '创投': ['a16z-blog', 'yc-blog'],
      'YouTube': ['yt-lex-fridman', 'yt-yannic-kilcher', 'yt-two-minute-papers', 'yt-3blue1brown', 'yt-andrej-karpathy'],
      '社交媒体': ['zhihu-hot', 'weibo-hot', 'bilibili-hot', 'bluesky-trending', 'tw-karpathy', 'tw-ylecun', 'tw-sama', 'tw-swyx', 'tw-drjimfan', 'tg-aibrief', 'tg-aigclink', 'mastodon-ai', 'mastodon-llm'],
    },
    defaults: {
      hours: 24,
      format: 'table',
      maxItems: 50,
      concurrency: 10,
      cacheTTL: 15,
    },
    customSources: {},
    enabledOverrides: [],
    language: 'zh',
    // 预设 AI 关键词（仅对 topics 非空的综合媒体生效，纯 AI 源不受影响）
    globalTopics: [
      // 通用
      'AI', '人工智能', '大模型', 'LLM', 'AGI', '智能体', 'Agent',
      // 技术
      'Transformer', 'RAG', '多模态', '推理', '微调', '具身',
      // 国际模型/产品
      'GPT', 'ChatGPT', 'Claude', 'Gemini', 'Llama', 'Grok',
      'Copilot', 'Sora', 'Midjourney', 'Stable Diffusion',
      // 国内模型/产品
      'DeepSeek', '豆包', '通义', '文心', 'Kimi', '混元',
      'Qwen', '讯飞', '智谱', '月之暗面', 'MiniMax',
      // 公司
      'OpenAI', 'Anthropic', 'DeepMind', 'xAI', 'Mistral',
      // 场景
      '自动驾驶', '机器人', 'AI 编程', 'AI原生',
    ],
    sourceTopics: {},
  }

  mkdirSync(join(CONFIG_DIR, 'cache'), { recursive: true })
  saveConfig(defaultConfig)
  return defaultConfig
}

/** 获取所有内置信息源定义 */
export function getDefaultSources(): SourceConfig[] {
  return defaultSourcesData.sources as SourceConfig[]
}

/** 根据板块名获取信息源 ID 列表 */
export function getSourceIdsForCategories(config: UserConfig, categoryNames: string[]): string[] {
  if (categoryNames.length === 0) {
    // 全部板块
    return Object.values(config.categories).flat()
  }

  const ids: string[] = []
  for (const name of categoryNames) {
    // 模糊匹配板块名
    const key = Object.keys(config.categories).find(
      k => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase())
    )
    if (key) {
      ids.push(...config.categories[key])
    }
  }
  return [...new Set(ids)]
}

/** 根据 ID 列表获取 SourceConfig 列表
 * @param sourceIds 要获取的信息源 ID 列表
 * @param allowDisabled 是否允许返回 enabled:false 的源（显式指定 --source 时，或 enabledOverrides 中的 ID）
 * @param enabledOverrides 用户手动开启的源 ID 列表（来自 UserConfig.enabledOverrides）
 */
export function resolveSourceConfigs(
  sourceIds: string[],
  allowDisabled = false,
  enabledOverrides: string[] = [],
): SourceConfig[] {
  const allSources = getDefaultSources()
  const sourceMap = new Map(allSources.map(s => [s.id, s]))
  const overrideSet = new Set(enabledOverrides)

  return sourceIds
    .map(id => sourceMap.get(id))
    .filter((s): s is SourceConfig =>
      s != null && (allowDisabled || overrideSet.has(s.id) || s.enabled !== false)
    )
}

/** 将信息源加入用户开启列表，并添加到指定板块（持久化到 ~/.reado/config.json） */
export function enableSource(sourceId: string, category?: string): void {
  const config = loadConfig()
  if (!config.enabledOverrides.includes(sourceId)) {
    config.enabledOverrides.push(sourceId)
  }
  // Use source's built-in category if none specified
  const allSources = getDefaultSources()
  const source = allSources.find(s => s.id === sourceId)
  const cat = category || (source as any).category || '其他'
  if (!config.categories[cat]) {
    config.categories[cat] = []
  }
  if (!config.categories[cat].includes(sourceId)) {
    config.categories[cat].push(sourceId)
  }
  saveConfig(config)
}

/** 从用户开启列表和所有板块中移除指定信息源 */
export function disableSource(sourceId: string): void {
  const config = loadConfig()
  config.enabledOverrides = config.enabledOverrides.filter(id => id !== sourceId)
  for (const cat of Object.keys(config.categories)) {
    config.categories[cat] = config.categories[cat].filter(id => id !== sourceId)
  }
  saveConfig(config)
}

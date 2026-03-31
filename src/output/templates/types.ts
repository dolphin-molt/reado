export interface TemplateItem {
  title: string
  url: string
  summary: string
  time: string
  timeAgo: string
}

export interface TemplateGroup {
  sourceName: string
  sourceId: string
  itemCount: number
  items: TemplateItem[]
}

export interface TemplateData {
  title: string
  fetchedAt: string
  date: string
  stats: {
    totalSources: number
    successSources: number
    failedSources: number
    cachedSources: number
    totalItems: number
  }
  groups: TemplateGroup[]
  failures: Array<{ sourceName: string; error: string }>
}

export type TemplateFn = (data: TemplateData) => string

/**
 * 解析时间范围字符串为小时数
 * 支持: "24h", "48h", "7d", "1w", 或纯数字
 */
export function parseHours(input: string | number): number {
  if (typeof input === 'number') return input

  const match = input.match(/^(\d+)(h|d|w)?$/i)
  if (!match) return 24

  const value = parseInt(match[1], 10)
  const unit = (match[2] || 'h').toLowerCase()

  switch (unit) {
    case 'd': return value * 24
    case 'w': return value * 24 * 7
    default: return value
  }
}

/**
 * 获取截止时间点
 */
export function getCutoffDate(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

/**
 * 格式化相对时间
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}

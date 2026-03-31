import type { AggregateResult, OutputFormat } from '../core/types.js'
import { formatJSON } from './json.js'
import { formatTable } from './table.js'
import { formatMarkdown } from './markdown.js'

export { exportHTML, getTemplateNames } from './html.js'

export function formatOutput(result: AggregateResult, format: OutputFormat): string {
  switch (format) {
    case 'json': return formatJSON(result)
    case 'markdown': return formatMarkdown(result)
    case 'table':
    default: return formatTable(result)
  }
}

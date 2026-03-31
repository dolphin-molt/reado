import type { InfoItem, SourceConfig } from '../core/types.js'

export abstract class SourceAdapter {
  abstract readonly type: string

  abstract fetch(source: SourceConfig): Promise<InfoItem[]>
}

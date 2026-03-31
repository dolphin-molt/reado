import type { SourceAdapter } from '../adapters/base.js'

class AdapterRegistry {
  private adapters = new Map<string, SourceAdapter>()

  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.type, adapter)
  }

  get(type: string): SourceAdapter | undefined {
    return this.adapters.get(type)
  }

  list(): string[] {
    return [...this.adapters.keys()]
  }
}

export const registry = new AdapterRegistry()

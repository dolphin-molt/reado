import bundlesData from '../../config/bundles.json' with { type: 'json' }

export interface BundleConfig {
  id: string
  name: string
  nameZh: string
  description: string
  emoji: string
  sources: string[]
}

interface BundlesFile {
  bundles: BundleConfig[]
}

let _bundles: BundleConfig[] | null = null

export function getBundles(): BundleConfig[] {
  if (_bundles) return _bundles
  _bundles = (bundlesData as BundlesFile).bundles
  return _bundles
}

export function getBundle(id: string): BundleConfig | undefined {
  return getBundles().find(b => b.id === id)
}

export function getBundleSourceIds(id: string): string[] {
  const bundle = getBundle(id)
  return bundle ? bundle.sources : []
}

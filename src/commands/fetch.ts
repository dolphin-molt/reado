import { runSearch } from './search.js'

export async function runFetch(categories: string[], opts: any): Promise<void> {
  return runSearch(categories, opts)
}

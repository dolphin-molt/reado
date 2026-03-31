import topicsData from '../../config/topics.json' with { type: 'json' }

interface TopicsFile {
  topics: Record<string, string[]>
}

function loadTopics(): Record<string, string[]> {
  return (topicsData as TopicsFile).topics
}

export function getTopicNames(): string[] {
  return Object.keys(loadTopics())
}

export function getTopicKeywords(name: string): string[] | undefined {
  return loadTopics()[name]
}

/**
 * Resolve --topics option value to a keyword array.
 * Input can be:
 *   - a named preset: "ai" → looks up topics.json
 *   - comma-separated keywords: "GPT,Claude" → splits literally
 *   - mixed: "ai,Claude" → if "ai" is a preset, expands it; otherwise treats whole thing as literal
 */
export function resolveTopics(input: string): string[] {
  const topics = loadTopics()
  // First try exact match with full input as preset name
  if (topics[input]) return topics[input]

  // Split by comma/space and resolve each part
  const parts = input.split(/[,，\s]+/).map(p => p.trim()).filter(Boolean)
  const result: string[] = []
  const seen = new Set<string>()

  for (const part of parts) {
    if (topics[part]) {
      for (const kw of topics[part]) {
        if (!seen.has(kw)) { result.push(kw); seen.add(kw) }
      }
    } else {
      if (!seen.has(part)) { result.push(part); seen.add(part) }
    }
  }

  return result
}

export function getAllTopics(): Record<string, string[]> {
  return loadTopics()
}

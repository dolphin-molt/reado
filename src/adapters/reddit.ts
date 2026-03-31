import { SourceAdapter } from './base.js'
import { httpGetJSON } from '../utils/http.js'
import type { InfoItem, SourceConfig } from '../core/types.js'

interface RedditListing {
  data: {
    children: Array<{
      data: {
        title: string
        url: string
        permalink: string
        selftext: string
        score: number
        num_comments: number
        created_utc: number
        author: string
        subreddit: string
      }
    }>
  }
}

export class RedditAdapter extends SourceAdapter {
  readonly type = 'reddit'

  async fetch(source: SourceConfig): Promise<InfoItem[]> {
    // 从 URL 提取 subreddit: https://www.reddit.com/r/LocalLLaMA
    const match = source.url.match(/\/r\/([^/]+)/)
    const subreddit = match?.[1] || 'LocalLLaMA'

    const data = await httpGetJSON<RedditListing>(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    return data.data.children.map(child => {
      const post = child.data
      const selftext = post.selftext?.slice(0, 200) || ''

      return {
        title: post.title,
        url: post.url.startsWith('/') ? `https://www.reddit.com${post.url}` : post.url,
        summary: selftext || `${post.score} upvotes | ${post.num_comments} comments | r/${post.subreddit}`,
        publishedAt: new Date(post.created_utc * 1000),
        source: source.id,
        sourceName: source.name,
      }
    })
  }
}

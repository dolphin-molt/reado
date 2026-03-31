import { registry } from '../core/registry.js'
import { RSSAdapter } from './rss.js'
import { HackerNewsAdapter } from './hackernews.js'
import { RedditAdapter } from './reddit.js'
import { GitHubTrendingAdapter } from './github-trending.js'
import { TwitterAdapter } from './twitter.js'
import { TelegramAdapter } from './telegram.js'
import { OpenCLIAdapter } from './opencli.js'
import { WordPressAdapter } from './wordpress.js'

export function registerAllAdapters(): void {
  registry.register(new RSSAdapter())
  registry.register(new HackerNewsAdapter())
  registry.register(new RedditAdapter())
  registry.register(new GitHubTrendingAdapter())
  registry.register(new TwitterAdapter())
  registry.register(new TelegramAdapter())
  registry.register(new OpenCLIAdapter())
  registry.register(new WordPressAdapter())
}

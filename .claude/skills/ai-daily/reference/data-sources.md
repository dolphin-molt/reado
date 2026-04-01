# Data Sources Reference

## JSON Output Format

所有 reado 命令 `-f json` 返回统一结构：

```json
{
  "fetchedAt": "2026-04-01T10:06:15.100Z",
  "stats": {
    "totalSources": 66,
    "successSources": 60,
    "failedSources": 6,
    "cachedSources": 0,
    "totalItems": 150,
    "deduplicatedItems": 5
  },
  "items": [
    {
      "title": "Article title",
      "url": "https://...",
      "summary": "Brief description or metrics",
      "publishedAt": "2026-04-01T08:00:00Z",
      "source": "source-id",
      "sourceName": "Human Readable Source Name"
    }
  ]
}
```

## Collection Commands

### 1. AI Bundle（主力 — 66 个源）

```bash
reado search --bundle ai -t 24 --no-cache -f json
```

覆盖：
- **AI 公司博客**: OpenAI, Anthropic, Google AI, DeepMind, Meta AI, NVIDIA, DeepSeek, Mistral, xAI, Cohere, ByteDance, Alibaba
- **科技媒体**: TechCrunch AI, The Verge AI, MIT Tech Review, Wired AI, The Decoder, Ars Technica, BBC Tech, Techmeme, 量子位, 新智元, 钛媒体, 雷锋网, 虎嗅, 36氪, 极客公园, 少数派, AIBase
- **学术**: arXiv cs.AI/cs.LG/cs.CL, HuggingFace Papers/Blog, AI Now Institute
- **GitHub**: Trending (全语言 + Python), Claude Code/n8n/Dify/LangChain Releases
- **社区**: HN Top/Best, V2EX, Lobste.rs, DEV Community
- **Reddit**: r/LocalLLaMA, r/MachineLearning, r/ainews, r/singularity
- **社交**: Bluesky, Mastodon #ai/#llm, Telegram AI 频道
- **开发者博客**: LangChain, Simon Willison, Lilian Weng, AI Snake Oil, Stratechery
- **产品/创投**: Product Hunt, Medium AI, a16z Blog, YC Blog
- **YouTube**: Lex Fridman, Yannic Kilcher, Two Minute Papers, 3Blue1Brown, Karpathy

完整列表：`reado bundles show ai`

### 2. Twitter Watchlist

```bash
reado twitter timeline -t 24 --no-cache -f json
```

拉取 `~/.reado/twitter-watchlist.txt` 中 ~58 个账号的最新推文。需要 opencli + Chrome 登录 x.com。

返回空或失败 → opencli 未安装/Chrome 未运行/未登录 x.com。跳过 Twitter 板块。

### 3. Hacker News

```bash
reado hackernews top -t 24 -f json
```

`summary` 字段含投票和评论数（如 `↑395 💬106 @username`）。

### 4. GitHub Trending

```bash
reado search -s github-trending -f json
```

当天全语言趋势项目。Python 专项：`reado search -s github-trending-python -f json`

## Source → Report Section 映射

| source ID 匹配模式 | 报告板块 |
|-------------------|----------|
| `openai`, `anthropic`, `google-ai`, `deepmind`, `meta-ai`, `nvidia-ai`, `deepseek`, `mistral`, `xai`, `cohere`, `bytedance-ai`, `alibaba-ai` | Company Updates |
| `techcrunch-*`, `the-verge-*`, `mit-tech-review`, `wired-*`, `the-decoder`, `ars-technica`, `bbc-tech`, `techmeme`, `qbitai`, `xinzhiyuan`, `tmtpost`, `leiphone`, `huxiu`, `36kr`, `geekpark`, `sspai`, `aibase` | Breaking News（重大）或 Company Updates |
| `arxiv-*`, `hf-papers`, `hf-blog`, `ai-now`, `papers-with-code` | Papers & Open Source |
| `github-trending*`, `*-release` | Papers & Open Source |
| `hackernews*`, `v2ex`, `lobsters`, `devto`, `reddit-*` | Community & Discussion |
| `tw-*`（Twitter timeline 条目） | Twitter Highlights |
| `producthunt`, `medium-*`, `a16z-*`, `yc-*` | Breaking News 或 Company Updates |
| `bluesky-*`, `mastodon-*`, `tg-*` | Community & Discussion |

## Optional: 额外数据源

```bash
reado search --bundle china-tech -t 24 -f json    # 中国科技新闻
reado search --bundle startups -t 24 -f json      # 创业/产品新闻
```

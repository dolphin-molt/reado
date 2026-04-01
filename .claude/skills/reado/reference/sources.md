# Reado 信息源参考

## 信息源 ID 速查

按板块分类，可用于 `reado search -s <id>` 或 `reado sources test <id>`。

### AI 公司（AI公司）

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `openai` | OpenAI Blog | rss | ✓ |
| `anthropic` | Anthropic | rss | ✓ |
| `google-ai` | Google AI Blog | rss | ✓ |
| `deepmind` | Google DeepMind | rss | ✓ |
| `meta-ai` | Meta AI Blog | rss | ✓ |
| `nvidia-ai` | NVIDIA AI Blog | rss | ✓ |
| `deepseek` | DeepSeek | rss | ✓ |
| `mistral` | Mistral AI | rss | ✓ |
| `xai` | xAI / Grok | rss | ✓ |
| `cohere` | Cohere | rss | ✓ |
| `bytedance-ai` | 字节 Seed | rss | ✓ |
| `alibaba-ai` | 阿里 / 通义千问 | rss | ✓ |
| `apple-ml` | Apple Machine Learning | rss | ✗ |
| `minimax` | MiniMax | rss | ✗ |
| `zhipu-ai` | 智谱 GLM | rss | ✗ |
| `moonshot` | Moonshot / Kimi | rss | ✗ |
| `tencent-ai` | 腾讯混元 | rss | ✗ |
| `baidu-ai` | 百度 / 文心 | rss | ✗ |
| `manus-ai` | Manus AI | rss | ✗ |
| `perplexity` | Perplexity AI | rss | ✗ |
| `stepfun` | 阶跃星辰 | rss | ✗ |

### 科技媒体

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `techcrunch-ai` | TechCrunch AI | rss | ✓ |
| `the-verge-ai` | The Verge AI | rss | ✓ |
| `mit-tech-review` | MIT Technology Review | rss | ✓ |
| `wired-ai` | Wired AI | rss | ✓ |
| `the-decoder` | The Decoder | rss | ✓ |
| `ars-technica` | Ars Technica | rss | ✓ |
| `bbc-tech` | BBC Technology | rss | ✓ |
| `techmeme` | Techmeme | rss | ✓ |
| `qbitai` | 量子位 | rss | ✓ |
| `xinzhiyuan` | 新智元 | rss | ✓ |
| `tmtpost` | 钛媒体 | rss | ✓ |
| `leiphone` | 雷锋网 | rss | ✓ |
| `huxiu` | 虎嗅 | rss | ✓ |
| `36kr` | 36氪 | rss | ✓ |
| `geekpark` | 极客公园 | rss | ✓ |
| `sspai` | 少数派 | rss | ✓ |
| `aibase` | AIBase | rss | ✓ |
| `36kr-en` | 36Kr English | rss | ✓ |
| `techcrunch-startups` | TechCrunch Startups | rss | ✗ |
| `techcrunch-security` | TechCrunch Security | rss | ✗ |
| `techcrunch-venture` | TechCrunch Venture | rss | ✗ |
| `the-verge-tech` | The Verge Tech | rss | ✗ |
| `the-verge-science` | The Verge Science | rss | ✗ |
| `the-verge-policy` | The Verge Policy | rss | ✗ |
| `the-verge-games` | The Verge Games | rss | ✗ |

### GitHub

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `github-trending` | GitHub Trending | github-trending | ✓ |
| `github-trending-python` | GitHub Trending Python | github-trending | ✓ |
| `claude-code-release` | Claude Code Release | rss | ✓ |
| `n8n-release` | n8n Release | rss | ✓ |
| `dify-release` | Dify Release | rss | ✓ |
| `langchain-release` | LangChain Release | rss | ✓ |

### 社区

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `hackernews` | Hacker News Top | hackernews | ✓ |
| `hackernews-best` | Hacker News Best | hackernews | ✓ |
| `v2ex` | V2EX | opencli | ✓ |
| `lobsters` | Lobste.rs | opencli | ✓ |
| `devto` | DEV Community | rss | ✓ |

### Reddit

| ID | 名称 | 默认启用 |
|----|------|----------|
| `reddit-locallama` | r/LocalLLaMA | ✓ |
| `reddit-ml` | r/MachineLearning | ✓ |
| `reddit-ainews` | r/ainews | ✓ |
| `reddit-singularity` | r/singularity | ✓ |
| `reddit-programming` | r/programming | ✗ |
| `reddit-golang` | r/golang | ✗ |
| `reddit-rust` | r/rust | ✗ |
| `reddit-python` | r/Python | ✗ |
| `reddit-webdev` | r/webdev | ✗ |
| `reddit-datascience` | r/datascience | ✗ |
| `reddit-netsec` | r/netsec | ✗ |
| `reddit-technology` | r/technology | ✗ |
| `reddit-futurology` | r/Futurology | ✗ |
| `reddit-science` | r/science | ✗ |
| `reddit-economics` | r/economics | ✗ |
| `reddit-finance` | r/finance | ✗ |
| `reddit-investing` | r/investing | ✗ |
| `reddit-worldnews` | r/worldnews | ✗ |
| `reddit-crypto` | r/CryptoCurrency | ✗ |

### 学术

| ID | 名称 | 默认启用 |
|----|------|----------|
| `arxiv-cs-ai` | arXiv cs.AI | ✓ |
| `arxiv-cs-lg` | arXiv cs.LG | ✓ |
| `arxiv-cs-cl` | arXiv cs.CL | ✓ |
| `arxiv-cs-cv` | arXiv cs.CV | ✗ |
| `arxiv-cs-ro` | arXiv cs.RO | ✗ |
| `arxiv-cs-se` | arXiv cs.SE | ✗ |
| `arxiv-stat-ml` | arXiv stat.ML | ✗ |
| `arxiv-econ-gn` | arXiv econ.GN | ✗ |
| `arxiv-q-fin` | arXiv q-fin | ✗ |
| `papers-with-code` | Papers with Code | ✗ |
| `hf-papers` | HuggingFace Papers | ✓ |
| `hf-blog` | HuggingFace Blog | ✓ |
| `ai-now` | AI Now Institute | ✓ |

### 社交媒体

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `zhihu-hot` | 知乎热榜 | opencli | ✓ |
| `weibo-hot` | 微博热搜 | opencli | ✓ |
| `bilibili-hot` | B站热门 | opencli | ✓ |
| `bluesky-trending` | Bluesky 热门 | opencli | ✓ |
| `tw-karpathy` | @karpathy | twitter | ✓ |
| `tw-ylecun` | @ylecun | twitter | ✓ |
| `tw-sama` | @sama | twitter | ✓ |
| `tw-swyx` | @swyx | twitter | ✓ |
| `tw-drjimfan` | @DrJimFan | twitter | ✓ |
| `tg-aibrief` | AI Brief (TG) | telegram | ✓ |
| `tg-aigclink` | AIGC Link (TG) | telegram | ✓ |
| `mastodon-ai` | Mastodon #ai | rss | ✓ |
| `mastodon-llm` | Mastodon #llm | rss | ✓ |

### 开发者

| ID | 名称 | 默认启用 |
|----|------|----------|
| `langchain-blog` | LangChain Blog | ✓ |
| `simon-willison` | Simon Willison | ✓ |
| `lilian-weng` | Lilian Weng | ✓ |
| `ai-snake-oil` | AI Snake Oil | ✓ |
| `aws-ml` | AWS ML | ✓ |
| `stratechery` | Stratechery | ✓ |
| `lenny-newsletter` | Lenny's Newsletter | ✓ |

### 产品/创投

| ID | 名称 | 默认启用 |
|----|------|----------|
| `producthunt` | Product Hunt | ✓ |
| `medium-ai` | Medium AI | ✓ |
| `a16z-blog` | a16z Blog | ✓ |
| `yc-blog` | Y Combinator Blog | ✓ |

### 金融

| ID | 名称 | 适配器 | 默认启用 |
|----|------|--------|----------|
| `xueqiu-hot` | 雪球热门 | opencli | ✗ |
| `xueqiu-hot-stock` | 雪球热门股 | opencli | ✗ |
| `36kr-hot` | 36氪热榜 | opencli | ✗ |

### YouTube

| ID | 名称 | 默认启用 |
|----|------|----------|
| `yt-lex-fridman` | Lex Fridman | ✓ |
| `yt-yannic-kilcher` | Yannic Kilcher | ✓ |
| `yt-two-minute-papers` | Two Minute Papers | ✓ |
| `yt-3blue1brown` | 3Blue1Brown | ✓ |
| `yt-andrej-karpathy` | Andrej Karpathy | ✓ |

---

## 适配器类型

| 适配器 | 说明 | 需要登录 |
|--------|------|----------|
| `rss` | RSS/Atom feed | 否 |
| `hackernews` | Hacker News API | 否 |
| `reddit` | Reddit API | 否 |
| `github-trending` | GitHub 页面解析 | 否 |
| `twitter` | Nitter RSS（不稳定） | 否 |
| `opencli` | 浏览器 CDP 采集 | 部分需要 |
| `telegram` | tgstat.ru RSS | 否 |
| `wordpress` | WordPress REST API | 否 |
| `arxiv` | arXiv RSS | 否 |

需要 opencli + 浏览器登录的平台：微博、知乎、B站、Twitter、TikTok、Instagram、Facebook、小红书、即刻、LinkedIn、知识星球、微信读书、雪球。

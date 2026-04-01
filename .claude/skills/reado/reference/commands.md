# Reado 完整命令参考

## 通用选项（所有数据命令共享）

| 选项 | 说明 |
|------|------|
| `-t, --hours <hours>` | 时间窗口：`24`、`48h`、`7d` |
| `-f, --format <fmt>` | 输出格式：`table` / `json` / `markdown` / `html` |
| `-l, --limit <n>` | 最大条目数 |
| `-c, --concurrency <n>` | 并发采集数 |
| `--no-cache` | 跳过缓存 |
| `--theme <theme>` | HTML 模板：`default` / `dashboard` / `minimal` |
| `--open` | 自动打开浏览器（HTML 格式） |
| `-o, --output <path>` | HTML 输出路径 |

---

## 通用查询命令

### reado search [categories...]

搜索信息，支持板块/源/主题包。

```bash
reado search                            # 交互式选择
reado search AI公司                      # 按板块
reado search -s openai anthropic         # 按源 ID
reado search --bundle ai                 # 主题包
reado search --topics "GPT,Claude"       # 关键词过滤
reado search -t 48h -f html --open       # 48h + HTML 报告
```

| 专属选项 | 说明 |
|----------|------|
| `-s, --source <ids...>` | 按信息源 ID 搜索 |
| `--topics <topics>` | 话题预设或关键词 |
| `--bundle <id>` | 主题包：`ai` / `tech` / `economics` / `work` / `science` / `china-tech` / `startups` |
| `-v, --verbose` | 详细输出 |

### reado hot [platform]

各平台热榜快捷命令。

```bash
reado hot                     # 全部平台
reado hot 开发者               # 按分组（国内社交/开发者社区/GitHub/Reddit/国际社交/金融）
reado hot --topics AI          # 关键词过滤
```

| 专属选项 | 说明 |
|----------|------|
| `--bundle <id>` | 主题包 |
| `--topics <topics>` | 关键词过滤 |

---

## 平台命令

### reado reddit

```bash
reado reddit hot [subreddit]                       # 热门（默认已启用的 AI/ML 版块）
reado reddit search <query> [--subreddit r] [--sort relevance/hot/top/new]
reado reddit read <post-id> [--limit 25]           # 阅读帖子和评论
reado reddit subreddit <name> [--sort hot/new/top/rising]
reado reddit frontpage [--limit 15]                # Reddit 首页 / r/all
reado reddit popular [--limit 15]                  # 热门版块
reado reddit user <username> [--limit 15]          # 用户帖子
```

### reado hackernews

```bash
reado hackernews top                               # Top 故事
reado hackernews best                              # Best 故事
reado hackernews search <query> [--sort relevance/date]
reado hackernews ask [--limit 20]                  # Ask HN
reado hackernews show [--limit 20]                 # Show HN
reado hackernews jobs [--limit 20]                 # HN 招聘
reado hackernews new [--limit 20]                  # 最新故事
```

### reado twitter

```bash
# 监控清单管理（存储在 ~/.reado/twitter-watchlist.txt）
reado twitter watch <username>                     # 添加到监控清单
reado twitter unwatch <username>                   # 移出清单
reado twitter watchlist                            # 查看清单

# 内容采集（通过 opencli，需本地浏览器登录 Twitter）
reado twitter timeline [users...]                  # 清单全员最新发言
reado twitter timeline karpathy -t 7d              # 指定用户 + 时间
reado twitter timeline -f html --open              # HTML 报告

# opencli 通道命令
reado twitter search <query> [--filter top/live] [--limit 15]
reado twitter trending                             # 热门话题
reado twitter profile [username]                   # 用户资料
reado twitter thread <tweet-id> [--limit 50]       # 推文线程
reado twitter notifications [--limit 20]           # 通知
reado twitter followers [username] [--limit 20]    # 粉丝列表
reado twitter download [username] [--tweet-url url] [--output dir]  # 下载媒体
reado twitter article <tweet-id>                   # 读取长文
```

### reado youtube

```bash
reado youtube latest [channels...]                 # 最新视频（默认预设频道）
reado youtube search <query> [--limit 10]          # 搜索视频
reado youtube channel <id> [--limit 10]            # 频道信息+最新视频
reado youtube video <url>                          # 视频详情
reado youtube comments <url> [--limit 20]          # 视频评论
reado youtube transcript <url>                     # 视频字幕/文稿
```

### reado weibo

```bash
reado weibo hot                                    # 微博热搜
reado weibo search <keyword> [--limit 10]          # 搜索微博
reado weibo user <id>                              # 用户主页
reado weibo feed [--limit 20]                      # 关注用户动态
reado weibo post <id>                              # 单条微博详情
reado weibo comments <id> [--limit 20]             # 微博评论
```

### reado bilibili

```bash
reado bilibili hot                                 # B站热门视频
reado bilibili ranking                             # 视频排行榜
reado bilibili search <query>                      # 搜索（交互式）
reado bilibili comments <bvid>                     # 视频评论
reado bilibili subtitle <bvid>                     # 视频字幕
reado bilibili download <bvid>                     # 下载视频（需 yt-dlp）
```

### reado zhihu

```bash
reado zhihu hot                                    # 知乎热榜
reado zhihu search <query>                         # 搜索内容
reado zhihu question <id>                          # 问题详情和回答
reado zhihu download <url>                         # 导出文章为 Markdown
```

### reado bluesky

```bash
reado bluesky trending                             # 热门话题（alias: hot）
reado bluesky search <query> [--limit 10]          # 搜索用户
reado bluesky user <handle> [--limit 20]           # 用户最近帖子
reado bluesky profile <handle>                     # 用户资料
reado bluesky thread <uri>                         # 帖子线程
reado bluesky feeds                                # 热门 Feed 生成器
```

### reado arxiv

```bash
reado arxiv recent [category]                      # 最新论文（默认 cs.AI）
# 可选 category: cs.AI, cs.LG, cs.CL, cs.CV, stat.ML, cs.RO, cs.SE, cs.CR 等
reado arxiv search <query> [--limit 10]            # 搜索论文
reado arxiv paper <id>                             # 论文详情（如 2301.07041）
```

### reado github

```bash
reado github trending [language]                   # 趋势项目（不传语言则全语言）
reado github releases [--topics filter]            # 关注项目的最新 Release
```

### reado telegram

```bash
reado telegram latest [channels...]                # 最新消息（默认 aibrief/aigclink）
```

### reado huggingface

```bash
reado huggingface papers                           # 每日精选论文
reado huggingface blog                             # 官方博客
```

### reado v2ex

```bash
reado v2ex hot                                     # 热门话题
reado v2ex latest [--limit 20]                     # 最新话题
reado v2ex node <name> [--limit 10]                # 节点话题（如 python/go）
reado v2ex topic <id>                              # 话题详情和回复
reado v2ex member <username>                       # 用户资料
reado v2ex notifications                           # 未读提醒
```

### reado lobsters

```bash
reado lobsters hot                                 # 热门故事
reado lobsters newest [--limit 20]                 # 最新故事
reado lobsters active [--limit 20]                 # 最活跃讨论
reado lobsters tag <tag> [--limit 20]              # 按标签（如 programming/ai）
```

### reado medium

```bash
reado medium feed                                  # 热门文章 Feed
reado medium search <query>                        # 搜索文章
reado medium user <username>                       # 用户文章列表
```

### reado substack

```bash
reado substack feed                                # 热门文章 Feed
reado substack search <query>                      # 搜索文章或 Newsletter
reado substack publication <name>                  # 指定 Newsletter 最新文章
```

### reado stackoverflow

```bash
reado stackoverflow hot                            # 热门问题
reado stackoverflow search <query>                 # 搜索问题
reado stackoverflow unanswered                     # 未解决的高赞问题
reado stackoverflow bounties                       # 悬赏问题
```

### reado xueqiu

```bash
reado xueqiu hot                                   # 热门动态
reado xueqiu hot-stock                             # 热门股票
reado xueqiu search <query>                        # 搜索股票
reado xueqiu stock <code>                          # 实时行情（如 AAPL, 600519）
reado xueqiu comments <code>                       # 股票讨论动态
reado xueqiu watchlist                             # 自选股列表
reado xueqiu earnings-date                         # 财报发布日期
```

### reado douban

```bash
reado douban movie-hot                             # 电影热门榜
reado douban book-hot                              # 图书热门榜
reado douban top250                                # 电影 Top250
reado douban search <query>                        # 搜索电影/图书/音乐
reado douban subject <id>                          # 电影详情
```

### reado weread

```bash
reado weread ranking                               # 图书排行榜
reado weread search <query>                        # 搜索图书
reado weread book <id>                             # 图书详情
reado weread shelf                                 # 我的书架
reado weread highlights                            # 我的划线
reado weread notebooks                             # 有笔记的书
```

### reado xiaohongshu

```bash
reado xiaohongshu feed                             # 首页推荐
reado xiaohongshu search <query>                   # 搜索笔记
reado xiaohongshu user <id>                        # 用户笔记列表
reado xiaohongshu comments <id>                    # 笔记评论
reado xiaohongshu download <id>                    # 下载图片/视频
reado xiaohongshu creator-profile                  # 创作者账号信息
reado xiaohongshu creator-notes                    # 创作者笔记+数据
reado xiaohongshu creator-stats                    # 创作者数据总览
```

### reado jike

```bash
reado jike feed                                    # 首页动态流
reado jike search <query>                          # 搜索帖子
reado jike post <id>                               # 帖子详情及评论
reado jike user <id>                               # 用户动态
reado jike topic <id>                              # 话题/圈子帖子
reado jike notifications                           # 通知
```

### reado tiktok

```bash
reado tiktok explore                               # 热门/探索视频（alias: hot）
reado tiktok search <query>                        # 搜索视频
reado tiktok user <username>                       # 用户最近视频
reado tiktok profile <username>                    # 用户资料
reado tiktok live                                  # 当前直播列表
reado tiktok notifications                         # 通知
reado tiktok comment <video-id> <text>             # 发表评论
```

### reado instagram

```bash
reado instagram explore                            # 探索页热门
reado instagram search <query>                     # 搜索用户
reado instagram user <username>                    # 用户最近帖子
reado instagram profile <username>                 # 用户资料
reado instagram followers <username>               # 粉丝列表
reado instagram saved                              # 我的收藏
```

### reado facebook

```bash
reado facebook feed                                # 首页信息流
reado facebook search <query>                      # 搜索
reado facebook profile <id>                        # 用户/主页资料
reado facebook events                              # 活动列表
reado facebook groups                              # 已加入的群组
reado facebook notifications                       # 通知
```

### reado linkedin

```bash
reado linkedin timeline                            # 首页信息流
reado linkedin search <query>                      # 搜索职位
```

### reado google

```bash
reado google search <query>                        # Google 搜索
reado google news <query>                          # Google 新闻
reado google trends                                # 热门趋势
```

### reado wikipedia

```bash
reado wikipedia search <query>                     # 搜索文章
reado wikipedia summary <title>                    # 文章摘要
reado wikipedia trending                           # 昨日最多阅读
reado wikipedia random                             # 随机文章
```

### reado bbc

```bash
reado bbc news                                     # BBC 新闻头条
```

### reado xiaoyuzhou

```bash
reado xiaoyuzhou podcast <id>                      # 播客主页信息
reado xiaoyuzhou episodes <id>                     # 最近单集
reado xiaoyuzhou episode <id>                      # 单集详情
```

### reado tieba

```bash
reado tieba hot                                    # 热门话题
reado tieba posts <name>                           # 版块帖子
reado tieba read <id>                              # 阅读帖子
reado tieba search <query>                         # 搜索帖子
```

### reado zsxq

```bash
reado zsxq groups                                  # 已加入的星球列表
reado zsxq topics <group-id>                       # 星球话题列表
reado zsxq dynamics                                # 所有星球最新动态
reado zsxq search <query>                          # 搜索星球内容
reado zsxq topic <id>                              # 话题详情和评论
```

### reado producthunt

```bash
reado producthunt hot                              # Product Hunt 热榜
```

### reado mastodon

```bash
reado mastodon hot                                 # 热榜/热门
reado mastodon search                              # 搜索内容
```

---

## 管理命令

### reado sources

```bash
reado sources list [search]                        # 列出信息源（可搜索）
reado sources list --disabled                      # 只显示未开启的
reado sources list --enabled                       # 只显示已开启的
reado sources enable [sourceId]                    # 开启（不传 ID 则交互式多选）
reado sources disable <sourceId>                   # 关闭
reado sources test <sourceId>                      # 测试
```

### reado bundles

```bash
reado bundles list                                 # 列出所有主题包
reado bundles show <bundleId>                      # 查看包含的信息源
```

### reado topics

```bash
reado topics list                                  # 列出所有话题预设
reado topics show <name>                           # 查看预设的关键词
```

### reado config

```bash
reado config get [key]                             # 查看配置
reado config set <key> <value>                     # 修改配置
reado config clear <key>                           # 清除配置
```

可设置的 key：
- `language` — `zh` / `en`
- `defaults.hours` — 默认时间窗口（小时）
- `defaults.format` — 默认输出格式
- `defaults.maxItems` — 默认最大条目数
- `defaults.concurrency` — 默认并发数
- `defaults.cacheTTL` — 缓存有效期（分钟）
- `topics` — 全局关键词过滤（逗号分隔）
- `source-topics` — 按源覆盖 topics，格式 `sourceId:kw1,kw2`

### reado init

```bash
reado init                                         # 初始化配置文件
```

---

## 主题包

| ID | 名称 | 信息源数 |
|----|------|----------|
| `ai` | AI 与机器学习 | 66 |
| `tech` | 科技与开发 | 28 |
| `economics` | 经济与金融 | 11 |
| `work` | 工作与职场 | 8 |
| `science` | 科学与研究 | 12 |
| `china-tech` | 中国科技 | 16 |
| `startups` | 创业与产品 | 12 |

## 话题预设

| 名称 | 关键词数 | 示例 |
|------|----------|------|
| `ai` | 43 | AI, 大模型, LLM, AGI, Agent... |
| `tech` | 17 | 编程, 开发, 软件, 硬件, 科技... |
| `crypto` | 10 | Bitcoin, Ethereum, 区块链... |
| `robotics` | 8 | 机器人, 自动驾驶, 具身智能... |
| `finance` | 12 | 股票, 投资, 理财, 经济... |
| `science` | 12 | 物理, 化学, 生物, 量子... |

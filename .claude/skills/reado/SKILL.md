---
name: reado
description: 信息聚合 CLI 工具。当用户提到"信息采集"、"AI资讯"、"科技新闻"、"热榜"、"Twitter监控"、"reado"时使用此 skill。支持 30+ 平台、100+ 信息源、多种输出格式。完整命令和信息源参考见 reference/ 目录。
---

# Reado — 信息聚合 CLI

支持 30+ 平台、100+ 信息源的信息采集工具。

## 依赖

需要全局安装 `reado`。如果未安装：

```bash
npm install -g reado
```

部分平台（微博、知乎、B站、Twitter、TikTok、Instagram 等）需要额外安装 `opencli` 并在浏览器中登录对应平台：

```bash
npm install -g opencli
opencli browser extension install   # 安装浏览器扩展
```

## 参考文档

- **完整命令参考**: `reference/commands.md` — 所有平台的全部子命令、选项、用法示例
- **信息源列表**: `reference/sources.md` — 100+ 信息源 ID、名称、适配器、启用状态

## 快速命令速查

### 通用查询

```bash
reado search                              # 交互式选择
reado search AI公司                        # 按板块
reado search -s openai anthropic           # 按源 ID
reado search --bundle ai                   # 主题包（ai/tech/economics/work/science/china-tech/startups）
reado search --topics "GPT,Claude"         # 关键词过滤
reado search -t 48h -f html --open         # 48h + HTML 报告
reado hot                                  # 全平台热榜
reado hot 开发者 --topics AI               # 按分组 + 过滤
```

### 30+ 平台命令

每个平台都有独立子命令（详见 `reference/commands.md`）：

```bash
# 开发者社区
reado hackernews top / best / search <q> / ask / show / jobs / new
reado reddit hot / search <q> / read <id> / subreddit <name> / frontpage / user <name>
reado v2ex hot / latest / node <name> / topic <id>
reado lobsters hot / newest / active / tag <tag>
reado stackoverflow hot / search <q> / unanswered / bounties
reado devto                                # DEV Community

# 社交媒体
reado twitter timeline / watch / unwatch / watchlist / search / trending / profile / thread / download / article
reado weibo hot / search / user / feed / post / comments
reado bilibili hot / ranking / search / comments / subtitle / download
reado zhihu hot / search / question / download
reado bluesky trending / search / user / profile / thread / feeds
reado xiaohongshu feed / search / user / comments / download / creator-profile / creator-notes / creator-stats
reado jike feed / search / post / user / topic / notifications
reado telegram latest
reado mastodon hot / search
reado tiktok explore / search / user / profile / live / notifications
reado instagram explore / search / user / profile / followers / saved
reado facebook feed / search / profile / events / groups / notifications
reado linkedin timeline / search

# 视频 & 播客
reado youtube latest / search / channel / video / comments / transcript
reado xiaoyuzhou podcast / episodes / episode

# 学术
reado arxiv recent [category] / search / paper    # category: cs.AI/cs.LG/cs.CL/cs.CV/stat.ML...
reado huggingface papers / blog

# 代码
reado github trending [language] / releases

# 产品 & 金融
reado producthunt hot
reado xueqiu hot / hot-stock / search / stock / comments / watchlist / earnings-date
reado medium feed / search / user
reado substack feed / search / publication

# 内容 & 阅读
reado douban movie-hot / book-hot / top250 / search / subject
reado weread ranking / search / book / shelf / highlights / notebooks
reado bbc news

# 中文社区
reado tieba hot / posts / read / search
reado zsxq groups / topics / dynamics / search / topic

# 搜索 & 工具
reado google search / news / trends
reado wikipedia search / summary / trending / random

# 聚合
reado bundle search --bundle <id> / hot
```

### Twitter 监控清单

```bash
reado twitter watch <username>        # 添加到监控清单
reado twitter unwatch <username>      # 移出
reado twitter watchlist               # 查看清单
reado twitter timeline                # 拉取清单全员最新发言
reado twitter timeline karpathy       # 只看某人
reado twitter timeline -t 7d          # 最近 7 天
# 清单文件: ~/.reado/twitter-watchlist.txt（纯文本，可手动编辑）
```

### 信息源管理

```bash
reado sources list                    # 列出全部（100+）
reado sources list --disabled         # 未开启的
reado sources list <搜索词>           # 按名称/ID/板块搜索
reado sources enable <id>             # 开启
reado sources disable <id>            # 关闭
reado sources test <id>               # 测试采集
```

### 配置管理

```bash
reado config get                              # 查看所有配置
reado config set topics "AI,GPT,Claude"       # 全局关键词过滤
reado config set topics ""                    # 不过滤（显示全部）
reado config clear topics                     # 恢复各源默认
reado config set defaults.hours 48            # 默认时间窗口
reado config set defaults.format html         # 默认输出格式
reado config set defaults.maxItems 100        # 默认最大条目
reado config set defaults.concurrency 10      # 并发数
reado config set defaults.cacheTTL 15         # 缓存有效期（分钟）
reado config set language en                  # 切换英文
reado config set source-topics "tmtpost:AI,大模型"  # 按源覆盖关键词
```

## 通用选项

| 选项 | 说明 |
|------|------|
| `-t, --hours <hours>` | 时间窗口：`24`、`48h`、`7d` |
| `-f, --format <fmt>` | `table` / `json` / `markdown` / `html` |
| `-l, --limit <n>` | 最大条目数 |
| `-c, --concurrency <n>` | 并发采集数 |
| `--no-cache` | 跳过缓存 |
| `--theme <theme>` | HTML 模板：`default` / `dashboard` / `minimal` |
| `--open` | 自动打开浏览器 |
| `-o, --output <path>` | HTML 输出路径 |

## 常见场景

```bash
# 每日 AI 快报
reado search --bundle ai -t 24 -f html --open

# Twitter 大V 日报
reado twitter timeline -t 1d -f html --open

# GitHub 趋势 + arXiv 论文
reado search -s github-trending arxiv-cs-ai -t 7d

# HN + Reddit 社区热点
reado hot 开发者 -f markdown

# 中国科技新闻
reado search --bundle china-tech -t 24

# 金融快讯
reado xueqiu hot-stock
reado search --bundle economics -t 24

# B站搜索 + 下载
reado bilibili search "Claude Code"
```

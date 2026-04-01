---
name: reado
description: 信息聚合 CLI 工具。当用户提到"信息采集"、"AI资讯"、"科技新闻"、"热榜"、"Twitter监控"、"reado"时使用此 skill。支持从 50+ 数据源采集信息并输出为多种格式。
---

# Reado — 信息聚合 CLI

## 依赖

需要全局安装 `reado`。如果未安装，先执行：

```bash
npm install -g reado
```

## 命令速查

### 搜索采集

```bash
reado search                            # 交互式选择
reado search AI公司                      # 按板块
reado search -s openai anthropic         # 按源 ID
reado search --bundle ai                 # 主题包（ai/tech/economics）
reado search --topics "GPT,Claude"       # 关键词过滤
reado search -t 48h -f html --open       # 48h + HTML 报告 + 打开浏览器
```

### 热榜

```bash
reado hot                     # 全平台热榜
reado hot 开发者               # 按分组
reado hot --topics AI         # 关键词过滤
```

### Twitter 监控清单

```bash
# 管理清单（存储在 ~/.reado/twitter-watchlist.txt）
reado twitter watch <username>       # 添加
reado twitter unwatch <username>     # 移除
reado twitter watchlist              # 查看

# 采集内容
reado twitter timeline               # 清单全员最新发言
reado twitter timeline karpathy      # 只看某人（临时）
reado twitter timeline -t 7d         # 最近 7 天
reado twitter timeline -f html --open  # HTML 报告
```

### 平台命令

```bash
reado reddit hot / search <q>
reado hackernews top / best / search <q>
reado github trending [language]
reado arxiv recent [category]
reado youtube latest
reado weibo hot / search <q>
reado bilibili search <q>
reado bluesky trending
```

### 信息源管理

```bash
reado sources list                # 列出全部
reado sources list --disabled     # 未开启的
reado sources enable <id>         # 开启
reado sources disable <id>        # 关闭
reado sources test <id>           # 测试
```

### 配置

```bash
reado config get                          # 查看配置
reado config set topics "AI,GPT,Claude"   # 全局关键词
reado config set topics ""                # 不过滤
reado config clear topics                 # 恢复各源默认
reado config set defaults.hours 48        # 默认时间窗口
reado config set defaults.format html     # 默认格式
```

## 通用选项

| 选项 | 说明 |
|------|------|
| `-t, --hours <hours>` | 时间窗口：`24`、`48h`、`7d` |
| `-f, --format <fmt>` | `table` / `json` / `markdown` / `html` |
| `-l, --limit <n>` | 最大条目数 |
| `--no-cache` | 跳过缓存 |
| `--theme <theme>` | HTML 模板：`default` / `dashboard` / `minimal` |
| `--open` | 自动打开浏览器 |

## 常见场景

```bash
# 每日 AI 快报
reado search --bundle ai -t 24 -f html --open

# Twitter 大V 日报
reado twitter timeline -t 1d -f html --open

# 查看 GitHub 趋势 + arXiv 论文
reado search -s github-trending arxiv-cs-ai -t 7d

# HN + Reddit 社区热点
reado hot 开发者 -f markdown
```

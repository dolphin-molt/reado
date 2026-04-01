# Reado

> 信息聚合 CLI — 一站式获取 AI 资讯、科技新闻、社区热点

Reado 从 50+ 数据源采集信息，支持 RSS、GitHub Trending、HackerNews、Reddit、Twitter/X 等平台，输出为终端表格、JSON、Markdown 或 HTML 报告。

## 安装

```bash
# 安装依赖
npm install

# 构建
npm run build

# 全局链接（可选，让 reado 命令全局可用）
npm link
```

安装后即可使用 `reado` 命令，或通过 `npx reado` 运行。

## 快速开始

```bash
# 搜索 AI 相关信息
reado search

# 各平台热榜汇总
reado hot

# 指定时间窗口和输出格式
reado search -t 48h -f html --open
```

## 核心命令

### reado search

通用搜索命令，支持按板块、信息源、主题包查询。

```bash
reado search                          # 交互式选择信息源
reado search AI公司                    # 按板块搜索
reado search -s openai anthropic      # 指定信息源 ID
reado search --bundle ai              # 使用主题包
reado search --topics "GPT,Claude"    # 关键词过滤
```

**常用选项：**

| 选项 | 说明 |
|------|------|
| `-t, --hours <hours>` | 时间窗口，如 `24`、`48h`、`7d` |
| `-f, --format <fmt>` | 输出格式：`table` / `json` / `markdown` / `html` |
| `-l, --limit <n>` | 最大条目数 |
| `-s, --source <ids...>` | 指定信息源 ID |
| `--bundle <id>` | 主题包：`ai` / `tech` / `economics` |
| `--topics <topics>` | 话题预设或关键词 |
| `--no-cache` | 跳过缓存 |
| `--theme <theme>` | HTML 模板：`default` / `dashboard` / `minimal` |
| `--open` | 自动打开浏览器（HTML 格式） |
| `-o, --output <path>` | HTML 输出路径 |

### reado hot

各平台热榜快捷命令。

```bash
reado hot                    # 全部平台热榜
reado hot 开发者              # 按平台分组
reado hot --topics AI        # 关键词过滤
```

### reado twitter

Twitter/X 内容采集，支持监控清单管理。

```bash
# 监控清单管理
reado twitter watch @karpathy       # 添加到监控清单
reado twitter unwatch karpathy      # 移出清单
reado twitter watchlist             # 查看清单

# 获取内容
reado twitter timeline              # 拉取清单中所有人的最新发言
reado twitter timeline karpathy     # 只看某个人
reado twitter timeline -t 7d        # 最近 7 天
reado twitter timeline -f html --open  # HTML 报告

# 其他 Twitter 功能（需要 opencli）
reado twitter search <query>        # 搜索推文
reado twitter trending              # 热门话题
reado twitter profile <user>        # 用户资料
```

**监控清单文件：** `~/.reado/twitter-watchlist.txt`，纯文本格式，每行一个用户名，支持 `#` 注释，可手动编辑或批量导入。

### 平台专属命令

每个平台有独立的子命令：

```bash
reado reddit hot                     # Reddit 热门
reado reddit search <query>          # 搜索 Reddit
reado hackernews top                 # HN Top 故事
reado github trending                # GitHub 趋势项目
reado arxiv recent                   # arXiv 最新论文
reado youtube latest                 # YouTube 最新视频
reado bilibili search <query>        # B站搜索
reado weibo hot                      # 微博热搜
reado zhihu hot                      # 知乎热榜
reado bluesky trending               # Bluesky 热门
```

### 信息源管理

```bash
reado sources list                   # 列出所有信息源
reado sources list --disabled        # 查看未开启的源
reado sources enable <id>            # 开启信息源
reado sources disable <id>           # 关闭信息源
reado sources test <id>              # 测试某个源
```

### 配置管理

```bash
reado config get                     # 查看所有配置
reado config set topics "AI,GPT"     # 设置全局关键词过滤
reado config set topics ""           # 清空过滤（显示全部）
reado config clear topics            # 恢复各源默认过滤
reado config set defaults.hours 48   # 默认时间窗口
reado config set defaults.format html  # 默认输出格式
```

## 输出格式

| 格式 | 说明 | 适用场景 |
|------|------|----------|
| `table` | 终端彩色表格（默认） | 快速浏览 |
| `json` | JSON 结构化数据 | 程序处理、管道传输 |
| `markdown` | Markdown 文本 | 文档整理、笔记 |
| `html` | HTML 报告文件 | 分享、归档、可视化 |

HTML 格式支持三种模板（`--theme`）：`default`（标准报告）、`dashboard`（仪表盘）、`minimal`（简洁）。

## 数据源

支持以下适配器类型：

| 适配器 | 平台 | 方式 |
|--------|------|------|
| `rss` | 博客、新闻、播客 | RSS/Atom feed |
| `hackernews` | Hacker News | HN API |
| `reddit` | Reddit | Reddit API |
| `github-trending` | GitHub | 页面解析 |
| `twitter` | Twitter/X | Nitter RSS |
| `opencli` | 微博、知乎、B站、Twitter 等 | 浏览器 CDP |
| `telegram` | Telegram 频道 | tgstat RSS |
| `wordpress` | WordPress 站点 | REST API |
| `arxiv` | arXiv 论文 | RSS feed |

## 目录结构

```
src/
  adapters/     # 数据源适配器
  commands/     # CLI 命令处理
  core/         # 核心逻辑（引擎、配置、过滤）
  output/       # 输出格式化（table/json/markdown/html）
  parsers/      # RSS/XML 解析
  utils/        # 工具函数
config/
  default-sources.json    # 50+ 预定义数据源
  bundles.json            # 主题包定义
  topics.json             # 话题预设
```

## License

MIT

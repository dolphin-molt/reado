---
name: ai-daily
description: |
  AI 日报生成技能。从 100+ 信息源采集 AI 资讯，生成结构化日报。
  触发词：AI日报、生成日报、今日AI、AI早报、AI简报、帮我生成日报、今天AI有什么新鲜事、ai daily report、daily AI briefing
---

# AI Daily Report

从 100+ 信息源采集 AI 领域资讯，生成结构化 Markdown 日报，可选同步到飞书等外部平台。

## Prerequisites

### Required: reado CLI

```bash
npm install -g reado
```

### Optional: opencli (Twitter/社交平台采集)

```bash
npm install -g opencli
opencli browser extension install
```

Twitter 部分需要 opencli + Chrome 登录 x.com。未安装则跳过 Twitter 板块。

### Optional: lark-cli (飞书同步)

仅同步到飞书时需要。详见 `reference/sync-feishu.md`。

```bash
npm install -g lark-cli
lark-cli auth login
```

---

## Workflow

### Step 1: Onboarding（首次运行或配置缺失时）

检查 `~/.ai-daily/config.json` 是否存在。不存在则依次询问：

**Q1: 语言**

```
日报使用什么语言？
  1. 中文（默认）
  2. English
  3. 中英双语
```

**Q2: 同步目标**

```
是否同步到外部平台？
  1. 不同步，仅输出 Markdown（默认）
  2. 飞书多维表格
  3. 其他（说明你的目标平台）
```

选飞书 → 询问 `app_token` 和 `table_id`，参考 `reference/sync-feishu.md`。
选其他 → 提示用户可添加 `reference/sync-*.md` 文件。

**Q3: 定时**

```
是否定时生成？
  1. 不定时，手动运行（默认）
  2. 每天定时（指定时间）
```

选定时 → 询问时间（如 09:00），使用 Claude Code scheduling 工具创建定时任务。

保存配置到 `~/.ai-daily/config.json`：

```json
{
  "language": "zh",
  "sync": "none",
  "sync_config": {},
  "schedule": null
}
```

### Step 2: Data Collection

运行以下 reado 命令采集数据（尽可能并行）。所有命令使用 `-f json` 输出。

```bash
# 1. AI 全源采集（66 个源：公司博客、科技媒体、学术、社区等）
reado search --bundle ai -t 24 --no-cache -f json

# 2. Twitter 采集（见下方 Twitter 账号优先级说明）
reado twitter timeline -t 24 --no-cache -f json
# 或按 skill 配置的账号逐个采集：
reado twitter timeline <username1> <username2> ... -t 24 --no-cache -f json

# 3. Hacker News 热门
reado hackernews top -t 24 -f json

# 4. GitHub 趋势项目
reado search -s github-trending -f json
```

详细的命令说明、JSON 格式和分类映射见 `reference/data-sources.md`。

#### Twitter 账号优先级

`reference/twitter-accounts.md` 是 **主导配置**。采集 Twitter 时按以下优先级：

1. **Skill 侧** `reference/twitter-accounts.md` — 如果此文件中列出了账号，以此为准。从中提取所有 handle，作为 `reado twitter timeline <handles...>` 的参数
2. **Reado 侧** `~/.reado/twitter-watchlist.txt` — 仅当 skill 侧未配置（文件不存在或无账号）时使用，作为降级方案

执行时：读取 `reference/twitter-accounts.md`，解析所有表格中的 handle 列，去掉 `@` 前缀，传给 `reado twitter timeline`。

Skill 侧同时提供每个账号的身份信息（人名、角色、公司），用于 AI 生成摘要时的分类和介绍。

**容错处理：**
- reado 未安装 → 终止并输出安装指引
- 某条命令失败 → 记录警告，继续其他命令
- Twitter 返回空 → 跳过 Twitter 板块，在报告中注明
- 全部失败 → 终止并报告网络问题

### Step 3: AI Summarization

使用采集到的 JSON 数据，按 `prompts/` 目录中的 prompt 文件生成结构化报告：

- `prompts/summarize-news.md` — 新闻/公司动态的摘要规则
- `prompts/summarize-tweets.md` — Twitter 推文的摘要规则
- `prompts/summarize-opensource.md` — 开源项目/论文的摘要规则
- `prompts/digest-intro.md` — 日报整体组装规则和格式要求

**核心要求：每条内容必须有四个要素——来源、标题、事件描述（100-200字）、跳转链接。**

处理流程：
1. **去重** — 同一新闻来自多个源时只保留一条，选信息最丰富的源
2. **分类** — 按 `reference/data-sources.md` 中的映射表分配板块
3. **摘要** — 按对应 prompt 生成摘要（新闻/推文/开源各有不同规则）
4. **组装** — 按 `prompts/digest-intro.md` 组装最终报告
5. **语言** — 按 config 中的语言设置输出

### Step 4: Output

报告格式和组装规则详见 `prompts/digest-intro.md`。

**输出处理：**
- 始终在终端打印完整报告
- 保存到 `~/ai-daily/YYYY-MM-DD.md`
- 如果配置了同步，进入 Step 5

### Step 5: Sync（可选）

当 `config.sync` 非 `none` 时：
- 读取对应的 `reference/sync-{destination}.md`
- 按文档说明将条目写入目标平台
- 报告同步结果（成功/失败条数）

当前支持的同步目标：
- `feishu` — 飞书多维表格，见 `reference/sync-feishu.md`

**添加新同步目标：** 创建 `reference/sync-{name}.md`，包含：
1. 前置依赖（CLI 工具、认证方式）
2. 数据 schema（字段映射）
3. 命令示例（创建/写入记录）

---

## Constraints

1. **reado 是唯一的数据采集工具** — 不直接调用 RSS、web_fetch 等
2. **输出阶段不访问外部链接** — 摘要仅基于已采集数据
3. **每条必须有来源 URL** — 不编造链接
4. **摘要简洁** — 中文 ≤50 字 / 英文 ≤20 词
5. **Top 5 跨所有板块** — 不局限于某个分类
6. **时间窗口** — 所有源 24h，GitHub Releases 可放宽到 7d
7. **Twitter 账号** — `reference/twitter-accounts.md` 是主导配置，`~/.reado/twitter-watchlist.txt` 仅作降级方案

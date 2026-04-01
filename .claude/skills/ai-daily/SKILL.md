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

# 2. Twitter 监控清单（~58 个账号）
reado twitter timeline -t 24 --no-cache -f json

# 3. Hacker News 热门
reado hackernews top -t 24 -f json

# 4. GitHub 趋势项目
reado search -s github-trending -f json
```

详细的命令说明、JSON 格式和分类映射见 `reference/data-sources.md`。
Twitter 监控账号列表见 `reference/twitter-accounts.md`。

**容错处理：**
- reado 未安装 → 终止并输出安装指引
- 某条命令失败 → 记录警告，继续其他命令
- Twitter 返回空 → 跳过 Twitter 板块，在报告中注明
- 全部失败 → 终止并报告网络问题

### Step 3: AI Summarization

使用采集到的 JSON 数据生成结构化报告，要求：

1. **去重** — 同一新闻来自多个源时只保留一条，注明最佳来源
2. **分类** — 按下方模板分配到对应板块
3. **摘要** — 每条一行摘要（中文 ≤50 字 / 英文 ≤20 词）
4. **Top 5** — 跨所有板块选出 5 条最有影响力的新闻
5. **语言** — 按 config 中的语言设置输出

### Step 4: Output

**报告模板：**

```markdown
# AI Daily Report · YYYY-MM-DD

> Collected at HH:MM | Sources: X | Items: X

---

## 重大新闻 / Breaking News

重大发布、产品上线、融资消息。

- **标题** — 一句话摘要 [→](url)

## 公司动态 / Company Updates

OpenAI、Anthropic、Google、Meta 等公司新闻。

- **标题** — 一句话摘要 [→](url)

## Twitter 精选 / Twitter Highlights

AI 领袖和研究者的重要推文。

- **@username**: 推文要点 [→](url)

## 论文与开源 / Papers & Open Source

arXiv 论文、HuggingFace 发布、GitHub 趋势项目。

- **项目/论文名** — 一句话摘要 [→](url)

## 社区热点 / Community & Discussion

HN 讨论、Reddit 帖子、社区动态。

- **标题** — 一句话摘要 [→](url)

---

## Top 5 Picks

1. **标题** [→](url)
   > 为什么重要：一句话

...

---

## 采集统计

| 指标 | 数值 |
|------|------|
| 信息源总数 | X |
| 成功采集 | X |
| 条目总数 | X |
| 去重后 | X |
```

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
7. **Twitter 账号参考** — 见 `reference/twitter-accounts.md`，实际清单在 `~/.reado/twitter-watchlist.txt`

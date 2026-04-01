# Sync to Feishu Bitable (飞书多维表格)

## Prerequisites

```bash
npm install -g lark-cli
lark-cli auth login
```

## Bitable Schema

目标表需要以下字段：

| 字段名 | 类型 | Type ID | 说明 |
|--------|------|---------|------|
| 标题 | Text | 1 | 文章/推文标题 |
| 来源 | Single Select | 3 | 信息源名称 |
| 链接 | URL | 15 | 原始链接 |
| 摘要 | Text | 1 | AI 生成摘要 |
| 分类 | Single Select | 3 | Breaking/Company/Twitter/Papers/Community |
| 发布时间 | DateTime | 5 | 原始发布时间（毫秒时间戳） |
| 采集日期 | Date | 5 | 日报日期 |

## 写入记录

### 单条写入

```bash
lark-cli base +record-upsert \
  --base-token <app_token> \
  --table-id <table_id> \
  --json '{
    "fields": {
      "标题": "GPT-5 Released",
      "来源": "OpenAI Blog",
      "链接": {"text": "GPT-5 Released", "link": "https://openai.com/blog/gpt-5"},
      "摘要": "OpenAI announces GPT-5 with improved reasoning",
      "分类": "Breaking News",
      "发布时间": 1711929600000,
      "采集日期": 1711929600000
    }
  }'
```

### 批量写入（最多 500 条/次）

```bash
lark-cli api POST /open-apis/bitable/v1/apps/<app_token>/tables/<table_id>/records/batch_create \
  --data '{
    "records": [
      {
        "fields": {
          "标题": "Item title",
          "来源": "Hacker News",
          "链接": {"text": "Item title", "link": "https://..."},
          "摘要": "Summary",
          "分类": "Community",
          "发布时间": 1711929600000,
          "采集日期": 1711929600000
        }
      }
    ]
  }'
```

## Important Notes

1. **URL 字段格式**: 必须是 `{"text": "显示文本", "link": "https://..."}`，不能是纯字符串
2. **DateTime 格式**: 毫秒时间戳（如 `1711929600000`），不是 ISO 字符串
3. **Single Select**: 纯字符串，匹配已有选项名
4. **批量限制**: 每次 batch_create 最多 500 条，超过需分批
5. **并发**: 不要并行写入同一张表，批次间加 500ms 延迟

## 去重

写入前可检查当天是否已有记录：

```bash
lark-cli base +record-list \
  --base-token <app_token> \
  --table-id <table_id> \
  --json '{"filter": {"conjunction": "and", "conditions": [{"field_name": "采集日期", "operator": "is", "value": ["ExactDate", "TIMESTAMP_MS"]}]}}'
```

## Sync Workflow

1. 将 Markdown 报告中的条目解析为结构化数据
2. 转换格式：
   - `publishedAt` ISO → 毫秒时间戳
   - `url` 字符串 → `{"text": title, "link": url}`
   - source ID → 显示名（`来源` 字段）
   - report section → `分类` 字段
3. 分批（每批 ≤500 条）
4. 调用 `lark-cli api POST .../batch_create` 写入
5. 报告成功/失败条数

## Config

用户配置飞书同步时存入 `~/.ai-daily/config.json`：

```json
{
  "sync": "feishu",
  "sync_config": {
    "app_token": "S404b...",
    "table_id": "tblXXX..."
  }
}
```

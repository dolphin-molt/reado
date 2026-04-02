# Twitter Watchlist — AI Accounts (81 人)

实际清单文件：`~/.reado/twitter-watchlist.txt`

## 管理命令

```bash
reado twitter watch <username>      # 添加
reado twitter unwatch <username>    # 移除
reado twitter watchlist             # 查看
reado twitter timeline -t 24       # 采集全员
reado twitter timeline karpathy    # 采集指定用户
```

## Account Categories

### 海外 AI 公司官方 (12)

| Handle | Organization |
|--------|-------------|
| @OpenAI | OpenAI |
| @AnthropicAI | Anthropic |
| @claudeai | Claude (Anthropic) |
| @GoogleDeepMind | Google DeepMind |
| @GoogleAI | Google AI |
| @GeminiApp | Gemini |
| @GoogleCloud | Google Cloud |
| @GoogleLabs | Google Labs |
| @xai | xAI / Grok |
| @MistralAI | Mistral AI |
| @huggingface | Hugging Face |
| @MetaAI | Meta AI |

### 中国 AI 公司官方 (8)

| Handle | Organization |
|--------|-------------|
| @deepseek_ai | DeepSeek |
| @Zai_org | 智谱 AI (Z AI / ChatGLM) |
| @Alibaba_Qwen | 通义千问 Qwen (阿里) |
| @Kimi_Moonshot | Kimi / 月之暗面 |
| @TXhunyuan | 腾讯混元 |
| @Baidu_Inc | 百度 / 文心 |
| @MiniMax_AI | MiniMax / 海螺 |

### AI 产品 & 工具 (6)

| Handle | Organization |
|--------|-------------|
| @openclaw | OpenClaw |
| @EvoMapAI | EvoMap — AI Agent 进化网络 |
| @ManusAI_HQ | Manus AI |
| @Replit | Replit |
| @lovable_dev | Lovable — AI app builder |
| @lovart_ai | Lovart — AI 设计 Agent |

### Founders & CEOs (12)

| Handle | Person | Role |
|--------|--------|------|
| @sama | Sam Altman | CEO, OpenAI |
| @DarioAmodei | Dario Amodei | CEO, Anthropic |
| @demishassabis | Demis Hassabis | CEO, Google DeepMind |
| @jensenhhuang | Jensen Huang | CEO, NVIDIA |
| @arthurmensrch | Arthur Mensch | CEO, Mistral AI |
| @aidangomez | Aidan Gomez | CEO, Cohere |
| @alexandr_wang | Alexandr Wang | CEO, Scale AI |
| @mustafasuleyman | Mustafa Suleyman | CEO, Microsoft AI |
| @gdb | Greg Brockman | Co-founder, OpenAI |
| @amasad | Amjad Masad | CEO, Replit |
| @rauchg | Guillermo Rauch | CEO, Vercel |
| @ClementDelangue | Clement Delangue | CEO, Hugging Face |

### Researchers (13)

| Handle | Person | Affiliation |
|--------|--------|-------------|
| @karpathy | Andrej Karpathy | Ex-OpenAI/Tesla |
| @ylecun | Yann LeCun | Chief AI Scientist, Meta |
| @geoffreyhinton | Geoffrey Hinton | Turing Award |
| @ilyasut | Ilya Sutskever | Co-founder, SSI |
| @JeffDean | Jeff Dean | Chief Scientist, Google |
| @DrJimFan | Jim Fan | NVIDIA, Embodied AI |
| @lilianweng | Lilian Weng | VP Research, OpenAI |
| @AmandaAskell | Amanda Askell | Anthropic |
| @ch402 | Chris Olah | Co-founder, Anthropic |
| @NeelNanda5 | Neel Nanda | Google DeepMind |
| @OriolVinyalsML | Oriol Vinyals | VP Research, Google DeepMind |
| @noamshazeer | Noam Shazeer | Character.AI |
| @emollick | Ethan Mollick | Wharton |

### Builders & Developers (12)

| Handle | Person | Known For |
|--------|--------|-----------|
| @swyx | Shawn Wang | Latent Space |
| @simonw | Simon Willison | Datasette, LLM tools |
| @alexalbert__ | Alex Albert | Anthropic |
| @kevinweil | Kevin Weil | CPO, OpenAI |
| @HamelHusain | Hamel Husain | ML Engineering |
| @eugeneyan | Eugene Yan | Applied AI |
| @chipro | Chip Huyen | ML Systems |
| @danshipper | Dan Shipper | Every, AI writing |
| @steipete | Peter Steinberger | OpenClaw 创始人 |
| @joshwoodward | Josh Woodward | Google |
| @petergyang | Peter Yang | Product, AI |
| @ryolu_ | Ryo Lu | Cursor |

### 中文 AI 开发者 & KOL (8)

| Handle | Person | Known For |
|--------|--------|-----------|
| @vista8 | 向阳乔木 | AI 工具推荐, Prompt 工程, 中文 AI 顶流 |
| @lijigang | 李继刚 | Prompt 大师, Claude Skills 创作者 |
| @idoubicc | idoubi | ShipAny, MCP.so |
| @dotey | 宝玉 | AI 翻译, AIGC 社区 |
| @op7418 | 歸藏 | AI 产品评测 |
| @geekbb | GeekBB | AI 工具资讯 |
| @MaxForAI | Max | AI 产品体验 |
| @aigclink | AIGC Link | AIGC 资讯聚合, Agent/MCP 分析 |

### 科技公司 (4)

| Handle | Organization |
|--------|-------------|
| @Xiaomi | 小米 |
| @bilibili_en | 哔哩哔哩 |
| @meituan | 美团 |
| @Huawei | 华为 |

### VCs & Investors (6)

| Handle | Person | Firm |
|--------|--------|------|
| @garrytan | Garry Tan | Y Combinator |
| @levie | Aaron Levie | Box |
| @zarazhangrui | Zara Zhang | Khosla Ventures |
| @mattturck | Matt Turck | FirstMark Capital |
| @saranormous | Sarah Guo | Conviction |
| @jackclark | Jack Clark | Anthropic |

## Report Usage

生成 Twitter Highlights 板块时：
1. 按分类分组（Companies > Founders > Researchers > Builders > KOL）
2. 优先高互动或突发新闻的推文
3. 格式参见 `prompts/summarize-tweets.md`
4. 限制 10-15 条最重要的，避免报告过长

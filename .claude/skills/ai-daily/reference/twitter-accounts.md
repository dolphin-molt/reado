# Twitter Watchlist — AI Accounts

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

### AI Companies Official (13)

| Handle | Organization |
|--------|-------------|
| @OpenAI | OpenAI |
| @AnthropicAI | Anthropic |
| @GoogleDeepMind | Google DeepMind |
| @GoogleAI | Google AI |
| @GeminiApp | Gemini |
| @GoogleCloud | Google Cloud |
| @GoogleLabs | Google Labs |
| @xai | xAI |
| @deepseek_ai | DeepSeek |
| @MistralAI | Mistral AI |
| @huggingface | Hugging Face |
| @MetaAI | Meta AI |
| @claudeai | Claude |

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
| @steipete | Peter Steinberger | AI tools |
| @joshwoodward | Josh Woodward | Google |
| @petergyang | Peter Yang | Product, AI |
| @ryolu_ | Ryo Lu | Cursor |

### Chinese AI Developers & KOLs (6)

| Handle | Person | Known For |
|--------|--------|-----------|
| @idoubicc | idoubi | ShipAny, MCP.so |
| @dotey | 宝玉 | AI translation, AIGC community |
| @op7418 | 歸藏 | AI 产品评测, 中文 AI 社区 KOL |
| @geekbb | GeekBB | AI 工具资讯, 中文科技博主 |
| @MaxForAI | Max | AI 产品体验, 中文 AI 社区 |
| @thukeg | 唐杰 (Jie Tang) | CTO, 智谱 AI (Zhipu/ChatGLM) |

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
1. 按分类分组（Companies > Founders > Researchers > Builders）
2. 优先高互动或突发新闻的推文
3. 格式：`@handle: 推文要点 [→](url)`
4. 限制 10-15 条最重要的，避免报告过长

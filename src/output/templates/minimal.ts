import type { TemplateData } from './types.js'

/**
 * Minimal 模板 — 极简列表风
 * 纯白背景，紧凑列表，类似 Hacker News，适合打印
 */
export function renderMinimal(data: TemplateData): string {
  let rank = 0

  const navHtml = `
    <nav class="source-nav">
      ${data.groups.map(g => `
        <a class="nav-pill" href="#src-${esc(g.sourceId)}">${esc(g.sourceName)}<span class="nav-cnt">${g.itemCount}</span></a>
      `).join('')}
    </nav>
  `

  const groupsHtml = data.groups.map(group => `
    <div class="group" id="src-${esc(group.sourceId)}">
      <h2 class="group-title">${esc(group.sourceName)} <small>(${group.itemCount})</small></h2>
      <ol class="items" start="${rank + 1}">
        ${group.items.map(item => {
          rank++
          return `
            <li class="item">
              <div class="item-main">
                <a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>
                <span class="domain">(${extractDomain(item.url)})</span>
              </div>
              <div class="item-sub">
                ${item.summary ? `<span class="summary">${esc(item.summary.slice(0, 100))}</span> · ` : ''}
                <span class="time">${esc(item.timeAgo)}</span>
              </div>
            </li>
          `
        }).join('')}
      </ol>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Verdana, Geneva, -apple-system, 'Noto Sans SC', sans-serif;
    background: #f6f6ef;
    color: #333;
    max-width: 860px;
    margin: 0 auto;
    padding: 0;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Top bar */
  .topbar {
    background: #ff6600;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #000;
    font-weight: bold;
    font-size: 13px;
  }
  .topbar .logo { font-size: 15px; text-decoration: none; color: #000; }
  .topbar .title { font-weight: bold; }
  .topbar .meta { margin-left: auto; font-weight: normal; font-size: 11px; color: rgba(0,0,0,0.6); }

  /* Stats strip */
  .stats-strip {
    background: #f6f6ef;
    border-bottom: 1px solid #e0ddd5;
    padding: 6px 8px;
    font-size: 11px;
    color: #828282;
  }
  .stats-strip span { margin-right: 12px; }
  .stats-strip .ok { color: #2e7d32; }
  .stats-strip .err { color: #c62828; }

  /* Source nav pills */
  .source-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #fff;
    border-bottom: 1px solid #e0ddd5;
    padding: 5px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .nav-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    background: #f6f6ef;
    border: 1px solid #e0ddd5;
    border-radius: 3px;
    font-size: 11px;
    color: #333;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.1s, border-color 0.1s;
  }
  .nav-pill:hover { background: #ff6600; color: #fff; border-color: #ff6600; }
  .nav-pill.active { background: #ff6600; color: #fff; border-color: #ff6600; }
  .nav-cnt {
    font-size: 10px;
    color: inherit;
    opacity: 0.7;
  }

  /* Content */
  .content { padding: 8px; background: #f6f6ef; }

  .group { margin-bottom: 16px; }
  .group-title {
    font-size: 13px;
    font-weight: bold;
    color: #000;
    padding: 4px 0;
    border-bottom: 1px solid #e0ddd5;
    margin-bottom: 4px;
  }
  .group-title small {
    font-weight: normal;
    color: #828282;
  }

  /* Item list */
  .items {
    padding-left: 30px;
    list-style: decimal;
  }
  .item {
    padding: 3px 0;
  }
  .item-main a {
    color: #000;
    text-decoration: none;
    font-size: 13px;
  }
  .item-main a:visited { color: #828282; }
  .item-main a:hover { text-decoration: underline; }
  .domain {
    font-size: 11px;
    color: #828282;
    margin-left: 4px;
  }
  .item-sub {
    font-size: 11px;
    color: #828282;
    margin-top: 1px;
  }
  .summary {
    color: #666;
  }

  /* Footer */
  .footer {
    border-top: 2px solid #ff6600;
    padding: 8px;
    text-align: center;
    font-size: 11px;
    color: #828282;
    margin-top: 16px;
  }

  @media print {
    body { background: #fff; }
    .topbar { background: #ff6600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-main a { color: #000 !important; }
    .item-main a::after { content: " (" attr(href) ")"; font-size: 10px; color: #999; }
  }

  @media (max-width: 600px) {
    body { padding: 0; }
    .content { padding: 4px; }
    .items { padding-left: 24px; }
  }
</style>
</head>
<body>

<div class="topbar">
  <span class="logo">📡</span>
  <span class="title">${esc(data.title)}</span>
  <span class="meta">${esc(data.date)}</span>
</div>

<div class="stats-strip">
  <span>信息源: ${data.stats.totalSources}</span>
  <span class="ok">成功: ${data.stats.successSources}</span>
  <span class="err">失败: ${data.stats.failedSources}</span>
  <span>条目: ${data.stats.totalItems}</span>
</div>

${navHtml}

<div class="content">
  ${groupsHtml}
</div>

<div class="footer">
  Generated by reado · ${esc(data.fetchedAt)}
</div>

<script>
  const pills = document.querySelectorAll('.nav-pill');
  const groups = document.querySelectorAll('.group[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        pills.forEach(a => a.classList.remove('active'));
        const a = document.querySelector('.nav-pill[href="#' + e.target.id + '"]');
        if (a) a.classList.add('active');
      }
    });
  }, { threshold: 0.2, rootMargin: '-5% 0px -70% 0px' });
  groups.forEach(g => spy.observe(g));
</script>
</body>
</html>`
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

import type { TemplateData } from './types.js'

/**
 * Dashboard 模板 — Terminal / 赛博朋克风
 * 黑底绿色磷光文字，等宽字体，扫描线纹理，CRT 显示器美学
 */
export function renderDashboard(data: TemplateData): string {
  let idx = 0

  const navHtml = `
    <nav class="toc-nav">
      <div class="toc-header"><span class="toc-prompt">$</span> index</div>
      <div class="toc-list">
        ${data.groups.map((g, i) => `
          <a class="toc-entry" href="#src-${esc(g.sourceId)}">
            <span class="toc-i">${String(i + 1).padStart(2, '0')}</span>
            <span class="toc-name">${esc(g.sourceName)}</span>
            <span class="toc-cnt">${g.itemCount}</span>
          </a>`).join('')}
      </div>
    </nav>
  `

  const groupsHtml = data.groups.map((group, gi) => `
    <div class="block" id="src-${esc(group.sourceId)}" style="animation-delay: ${gi * 120}ms">
      <div class="block-header">
        <span class="prompt">▸</span>
        <span class="block-name">${esc(group.sourceName)}</span>
        <span class="block-count">[${group.itemCount}]</span>
        <span class="block-line"></span>
      </div>
      <div class="entries">
        ${group.items.map((item, j) => {
          idx++
          return `
        <a href="${esc(item.url)}" target="_blank" rel="noopener" class="entry" style="animation-delay: ${(gi * 120) + (j * 30)}ms">
          <span class="entry-idx">${String(idx).padStart(3, '0')}</span>
          <span class="entry-body">
            <span class="entry-title">${esc(item.title)}</span>
            ${item.summary ? `<span class="entry-desc">${esc(item.summary.slice(0, 120))}</span>` : ''}
          </span>
          <span class="entry-time">${esc(item.timeAgo || item.time)}</span>
        </a>`
        }).join('')}
      </div>
    </div>
  `).join('')

  const failuresHtml = data.failures.length > 0 ? `
    <div class="block block--err">
      <div class="block-header">
        <span class="prompt err">✗</span>
        <span class="block-name err">ERRORS</span>
        <span class="block-line"></span>
      </div>
      ${data.failures.map(f => `
        <div class="err-line">
          <span class="err-src">${esc(f.sourceName)}</span>
          <span class="err-msg">${esc(f.error)}</span>
        </div>
      `).join('')}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  @keyframes bootIn {
    0% { opacity: 0; transform: translateY(8px); filter: blur(2px); }
    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.8; }
    94% { opacity: 1; }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0e12;
    --surface: #0f1419;
    --border: #1a2332;
    --green: #00ff9d;
    --green-dim: #0a3d2a;
    --green-glow: rgba(0, 255, 157, 0.08);
    --amber: #ffb627;
    --red: #ff3b5c;
    --text: #c8d6e5;
    --text-dim: #4a5568;
    --mono: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
  }

  html { font-size: 14px; }

  body {
    font-family: var(--mono);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
    position: relative;
    overflow-x: hidden;
    animation: flicker 8s infinite;
  }

  /* CRT scanline overlay */
  body::after {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: rgba(0, 255, 157, 0.03);
    z-index: 9999;
    pointer-events: none;
    animation: scanline 4s linear infinite;
  }

  /* Noise texture */
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9998;
  }

  /* Layout: sidebar + main */
  .layout {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  /* TOC sidebar */
  .toc-nav {
    width: 180px;
    flex-shrink: 0;
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.7rem;
  }
  .toc-header {
    padding: 0.5rem 0.75rem;
    color: var(--green);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    letter-spacing: 1px;
    text-shadow: 0 0 8px rgba(0, 255, 157, 0.3);
  }
  .toc-prompt { margin-right: 0.3rem; }
  .toc-list { padding: 0.25rem 0; }
  .toc-entry {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    text-decoration: none;
    color: var(--text-dim);
    transition: color 0.12s, background 0.12s;
    white-space: nowrap;
    overflow: hidden;
  }
  .toc-entry:hover, .toc-entry.active {
    color: var(--green);
    background: var(--green-dim);
  }
  .toc-i { color: var(--border); flex-shrink: 0; font-size: 0.6rem; }
  .toc-name { flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 0.68rem; }
  .toc-cnt {
    flex-shrink: 0;
    font-size: 0.6rem;
    color: var(--text-dim);
    background: var(--border);
    padding: 0 3px;
    border-radius: 2px;
  }

  /* Main content */
  .main { flex: 1; min-width: 0; }

  .shell {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1.5rem 2rem;
  }

  /* Header */
  .header {
    border: 1px solid var(--border);
    background: var(--surface);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    position: relative;
    animation: bootIn 0.5s ease both;
  }
  .header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 4px; bottom: 0;
    background: var(--green);
    box-shadow: 0 0 12px var(--green);
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .logo {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--green);
    text-shadow: 0 0 20px rgba(0, 255, 157, 0.4);
    letter-spacing: 2px;
  }
  .logo-cursor {
    display: inline-block;
    width: 8px;
    height: 1.1rem;
    background: var(--green);
    margin-left: 4px;
    vertical-align: text-bottom;
    animation: cursor-blink 1s step-end infinite;
  }
  .header-time {
    font-size: 0.7rem;
    color: var(--text-dim);
  }

  /* Stats row */
  .stats-row {
    display: flex;
    gap: 2rem;
    font-size: 0.75rem;
  }
  .stat-item { color: var(--text-dim); }
  .stat-item b {
    color: var(--green);
    font-weight: 500;
    margin-right: 3px;
    text-shadow: 0 0 6px rgba(0, 255, 157, 0.3);
  }
  .stat-item.warn b { color: var(--amber); text-shadow: 0 0 6px rgba(255, 182, 39, 0.3); }
  .stat-item.err b { color: var(--red); text-shadow: 0 0 6px rgba(255, 59, 92, 0.3); }

  /* Block = source group */
  .block {
    border: 1px solid var(--border);
    background: var(--surface);
    margin-bottom: 0.75rem;
    animation: bootIn 0.4s ease both;
    overflow: hidden;
  }
  .block-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: rgba(0, 255, 157, 0.03);
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
  }
  .prompt {
    color: var(--green);
    text-shadow: 0 0 8px rgba(0, 255, 157, 0.5);
    font-weight: 600;
  }
  .block-name {
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
  }
  .block-count {
    color: var(--text-dim);
    font-size: 0.7rem;
  }
  .block-line {
    flex: 1;
    height: 1px;
    background: var(--border);
    margin-left: 0.5rem;
  }

  /* Entry = article item */
  .entries { }
  .entry {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.55rem 1rem;
    text-decoration: none;
    color: inherit;
    border-bottom: 1px solid rgba(26, 35, 50, 0.6);
    transition: background 0.12s;
    animation: bootIn 0.35s ease both;
  }
  .entry:last-child { border-bottom: none; }
  .entry:hover {
    background: var(--green-glow);
  }
  .entry:hover .entry-title {
    color: var(--green);
    text-shadow: 0 0 8px rgba(0, 255, 157, 0.2);
  }
  .entry-idx {
    flex-shrink: 0;
    font-size: 0.65rem;
    color: var(--text-dim);
    padding-top: 3px;
    width: 2rem;
    text-align: right;
  }
  .entry-body {
    flex: 1;
    min-width: 0;
  }
  .entry-title {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text);
    line-height: 1.4;
    transition: color 0.12s, text-shadow 0.12s;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .entry-desc {
    display: block;
    font-size: 0.68rem;
    color: var(--text-dim);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .entry-time {
    flex-shrink: 0;
    font-size: 0.62rem;
    color: var(--green-dim);
    padding-top: 4px;
    min-width: 60px;
    text-align: right;
  }

  /* Error block */
  .block--err { border-color: rgba(255, 59, 92, 0.3); }
  .block--err .block-header { background: rgba(255, 59, 92, 0.05); }
  .prompt.err, .block-name.err { color: var(--red); }
  .err-line {
    padding: 0.3rem 1rem;
    font-size: 0.72rem;
    border-bottom: 1px solid rgba(26, 35, 50, 0.4);
  }
  .err-line:last-child { border-bottom: none; }
  .err-src { color: var(--amber); margin-right: 0.5rem; }
  .err-msg { color: var(--text-dim); }

  /* Footer */
  .footer {
    text-align: center;
    padding: 1.5rem 0 1rem;
    font-size: 0.6rem;
    color: var(--text-dim);
    letter-spacing: 1px;
  }

  @media (max-width: 860px) {
    .layout { flex-direction: column; padding: 0.75rem; }
    .toc-nav { width: 100%; position: static; max-height: none; }
    .toc-list { display: flex; flex-wrap: wrap; gap: 0; }
    .toc-entry { flex: 0 0 auto; border-right: 1px solid var(--border); }
    .header { padding: 1rem; }
    .stats-row { flex-wrap: wrap; gap: 0.75rem; }
    .entry-title { white-space: normal; }
  }
</style>
</head>
<body>
<div class="layout">
  ${navHtml}
  <div class="main">
    <div class="header">
      <div class="header-top">
        <div class="logo">INFOCLI<span class="logo-cursor"></span></div>
        <div class="header-time">${esc(data.date)} ${esc(data.fetchedAt)}</div>
      </div>
      <div class="stats-row">
        <span class="stat-item"><b>${data.stats.totalItems}</b> items</span>
        <span class="stat-item"><b>${data.stats.successSources}</b> sources</span>
        <span class="stat-item err"><b>${data.stats.failedSources}</b> failed</span>
        <span class="stat-item warn"><b>${data.stats.cachedSources}</b> cached</span>
      </div>
    </div>

    ${groupsHtml}
    ${failuresHtml}

    <div class="footer">GENERATED BY INFOCLI · ${esc(data.fetchedAt)}</div>
  </div>
</div>
<script>
  const tocEntries = document.querySelectorAll('.toc-entry');
  const blocks = document.querySelectorAll('.block[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocEntries.forEach(a => a.classList.remove('active'));
        const active = document.querySelector('.toc-entry[href="#' + e.target.id + '"]');
        if (active) { active.classList.add('active'); active.scrollIntoView({ block: 'nearest' }); }
      }
    });
  }, { threshold: 0.1, rootMargin: '-10% 0px -60% 0px' });
  blocks.forEach(b => spy.observe(b));
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

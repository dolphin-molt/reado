import type { TemplateData } from './types.js'

/**
 * Default 模板 — Editorial 编辑/杂志风
 * 奶油纸质感，衬线字体，分栏排版，红色强调线，高端阅读感
 */
export function renderDefault(data: TemplateData): string {
  let globalIdx = 0

  const navHtml = `
    <nav class="toc-bar" id="toc">
      <span class="toc-label">Contents</span>
      <div class="toc-links">
        ${data.groups.map(g => `
          <a class="toc-item" href="#src-${esc(g.sourceId)}">
            ${esc(g.sourceName)}<span class="toc-n">${g.itemCount}</span>
          </a>`).join('')}
      </div>
    </nav>
  `

  const groupsHtml = data.groups.map((group, gi) => `
    <section class="source-section" id="src-${esc(group.sourceId)}" style="animation-delay: ${gi * 80}ms">
      <div class="section-rule"></div>
      <h2 class="section-title">
        <span class="section-name">${esc(group.sourceName)}</span>
        <span class="section-count">${group.itemCount} articles</span>
      </h2>
      <div class="article-grid">
        ${group.items.map((item, j) => {
          globalIdx++
          const isLead = j === 0 && group.items.length > 2
          return `
          <article class="article ${isLead ? 'article--lead' : ''}" style="animation-delay: ${(gi * 80) + (j * 40)}ms">
            <span class="article-num">${String(globalIdx).padStart(2, '0')}</span>
            <a href="${esc(item.url)}" target="_blank" rel="noopener" class="article-link">
              <h3 class="article-title">${esc(item.title)}</h3>
            </a>
            ${item.summary ? `<p class="article-excerpt">${esc(item.summary)}</p>` : ''}
            <div class="article-meta">
              <time>${esc(item.timeAgo)}</time>
              <span class="dot">·</span>
              <span>${esc(group.sourceName)}</span>
            </div>
          </article>`
        }).join('')}
      </div>
    </section>
  `).join('')

  const failuresHtml = data.failures.length > 0 ? `
    <aside class="failures">
      <p class="failures-title">Unreachable</p>
      ${data.failures.map(f => `<p class="fail-line">${esc(f.sourceName)}</p>`).join('')}
    </aside>
  ` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Crimson+Pro:wght@300;400;500&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
<style>
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #faf8f4;
    --ink: #1a1a18;
    --ink-light: #4a4a46;
    --ink-muted: #8a8a84;
    --accent: #c23a22;
    --accent-pale: #f0e0dc;
    --rule: #d4d0c8;
    --paper-shadow: rgba(26, 26, 24, 0.06);
  }

  body {
    font-family: 'Crimson Pro', 'Noto Serif SC', Georgia, serif;
    background: #e8e4dc;
    color: var(--ink);
    min-height: 100vh;
    line-height: 1.7;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }

  /* Paper container */
  .paper {
    max-width: 960px;
    margin: 2rem auto;
    background: var(--cream);
    box-shadow:
      0 1px 3px var(--paper-shadow),
      0 8px 40px var(--paper-shadow);
    position: relative;
  }
  .paper::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 1;
  }
  .paper > * { position: relative; z-index: 2; }

  /* Masthead */
  .masthead {
    padding: 2.5rem 3rem 1.5rem;
    text-align: center;
    border-bottom: 3px double var(--rule);
  }
  .masthead-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 300;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-bottom: 0.75rem;
  }
  .masthead h1 {
    font-family: 'Playfair Display', 'Noto Serif SC', serif;
    font-size: 2.8rem;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1.1;
    color: var(--ink);
  }
  .masthead-sub {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-muted);
  }

  /* TOC navigation bar */
  .toc-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 3rem;
    background: var(--ink);
    border-bottom: 2px solid var(--accent);
    overflow: hidden;
  }
  .toc-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .toc-links {
    display: flex;
    gap: 0.15rem;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex: 1;
    mask-image: linear-gradient(to right, transparent 0%, black 2%, black 96%, transparent 100%);
  }
  .toc-links::-webkit-scrollbar { display: none; }
  .toc-item {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.58rem;
    letter-spacing: 0.3px;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    white-space: nowrap;
    padding: 0.2rem 0.6rem;
    border-radius: 2px;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .toc-item:hover { background: var(--accent); color: #fff; }
  .toc-item.active { background: var(--accent); color: #fff; }
  .toc-n {
    margin-left: 0.3rem;
    opacity: 0.5;
    font-size: 0.5rem;
  }

  /* Stats ribbon */
  .stats-ribbon {
    display: flex;
    justify-content: center;
    gap: 2.5rem;
    padding: 0.75rem 3rem;
    border-bottom: 1px solid var(--rule);
    background: linear-gradient(180deg, var(--cream) 0%, #f5f2ec 100%);
  }
  .stat {
    text-align: center;
  }
  .stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
  }
  .stat-val.accent { color: var(--accent); }
  .stat-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-top: 2px;
  }

  /* Content area */
  .content { padding: 0 3rem 3rem; }

  /* Section */
  .source-section {
    margin-top: 2rem;
    animation: fadeUp 0.5s ease both;
  }
  .section-rule {
    height: 3px;
    background: var(--accent);
    margin-bottom: 0.6rem;
  }
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--rule);
    margin-bottom: 1.25rem;
  }
  .section-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .section-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  /* Article grid — newspaper columns */
  .article-grid {
    column-count: 2;
    column-gap: 2rem;
    column-rule: 1px solid var(--rule);
  }

  .article {
    break-inside: avoid;
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--rule);
    animation: fadeUp 0.45s ease both;
    position: relative;
  }
  .article:last-child { border-bottom: none; }

  .article-num {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 900;
    color: var(--accent-pale);
    line-height: 1;
    float: left;
    margin-right: 0.5rem;
    margin-top: -2px;
  }

  .article-link {
    text-decoration: none;
    color: inherit;
  }
  .article-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--ink);
    transition: color 0.15s;
  }
  .article-link:hover .article-title {
    color: var(--accent);
  }

  .article--lead {
    column-span: all;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
  }
  .article--lead .article-num {
    font-size: 3.5rem;
    color: var(--accent);
  }
  .article--lead .article-title {
    font-size: 1.6rem;
    line-height: 1.25;
  }
  .article--lead .article-excerpt {
    font-size: 0.95rem;
    margin-top: 0.5rem;
    max-width: 80%;
  }

  .article-excerpt {
    font-size: 0.82rem;
    color: var(--ink-light);
    margin-top: 0.35rem;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .article-meta {
    margin-top: 0.4rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    color: var(--ink-muted);
    letter-spacing: 0.3px;
  }
  .dot { margin: 0 0.3rem; }

  /* Failures */
  .failures {
    margin-top: 2rem;
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--accent);
    background: var(--accent-pale);
  }
  .failures-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--accent);
    margin-bottom: 0.25rem;
  }
  .fail-line {
    font-size: 0.78rem;
    color: var(--accent);
  }

  /* Colophon */
  .colophon {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 3px double var(--rule);
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.55rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  /* Print */
  @media print {
    body { background: #fff; }
    .paper { box-shadow: none; margin: 0; }
  }

  @media (max-width: 700px) {
    .paper { margin: 0; }
    .masthead { padding: 1.5rem 1.25rem 1rem; }
    .masthead h1 { font-size: 1.8rem; }
    .stats-ribbon { padding: 0.6rem 1.25rem; gap: 1.5rem; }
    .content { padding: 0 1.25rem 2rem; }
    .article-grid { column-count: 1; }
    .article--lead .article-title { font-size: 1.2rem; }
    .article--lead .article-excerpt { max-width: 100%; }
  }
</style>
</head>
<body>
<div class="paper">
  <header class="masthead">
    <div class="masthead-date">${esc(data.date)} — ${esc(data.fetchedAt)}</div>
    <h1>The Daily Brief</h1>
    <p class="masthead-sub">Curated intelligence from ${data.stats.totalSources} sources</p>
  </header>

  ${navHtml}

  <div class="stats-ribbon">
    <div class="stat">
      <div class="stat-val accent">${data.stats.totalItems}</div>
      <div class="stat-label">Articles</div>
    </div>
    <div class="stat">
      <div class="stat-val">${data.stats.successSources}</div>
      <div class="stat-label">Sources</div>
    </div>
    <div class="stat">
      <div class="stat-val">${data.stats.failedSources}</div>
      <div class="stat-label">Failed</div>
    </div>
  </div>

  <div class="content">
    ${groupsHtml}
    ${failuresHtml}

    <div class="colophon">
      Generated by reado · ${esc(data.fetchedAt)}
    </div>
  </div>
</div>
<script>
  // Scroll-spy: highlight current section in TOC
  const tocItems = document.querySelectorAll('.toc-item');
  const sections = document.querySelectorAll('.source-section[id]');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocItems.forEach(a => a.classList.remove('active'));
        const active = document.querySelector('.toc-item[href="#' + e.target.id + '"]');
        if (active) {
          active.classList.add('active');
          active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
      }
    });
  }, { threshold: 0.15, rootMargin: '-60px 0px -60% 0px' });
  sections.forEach(s => spy.observe(s));
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

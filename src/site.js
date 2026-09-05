const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function groupBySource(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.source)) map.set(item.source, []);
    map.get(item.source).push(item);
  }
  return map;
}

function generateSite(items) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const sorted = [...items].sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));
  const grouped = groupBySource(sorted);
  const updatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  let sections = '';
  for (const [source, list] of grouped) {
    sections += `<section class="source-block">
<p class="eyebrow"><span class="dot"></span>${escapeHtml(source)} <span class="count">${list.length}건</span></p>
<div class="card-list">
`;
    for (const item of list) {
      sections += `<a class="news-card" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
<div class="card-text">
<h3>${escapeHtml(item.title)}</h3>
<time>${formatDate(item.pubDate || item.fetchedAt)}</time>
</div>
<span class="satellite" aria-hidden="true">&rarr;</span>
</a>
`;
    }
    sections += `</div>
</section>
`;
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>현대차·기아 뉴스</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
<style>
  :root {
    --canvas: #F3F0EE;
    --lifted: #FCFBFA;
    --white: #FFFFFF;
    --ink: #141413;
    --slate: #696969;
    --dust: #D1CDC7;
    --signal-orange: #CF4500;
    --light-orange: #F37338;
    color-scheme: light;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--canvas);
    color: var(--ink);
    font-family: "Inter", -apple-system, "Malgun Gothic", sans-serif;
    font-weight: 450;
    line-height: 1.4;
  }

  .page { max-width: 900px; margin: 0 auto; padding: 0 24px 96px; }

  .nav-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: var(--white);
    border-radius: 999px;
    box-shadow: rgba(0, 0, 0, 0.04) 0px 4px 24px 0px;
    padding: 16px 32px;
    margin: 24px 0 64px;
  }

  .brand {
    font-weight: 500;
    font-size: 16px;
    letter-spacing: -0.32px;
    white-space: nowrap;
  }

  .updated-pill {
    color: var(--slate);
    font-size: 13px;
    font-weight: 450;
    text-align: right;
  }

  .hero { padding: 0 0 64px; }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    text-transform: uppercase;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.56px;
    color: var(--ink);
  }

  .eyebrow .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--signal-orange);
    flex-shrink: 0;
  }

  .eyebrow .count {
    font-weight: 450;
    text-transform: none;
    letter-spacing: normal;
    color: var(--slate);
  }

  .hero h1 {
    font-size: 64px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -1.28px;
    margin: 0 0 24px;
  }

  .hero .sub {
    font-size: 16px;
    font-weight: 450;
    color: var(--slate);
    max-width: 520px;
    margin: 0;
  }

  .source-block { margin-bottom: 64px; }

  .card-list { display: flex; flex-direction: column; gap: 16px; }

  .news-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    background: var(--lifted);
    border-radius: 24px;
    padding: 24px 28px;
    text-decoration: none;
    color: inherit;
    box-shadow: rgba(0, 0, 0, 0.04) 0px 4px 24px 0px;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  .news-card:hover {
    box-shadow: rgba(0, 0, 0, 0.08) 0px 24px 48px 0px;
    transform: translateY(-2px);
  }

  .card-text h3 {
    font-size: 20px;
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: -0.4px;
    margin: 0 0 8px;
  }

  .card-text time {
    font-size: 13px;
    font-weight: 450;
    color: var(--slate);
  }

  .satellite {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--ink);
    color: var(--canvas);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: transform 0.2s ease;
  }

  .news-card:hover .satellite { transform: translateX(3px); }

  .empty {
    background: var(--lifted);
    border-radius: 24px;
    padding: 48px;
    text-align: center;
    color: var(--slate);
  }

  .site-footer {
    background: var(--ink);
    color: var(--white);
    border-radius: 40px;
    padding: 48px 40px;
    margin-top: 64px;
    text-align: center;
    font-size: 14px;
    font-weight: 450;
  }

  .site-footer a {
    color: var(--light-orange);
    text-decoration: none;
  }

  .site-footer a:hover { text-decoration: underline; }

  @media (max-width: 767px) {
    .page { padding: 0 16px 64px; }
    .nav-pill { flex-direction: column; align-items: flex-start; gap: 8px; padding: 20px 24px; border-radius: 24px; }
    .hero h1 { font-size: 40px; letter-spacing: -0.8px; }
    .news-card { padding: 20px; }
    .card-text h3 { font-size: 17px; }
    .satellite { width: 40px; height: 40px; font-size: 16px; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="nav-pill">
    <div class="brand">현대차·기아 뉴스</div>
    <div class="updated-pill">업데이트: ${updatedAt}</div>
  </header>

  <section class="hero">
    <p class="eyebrow"><span class="dot"></span>AUTO NEWS</p>
    <h1>현대차그룹 소식을<br>한곳에서</h1>
    <p class="sub">5개 매체(모터그래프·오토헤럴드·연합뉴스·Car Watch·Auto Car)에서 현대차·기아 관련 기사만 골라 2시간마다 자동으로 수집합니다.</p>
  </section>

  ${sections || '<div class="empty">아직 수집된 뉴스가 없습니다.</div>'}

  <footer class="site-footer">
    <p>2시간마다 자동 갱신 · <a href="https://github.com/emperordesu/News-RSS-2609">GitHub Actions</a>로 운영됩니다.</p>
  </footer>
</div>
</body>
</html>
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');
}

module.exports = { generateSite };

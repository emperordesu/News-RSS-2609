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
    sections += `<section>\n<h2>${escapeHtml(source)} <span class="count">${list.length}건</span></h2>\n<ul>\n`;
    for (const item of list) {
      sections += `<li><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a><time>${formatDate(item.pubDate || item.fetchedAt)}</time></li>\n`;
    }
    sections += '</ul>\n</section>\n';
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>자동차 뉴스 모음</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, "Malgun Gothic", sans-serif; max-width: 760px; margin: 0 auto; padding: 24px 16px 60px; line-height: 1.5; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .updated { color: #888; font-size: 0.85rem; margin-bottom: 24px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 1.1rem; border-bottom: 2px solid #ddd; padding-bottom: 6px; }
  .count { font-weight: normal; color: #888; font-size: 0.85rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  li a { text-decoration: none; color: inherit; font-weight: 500; }
  li a:hover { text-decoration: underline; }
  li time { color: #999; font-size: 0.8rem; white-space: nowrap; }
</style>
</head>
<body>
<h1>자동차 뉴스 모음</h1>
<div class="updated">마지막 업데이트: ${updatedAt} (2시간마다 자동 갱신)</div>
${sections || '<p>수집된 뉴스가 없습니다.</p>'}
</body>
</html>
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');
}

module.exports = { generateSite };

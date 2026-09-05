const fs = require('fs');
const path = require('path');
const { FEEDS } = require('./config');
const { groupFeedsByCountry } = require('./countryGroups');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const ASSETS_SRC_DIR = path.join(__dirname, '..', 'assets');
const LOGO_FILENAME = 'hyundai-motor-group-logo.png';
const CAROUSEL_SLIDE_COUNT = 6;

function copyLogoAsset() {
  const src = path.join(ASSETS_SRC_DIR, LOGO_FILENAME);
  if (!fs.existsSync(src)) return false;
  const destDir = path.join(DOCS_DIR, 'assets');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, LOGO_FILENAME));
  return true;
}

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

function renderCard(item) {
  const hasImage = Boolean(item.image);
  const summaryHtml = item.summary ? `<p class="summary">${escapeHtml(item.summary)}</p>` : '';
  const imgHtml = hasImage
    ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.remove()">`
    : '';

  const pubdate = item.pubDate || item.fetchedAt || '';

  return `<a class="article-card" href="${escapeHtml(item.link)}" target="_blank" rel="noopener" data-pubdate="${escapeHtml(pubdate)}">
<div class="thumb" style="background:${item.color}">
<span class="thumb-fallback">${escapeHtml(item.initials)}</span>
${imgHtml}
</div>
<div class="article-body">
<h3>${escapeHtml(item.title)}</h3>
${summaryHtml}
<time>${formatDate(item.pubDate || item.fetchedAt)}</time>
</div>
</a>`;
}

const DIRECTION_ARROW = { up: '▲', down: '▼', flat: '－' };

function renderTickerItem(stock) {
  const arrow = DIRECTION_ARROW[stock.direction] || '－';
  const changeAbs = Math.abs(stock.change).toLocaleString('ko-KR');
  const percentAbs = Math.abs(stock.percent).toFixed(2);

  return `<span class="ticker-item ticker-${stock.direction}">
<span class="ticker-arrow">${arrow}</span>
<span class="ticker-name">${escapeHtml(stock.name)}</span>
<span class="ticker-price">${stock.price.toLocaleString('ko-KR')}</span>
<span class="ticker-change">(${changeAbs}, ${percentAbs}%)</span>
</span>`;
}

// 캐러셀 바로 아래에 배치되는 현대차/기아/현대모비스 시세 티커. 데이터가 없으면 렌더링하지 않는다.
function renderTickerBar(stocks) {
  if (!stocks || stocks.length === 0) return '';

  return `<div class="ticker-bar" aria-label="현대차·기아·현대모비스 시세">
<div class="ticker-inner">
${stocks.map((s) => renderTickerItem(s)).join('<span class="ticker-sep">|</span>\n')}
</div>
</div>`;
}

const FEEDS_BY_NAME = new Map(FEEDS.map((f) => [f.name, f]));

function renderCarouselSlide(item, index) {
  const feed = FEEDS_BY_NAME.get(item.source);
  const color = feed ? feed.color : '#8A8172';
  const initials = feed ? feed.initials : '';
  const bgImage = item.image ? `background-image:url('${escapeHtml(item.image)}');` : '';

  return `<a class="carousel-slide${index === 0 ? ' is-active' : ''}" data-index="${index}" href="${escapeHtml(item.link)}" target="_blank" rel="noopener" style="background-color:${color};${bgImage}">
<span class="carousel-fallback-text">${escapeHtml(initials)}</span>
<div class="carousel-scrim"></div>
<div class="carousel-caption">
<h2>${escapeHtml(item.title)}</h2>
</div>
</a>`;
}

// 최근 기사 상위 N건으로 자동 전환되는 이미지 캐러셀을 만든다. 기사가 없으면 렌더링하지 않는다.
function renderHeroCarousel(items) {
  const slides = [...items]
    .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))
    .slice(0, CAROUSEL_SLIDE_COUNT);

  if (slides.length === 0) return '';

  const slidesHtml = slides.map((item, i) => renderCarouselSlide(item, i)).join('\n');
  const dotsHtml = slides
    .map(
      (_, i) => `<button type="button" class="carousel-dot${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-label="${i + 1}번 슬라이드로 이동">
<span class="carousel-dot-num">${i + 1}</span>
<span class="carousel-dot-bar"><span class="carousel-dot-fill"></span></span>
</button>`
    )
    .join('\n');

  const arrows =
    slides.length > 1
      ? `<button type="button" class="carousel-arrow carousel-prev" aria-label="이전 슬라이드">&#8249;</button>
<button type="button" class="carousel-arrow carousel-next" aria-label="다음 슬라이드">&#8250;</button>`
      : '';

  return `<section class="hero-carousel" id="hero-carousel" aria-roledescription="carousel" aria-label="주요 뉴스">
<div class="carousel-viewport">
${slidesHtml}
</div>
${arrows}
<div class="carousel-pager">
${dotsHtml}
</div>
</section>`;
}

// 국가(한국/일본/영국)별로 섹션을 구성한다. 매칭되는 기사가 없는 국가는 섹션 자체를 숨긴다.
function renderSections(items, sectionSummaries = {}) {
  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  }

  const { order, map: countryFeeds } = groupFeedsByCountry();

  let sourceNav = '';
  let sections = '';
  let sectionIndex = 0;

  for (const country of order) {
    const feeds = countryFeeds.get(country);
    const combined = feeds.flatMap((feed) =>
      (bySource.get(feed.name) || []).map((item) => ({
        ...item,
        color: feed.color,
        initials: feed.initials,
      }))
    );

    if (combined.length === 0) continue;

    sectionIndex += 1;
    const sectionNum = String(sectionIndex).padStart(2, '0');
    const sectionId = `section-${sectionIndex}`;
    const aiSummary = sectionSummaries[country] && sectionSummaries[country].text;
    const description = aiSummary || [...new Set(feeds.map((f) => f.description))].join(' · ');
    const sorted = combined.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));

    sourceNav += `<a href="#${sectionId}">${escapeHtml(country)}</a>\n`;

    sections += `<section class="source-section" id="${sectionId}">
<div class="section-heading">
<p class="section-label">SECTION ${sectionNum}</p>
<h2>${escapeHtml(country)}</h2>
<p class="section-desc">${escapeHtml(description)}</p>
</div>
<div class="card-grid">
${sorted.map((item) => renderCard(item)).join('\n')}
</div>
</section>
`;
  }

  return { sourceNav, sections };
}

function generateSite(items, stocks = [], sectionSummaries = {}) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const hasLogo = copyLogoAsset();
  const updatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const { sourceNav, sections } = renderSections(items, sectionSummaries);
  const tickerBar = renderTickerBar(stocks);
  const heroCarousel = renderHeroCarousel(items);

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
    --canvas: #F1EBE1;
    --surface: #FFFFFF;
    --ink: #1C1A17;
    --ink-soft: #4A453D;
    --muted: #8A8172;
    --border: rgba(28, 26, 23, 0.08);
    --accent: #B5502A;
    --accent-on-dark: #E2916B;
    color-scheme: light;
  }

  * { box-sizing: border-box; }
  [hidden] { display: none !important; }

  body {
    margin: 0;
    background: var(--canvas);
    color: var(--ink);
    font-family: "Inter", -apple-system, "Malgun Gothic", sans-serif;
    font-weight: 450;
    line-height: 1.5;
  }

  a { color: inherit; }

  .topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .topbar-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .logo { font-weight: 700; font-size: 16px; white-space: nowrap; }
  .logo img { display: block; height: 36px; width: auto; }

  .period-filter {
    display: inline-flex;
    background: var(--canvas);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
    gap: 2px;
  }

  .period-btn {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .period-btn:hover { color: var(--accent); }
  .period-btn.active { background: var(--ink); color: var(--canvas); }
  .period-btn.active:hover { color: var(--canvas); }

  .hero-carousel {
    position: relative;
    height: 56vh;
    min-height: 380px;
    max-height: 600px;
    overflow: hidden;
    background: var(--ink);
  }

  .carousel-viewport { position: relative; width: 100%; height: 100%; }

  .carousel-slide {
    position: absolute;
    inset: 0;
    display: block;
    background-size: cover;
    background-position: center;
    text-decoration: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.8s ease;
    z-index: 0;
  }
  .carousel-slide.is-active { opacity: 1; visibility: visible; z-index: 1; }

  .carousel-fallback-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 72px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.22);
    letter-spacing: 0.04em;
  }

  .carousel-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(20, 18, 16, 0.85) 0%, rgba(20, 18, 16, 0.35) 42%, rgba(20, 18, 16, 0) 68%);
  }

  .carousel-caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 32px 100px 56px 40px;
    max-width: 760px;
    color: #fff;
  }

  .carousel-caption h2 {
    font-size: clamp(20px, 2.6vw, 30px);
    font-weight: 700;
    line-height: 1.35;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .carousel-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  .carousel-arrow:hover { background: rgba(255, 255, 255, 0.3); }
  .carousel-prev { left: 20px; }
  .carousel-next { right: 20px; }

  .carousel-pager {
    position: absolute;
    right: 40px;
    bottom: 24px;
    display: flex;
    gap: 10px;
    z-index: 2;
  }

  .carousel-dot {
    appearance: none;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    font-weight: 600;
  }
  .carousel-dot.is-active { color: #fff; }

  .carousel-dot-bar {
    width: 26px;
    height: 2px;
    background: rgba(255, 255, 255, 0.3);
    position: relative;
    overflow: hidden;
    border-radius: 2px;
  }

  .carousel-dot-fill {
    position: absolute;
    inset: 0;
    width: 0%;
    background: #fff;
  }

  @keyframes carousel-progress {
    from { width: 0%; }
    to { width: 100%; }
  }

  .ticker-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }

  .ticker-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
  }

  .ticker-item { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-soft); }
  .ticker-sep { color: var(--border); margin: 0 14px; }
  .ticker-arrow { font-size: 10px; }
  .ticker-name { color: var(--ink); font-weight: 700; }
  .ticker-price { font-variant-numeric: tabular-nums; }
  .ticker-change { font-weight: 500; color: var(--muted); }

  .ticker-up .ticker-arrow, .ticker-up .ticker-price, .ticker-up .ticker-change { color: #B3554F; }
  .ticker-down .ticker-arrow, .ticker-down .ticker-price, .ticker-down .ticker-change { color: #3E6DA6; }
  .ticker-flat .ticker-arrow, .ticker-flat .ticker-price, .ticker-flat .ticker-change { color: var(--muted); }

  .search-bar-wrap {
    background: var(--canvas);
    border-bottom: 1px solid var(--border);
  }

  .search-bar-inner { max-width: 1100px; margin: 0 auto; padding: 16px 24px; }

  #search-form {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 10px 18px;
    max-width: 560px;
    margin: 0 auto;
  }

  .search-icon { font-size: 14px; opacity: 0.6; }

  #search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 14px;
    color: var(--ink);
  }
  #search-input::placeholder { color: var(--muted); }

  .search-clear-btn {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  .search-clear-btn:hover { color: var(--accent); }

  .search-results { margin-top: 16px; }

  .search-answer {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 20px;
    margin: 0 0 16px;
  }

  .search-answer-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .search-answer p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--ink-soft); }

  .source-nav {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 24px 8px;
  }

  .source-nav a {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-soft);
    text-decoration: none;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .source-nav a:hover { border-color: var(--accent); color: var(--accent); }

  .source-section {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 24px 32px;
    scroll-margin-top: 24px;
  }

  .section-heading { margin-bottom: 32px; max-width: 640px; }

  .section-label {
    color: var(--accent);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 8px;
  }

  .section-heading h2 {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 12px;
  }

  .section-desc { color: var(--ink-soft); font-size: 15px; margin: 0; }

  .section-empty {
    color: var(--muted);
    background: var(--surface);
    border-radius: 20px;
    padding: 32px;
    text-align: center;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .article-card {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-radius: 20px;
    overflow: hidden;
    text-decoration: none;
    box-shadow: 0 12px 32px rgba(28, 26, 23, 0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .article-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(28, 26, 23, 0.14); }

  .thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .thumb-fallback {
    font-size: 26px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    letter-spacing: 0.02em;
  }

  .thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

  .article-body { padding: 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; }

  .article-body h3 {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.35;
    margin: 0;
  }

  .article-body .summary {
    font-size: 13.5px;
    color: var(--ink-soft);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .article-body time { margin-top: auto; font-size: 12px; color: var(--muted); }

  .site-footer {
    background: var(--ink);
    color: var(--canvas);
    border-radius: 32px;
    padding: 48px 40px;
    margin: 64px 24px 48px;
    text-align: center;
    font-size: 14px;
    font-weight: 450;
  }
  .site-footer a { color: var(--accent-on-dark); text-decoration: none; }
  .site-footer a:hover { text-decoration: underline; }

  @media (max-width: 1023px) {
    .card-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 767px) {
    .topbar-inner { flex-wrap: wrap; gap: 10px; }
    .hero-carousel { height: 42vh; min-height: 280px; }
    .carousel-caption { padding: 24px 60px 36px 20px; }
    .carousel-arrow { width: 34px; height: 34px; font-size: 16px; }
    .carousel-prev { left: 10px; }
    .carousel-next { right: 10px; }
    .carousel-pager { right: 20px; bottom: 16px; }
    .logo img { height: 28px; }
    .ticker-inner { padding: 8px 20px; font-size: 12px; }
    .ticker-sep { margin: 0 10px; }
    .search-bar-inner { padding: 12px 20px; }
    #search-form { max-width: none; }
    .section-heading h2 { font-size: 24px; }
    .card-grid { grid-template-columns: 1fr; }
    .site-footer { margin: 48px 16px 32px; padding: 36px 24px; }
  }
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <div class="logo">${hasLogo ? '<img src="assets/hyundai-motor-group-logo.png" alt="Hyundai Motor Group">' : '현대차·기아 뉴스'}</div>
    <div class="period-filter" role="group" aria-label="기간 필터">
      <button type="button" class="period-btn active" data-period="7d">7일</button>
      <button type="button" class="period-btn" data-period="30d">30일</button>
    </div>
  </div>
</header>

<main>
${heroCarousel}

${tickerBar}

<div class="search-bar-wrap">
  <div class="search-bar-inner">
    <form id="search-form" autocomplete="off">
      <span class="search-icon" aria-hidden="true">&#128269;</span>
      <input type="search" id="search-input" placeholder="예: 최근 리콜 관련 뉴스, 기아 신차 소식" aria-label="뉴스 검색">
      <button type="button" id="search-clear" class="search-clear-btn" hidden aria-label="검색어 지우기">&times;</button>
    </form>
    <div id="search-results" class="search-results" hidden>
      <div id="search-answer" class="search-answer" hidden>
        <span class="search-answer-label">AI 답변</span>
        <p id="search-answer-text"></p>
      </div>
      <div id="search-cards" class="card-grid"></div>
    </div>
  </div>
</div>

${sourceNav ? `  <nav class="source-nav" id="source-nav">\n${sourceNav}  </nav>\n` : ''}
  <div id="sections">
${sections || '<p class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;">현재 표시할 뉴스가 없습니다.</p>\n'}  <p id="no-results" class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;" hidden>선택한 기간에는 표시할 뉴스가 없습니다.</p>
  </div>
</main>

<footer class="site-footer">
  <p>마지막 업데이트: ${updatedAt} · 2시간마다 자동 갱신 · <a href="https://github.com/emperordesu/News-RSS-2609">GitHub Actions</a>로 운영됩니다.</p>
</footer>
<script>
(function () {
  var PERIODS = {
    '7d': { ms: 7 * 24 * 60 * 60 * 1000 },
    '30d': { ms: 30 * 24 * 60 * 60 * 1000 }
  };

  function applyFilter(periodKey) {
    var period = PERIODS[periodKey];
    if (!period) return;
    var cutoff = Date.now() - period.ms;

    document.querySelectorAll('.article-card').forEach(function (card) {
      var t = new Date(card.getAttribute('data-pubdate')).getTime();
      card.hidden = !(!isNaN(t) && t >= cutoff);
    });

    document.querySelectorAll('.source-section').forEach(function (section) {
      section.hidden = !section.querySelector('.article-card:not([hidden])');
    });

    var anyNavLinkVisible = false;
    document.querySelectorAll('.source-nav a').forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace('#', '');
      var section = id ? document.getElementById(id) : null;
      var show = !!section && !section.hidden;
      a.hidden = !show;
      if (show) anyNavLinkVisible = true;
    });
    var sourceNavEl = document.getElementById('source-nav');
    if (sourceNavEl) sourceNavEl.hidden = !anyNavLinkVisible;

    var noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.hidden = !!document.querySelector('.source-section:not([hidden])');
    }

    document.querySelectorAll('.period-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-period') === periodKey);
    });
  }

  document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyFilter(btn.getAttribute('data-period')); });
  });

  applyFilter('7d');
})();
</script>
<script>
(function () {
  var carousel = document.getElementById('hero-carousel');
  if (!carousel) return;

  var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
  var dots = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-dot'));
  var total = slides.length;
  var DURATION = 5000;
  var current = 0;
  var timer = null;

  function show(index) {
    current = (index + total) % total;
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === current);
      var fill = d.querySelector('.carousel-dot-fill');
      if (!fill) return;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.animation = i === current ? 'carousel-progress ' + DURATION + 'ms linear forwards' : 'none';
    });
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function startTimer() {
    stopTimer();
    if (total > 1) timer = setInterval(next, DURATION);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { show(i); startTimer(); });
  });

  var prevBtn = carousel.querySelector('.carousel-prev');
  var nextBtn = carousel.querySelector('.carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startTimer(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { next(); startTimer(); });

  carousel.addEventListener('mouseenter', stopTimer);
  carousel.addEventListener('mouseleave', startTimer);

  show(0);
  startTimer();
})();
</script>
<script>
(function () {
  var form = document.getElementById('search-form');
  var input = document.getElementById('search-input');
  var clearBtn = document.getElementById('search-clear');
  var resultsBox = document.getElementById('search-results');
  var answerBox = document.getElementById('search-answer');
  var answerText = document.getElementById('search-answer-text');
  var cardsBox = document.getElementById('search-cards');
  if (!form || !input) return;

  var debounceTimer = null;
  var DEBOUNCE_MS = 500;

  function clientFallbackSearch(query) {
    var q = query.toLowerCase();
    var matches = [];
    document.querySelectorAll('.article-card').forEach(function (card) {
      var h3 = card.querySelector('h3');
      var title = h3 ? h3.textContent : '';
      if (title.toLowerCase().indexOf(q) !== -1) {
        var thumbEl = card.querySelector('.thumb img');
        matches.push({
          title: title,
          link: card.getAttribute('href'),
          image: thumbEl ? thumbEl.getAttribute('src') : null,
        });
      }
    });
    return matches.slice(0, 8);
  }

  function renderResultCard(item) {
    var a = document.createElement('a');
    a.className = 'article-card';
    a.href = item.link;
    a.target = '_blank';
    a.rel = 'noopener';

    var thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.style.background = '#8A8172';
    var fallback = document.createElement('span');
    fallback.className = 'thumb-fallback';
    fallback.textContent = item.source ? item.source.slice(0, 2) : '';
    thumb.appendChild(fallback);
    if (item.image) {
      var img = document.createElement('img');
      img.src = item.image;
      img.loading = 'lazy';
      img.onerror = function () { img.remove(); };
      thumb.appendChild(img);
    }

    var body = document.createElement('div');
    body.className = 'article-body';
    var h3 = document.createElement('h3');
    h3.textContent = item.title;
    body.appendChild(h3);

    a.appendChild(thumb);
    a.appendChild(body);
    return a;
  }

  function showResults(answer, items) {
    cardsBox.innerHTML = '';
    if (answer) {
      answerText.textContent = answer;
      answerBox.hidden = false;
    } else {
      answerBox.hidden = true;
    }
    if (items.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'section-empty';
      empty.textContent = '관련 기사를 찾지 못했습니다.';
      cardsBox.appendChild(empty);
    } else {
      items.forEach(function (item) { cardsBox.appendChild(renderResultCard(item)); });
    }
    resultsBox.hidden = false;
    clearBtn.hidden = false;
  }

  function runSearch(query) {
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then(function (data) {
        if (data && data.fallback) {
          showResults('', clientFallbackSearch(query));
        } else {
          showResults((data && data.answer) || '', (data && data.results) || []);
        }
      })
      .catch(function () {
        showResults('', clientFallbackSearch(query));
      });
  }

  function clearSearch() {
    input.value = '';
    resultsBox.hidden = true;
    clearBtn.hidden = true;
    clearTimeout(debounceTimer);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    clearTimeout(debounceTimer);
    runSearch(q);
  });

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = input.value.trim();
    if (!q) {
      resultsBox.hidden = true;
      clearBtn.hidden = true;
      return;
    }
    debounceTimer = setTimeout(function () { runSearch(q); }, DEBOUNCE_MS);
  });

  clearBtn.addEventListener('click', clearSearch);
})();
</script>
</body>
</html>
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');
}

module.exports = { generateSite };

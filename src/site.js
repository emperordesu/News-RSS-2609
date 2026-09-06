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

function renderSentimentRow(sentiment) {
  if (!sentiment) return '';
  const positive = sentiment.positive || 0;
  const neutral = sentiment.neutral || 0;
  const negative = sentiment.negative || 0;
  if (positive + neutral + negative === 0) return '';

  return `<div class="sentiment-row" aria-label="기사 감성 분포">
<span class="sentiment-chip sentiment-positive">긍정 ${positive}</span>
<span class="sentiment-chip sentiment-neutral">중립 ${neutral}</span>
<span class="sentiment-chip sentiment-negative">부정 ${negative}</span>
</div>`;
}

// 국가(한국/일본/영국)별로 섹션을 구성한다. 매칭되는 기사가 없는 국가는 섹션 자체를 숨긴다.
function renderSections(items, sectionSummaries = {}) {
  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  }

  const { order, map: countryFeeds } = groupFeedsByCountry();

  let sections = '';
  let sectionIndex = 0;
  const countriesWithData = [];

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

    countriesWithData.push(country);
    sectionIndex += 1;
    const sectionNum = String(sectionIndex).padStart(2, '0');
    const sectionId = `section-${sectionIndex}`;
    const summaryEntry = sectionSummaries[country];
    const summaryText = (summaryEntry && summaryEntry.text) || '요약을 준비 중입니다.';
    const sentimentHtml = renderSentimentRow(summaryEntry && summaryEntry.sentiment);
    const sorted = combined.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));

    sections += `<section class="source-section" id="${sectionId}" data-country="${escapeHtml(country)}">
<div class="section-heading">
<p class="section-label">SECTION ${sectionNum}</p>
<h2>${escapeHtml(country)}</h2>
<p class="section-desc"><strong>한 줄 요약 : </strong>${escapeHtml(summaryText)}</p>
${sentimentHtml}
</div>
<div class="card-grid">
${sorted.map((item) => renderCard(item)).join('\n')}
</div>
</section>
`;
  }

  return { sections, countriesWithData };
}

const PERIOD_OPTIONS = [
  ['30d', '30일'],
  ['15d', '15일'],
  ['7d', '7일'],
  ['24h', '24시간'],
];
const DEFAULT_PERIOD = '7d';

// 국가(다중 선택) + 기간(단일 선택) 필터 바. 기사가 있는 국가만 버튼으로 노출한다.
function renderFilterBar(countries) {
  if (countries.length === 0) return '';

  const countryBtns = countries
    .map((c) => `<button type="button" class="filter-btn country-btn active" data-country="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('\n');
  const periodBtns = PERIOD_OPTIONS.map(
    ([key, label]) =>
      `<button type="button" class="filter-btn period-btn${key === DEFAULT_PERIOD ? ' active' : ''}" data-period="${key}">${label}</button>`
  ).join('\n');

  return `<div class="filter-bar" id="filter-bar">
<div class="filter-group" role="group" aria-label="국가 필터">
<span class="filter-group-label">국가</span>
${countryBtns}
</div>
<div class="filter-group" role="group" aria-label="기간 필터">
<span class="filter-group-label">기간</span>
${periodBtns}
</div>
</div>`;
}

function generateSite(items, stocks = [], sectionSummaries = {}) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const hasLogo = copyLogoAsset();
  const updatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const { sections, countriesWithData } = renderSections(items, sectionSummaries);
  const filterBar = renderFilterBar(countriesWithData);
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
    --filter-active: #2F6FED;
    --filter-active-ink: #FFFFFF;
    --sentiment-positive: #2F7D5D;
    --sentiment-negative: #B5502A;
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

  .filter-bar {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 24px 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px 32px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-group-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-right: 2px;
  }

  .filter-btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-soft);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 16px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .filter-btn:hover { border-color: var(--filter-active); color: var(--filter-active); }
  .filter-btn.active {
    background: var(--filter-active);
    border-color: var(--filter-active);
    color: var(--filter-active-ink);
  }
  .filter-btn.active:hover { color: var(--filter-active-ink); }

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

  .sentiment-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 14px 0 0;
  }

  .sentiment-chip {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .sentiment-positive { background: rgba(47, 125, 93, 0.12); color: var(--sentiment-positive); }
  .sentiment-neutral { background: rgba(138, 129, 114, 0.14); color: var(--muted); }
  .sentiment-negative { background: rgba(181, 80, 42, 0.12); color: var(--sentiment-negative); }

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
    .filter-bar { padding: 16px 20px 4px; gap: 10px 20px; }
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
  </div>
</header>

<main>
${heroCarousel}

${tickerBar}

${filterBar}

  <div id="sections">
${sections || '<p class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;">현재 표시할 뉴스가 없습니다.</p>\n'}  <p id="no-results" class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;" hidden>선택한 조건에는 표시할 뉴스가 없습니다.</p>
  </div>
</main>

<footer class="site-footer">
  <p>마지막 업데이트: ${updatedAt} · 2시간마다 자동 갱신 · <a href="https://github.com/emperordesu/News-RSS-2609">GitHub Actions</a>로 운영됩니다.</p>
</footer>
<script>
(function () {
  var PERIOD_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '15d': 15 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  var countryBtns = Array.prototype.slice.call(document.querySelectorAll('.country-btn'));
  var periodBtns = Array.prototype.slice.call(document.querySelectorAll('.period-btn'));
  var selectedCountries = {};
  countryBtns.forEach(function (btn) {
    if (btn.classList.contains('active')) selectedCountries[btn.getAttribute('data-country')] = true;
  });
  var selectedPeriod = '7d';
  periodBtns.forEach(function (btn) {
    if (btn.classList.contains('active')) selectedPeriod = btn.getAttribute('data-period');
  });

  function applyFilters() {
    var cutoff = Date.now() - (PERIOD_MS[selectedPeriod] || PERIOD_MS['7d']);

    document.querySelectorAll('.source-section').forEach(function (section) {
      var country = section.getAttribute('data-country');
      if (!selectedCountries[country]) {
        section.hidden = true;
        return;
      }
      var anyVisible = false;
      section.querySelectorAll('.article-card').forEach(function (card) {
        var t = new Date(card.getAttribute('data-pubdate')).getTime();
        var show = !isNaN(t) && t >= cutoff;
        card.hidden = !show;
        if (show) anyVisible = true;
      });
      section.hidden = !anyVisible;
    });

    var noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.hidden = !!document.querySelector('.source-section:not([hidden])');
    }
  }

  countryBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var country = btn.getAttribute('data-country');
      if (selectedCountries[country]) {
        delete selectedCountries[country];
        btn.classList.remove('active');
      } else {
        selectedCountries[country] = true;
        btn.classList.add('active');
      }
      applyFilters();
    });
  });

  periodBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedPeriod = btn.getAttribute('data-period');
      periodBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      applyFilters();
    });
  });

  applyFilters();
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
</body>
</html>
`;

  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html, 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');
}

module.exports = { generateSite };

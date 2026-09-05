const fs = require('fs');
const path = require('path');
const { FEEDS } = require('./config');
const { buildBriefing, STOPWORDS_LIST } = require('./briefing');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const ASSETS_SRC_DIR = path.join(__dirname, '..', 'assets');
const LOGO_FILENAME = 'hyundai-motor-group-logo.svg';
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

function renderStockCard(stock) {
  const arrow = DIRECTION_ARROW[stock.direction] || '－';
  const changeAbs = Math.abs(stock.change).toLocaleString('ko-KR');
  const percentAbs = Math.abs(stock.percent).toFixed(2);
  const statusLabel = stock.isMarketClosed ? '전일 종가 기준' : stock.status ? '장중' : '';

  return `<div class="stock-card stock-${stock.direction}">
<div class="stock-head">
<span class="stock-name">${escapeHtml(stock.name)}</span>
<span class="stock-code">${escapeHtml(stock.code)}</span>
</div>
<div class="stock-price">${stock.price.toLocaleString('ko-KR')}<span class="stock-won">원</span></div>
<div class="stock-change">${arrow} ${changeAbs} <span class="stock-percent">(${percentAbs}%)</span></div>
${statusLabel ? `<div class="stock-status">${escapeHtml(statusLabel)}</div>` : ''}
</div>`;
}

// 히어로 바로 아래에 배치되는 현대차/기아/현대모비스 시세 위젯. 데이터가 없으면 렌더링하지 않는다.
function renderMarketWidget(stocks) {
  if (!stocks || stocks.length === 0) return '';

  const updatedAt = stocks
    .map((s) => s.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : '';

  return `<section class="market-widget" aria-label="현대차·기아·현대모비스 시세">
<div class="market-inner">
<p class="eyebrow"><span class="dot"></span>오늘의 시황${updatedLabel ? ` · ${escapeHtml(updatedLabel)} 갱신` : ''}</p>
<div class="stock-grid">
${stocks.map((s) => renderStockCard(s)).join('\n')}
</div>
</div>
</section>`;
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
<span class="carousel-source">${escapeHtml(item.source)}</span>
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

function groupFeedsByCountry() {
  const order = [];
  const map = new Map();
  for (const feed of FEEDS) {
    if (!map.has(feed.country)) {
      map.set(feed.country, []);
      order.push(feed.country);
    }
    map.get(feed.country).push(feed);
  }
  return { order, map };
}

// 국가(한국/일본/영국)별로 섹션을 구성한다. 매칭되는 기사가 없는 국가는 섹션 자체를 숨긴다.
function renderSections(items) {
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
    const description = [...new Set(feeds.map((f) => f.description))].join(' · ');
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

function generateSite(items, stocks = []) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const hasLogo = copyLogoAsset();
  const updatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const briefing = buildBriefing(items);
  const { sourceNav, sections } = renderSections(items);
  const marketWidget = renderMarketWidget(stocks);
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
  .logo img { display: block; height: 22px; width: auto; }

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

  .carousel-source {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.16);
    padding: 5px 12px;
    border-radius: 999px;
    margin-bottom: 12px;
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

  .hero {
    position: relative;
    overflow: hidden;
    padding: 68px 24px 50px;
  }

  .hero-decor { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .hero-decor circle { fill: none; stroke: var(--accent); opacity: 0.16; }

  .hero-inner { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    text-transform: uppercase;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--ink);
  }

  .eyebrow .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .hero h1 {
    font-size: clamp(22px, 3vw, 34px);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    margin: 0 0 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hero-paragraph {
    font-size: 15px;
    font-weight: 450;
    line-height: 1.65;
    color: var(--ink-soft);
    max-width: 580px;
    margin: 0 0 10px;
  }

  .hero-meta {
    font-size: 12px;
    color: var(--muted);
    margin: 0 0 24px;
  }

  .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 14px 28px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .btn-primary { background: var(--ink); color: var(--canvas); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(28, 26, 23, 0.2); }

  .btn-outline { background: transparent; color: var(--ink); border: 1.5px solid var(--ink); }
  .btn-outline:hover { background: var(--ink); color: var(--canvas); }

  .market-widget { padding: 0 24px 56px; }

  .market-inner { max-width: 1100px; margin: 0 auto; }

  .stock-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stock-card {
    font-family: -apple-system, BlinkMacSystemFont, "system-ui", "Segoe UI", "Malgun Gothic", sans-serif;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 16px;
    border: 1px solid var(--border);
  }

  .stock-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .stock-name { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); }
  .stock-code { font-size: 11px; color: var(--muted); }

  .stock-price {
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }
  .stock-price .stock-won { font-size: 12px; font-weight: 500; color: var(--muted); margin-left: 2px; }

  .stock-change { font-size: 12.5px; font-weight: 600; color: var(--muted); white-space: nowrap; }
  .stock-change .stock-percent { font-weight: 500; }
  .stock-up .stock-change { color: #B3554F; }
  .stock-down .stock-change { color: #3E6DA6; }

  .stock-status { margin-top: 6px; font-size: 10.5px; color: var(--muted); }

  .source-nav {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px 56px;
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
    padding: 48px 24px 32px;
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
    .hero { padding: 44px 20px 36px; }
    .hero h1 { white-space: normal; font-size: clamp(20px, 6vw, 26px); }
    .market-widget { padding: 0 20px 40px; }
    .stock-grid { grid-template-columns: 1fr; }
    .section-heading h2 { font-size: 24px; }
    .card-grid { grid-template-columns: 1fr; }
    .site-footer { margin: 48px 16px 32px; padding: 36px 24px; }
  }
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <div class="logo">${hasLogo ? '<img src="assets/hyundai-motor-group-logo.svg" alt="Hyundai Motor Group">' : '현대차·기아 뉴스'}</div>
    <div class="period-filter" role="group" aria-label="기간 필터">
      <button type="button" class="period-btn active" data-period="24h">24시간</button>
      <button type="button" class="period-btn" data-period="7d">7일</button>
      <button type="button" class="period-btn" data-period="30d">30일</button>
    </div>
  </div>
</header>

<main>
${heroCarousel}

  <section class="hero" id="briefing">
    <div class="hero-decor" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <circle cx="88%" cy="10%" r="220" stroke-width="1.5"></circle>
        <circle cx="94%" cy="30%" r="140" stroke-width="1.5"></circle>
      </svg>
    </div>
    <div class="hero-inner">
      <p class="eyebrow" id="hero-eyebrow"><span class="dot"></span>${escapeHtml(briefing.eyebrow)}</p>
      <h1 id="hero-headline">${escapeHtml(briefing.headline)}</h1>
      <p class="hero-paragraph" id="hero-paragraph">${escapeHtml(briefing.paragraph)}</p>
      <p class="hero-meta">마지막 업데이트: ${updatedAt} · 2시간마다 자동 갱신</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#sections">전체 기사 보기</a>
      </div>
    </div>
  </section>

${marketWidget}

${sourceNav ? `  <nav class="source-nav" id="source-nav">\n${sourceNav}  </nav>\n` : ''}
  <div id="sections">
${sections || '<p class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;">현재 표시할 뉴스가 없습니다.</p>\n'}  <p id="no-results" class="section-empty" style="max-width:1100px;margin:0 auto;padding:0 24px 48px;" hidden>선택한 기간에는 표시할 뉴스가 없습니다.</p>
  </div>
</main>

<footer class="site-footer">
  <p>2시간마다 자동 갱신 · <a href="https://github.com/emperordesu/News-RSS-2609">GitHub Actions</a>로 운영됩니다.</p>
</footer>
<script>
(function () {
  var STOPWORDS = new Set(${JSON.stringify(STOPWORDS_LIST.map((w) => w.toLowerCase()))});
  var PERIODS = {
    '24h': { ms: 24 * 60 * 60 * 1000, label: '24시간' },
    '7d': { ms: 7 * 24 * 60 * 60 * 1000, label: '7일' },
    '30d': { ms: 30 * 24 * 60 * 60 * 1000, label: '30일' }
  };
  var PUNCTUATION_RE = /[[\\]()'"“”‘’…!?.,·]/g;

  function tokenize(title) {
    return (title || '')
      .replace(PUNCTUATION_RE, ' ')
      .split(/\\s+/)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length >= 2; });
  }

  function topKeywords(titles, limit) {
    var freq = {};
    titles.slice(0, 30).forEach(function (title) {
      tokenize(title).forEach(function (token) {
        var key = token.toLowerCase();
        if (STOPWORDS.has(key)) return;
        freq[token] = (freq[token] || 0) + 1;
      });
    });
    return Object.keys(freq)
      .sort(function (a, b) { return freq[b] - freq[a]; })
      .slice(0, limit || 3);
  }

  function buildBriefing(cards, periodLabel) {
    if (cards.length === 0) {
      return { headline: '해당 기간에는 소식이 없습니다', paragraph: '다른 기간을 선택해 보세요.' };
    }
    var sorted = cards.slice().sort(function (a, b) { return b.time - a.time; });
    var latest = sorted[0];
    var keywords = topKeywords(sorted.map(function (c) { return c.title; }));
    var otherCount = sorted.length - 1;
    var paragraph = keywords.length > 0
      ? "최신 소식은 '" + latest.title + "'" + (otherCount > 0 ? ' 외 ' + otherCount + '건' : '') + "이며, '" + keywords.join("', '") + "' 키워드가 자주 언급되고 있습니다."
      : "최신 소식은 '" + latest.title + "' 입니다.";
    return {
      headline: '현대차·기아, 최근 ' + periodLabel + ' ' + sorted.length + '건의 소식',
      paragraph: paragraph
    };
  }

  function applyFilter(periodKey) {
    var period = PERIODS[periodKey];
    if (!period) return;
    var cutoff = Date.now() - period.ms;
    var visibleCards = [];

    document.querySelectorAll('.article-card').forEach(function (card) {
      var t = new Date(card.getAttribute('data-pubdate')).getTime();
      var visible = !isNaN(t) && t >= cutoff;
      card.hidden = !visible;
      if (visible) {
        var h3 = card.querySelector('h3');
        visibleCards.push({ title: h3 ? h3.textContent : '', time: t });
      }
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

    var briefing = buildBriefing(visibleCards, period.label);
    var headlineEl = document.getElementById('hero-headline');
    var paragraphEl = document.getElementById('hero-paragraph');
    if (headlineEl) headlineEl.textContent = briefing.headline;
    if (paragraphEl) paragraphEl.textContent = briefing.paragraph;

    document.querySelectorAll('.period-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-period') === periodKey);
    });
  }

  document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyFilter(btn.getAttribute('data-period')); });
  });

  applyFilter('24h');
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

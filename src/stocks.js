const STOCKS = [
  { code: '005380', name: '현대차' },
  { code: '000270', name: '기아' },
  { code: '012330', name: '현대모비스' },
];

const STOCK_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

// 네이버 증권 종목 페이지 상단의 스크린리더용 요약 블록(<dl class="blind">)에서 시세를 파싱한다.
// 예: "현재가 383,500 전일대비 보합 0 0.00 퍼센트"
const QUOTE_RE =
  /<dl class="blind">\s*<dt>종목 시세 정보<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<dd>종목명\s*([^<]+?)\s*<\/dd>\s*<dd>종목코드\s*(\d+)\s*([^<]*?)<\/dd>\s*<dd>현재가\s*([\d,]+)\s*전일대비\s*(상승|하락|보합)\s*([\d,]+)\s*([\s\S]*?)([\d.]+)\s*퍼센트\s*<\/dd>/;

const DIRECTION_MAP = { 상승: 'up', 하락: 'down', 보합: 'flat' };

function clean(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function parseQuoteHtml(html) {
  const match = QUOTE_RE.exec(html);
  if (!match) return null;

  const [, statusRaw, name, code, market, priceRaw, directionRaw, changeRaw, , percentRaw] = match;
  const status = clean(statusRaw);
  const direction = DIRECTION_MAP[directionRaw] || 'flat';

  return {
    code,
    name: clean(name),
    market: clean(market),
    price: Number(priceRaw.replace(/,/g, '')),
    change: Number(changeRaw.replace(/,/g, '')) * (direction === 'down' ? -1 : 1),
    percent: Number(percentRaw) * (direction === 'down' ? -1 : 1),
    direction,
    status,
    isMarketClosed: status.includes('장마감'),
  };
}

async function fetchStock(stock) {
  const url = `https://finance.naver.com/item/main.naver?code=${stock.code}`;
  const res = await fetch(url, { headers: STOCK_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const parsed = parseQuoteHtml(html);
  if (!parsed) throw new Error('시세 정보를 찾을 수 없음 (페이지 구조 변경 가능성)');
  return { ...parsed, name: stock.name, updatedAt: new Date().toISOString() };
}

// 개별 종목 수집 실패 시 조용히 로그만 남기고 이전 값(previous)을 유지한다.
async function fetchAllStocks(previous = []) {
  const previousByCode = new Map(previous.map((s) => [s.code, s]));

  const results = await Promise.all(
    STOCKS.map(async (stock) => {
      try {
        return await fetchStock(stock);
      } catch (err) {
        console.error(`[주식] ${stock.name}(${stock.code}) 수집 실패: ${err.message}`);
        return previousByCode.get(stock.code) || null;
      }
    })
  );

  return results.filter(Boolean);
}

module.exports = { STOCKS, fetchAllStocks, parseQuoteHtml };

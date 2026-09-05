const { fetchAllStocks } = require('../src/stocks');
const { loadStocks, saveStocks } = require('../src/stockStore');
const { loadAll } = require('../src/store');
const { generateSite } = require('../src/site');

async function main() {
  console.log(`[주식 수집 시작] ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  const previous = loadStocks();
  const stocks = await fetchAllStocks(previous);
  saveStocks(stocks);

  for (const stock of stocks) {
    console.log(`  [${stock.name}] ${stock.price.toLocaleString('ko-KR')}원 (${stock.direction}, ${stock.percent}%)`);
  }

  generateSite(loadAll(), stocks);
  console.log('docs/index.html 갱신 완료 (주식 시세 반영)');
}

main().catch((err) => {
  console.error('[주식 수집 오류]', err);
  process.exit(1);
});

const { FEEDS } = require('../src/config');
const { fetchAllFeeds } = require('../src/rss');
const { addNewItems, loadAll } = require('../src/store');
const { generateSite } = require('../src/site');
const { filterItems } = require('../src/filter');

async function main() {
  console.log(`[수집 시작] ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  const fetched = await fetchAllFeeds(FEEDS);
  const filtered = filterItems(fetched);
  const added = addNewItems(filtered);

  if (added.length === 0) {
    console.log('새 뉴스가 없습니다.');
  } else {
    console.log(`새 뉴스 ${added.length}건:`);
    for (const item of added) {
      console.log(`  [${item.source}] ${item.title}`);
    }
  }

  generateSite(loadAll());
  console.log('docs/index.html 갱신 완료');
}

main().catch((err) => {
  console.error('[수집 오류]', err);
  process.exit(1);
});

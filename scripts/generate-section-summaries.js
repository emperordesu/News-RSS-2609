const { loadAll } = require('../src/store');
const { loadStocks } = require('../src/stockStore');
const { loadSectionSummaries, saveSectionSummaries } = require('../src/sectionSummaryStore');
const { groupFeedsByCountry } = require('../src/countryGroups');
const { summarizeCountryTitles } = require('../src/openrouter');
const { generateSite } = require('../src/site');

const MAX_TITLES = 30;

async function main() {
  console.log(`[섹션 요약 생성] ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[섹션 요약] OPENROUTER_API_KEY가 없어 건너뜁니다. 기존 요약/고정 문구를 그대로 사용합니다.');
    return;
  }

  const items = loadAll();
  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  }

  const { order, map: countryFeeds } = groupFeedsByCountry();
  const summaries = loadSectionSummaries();

  for (const country of order) {
    const feeds = countryFeeds.get(country);
    const combined = feeds.flatMap((feed) => bySource.get(feed.name) || []);

    if (combined.length === 0) {
      console.log(`  [${country}] 기사 없음, 건너뜀`);
      continue;
    }

    const titles = combined
      .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt))
      .slice(0, MAX_TITLES)
      .map((i) => i.title);

    try {
      const text = await summarizeCountryTitles(country, titles);
      summaries[country] = { text, updatedAt: new Date().toISOString(), articleCount: combined.length };
      console.log(`  [${country}] ${text}`);
    } catch (err) {
      console.error(`  [${country}] 생성 실패: ${err.message} (이전 값 또는 고정 문구로 대체됨)`);
    }
  }

  saveSectionSummaries(summaries);
  generateSite(loadAll(), loadStocks(), summaries);
  console.log('docs/index.html 갱신 완료 (섹션 요약 반영)');
}

main().catch((err) => {
  console.error('[섹션 요약 오류]', err);
  process.exit(1);
});

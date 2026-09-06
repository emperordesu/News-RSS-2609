const { loadAll, saveAll } = require('../src/store');
const { loadStocks } = require('../src/stockStore');
const { loadSectionSummaries, saveSectionSummaries } = require('../src/sectionSummaryStore');
const { groupFeedsByCountry } = require('../src/countryGroups');
const { summarizeCountryTitles, classifyCountrySentiment } = require('../src/openrouter');
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

    const topItems = combined.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt)).slice(0, MAX_TITLES);
    const titles = topItems.map((i) => i.title);

    const previous = summaries[country] || {};

    try {
      const text = await summarizeCountryTitles(country, titles);
      summaries[country] = { ...previous, text, updatedAt: new Date().toISOString(), articleCount: combined.length };
      console.log(`  [${country}] ${text}`);
    } catch (err) {
      console.error(`  [${country}] 요약 생성 실패: ${err.message} (이전 값 또는 고정 문구로 대체됨)`);
    }

    try {
      const labels = await classifyCountrySentiment(country, titles);
      topItems.forEach((item, i) => { item.sentiment = labels[i]; });
      const sentiment = { positive: 0, neutral: 0, negative: 0 };
      for (const label of labels) sentiment[label] += 1;
      summaries[country] = { ...summaries[country], sentiment };
      console.log(`  [${country}] 감성: 긍정 ${sentiment.positive} · 중립 ${sentiment.neutral} · 부정 ${sentiment.negative}`);
    } catch (err) {
      console.error(`  [${country}] 감성 분석 실패: ${err.message} (이전 값 유지)`);
    }
  }

  saveSectionSummaries(summaries);
  saveAll(items);
  generateSite(loadAll(), loadStocks(), summaries);
  console.log('docs/index.html 갱신 완료 (섹션 요약·감성 반영)');
}

main().catch((err) => {
  console.error('[섹션 요약 오류]', err);
  process.exit(1);
});

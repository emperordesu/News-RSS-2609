const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map((item) => ({
      source: feed.name,
      title: (item.title || '').trim(),
      link: item.link || item.guid || '',
      pubDate: item.isoDate || item.pubDate || null,
    }));
  } catch (err) {
    console.error(`[RSS] ${feed.name} 수집 실패: ${err.message}`);
    return [];
  }
}

async function fetchAllFeeds(feeds) {
  const results = await Promise.all(feeds.map(fetchFeed));
  return results.flat().filter((item) => item.link && item.title);
}

module.exports = { fetchAllFeeds };

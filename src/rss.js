const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['description', 'descriptionRaw'],
    ],
  },
});

const SUMMARY_MAX_LENGTH = 100;

function firstImgSrc(html) {
  if (!html) return null;
  const match = /<img[^>]+src=["']([^"'>]+)["']/i.exec(html);
  return match ? match[1] : null;
}

function firstMediaUrl(field) {
  if (!field) return null;
  const list = Array.isArray(field) ? field : [field];
  for (const entry of list) {
    const url = entry && entry.$ && entry.$.url;
    if (url) return url;
  }
  return null;
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.url && (!item.enclosure.type || item.enclosure.type.startsWith('image'))) {
    return item.enclosure.url;
  }
  return (
    firstMediaUrl(item.mediaContent) ||
    firstMediaUrl(item.mediaThumbnail) ||
    firstImgSrc(item.contentEncoded) ||
    firstImgSrc(item.content) ||
    firstImgSrc(item.descriptionRaw) ||
    null
  );
}

const HTML_ENTITIES = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  middot: '·',
  bull: '•',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  laquo: '«',
  raquo: '»',
  times: '×',
};

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, maxLength = SUMMARY_MAX_LENGTH) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

function extractSummary(item) {
  const raw = item.contentEncoded || item.descriptionRaw || item.content || item.summary || '';
  return truncate(stripHtml(raw));
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).map((item) => ({
      source: feed.name,
      title: (item.title || '').trim(),
      link: item.link || item.guid || '',
      pubDate: item.isoDate || item.pubDate || null,
      image: extractImage(item),
      summary: extractSummary(item),
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

const { KEYWORDS } = require('./config');

const STOPWORDS_LIST = [
  ...KEYWORDS,
  '및',
  '관련',
  '위해',
  '대한',
  '에서',
  '으로',
  '한다',
  '했다',
  '있다',
  '기자',
  '종합',
  '것으로',
  '대해',
  '통해',
  '오늘',
  '최근',
  '발표',
  '이번',
];

const STOPWORDS = new Set(STOPWORDS_LIST.map((w) => w.toLowerCase()));

const PUNCTUATION_RE = /[[\]()'"“”‘’…!?.,·]/g;

function tokenize(title) {
  return (title || '')
    .replace(PUNCTUATION_RE, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function topKeywords(items, limit = 3) {
  const freq = new Map();
  for (const item of items) {
    for (const token of tokenize(item.title)) {
      if (STOPWORDS.has(token.toLowerCase())) continue;
      freq.set(token, (freq.get(token) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function todayLabel() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()).replace(/-/g, '.');
}

function buildBriefing(items) {
  if (items.length === 0) {
    return {
      eyebrow: `${todayLabel()} 브리핑`,
      headline: '아직 수집된 소식이 없습니다',
      paragraph: '곧 첫 수집이 진행되면 이 자리에 오늘의 요약이 표시됩니다.',
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const recent = items.filter((i) => Date.now() - new Date(i.fetchedAt).getTime() <= dayMs);
  const pool = recent.length > 0 ? recent : items;
  const sorted = [...pool].sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));

  const latest = sorted[0];
  const keywords = topKeywords(sorted.slice(0, 30));
  const otherCount = sorted.length - 1;

  const paragraph =
    keywords.length > 0
      ? `최신 소식은 '${latest.title}'${otherCount > 0 ? ` 외 ${otherCount}건` : ''}이며, '${keywords.join("', '")}' 키워드가 자주 언급되고 있습니다.`
      : `최신 소식은 '${latest.title}' 입니다.`;

  return {
    eyebrow: `${todayLabel()} 브리핑`,
    headline: `현대차·기아, 최근 24시간 ${sorted.length}건의 소식`,
    paragraph,
  };
}

module.exports = { buildBriefing, STOPWORDS_LIST };

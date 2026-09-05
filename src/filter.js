const { KEYWORDS } = require('./config');

const lowerKeywords = KEYWORDS.map((k) => k.toLowerCase());

function matchesKeywords(title) {
  const lowerTitle = (title || '').toLowerCase();
  return lowerKeywords.some((k) => lowerTitle.includes(k));
}

function filterItems(items) {
  return items.filter((item) => matchesKeywords(item.title));
}

module.exports = { filterItems, matchesKeywords };

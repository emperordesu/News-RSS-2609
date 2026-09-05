const { FEEDS } = require('./config');

// FEEDS를 country 필드 기준으로 묶는다. 순서는 FEEDS 배열에서 각 country가 처음 등장한 순서를 따른다.
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

module.exports = { groupFeedsByCountry };

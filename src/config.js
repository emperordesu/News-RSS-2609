const FEEDS = [
  { name: '모터그래프', url: 'https://www.motorgraph.com/rss/allArticle.xml' },
  { name: '오토헤럴드', url: 'https://www.autoherald.co.kr/rss/allArticle.xml' },
  { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
  { name: 'Car Watch (JP)', url: 'http://car.watch.impress.co.jp/docs/car.rdf' },
  { name: 'Auto Car (UK)', url: 'https://www.autocar.co.uk/rss' },
];

// 데이터 파일에 보관할 기간 (일)
const RETENTION_DAYS = 7;

module.exports = { FEEDS, RETENTION_DAYS };

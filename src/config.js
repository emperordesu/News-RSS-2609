const FEEDS = [
  {
    name: '오토헤럴드',
    url: 'https://www.autoherald.co.kr/rss/allArticle.xml',
    country: '한국',
    description: '산업·리뷰·트렌드를 폭넓게 다루는 자동차 전문지',
    color: '#8FA37E',
    initials: '오토',
  },
  {
    name: 'Car Watch (JP)',
    url: 'http://car.watch.impress.co.jp/docs/car.rdf',
    country: '일본',
    description: '일본 자동차 전문지가 전하는 현지 동향',
    color: '#BD7F5E',
    initials: 'CW',
  },
  {
    name: 'くるまのニュース',
    url: 'https://kuruma-news.jp/feed',
    country: '일본',
    description: '일본 자동차 전문지가 전하는 현지 동향',
    color: '#C79A45',
    initials: 'KN',
  },
  {
    name: 'レスポンス',
    url: 'https://response.jp/rss/index.rdf',
    country: '일본',
    description: '일본 자동차 전문지가 전하는 현지 동향',
    color: '#5E8FBD',
    initials: 'RP',
  },
  {
    name: 'Auto Car (UK)',
    url: 'https://www.autocar.co.uk/rss',
    country: '영국',
    description: '영국 자동차 전문지가 전하는 글로벌 동향',
    color: '#9A8AAE',
    initials: 'AC',
  },
];

// 데이터 파일에 보관할 기간 (일)
const RETENTION_DAYS = 7;

// 제목에 아래 키워드 중 하나라도 포함된 기사만 수집한다 (대소문자 구분 없음)
const KEYWORDS = [
  '현대차그룹',
  '현대자동차',
  '현대차',
  '기아자동차',
  '기아차',
  '기아',
  'Hyundai',
  'Kia',
  'HMG',
];

module.exports = { FEEDS, RETENTION_DAYS, KEYWORDS };

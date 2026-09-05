const FEEDS = [
  {
    name: '모터그래프',
    url: 'https://www.motorgraph.com/rss/allArticle.xml',
    description: '국내 자동차 전문 매체가 전하는 최신 소식',
    color: '#D99A4E',
    initials: '모터',
  },
  {
    name: '오토헤럴드',
    url: 'https://www.autoherald.co.kr/rss/allArticle.xml',
    description: '산업·리뷰·트렌드를 폭넓게 다루는 자동차 전문지',
    color: '#8FA37E',
    initials: '오토',
  },
  {
    name: '연합뉴스',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    description: '경제·산업 관점에서 본 현대차·기아 소식',
    color: '#7C97AD',
    initials: '연합',
  },
  {
    name: 'Car Watch (JP)',
    url: 'http://car.watch.impress.co.jp/docs/car.rdf',
    description: '일본 자동차 전문지가 전하는 해외 동향',
    color: '#BD7F5E',
    initials: 'CW',
  },
  {
    name: 'Auto Car (UK)',
    url: 'https://www.autocar.co.uk/rss',
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

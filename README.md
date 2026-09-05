# News RSS

자동차 RSS 뉴스를 2시간마다 수집해 GitHub Pages로 보여주고, 매일 오전 9시(KST)에 Discord로 요약을 전송하는 자동화입니다. GitHub Actions에서 실행되므로 개인 PC를 켜둘 필요가 없습니다.

## 구성

- `src/config.js` — 수집할 RSS 피드 목록(이름/URL/설명/색상/이니셜) 및 키워드 필터
- `src/rss.js` — RSS 파싱 + 썸네일(enclosure/media:content/media:thumbnail/본문 첫 이미지) 및 요약(본문 100자 요약) 추출
- `src/briefing.js` — 최근 24시간 수집분 기준으로 "오늘의 요약" 헤드라인 생성(최신 기사 + 자주 언급된 키워드)
- `src/site.js` — 웜 크림 톤 디자인의 `docs/index.html` 생성(히어로 요약, 국가별 카드 그리드). 매칭 기사가 없는 국가 섹션은 화면에서 숨김
- `src/stocks.js` — 네이버 증권 시세 페이지(HTML)에서 현재가/전일대비/등락률을 정규식으로 파싱
- `scripts/collect.js` — 피드 수집 → `data/news.json`에 누적 저장 → `docs/index.html` 생성
- `scripts/collect-stocks.js` — 현대차·기아·현대모비스 시세 수집 → `data/stocks.json` 저장 → `docs/index.html` 재생성
- `scripts/summary.js` — 최근 24시간 뉴스를 Discord Webhook으로 전송
- `.github/workflows/collect-news.yml` — 2시간마다 뉴스+시세 수집 실행 후 결과 커밋
- `.github/workflows/daily-summary.yml` — 매일 09:00(KST)에 Discord 요약 전송

## 최초 설정 (1회)

1. **GitHub Pages 활성화**: 저장소 Settings → Pages → Build and deployment → Source를 `Deploy from a branch`로, Branch를 `main` / `docs` 폴더로 설정합니다. 저장 후 몇 분 뒤 `https://<계정>.github.io/News-RSS-2609/`에서 뉴스 목록을 볼 수 있습니다.
2. **Discord Webhook Secret**: 저장소 Settings → Secrets and variables → Actions에 `DISCORD_WEBHOOK_URL` 이름으로 이미 등록되어 있습니다. (변경 시 같은 이름으로 갱신)
3. 워크플로우는 저장소에 push되는 즉시 예약(cron)대로 자동 실행됩니다. 바로 테스트하려면 Actions 탭 → 각 워크플로우 → "Run workflow"로 수동 실행할 수 있습니다.

## 로컬 테스트

```bash
npm install
npm run collect          # RSS 수집 + docs/index.html 갱신
npm run collect-stocks   # 현대차·기아·현대모비스 시세 수집 + docs/index.html 갱신
DISCORD_WEBHOOK_URL=발급받은주소 npm run summary   # Discord 요약 전송 테스트
```

## 뉴스 소스 추가/변경

`src/config.js`의 `FEEDS` 배열에 `{ name, url, country, description, color, initials }` 형태로 추가하면 됩니다. `country`가 같은 피드는 하나의 섹션(한국/일본/영국)으로 묶여 표시되며, 해당 국가에 매칭되는 기사가 하나도 없으면 그 섹션은 화면에서 자동으로 숨겨집니다.

## 키워드 필터

`src/config.js`의 `KEYWORDS` 배열에 있는 단어가 제목에 하나라도 포함된 기사만 수집합니다 (현재: 현대차그룹/현대차/기아 관련). GitHub Pages와 Discord 요약 모두 이 필터가 적용된 결과만 보여줍니다. 필터를 없애려면 `src/filter.js`의 `filterItems` 호출을 `scripts/collect.js`에서 제거하면 됩니다.

## 시황 위젯

히어로(오늘의 요약) 바로 아래에 현대차(005380)·기아(000270)·현대모비스(012330) 시세를 보여줍니다. 네이버 증권은 종목별 RSS를 제공하지 않아 시세 페이지의 스크린리더용 요약 블록(`<dl class="blind">…</dl>`)을 정규식으로 파싱합니다(`src/stocks.js`). 사이트 구조 변경 등으로 파싱에 실패하면 해당 종목은 `data/stocks.json`에 저장된 마지막 성공 값을 그대로 유지하고, 에러만 콘솔에 로그로 남깁니다. 장 마감 이후에는 카드 하단에 "전일 종가 기준" 라벨이 표시됩니다. 종목을 추가/변경하려면 `src/stocks.js`의 `STOCKS` 배열을 수정하세요.

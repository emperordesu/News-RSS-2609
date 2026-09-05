# News RSS

자동차 RSS 뉴스를 2시간마다 수집해 GitHub Pages로 보여주고, 매일 오전 9시(KST)에 Discord로 요약을 전송하는 자동화입니다. GitHub Actions에서 실행되므로 개인 PC를 켜둘 필요가 없습니다.

## 구성

- `src/config.js` — 수집할 RSS 피드 목록(이름/URL/설명/색상/이니셜) 및 키워드 필터
- `src/rss.js` — RSS 파싱 + 썸네일(enclosure/media:content/media:thumbnail/본문 첫 이미지) 및 요약(본문 100자 요약) 추출
- `src/briefing.js` — 최근 24시간 수집분 기준으로 "오늘의 요약" 헤드라인 생성(최신 기사 + 자주 언급된 키워드)
- `src/site.js` — 웜 크림 톤 디자인의 `docs/index.html` 생성(히어로 요약, 출처별 카드 그리드)
- `scripts/collect.js` — 피드 수집 → `data/news.json`에 누적 저장 → `docs/index.html` 생성
- `scripts/summary.js` — 최근 24시간 뉴스를 Discord Webhook으로 전송
- `.github/workflows/collect-news.yml` — 2시간마다 수집 실행 후 결과 커밋
- `.github/workflows/daily-summary.yml` — 매일 09:00(KST)에 Discord 요약 전송

## 최초 설정 (1회)

1. **GitHub Pages 활성화**: 저장소 Settings → Pages → Build and deployment → Source를 `Deploy from a branch`로, Branch를 `main` / `docs` 폴더로 설정합니다. 저장 후 몇 분 뒤 `https://<계정>.github.io/News-RSS-2609/`에서 뉴스 목록을 볼 수 있습니다.
2. **Discord Webhook Secret**: 저장소 Settings → Secrets and variables → Actions에 `DISCORD_WEBHOOK_URL` 이름으로 이미 등록되어 있습니다. (변경 시 같은 이름으로 갱신)
3. 워크플로우는 저장소에 push되는 즉시 예약(cron)대로 자동 실행됩니다. 바로 테스트하려면 Actions 탭 → 각 워크플로우 → "Run workflow"로 수동 실행할 수 있습니다.

## 로컬 테스트

```bash
npm install
npm run collect   # RSS 수집 + docs/index.html 갱신
DISCORD_WEBHOOK_URL=발급받은주소 npm run summary   # Discord 요약 전송 테스트
```

## 뉴스 소스 추가/변경

`src/config.js`의 `FEEDS` 배열에 `{ name, url }` 형태로 추가하면 됩니다.

## 키워드 필터

`src/config.js`의 `KEYWORDS` 배열에 있는 단어가 제목에 하나라도 포함된 기사만 수집합니다 (현재: 현대차그룹/현대차/기아 관련). GitHub Pages와 Discord 요약 모두 이 필터가 적용된 결과만 보여줍니다. 필터를 없애려면 `src/filter.js`의 `filterItems` 호출을 `scripts/collect.js`에서 제거하면 됩니다.

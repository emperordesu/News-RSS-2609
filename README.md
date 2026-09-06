# News RSS

자동차 RSS 뉴스를 2시간마다 수집해 GitHub Pages로 보여주고, 매일 오전 9시(KST)에 Discord로 요약을 전송하는 자동화입니다. GitHub Actions에서 실행되므로 개인 PC를 켜둘 필요가 없습니다.

## 구성

- `src/config.js` — 수집할 RSS 피드 목록(이름/URL/설명/색상/이니셜) 및 키워드 필터
- `src/rss.js` — RSS 파싱 + 썸네일(enclosure/media:content/media:thumbnail/본문 첫 이미지) 및 요약(본문 100자 요약) 추출
- `src/site.js` — 웜 크림 톤 디자인의 `docs/index.html` 생성(이미지 캐러셀, 시세 티커, 국가별 카드 그리드). 매칭 기사가 없는 국가 섹션은 화면에서 숨김
- `src/stocks.js` — 네이버 증권 시세 페이지(HTML)에서 현재가/전일대비/등락률을 정규식으로 파싱
- `src/countryGroups.js` — `FEEDS`를 `country` 기준으로 묶는 공용 로직(사이트 생성·섹션 요약 생성 스크립트가 공유)
- `src/openrouter.js` — OpenRouter Chat Completions API 호출 헬퍼(국가별 섹션 요약 생성에 사용)
- `scripts/collect.js` — 피드 수집 → `data/news.json`에 누적 저장 → `docs/index.html` 생성
- `scripts/collect-stocks.js` — 현대차·기아·현대모비스 시세 수집 → `data/stocks.json` 저장 → `docs/index.html` 재생성
- `scripts/generate-section-summaries.js` — 국가 그룹별 기사 제목을 OpenRouter에 보내 한 문장 요약 생성 → `data/section-summary.json` 저장 → `docs/index.html` 재생성
- `scripts/summary.js` — 최근 24시간 뉴스를 Discord Webhook으로 전송
- `.github/workflows/collect-news.yml` — 2시간마다 뉴스+시세+섹션 요약 수집 실행 후 결과 커밋
- `.github/workflows/daily-summary.yml` — 매일 09:00(KST)에 Discord 요약 전송

## 최초 설정 (1회)

1. **GitHub Pages 활성화**: 저장소 Settings → Pages → Build and deployment → Source를 `Deploy from a branch`로, Branch를 `main` / `docs` 폴더로 설정합니다. 저장 후 몇 분 뒤 `https://<계정>.github.io/News-RSS-2609/`에서 뉴스 목록을 볼 수 있습니다.
2. **Discord Webhook Secret**: 저장소 Settings → Secrets and variables → Actions에 `DISCORD_WEBHOOK_URL` 이름으로 이미 등록되어 있습니다. (변경 시 같은 이름으로 갱신)
3. **GitHub Actions OpenRouter Secret**: 같은 위치에 `OPENROUTER_API_KEY`가 이미 등록되어 있습니다(국가별 섹션 요약·감성 분석 생성용).
4. 워크플로우는 저장소에 push되는 즉시 예약(cron)대로 자동 실행됩니다. 바로 테스트하려면 Actions 탭 → 각 워크플로우 → "Run workflow"로 수동 실행할 수 있습니다.

## 로컬 테스트

```bash
npm install
npm run collect          # RSS 수집 + docs/index.html 갱신
npm run collect-stocks   # 현대차·기아·현대모비스 시세 수집 + docs/index.html 갱신
OPENROUTER_API_KEY=발급받은키 npm run generate-section-summaries   # 국가별 AI 요약 생성 + docs/index.html 갱신
DISCORD_WEBHOOK_URL=발급받은주소 npm run summary   # Discord 요약 전송 테스트
```

## 뉴스 소스 추가/변경

`src/config.js`의 `FEEDS` 배열에 `{ name, url, country, description, color, initials }` 형태로 추가하면 됩니다. `country`가 같은 피드는 하나의 섹션(한국/일본/영국)으로 묶여 표시되며, 해당 국가에 매칭되는 기사가 하나도 없으면 그 섹션은 화면에서 자동으로 숨겨집니다.

## 키워드 필터

`src/config.js`의 `KEYWORDS` 배열에 있는 단어가 제목에 하나라도 포함된 기사만 수집합니다 (현재: 현대차그룹/현대차/기아 관련). GitHub Pages와 Discord 요약 모두 이 필터가 적용된 결과만 보여줍니다. 필터를 없애려면 `src/filter.js`의 `filterItems` 호출을 `scripts/collect.js`에서 제거하면 됩니다.

## 시세 티커

상단바 오른쪽에 현대차(005380)·기아(000270)·현대모비스(012330)의 현재가·등락폭·등락률을 보여줍니다("▲ 종목명 현재가 (등락폭, 등락률%)" 형식, 상승 빨강/하락 파랑/보합 회색). 네이버 증권은 종목별 RSS를 제공하지 않아 시세 페이지의 스크린리더용 요약 블록(`<dl class="blind">…</dl>`)을 정규식으로 파싱합니다(`src/stocks.js`). 사이트 구조 변경 등으로 파싱에 실패하면 해당 종목은 `data/stocks.json`에 저장된 마지막 성공 값을 그대로 유지하고, 에러만 콘솔에 로그로 남깁니다. 종목을 추가/변경하려면 `src/stocks.js`의 `STOCKS` 배열을 수정하세요.

## 국가·기간 필터

캐러셀 바로 아래, 흰 배경으로 다른 영역과 구분되는 필터 바는 서버 재요청 없이 클라이언트 사이드 JavaScript로 동작합니다(`src/site.js` 하단에 인라인 삽입). "국가" 그룹은 기사가 있는 국가만 버튼으로 노출되며 다중 선택이 가능하고, "기간" 그룹(30일/15일/7일/24시간)은 하나만 선택할 수 있습니다. 선택된 버튼은 파란 배경으로 강조됩니다. 각 기사 카드의 `data-pubdate` 속성과 섹션의 `data-country` 속성을 기준으로 카드/섹션을 보이거나 숨깁니다. 기본값은 "7일" + 전체 국가이며, 30일 필터가 의미 있으려면 `RETENTION_DAYS`가 최소 30이어야 합니다(현재 30으로 설정됨).

## 로고

`assets/hyundai-motor-group-logo.png`를 내비게이션 로고로 사용합니다(사내/비상업 용도로만 사용), 높이 36px. `generateSite()` 실행 시마다 `docs/assets/`로 자동 복사됩니다. 교체하려면 같은 파일명으로 `assets/` 폴더의 파일을 덮어쓰세요(파일명·확장자를 바꾸려면 `src/site.js`의 `LOGO_FILENAME`도 함께 수정).

## 히어로 이미지 캐러셀

로고 아래에 최신 기사 상위 6건을 자동으로 넘어가는 풀블리드 캐러셀이 표시됩니다(`renderHeroCarousel`, kia.com/jp/ja 참고). 3.75초 간격 자동 전환, 좌우 화살표, 1~6 번호가 붙은 하단 진행바 인디케이터로 직접 이동할 수 있고, 마우스를 올리면 일시정지됩니다. 제목은 2줄까지만 표시되고 넘치면 잘립니다. 썸네일 이미지가 없거나 로드에 실패하면 해당 매체의 색상+이니셜이 자동으로 대체 표시됩니다(출처 이름 배지는 표시하지 않습니다).

## 국가별 AI 요약 및 감성 분석 (섹션 설명)

"SECTION 01 한국" 등 각 국가 섹션 제목 아래 "한 줄 요약 : "에 이어지는 문장(1줄로 말줄임 처리)은 그 시점에 수집된 해당 국가 그룹 기사 제목(최대 30개)을 OpenRouter(`openai/gpt-4o-mini`, `OPENROUTER_MODEL` 환경변수로 변경 가능)에 보내 생성한 한국어 한 문장 요약입니다. 같은 제목 목록을 현대차·기아 브랜드 관점에서 긍정/중립/부정으로 분류해 섹션 설명 아래 긍정·중립·부정 기사 수를 버튼으로 표시하고, 각 기사(`data/news.json`의 `sentiment` 필드)에도 라벨을 붙입니다(`scripts/generate-section-summaries.js` → `data/section-summary.json` + `data/news.json`). 버튼을 클릭하면 해당 섹션의 기사 카드가 그 감성으로만 필터링되고 버튼 배경이 진해지며, 옆의 "초기화" 버튼이나 같은 버튼을 다시 클릭하면 필터가 해제됩니다. 2시간 수집 주기의 마지막 스텝으로 실행됩니다. API 키가 없거나 호출이 실패하면 해당 국가는 직전에 성공한 값을 계속 보여주고(있다면), 그마저 없으면 요약은 "요약을 준비 중입니다."로, 감성 버튼은 표시하지 않는 것으로 자연스럽게 대체됩니다.

## 기사별 공유 버튼

각 기사 카드 우측 하단의 아이콘 버튼을 누르면 방문자 자신의 기기 공유 기능(Web Share API, `navigator.share`)이 열려서 그 기사 제목과 링크를 자신의 디스코드(설치되어 있다면 공유 대상으로 뜹니다)나 다른 앱으로 직접 보낼 수 있습니다. 특정 서버나 채널로 강제 전송하는 게 아니라 각자 자기 디스코드로 보내는 방식이라 별도 서버·Webhook·로그인이 필요 없습니다. 공유 기능을 지원하지 않는 환경(주로 데스크톱 브라우저)에서는 자동으로 "제목 + 링크"를 클립보드에 복사하고 버튼이 잠시 초록색으로 바뀌어, 디스코드에 직접 붙여넣으면 됩니다. 복사까지 실패하면 버튼이 빨간색으로 바뀝니다.

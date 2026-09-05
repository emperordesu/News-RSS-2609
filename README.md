# News RSS

자동차 RSS 뉴스를 2시간마다 수집해 GitHub Pages로 보여주고, 매일 오전 9시(KST)에 Discord로 요약을 전송하는 자동화입니다. GitHub Actions에서 실행되므로 개인 PC를 켜둘 필요가 없습니다.

## 구성

- `src/config.js` — 수집할 RSS 피드 목록
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

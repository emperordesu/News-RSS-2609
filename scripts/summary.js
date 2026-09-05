const { getItemsSince } = require('../src/store');
const { sendDiscordSummary } = require('../src/discord');

function buildSummaryText(items) {
  const dateLabel = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

  if (items.length === 0) {
    return `**오늘의 뉴스 요약 (${dateLabel})**\n지난 24시간 동안 수집된 뉴스가 없습니다.`;
  }

  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.source)) bySource.set(item.source, []);
    bySource.get(item.source).push(item);
  }

  let text = `**오늘의 뉴스 요약 (${dateLabel}) - 총 ${items.length}건**\n`;
  for (const [source, list] of bySource) {
    text += `\n__${source}__ (${list.length}건)\n`;
    for (const item of list) {
      text += `- [${item.title}](${item.link})\n`;
    }
  }
  return text;
}

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const items = getItemsSince(since);

  const text = buildSummaryText(items);
  await sendDiscordSummary(webhookUrl, text);

  console.log(`Discord 요약 전송 완료 (${items.length}건)`);
}

main().catch((err) => {
  console.error('[요약 전송 오류]', err);
  process.exit(1);
});

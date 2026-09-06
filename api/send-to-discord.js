const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10; // 같은 IP 기준 분당 최대 요청 수 (best-effort, 콜드 스타트마다 초기화됨)
const DISCORD_BLURPLE = 0x5865f2;

// Vercel 서버리스 함수 인스턴스가 살아있는 동안만 유지되는 메모리 캐시.
// 정확한 분산 rate limit이 아니라 남용을 줄이기 위한 간단한 안전장치다.
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function truncate(value, maxLength) {
  const text = typeof value === 'string' ? value : '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return sendJson(res, 503, { error: '디스코드 연동이 설정되지 않았습니다.' });
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

  if (isRateLimited(ip)) {
    return sendJson(res, 429, { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const body = req.body || {};
  const title = truncate(body.title, 250);
  const link = typeof body.link === 'string' ? body.link.slice(0, 500) : '';
  const source = truncate(body.source, 60);
  const summary = truncate(body.summary, 300);

  if (!title || !/^https?:\/\//.test(link)) {
    return sendJson(res, 400, { error: '잘못된 요청입니다.' });
  }

  const embed = { title, url: link, color: DISCORD_BLURPLE };
  if (summary) embed.description = summary;
  if (source) embed.footer = { text: source };

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text().catch(() => '');
      throw new Error(`discord-http-${discordRes.status}: ${text.slice(0, 200)}`);
    }

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('[send-to-discord]', err.message);
    return sendJson(res, 502, { error: '디스코드 전송에 실패했습니다.' });
  }
};

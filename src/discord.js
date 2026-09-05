const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendDiscordMessage(webhookUrl, content, retriesLeft = 3) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (res.status === 429 && retriesLeft > 0) {
    const body = await res.json().catch(() => ({}));
    const retryAfterMs = Math.ceil((body.retry_after || 1) * 1000) + 200;
    await sleep(retryAfterMs);
    return sendDiscordMessage(webhookUrl, content, retriesLeft - 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord 전송 실패 (${res.status}): ${text}`);
  }
}

// Discord 메시지 2000자 제한을 고려해 줄 단위로 나눈다.
function chunkText(text, maxLen = 1900) {
  const lines = text.split('\n');
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxLen) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendDiscordSummary(webhookUrl, text) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    await sendDiscordMessage(webhookUrl, chunk);
    await sleep(500); // Discord webhook rate limit(초당 요청 수) 여유
  }
}

module.exports = { sendDiscordSummary };

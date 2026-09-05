async function sendDiscordMessage(webhookUrl, content) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
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
  }
}

module.exports = { sendDiscordSummary };

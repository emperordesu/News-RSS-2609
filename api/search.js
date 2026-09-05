const fs = require('fs');
const path = require('path');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10; // 같은 IP 기준 분당 최대 요청 수 (best-effort, 콜드 스타트마다 초기화됨)
const MAX_ARTICLES_IN_CONTEXT = 60;
const MAX_RESULTS = 5;

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

function loadArticles() {
  const file = path.join(process.cwd(), 'data', 'news.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function callOpenRouter(query, articles) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('no-api-key');

  const pool = articles.slice(0, MAX_ARTICLES_IN_CONTEXT);
  const numbered = pool
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}${a.summary ? ' - ' + a.summary : ''}`)
    .join('\n');

  const prompt = `아래는 수집된 현대차/기아 관련 자동차 뉴스 기사 목록이다.\n\n${numbered}\n\n사용자 질문: "${query}"\n\n이 질문과 가장 관련 있는 기사를 최대 ${MAX_RESULTS}개까지 번호로 골라줘. 관련된 기사가 없으면 빈 배열을 반환해. 그리고 질문에 대한 짧은 한국어 답변도 작성해줘.\n\n다음 JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마:\n{"answer": "짧은 한국어 답변", "indices": [번호, 번호]}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://news-rss-2609.vercel.app',
      'X-Title': '현대차·기아 뉴스 검색',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`openrouter-http-${res.status}`);

  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error('empty-response');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('no-json-in-response');

  const parsed = JSON.parse(jsonMatch[0]);
  const indices = Array.isArray(parsed.indices) ? parsed.indices : [];
  const results = indices
    .map((n) => pool[n - 1])
    .filter(Boolean)
    .slice(0, MAX_RESULTS)
    .map((a) => ({ title: a.title, link: a.link, source: a.source, image: a.image || null }));

  return { answer: typeof parsed.answer === 'string' ? parsed.answer : '', results };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  const query = req.method === 'GET' ? req.query && req.query.q : req.body && req.body.q;
  const q = String(query || '').trim().slice(0, 200);
  if (!q) {
    return sendJson(res, 400, { error: '검색어가 필요합니다.' });
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

  if (isRateLimited(ip)) {
    return sendJson(res, 429, { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const articles = loadArticles();
  if (articles.length === 0) {
    return sendJson(res, 200, { answer: '', results: [] });
  }

  try {
    const { answer, results } = await callOpenRouter(q, articles);
    return sendJson(res, 200, { answer, results });
  } catch (err) {
    console.error('[search] OpenRouter 실패, 폴백 신호 반환:', err.message);
    return sendJson(res, 200, { answer: '', results: [], fallback: true });
  }
};

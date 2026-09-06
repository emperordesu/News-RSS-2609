const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

function getModel() {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

async function chatCompletion(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY가 설정되지 않았습니다.');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://news-rss-2609.vercel.app',
      'X-Title': 'Hyundai-Kia News',
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: options.maxTokens || 300,
      temperature: options.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('OpenRouter 응답이 비어 있습니다.');
  return content.trim();
}

// 국가 그룹의 기사 제목 목록으로 한 문장짜리 한국어 요약을 만든다.
async function summarizeCountryTitles(countryLabel, titles) {
  const list = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `다음은 오늘 수집된 ${countryLabel} 자동차 뉴스 제목들이다.\n\n${list}\n\n이 뉴스들의 공통 주제나 핵심 이슈를 한국어 한 문장으로 요약해줘. 문장 하나만 출력하고 다른 설명은 하지 마.`;
  const text = await chatCompletion([{ role: 'user', content: prompt }], { maxTokens: 150, temperature: 0.3 });
  return text.replace(/^["'“]|["'”]$/g, '').trim();
}

const SENTIMENT_LABELS = new Set(['positive', 'neutral', 'negative']);

// 국가 그룹의 기사 제목 목록을 현대차/기아 브랜드 관점에서 긍정/중립/부정으로 분류한다.
// 반환 배열의 길이와 순서는 입력 titles와 항상 같다.
async function classifyCountrySentiment(countryLabel, titles) {
  const list = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `다음은 ${countryLabel} 자동차 뉴스 제목 목록이다.\n\n${list}\n\n각 제목이 현대차·기아 브랜드 이미지 관점에서 긍정적(positive), 중립적(neutral), 부정적(negative) 중 무엇에 해당하는지 판단해줘.\n\n다음 JSON 배열 형식으로만 응답하고 다른 텍스트는 포함하지 마. 배열 길이는 반드시 ${titles.length}개이고 순서는 제목 순서와 같아야 한다.\n["positive", "neutral", "negative", ...]`;

  const text = await chatCompletion([{ role: 'user', content: prompt }], { maxTokens: 500, temperature: 0 });
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('감성 분석 응답에서 JSON 배열을 찾지 못했습니다.');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('감성 분석 응답이 배열이 아닙니다.');

  return titles.map((_, i) => {
    const label = typeof parsed[i] === 'string' ? parsed[i].toLowerCase().trim() : '';
    return SENTIMENT_LABELS.has(label) ? label : 'neutral';
  });
}

module.exports = { chatCompletion, summarizeCountryTitles, classifyCountrySentiment, getModel };

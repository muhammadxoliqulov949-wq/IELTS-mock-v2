/* AI-generated quick-quiz endpoint (Vercel serverless function).
 *
 * POST /api/quiz
 *   body: { topic?: 'writing'|'reading'|'listening'|'speaking'|'vocabulary', count?: 4 }
 *
 * Returns:
 *   { ok: true, questions: [{ prompt, options, answer, explanation }] }
 *
 * If GEMINI_API_KEY is not configured, it falls back to a local question bank so
 * the preview still works without a key.
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20;
const ipHits = new Map();
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}
function rateLimited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) { ipHits.set(ip, hits); return true; }
  hits.push(now); ipHits.set(ip, hits);
  return false;
}

/* Local fallback bank — the same quality as the client quiz. */
const LOCAL_QUESTIONS = [
  { prompt: 'Which of these is the correct way to start a Writing Task 1 overview?', options: ['Overall, the number rises sharply...', 'In conclusion, I think...', 'Firstly, it is true that...', 'The chart shows 12% in 2015.'], answer: 0, explanation: 'An overview usually begins with "Overall," and describes the main trend.' },
  { prompt: 'In TRUE / FALSE / NOT GIVEN, choose NOT GIVEN when:', options: ['The text says the opposite', 'The text does not mention it', 'You disagree with the statement', 'The text uses similar words'], answer: 1, explanation: 'NOT GIVEN is used when the text does not mention the information.' },
  { prompt: 'What helps the brain consolidate what you study?', options: ['Sleep', 'Caffeine', 'Late-night screens', 'Studying without breaks'], answer: 0, explanation: 'Sleep plays a key role in moving new information into long-term memory.' },
  { prompt: 'A good Speaking Part 2 answer should:', options: ['Cover each bullet with a detail', 'Only talk about one point', 'Memorise a full script', 'Stop after 30 seconds'], answer: 0, explanation: 'Use the cue-card bullets as headings and spend a little time on each.' },
  { prompt: 'Which word is a good synonym for "important"?', options: ['significant', 'quick', 'empty', 'quiet'], answer: 0, explanation: '"Significant" carries the same idea as "important" in academic writing.' },
  { prompt: 'What does "commute" mean?', options: ['To travel regularly between home and work', 'To sleep', 'To study abroad', 'To write an essay'], answer: 0, explanation: 'A commute is a regular journey between home and work.' },
  { prompt: 'Which is the best way to review your mistakes?', options: ['Read the correct answer and explain why', 'Only look at the band score', 'Delete the result', 'Ignore the question'], answer: 0, explanation: 'Understanding why an answer is correct turns mistakes into learning.' }
];

function pickLocal(topic, count) {
  const pool = topic && topic.toLowerCase() === 'vocabulary'
    ? LOCAL_QUESTIONS.slice(0, 5)
    : LOCAL_QUESTIONS.slice();
  return pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

async function callGemini(topic, count) {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: 'You are an IELTS quiz generator. Return ONLY JSON: { questions: [{ prompt, options:[4 strings], answer: index(0-3), explanation }] }' }] },
      contents: [{ role: 'user', parts: [{ text: `Generate ${count} IELTS multiple-choice questions about ${topic || 'exam strategy'}.` }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
    })
  });
  if (!res.ok) throw new Error('Gemini unavailable');
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  const parsed = start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : {};
  const questions = (parsed.questions || []).filter(q => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2);
  if (!questions.length) throw new Error('No valid questions returned');
  return questions.slice(0, count);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    if (rateLimited(req)) { res.status(429).json({ error: 'Too many requests. Try again shortly.' }); return; }

    const body = req.body || {};
    const topic = String(body.topic || '').slice(0, 40);
    const count = Math.max(1, Math.min(8, Number(body.count) || 4));

    let questions;
    if (process.env.GEMINI_API_KEY) {
      try { questions = await callGemini(topic, count); }
      catch { questions = pickLocal(topic, count); }
    } else {
      questions = pickLocal(topic, count);
    }
    res.json({ ok: true, source: process.env.GEMINI_API_KEY ? 'ai' : 'local', questions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Quiz generation failed' });
  }
};

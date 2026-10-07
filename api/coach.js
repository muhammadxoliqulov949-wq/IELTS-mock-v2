/* AI Coach endpoint (Vercel serverless function).
 *
 * POST /api/coach
 * body: { message: string, profile: { band, weakest, mistakeCount }, history: [{role, text}, ...] }
 * returns: { reply: string }
 *
 * Requires env var: GROQ_API_KEY (free key at https://console.groq.com/keys)
 *
 * The model call goes through lib/aiClient.js — the single Groq provider
 * every AI endpoint shares (OpenAI format, max_tokens 4096).
 */
const ai = require('../lib/aiClient.js');
const guard = require('../lib/aiGuardrails.js');
const aiCache = require('../lib/aiCache.js');

/* ---------- tiny in-memory rate limiter (per server instance) ---------- */
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
  if (hits.length >= RATE_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

const COACH_SYSTEM = `You are "IELTS Coach", a friendly but rigorous IELTS preparation coach inside an IELTS mock-test web app. You help candidates improve their band score using the official IELTS band descriptors and smart study techniques.

The app sends you the candidate's current profile: latest overall band, weakest skill (listening, reading, writing or speaking), and how many saved mistakes they have. Use this profile to personalise every answer.

Your style:
- Warm, encouraging and specific — never generic advice.
- Answer in clear, structured text (short paragraphs or short bullet lists).
- When the user asks for a plan, give a concrete, time-boxed study plan (e.g. a "30-minute session" or a "7-day plan") that targets their weakest skill.
- When they ask why they are stuck at a band, explain in terms of the band descriptors and give 2-3 concrete fixes.
- Never promise exact exam results. Briefly remind that mock scores are estimates.
- Answer in the language the user writes in (English, Uzbek, Russian, etc.).

Respond with plain text only — no JSON, no markdown headers. Keep responses under ~250 words unless the user explicitly asks for a longer plan.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    return;
  }
  if (!ai.apiKey()) {
    res.status(500).json({
      error: 'GROQ_API_KEY is not set on the server. Add it in your hosting environment (Vercel → Settings → Environment Variables) — get a free key at https://console.groq.com/keys'
    });
    return;
  }

  const { message, profile, history } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  if (message.length > 3000) {
    res.status(400).json({ error: 'Message is too long (max 3000 characters)' });
    return;
  }

  /* Strict IELTS boundary (lib/aiGuardrails.js): a clearly out-of-scope
     question is refused before a Groq token is spent. */
  if (guard.isLikelyOffTopic(message)) {
    res.status(400).json({ error: guard.REFUSAL_MESSAGE, code: guard.OFF_TOPIC });
    return;
  }

  try {
    const p = profile || {};
    const profileLine = `Candidate profile — latest overall band: ${p.band ?? 'not assessed yet'}; weakest skill: ${p.weakest ?? 'none yet'}; saved mistakes: ${p.mistakeCount ?? 0}.`;

    /* OpenAI message shape (lib/aiClient.js): one system prompt, then the
       recent turns as user/assistant, then the new question. */
    const messages = [
      { role: 'system', content: guard.withGuardrails(`${COACH_SYSTEM}\n\n${profileLine}`) }
    ];
    if (Array.isArray(history) && history.length) {
      for (const h of history.slice(-10)) {
        const role = h && h.role === 'user' ? 'user' : 'assistant';
        const text = String(h && h.text || '').slice(0, 3000);
        if (!text) continue;
        const last = messages[messages.length - 1];
        if (last && last.role === role) last.content += `\n${text}`;
        else messages.push({ role, content: text });
      }
    }
    messages.push({ role: 'user', content: message });

    /* 7-day TTL cache (public.ai_cache, see lib/aiCache.js): the same
       question about the same profile is answered straight from the
       database and Groq is not called again. */
    const cacheKey = `coach:${guard.cleanPrompt(message)}|${p.band ?? '-'}|${p.weakest ?? '-'}`;
    const { data: reply } = await aiCache.withCache(cacheKey, async () => {
      const { content } = await ai.chat(messages, { temperature: 0.6, maxTokens: ai.DEFAULT_MAX_TOKENS });
      const trimmed = String(content || '').trim();
      if (!trimmed) throw new Error('Coach produced no reply — please try again');
      return trimmed;
    });

    /* The model obeyed the guardrails and refused: hand back the canonical
       Uzbek sentence rather than whatever wording it invented. */
    if (guard.looksLikeRefusal(reply)) {
      res.status(200).json({ reply: guard.REFUSAL_MESSAGE, offTopic: true });
      return;
    }
    res.status(200).json({ reply });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: err?.message || 'Coach error. Please try again.' });
  }
};

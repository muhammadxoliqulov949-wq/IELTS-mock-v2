/* AI Coach endpoint (Vercel serverless function).
 *
 * POST /api/coach
 *   body: { message, profile, history, stream?: boolean }
 *
 * Two response modes:
 *   - Default (JSON): { reply: string }              — one-shot, cached.
 *   - SSE streaming (text/event-stream)               — chunks arrive in
 *     real time as the model generates them, ChatGPT-style. The final
 *     event carries the full reply which is also written to the cache.
 *
 * Requires at least one provider key (GROQ_API_KEY* or DEEPSEEK_API_KEY).
 */
const aiClient = require('../lib/aiClient.js');
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
- Answer in clear, structured text using Markdown: short paragraphs, bullet lists with "- ", **bold** for emphasis. You may use simple headings (##) for longer plans.
- When the user asks for a plan, give a concrete, time-boxed study plan (e.g. a "30-minute session" or a "7-day plan") that targets their weakest skill.
- When they ask why they are stuck at a band, explain in terms of the band descriptors and give 2-3 concrete fixes.
- Never promise exact exam results. Briefly remind that mock scores are estimates.
- Answer in the language the user writes in (English, Uzbek, Russian, etc.).

Keep responses under ~250 words unless the user explicitly asks for a longer plan.`;

/* ---------- SSE helpers ---------- */
function sseWrite(res, event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);
  res.write(`data: ${payload}\n\n`);
}

function buildMessages(body) {
  const p = body.profile || {};
  const profileLine = `Candidate profile — latest overall band: ${p.band ?? 'not assessed yet'}; weakest skill: ${p.weakest ?? 'none yet'}; saved mistakes: ${p.mistakeCount ?? 0}.`;

  const messages = [{
    role: 'system',
    content: guard.withGuardrails(`${COACH_SYSTEM}\n\n${profileLine}`)
  }];
  if (Array.isArray(body.history) && body.history.length) {
    for (const h of body.history.slice(-10)) {
      const role = h && h.role === 'user' ? 'user' : 'assistant';
      const text = String(h && h.text || '').slice(0, 3000);
      if (!text) continue;
      const last = messages[messages.length - 1];
      if (last && last.role === role) last.content += `\n${text}`;
      else messages.push({ role, content: text });
    }
  }
  messages.push({ role: 'user', content: body.message });
  return messages;
}

function cacheKey(body) {
  const p = body.profile || {};
  return `coach:${guard.cleanPrompt(body.message)}|${p.band ?? '-'}|${p.weakest ?? '-'}`;
}

/* ---------- JSON (one-shot) handler ---------- */
async function handleJson(req, res, body) {
  try {
    const messages = buildMessages(body);
    const key = cacheKey(body);
    const { data: reply } = await aiCache.withCache(key, async () => {
      const result = await aiClient.chatCompletion(messages, { temperature: 0.6 });
      if (!result.content) throw new Error('Coach produced no reply — please try again');
      return result.content;
    });

    if (guard.looksLikeRefusal(reply)) {
      res.status(200).json({ reply: guard.REFUSAL_MESSAGE, offTopic: true });
      return;
    }
    res.status(200).json({ reply });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: err?.message || 'Coach error. Please try again.' });
  }
}

/* ---------- SSE (streaming) handler ---------- */
async function handleStream(req, res, body) {
  // Set SSE headers — must happen before any write.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  // Tell the client the stream is open.
  sseWrite(res, 'connected', { ok: true });

  try {
    const messages = buildMessages(body);
    const cKey = cacheKey(body);
    const hash = aiCache.hashPrompt(cKey);

    // Cache hit — send the cached reply in one event and close.
    const hit = await aiCache.readCache(hash);
    if (hit && hit.response_json) {
      const cached = typeof hit.response_json === 'string'
        ? hit.response_json
        : String(hit.response_json);
      sseWrite(res, 'chunk', { delta: cached });
      sseWrite(res, 'done', { reply: cached, cached: true });
      res.end();
      return;
    }

    let fullReply = '';
    let started = false;
    try {
      for await (const chunk of aiClient.streamChat(messages, { temperature: 0.6 })) {
        if (chunk.done) {
          fullReply = chunk.content || fullReply;
          break;
        }
        if (chunk.delta) {
          started = true;
          fullReply += chunk.delta;
          sseWrite(res, 'chunk', { delta: chunk.delta });
        }
      }
    } catch (streamErr) {
      if (!started) {
        sseWrite(res, 'error', { message: streamErr?.message || 'Stream failed' });
        res.end();
        return;
      }
      // Mid-stream failure — append a visible note but keep what we have.
      const note = '\n\n[Connection interrupted]';
      sseWrite(res, 'chunk', { delta: note });
      fullReply += note;
    }

    if (!fullReply) {
      sseWrite(res, 'error', { message: 'Coach produced no reply — please try again' });
      res.end();
      return;
    }

    if (guard.looksLikeRefusal(fullReply)) {
      sseWrite(res, 'done', { reply: guard.REFUSAL_MESSAGE, offTopic: true });
      res.end();
      return;
    }

    // Populate the cache in the background — the client already has the reply.
    aiCache.writeCache(hash, fullReply).catch(() => { /* fail open */ });

    sseWrite(res, 'done', { reply: fullReply });
    res.end();
  } catch (err) {
    sseWrite(res, 'error', { message: err?.message || 'Coach error. Please try again.' });
    res.end();
  }
}

/* ---------- main handler ---------- */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
    return;
  }
  if (!aiClient.isConfigured()) {
    res.status(500).json({
      error: 'No AI provider key is configured. Set GROQ_API_KEY (and optionally GROQ_API_KEY_1, GROQ_API_KEY_2, DEEPSEEK_API_KEY) in your environment.'
    });
    return;
  }

  const body = req.body || {};
  const { message } = body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  if (message.length > 3000) {
    res.status(400).json({ error: 'Message is too long (max 3000 characters)' });
    return;
  }

  /* Strict IELTS boundary (lib/aiGuardrails.js): a clearly out-of-scope
     question is refused before a model token is spent. */
  if (guard.isLikelyOffTopic(message)) {
    const accept = String(req.headers['accept'] || '');
    if (body.stream === true || accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      sseWrite(res, 'error', { message: guard.REFUSAL_MESSAGE, code: guard.OFF_TOPIC });
      res.end();
      return;
    }
    res.status(400).json({ error: guard.REFUSAL_MESSAGE, code: guard.OFF_TOPIC });
    return;
  }

  // Decide response mode: body.stream=true OR Accept: text/event-stream.
  const accept = String(req.headers['accept'] || '');
  const wantsStream = body.stream === true || accept.includes('text/event-stream');

  if (wantsStream) {
    return handleStream(req, res, body);
  }
  return handleJson(req, res, body);
};

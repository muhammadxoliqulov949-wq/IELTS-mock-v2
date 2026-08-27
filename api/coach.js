/* AI Coach endpoint (Vercel serverless function).
 *
 * POST /api/coach
 * body: { message: string, profile: { band, weakest, mistakeCount }, history: [{role, text}, ...] }
 * returns: { reply: string }
 *
 * Requires env var: GEMINI_API_KEY (free key at https://aistudio.google.com/apikey)
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not set on the server. Add it in your hosting environment (Vercel → Settings → Environment Variables) — get a free key at https://aistudio.google.com/apikey'
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

  try {
    const p = profile || {};
    const profileLine = `Candidate profile — latest overall band: ${p.band ?? 'not assessed yet'}; weakest skill: ${p.weakest ?? 'none yet'}; saved mistakes: ${p.mistakeCount ?? 0}.`;

    const contents = [];
    if (Array.isArray(history) && history.length) {
      for (const h of history.slice(-10)) {
        const role = h && h.role === 'user' ? 'user' : 'model';
        const text = String(h && h.text || '').slice(0, 3000);
        if (!text) continue;
        const last = contents[contents.length - 1];
        if (last && last.role === role) last.parts[0].text += `\n${text}`;
        else contents.push({ role, parts: [{ text }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiRes = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `${COACH_SYSTEM}\n\n${profileLine}` }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 900 }
      })
    });

    if (!geminiRes.ok) {
      const errText = (await geminiRes.text()).slice(0, 400);
      res.status(geminiRes.status).json({ error: `Gemini API error (${geminiRes.status}): ${errText}` });
      return;
    }
    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      res.status(502).json({ error: 'Coach produced no reply — please try again' });
      return;
    }
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Coach error. Please try again.' });
  }
};

/* AI grading endpoint (Vercel serverless function).
 *
 * POST /api/grade
 *  - mode: 'writing'  → body: { mode: 'writing', tasks: [{ title, prompt, response }, ...] }
 *                       (Task 1 and Task 2 are graded SEPARATELY, overall = T1×1/3 + T2×2/3)
 *  - mode: 'speaking' → body: { mode: 'speaking', parts: [{ title, qa: [{q, a}] }] }
 *                       or legacy { mode: 'speaking', response: '...' }
 *
 * Requires env var: GEMINI_API_KEY (free key at https://aistudio.google.com/apikey)
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/* ---------- tiny in-memory rate limiter (per server instance) ---------- */
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 15;
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

/* ---------- helpers ---------- */
function clampBand(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(9, Math.round(n * 2) / 2)) : 0;
}
function str(v) { return String(v ?? ''); }
function list(v) { return Array.isArray(v) ? v.map(String) : []; }

function parseJson(raw) {
  const s = str(raw).replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('Could not parse examiner response');
}

async function callGemini(systemPrompt, userContent, maxTokens = 2500) {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: maxTokens }
    })
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 400);
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return parseJson(raw);
}

/* ---------- prompts ---------- */
const WRITING_SYSTEM = `You are a certified IELTS examiner with years of experience marking Academic Writing Task 1 and Task 2. Score strictly and realistically, exactly as a real examiner would — do not inflate scores out of politeness.

The candidate has written responses to one or more writing tasks. Grade EACH TASK INDEPENDENTLY using the official IELTS public band descriptors. Each criterion is scored on the 1-9 scale (whole or half bands):

For every task, apply these four criteria:
1. TASK ACHIEVEMENT (for Task 1) or TASK RESPONSE (for Task 2). Task 1: does the response accurately summarise data/trends, cover key features, make relevant comparisons? Penalise mere data listing without an overview. Task 2: does the response fully address all parts of the question with a clear position, developed with relevant, extended and supported ideas?
2. COHERENCE AND COHESION: logical organisation, clear progression, appropriate paragraphing, effective use of cohesive devices (not mechanical or repetitive), clear central topic in each paragraph.
3. LEXICAL RESOURCE: range and precision of vocabulary, natural collocation, awareness of style/register, ability to paraphrase, error frequency in word choice/spelling.
4. GRAMMATICAL RANGE AND ACCURACY: range of sentence structures (simple, compound, complex), accuracy, frequency and impact of errors on communication.

Band guidance: Band 9 = expert user, near-flawless. Band 7 = good user, occasional inaccuracies but handles complex language well. Band 5 = modest user, partial command, frequent problems. Band 4 or below = limited user, frequent breakdowns.

Word count rules: Task 1 under 150 words or Task 2 under 250 words must be penalised under the first criterion, and you MUST note this explicitly in that task's summary if it applies.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "tasks": [
    {
      "title": "Task 1",
      "band": <overall band for this task = average of its 4 criteria, rounded to nearest 0.5>,
      "criteria": { "taskAchievement": <band>, "coherenceCohesion": <band>, "lexicalResource": <band>, "grammar": <band> },
      "strengths": ["specific, evidence-based strength 1", "strength 2"],
      "improvements": ["specific, actionable improvement 1", "improvement 2", "improvement 3"],
      "summary": "2-3 sentence examiner-style summary for this task"
    }
  ],
  "overallSummary": "2-3 sentence overall summary across all tasks"
}
IMPORTANT: include exactly one object inside "tasks" per task given. Use "taskAchievement" as the first criterion key for Task 1 and "taskResponse" for Task 2.`;

const SPEAKING_SYSTEM = `You are a certified IELTS examiner with years of experience marking the Speaking test. You are given a candidate's spoken answers across Parts 1, 2 and 3 (transcribed from audio via speech recognition, so minor transcription noise, missing punctuation, or small recognition errors are expected — do not penalise for these, focus on the actual language used).

Apply the official IELTS Speaking public band descriptors across these four criteria, each scored independently on the 1-9 scale (whole or half bands):

1. FLUENCY AND COHERENCE: speech rate and continuity, hesitation frequency, self-correction, logical sequencing of ideas, appropriate use of cohesive devices and discourse markers.
2. LEXICAL RESOURCE: range of vocabulary for the topics, flexibility to discuss a variety of topics, use of less common/idiomatic vocabulary, paraphrasing ability, precision.
3. GRAMMATICAL RANGE AND ACCURACY: range of grammatical structures attempted, accuracy, frequency of error, ability to produce complex sentences.
4. PRONUNCIATION: since this is inferred from a text transcript rather than audio, infer pronunciation risk ONLY from indirect textual evidence (word choice complexity, sentence flow as transcribed) and note explicitly in the summary that pronunciation is estimated from transcript patterns, not directly heard audio, and carries lower confidence than the other three criteria.

Band guidance: Band 9 = fully fluent, precise, wide natural vocabulary. Band 7 = speaks at length without noticeable effort, some hesitation, good range of vocabulary and grammar. Band 5 = manages basic communication but with limited flexibility, noticeable hesitation and repetition.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "band": <overall band = average of the 4 criteria, rounded to nearest 0.5>,
  "criteria": { "fluencyCoherence": <band>, "lexicalResource": <band>, "grammar": <band>, "pronunciation": <band> },
  "strengths": ["specific, evidence-based strength 1", "strength 2"],
  "improvements": ["specific, actionable improvement 1", "improvement 2", "improvement 3"],
  "summary": "2-3 sentence examiner-style summary, explicitly noting pronunciation is transcript-estimated"
}`;

/* ---------- normalisers ---------- */
function normalizeWriting(parsed, expectedCount) {
  let tasks = Array.isArray(parsed.tasks) && parsed.tasks.length
    ? parsed.tasks
    : parsed.criteria
      ? [{ title: 'Task', band: parsed.band, criteria: parsed.criteria, strengths: parsed.strengths, improvements: parsed.improvements, summary: parsed.summary }]
      : [];
  tasks = tasks.slice(0, expectedCount || tasks.length).map((t) => ({
    title: str(t.title) || 'Task',
    band: clampBand(t.band),
    criteria: (t.criteria && typeof t.criteria === 'object') ? t.criteria : {},
    strengths: list(t.strengths),
    improvements: list(t.improvements),
    summary: str(t.summary)
  }));
  const weights = tasks.length === 2 ? [1 / 3, 2 / 3] : tasks.map(() => 1 / Math.max(1, tasks.length));
  const overall = tasks.reduce((s, t, i) => s + Number(t.band) * weights[i], 0);
  return {
    band: clampBand(overall),
    tasks,
    summary: str(parsed.overallSummary || parsed.summary)
  };
}

function normalizeSpeaking(parsed) {
  return {
    band: clampBand(parsed.band),
    criteria: (parsed.criteria && typeof parsed.criteria === 'object') ? parsed.criteria : {},
    strengths: list(parsed.strengths),
    improvements: list(parsed.improvements),
    summary: str(parsed.summary)
  };
}

/* ---------- handler ---------- */
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

  const { mode, prompt, response, tasks, parts } = req.body || {};
  if (mode !== 'writing' && mode !== 'speaking') {
    res.status(400).json({ error: 'Invalid mode' });
    return;
  }

  try {
    if (mode === 'writing') {
      const list = (Array.isArray(tasks) && tasks.length) ? tasks : [{ title: 'Task', prompt, response }];
      const clean = list.map((t, i) => ({
        title: str(t.title) || `Task ${i + 1}`,
        prompt: str(t.prompt).slice(0, 4000),
        response: str(t.response).trim().slice(0, 6000)
      }));
      if (!clean.length || clean.every((t) => t.response.length < 10)) {
        res.status(400).json({ error: 'Your responses are too short to grade — write at least a few sentences for each task.' });
        return;
      }
      const userContent = clean.map((t) => `TASK: ${t.title}\nTASK PROMPT:\n${t.prompt}\n\nCANDIDATE RESPONSE:\n${t.response}`).join('\n\n---\n\n');
      const parsed = await callGemini(WRITING_SYSTEM, userContent.slice(0, 12000), 3000);
      res.status(200).json(normalizeWriting(parsed, clean.length));
      return;
    }

    // speaking
    let userContent = '';
    if (Array.isArray(parts) && parts.length) {
      userContent = parts.map((p) => `PART: ${str(p.title)}\n${(p.qa || []).map((qa) => `Q: ${str(qa.q)}\nA: ${str(qa.a) || '(no answer)'}`).join('\n')}`).join('\n\n');
    } else {
      userContent = `CANDIDATE ANSWERS:\n${str(response)}`;
    }
    if (userContent.trim().length < 10) {
      res.status(400).json({ error: 'Please record at least one answer first.' });
      return;
    }
    const parsed = await callGemini(SPEAKING_SYSTEM, userContent.slice(0, 9000), 2000);
    res.status(200).json(normalizeSpeaking(parsed));
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Grading failed. Please try again.' });
  }
};

/* ===================================================================
 * 1-Click IELTS Mock generator (Vercel serverless function)
 * -------------------------------------------------------------------
 * POST /api/generate-mock
 *
 * Body (mode "section", the default):
 *   { skill, testId, label, difficulty, topic?, plan?, withAudio? }
 *     skill       'listening' | 'reading' | 'writing' | 'speaking'
 *     difficulty  'standard' | 'hard'
 *     topic       optional theme; when empty the pool picks one
 *     plan        optional plan built by the browser (lib/topicPool.js)
 *
 * Body (mode "audio"):
 *   { mode: 'audio', transcript, partNumber?, label?, voice?, accessToken? }
 *
 * Both modes answer with { ok: true, … }.
 *
 * The four skills are generated ONE REQUEST AT A TIME on purpose: the
 * admin modal can then show honest progress (Listening → Reading →
 * Writing → Speaking) and every response stays far below the serverless
 * execution limit. Listening and Reading are split into small focused
 * model calls so every 4096-token response can finish cleanly.
 *
 * Audio: Listening transcripts are synthesised with the free Edge TTS
 * engine (MP3) — see lib/edgeTts.js. When the browser forwards the
 * admin's Supabase access token the MP3 is uploaded straight into the public
 * "ielts-media" bucket and the payload comes back with a real audioUrl.
 * Without a token the audio is returned as base64 so the browser can
 * upload it through the existing admin media endpoint (RLS still guards
 * the bucket: only admins may write).
 *
 * Section generation requires the shared GROQ_API_KEY server secret.
 * =================================================================== */
'use strict';

const { buildPlan } = require('../lib/topicPool.js');
const guard = require('../lib/aiGuardrails.js');
const tts = require('../lib/edgeTts.js');
const aiClient = require('../lib/aiClient.js');
/* NOTE: this endpoint deliberately does NOT use lib/aiCache.js. A cached
 * mock section would replay the very same paper the pool just randomised
 * itself to avoid — the generator's whole promise is that every run
 * differs. Grade, Coach and Quiz are the cached endpoints. */

const MEDIA_BUCKET = 'ielts-media';
const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
const TEMPERATURE = 0.85; /* diversity over precision — see ADMIN.md */

/* ---------- rate limiting (generation is the most expensive call) ---------- */
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 60;
const ipHits = new Map();
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}
function rateLimited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) { ipHits.set(ip, hits); return true; }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

/* ---------- helpers ---------- */
function str(v) { return String(v ?? '').trim(); }
function num(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }

/* Be tolerant of a code fence or a short preamble around JSON. */
function parseJson(raw) {
  const s = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('The model did not return valid JSON');
}

async function callAI(systemPrompt, userContent) {
  const { content, usage } = await aiClient.chatCompletion([
    { role: 'system', content: guard.withGuardrails(systemPrompt) },
    { role: 'user', content: userContent }
  ], { temperature: TEMPERATURE, responseFormat: 'json_object' });
  return { parsed: parseJson(content), usage };
}

function combineUsage(usages) {
  const rows = usages.filter(Boolean);
  if (!rows.length) return null;
  return rows.reduce((total, row) => {
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
      if (Number.isFinite(Number(row[key]))) total[key] = (total[key] || 0) + Number(row[key]);
    }
    return total;
  }, { calls: rows.length });
}

async function generateSkill(skill, plan, context) {
  if (skill === 'listening') {
    const parts = [];
    const usages = [];
    for (const item of plan.questionPlan.listening) {
      const userContent = `${context}\nGenerate only Listening Part ${item.part}, with exactly its 10 planned questions. Return it in the required JSON shape.`;
      const result = await callAI(listeningSystem(plan, item.part), userContent);
      const section = result.parsed.listening || result.parsed;
      const generated = Array.isArray(section.parts) ? section.parts : [];
      if (generated.length !== 1) {
        throw new Error(`Listening Part ${item.part} response was incomplete. Please generate the section again.`);
      }
      parts.push({ ...generated[0], partNumber: item.part });
      usages.push(result.usage);
    }
    return {
      parsed: { listening: { title: 'Listening Practice Test', parts } },
      usage: combineUsage(usages)
    };
  }

  if (skill === 'reading') {
    const passages = [];
    const usages = [];
    for (const item of plan.questionPlan.reading) {
      const userContent = `${context}\nGenerate only Reading Passage ${item.passage}, with exactly its ${item.types.length} planned questions. Return it in the required JSON shape.`;
      const result = await callAI(readingSystem(plan, item.passage), userContent);
      const section = result.parsed.reading || result.parsed;
      const generated = Array.isArray(section.passages) ? section.passages : [];
      if (generated.length !== 1) {
        throw new Error(`Reading Passage ${item.passage} response was incomplete. Please generate the section again.`);
      }
      passages.push({ ...generated[0], passageNumber: item.passage });
      usages.push(result.usage);
    }
    return {
      parsed: { reading: { title: 'Reading Practice Test', passages } },
      usage: combineUsage(usages)
    };
  }

  const systems = { writing: writingSystem(plan), speaking: speakingSystem(plan) };
  return callAI(systems[skill], `${context}\nWrite the complete ${skill.toUpperCase()} section as one JSON object.`);
}

/* ------------------------------------------------------------------
 * PROMPTS — focused on a skill or one large section chunk. Every prompt carries the exact question-type
 * sequence chosen by lib/topicPool.js, so the mix really changes on
 * every run instead of collapsing to the model's favourite types.
 * ------------------------------------------------------------------ */
const RULES = `You are an elite IELTS content author who writes original, exam-standard practice material.
Hard rules:
- Write ORIGINAL material. Never reproduce Cambridge, IDP or any published test.
- Use natural, high-register academic English. No bullet-point shorthand inside passages.
- Facts inside a passage may be realistic but invented; never cite a real person as a source.
- Answer keys must be 100% derivable from the material you wrote, and every question needs a short explanation.
- Respond with ONE valid JSON object only. No markdown, no commentary.`;

function difficultyLine(difficulty) {
  return difficulty === 'hard'
    ? 'Difficulty: HARD. Use longer, more complex sentences, denser academic vocabulary, subtler distractors and more paraphrase between question and source.'
    : 'Difficulty: STANDARD IELTS. Clear academic English at the level of a real General/Academic paper, with fair, findable answers.';
}

function listeningSystem(plan, partNumber) {
  const selected = plan.questionPlan.listening.filter(p => !partNumber || p.part === partNumber);
  const partText = selected.map(p => `Part ${p.part}: exactly 10 questions, in this order: ${JSON.stringify(p.types)}`).join('\n');
  const startId = partNumber ? (partNumber - 1) * 10 + 1 : 1;
  const endId = partNumber ? partNumber * 10 : 40;
  const scope = partNumber
    ? `Generate ONLY Listening Part ${partNumber}. Do not include any other part.`
    : 'Generate all four Listening parts.';
  return `${RULES}

TASK: write IELTS Listening practice on the theme "${plan.topics.listening}".
${difficultyLine(plan.difficulty)}
${scope}

Listening structure:
- Part 1: an everyday conversation between two speakers (enquiry, booking or arrangement).
- Part 2: one speaker gives a public announcement, guided talk or instructions.
- Part 3: an academic discussion between two to four students and/or a tutor.
- Part 4: a single-speaker academic lecture.

For each requested part return:
- "partNumber": 1, 2, 3 or 4; "title": a short descriptive label; "instructions": one IELTS-style line.
- "transcript": 260–520 words of natural spoken English, with labels such as "Woman:", "Man:", "Tutor:" or "Dr Ahmed:". It is the ONLY source of answers; all answers must be clearly spoken.
- "questions": exactly 10 questions in the planned order below.

Planned types:
${partText}

Question rules:
- IDs run continuously from l${startId} to l${endId}; type must exactly match the planned sequence.
- Completion questions have a gap (______), an exact 1–4 word answer and wordLimit "NO MORE THAN TWO WORDS AND/OR A NUMBER".
- multiple-choice has 4 options and a single 0-based answer; multiple-choice-multi has 5 options and exactly two 0-based answers; matching has 5–7 options and one 0-based answer.
- Every question has a one-sentence explanation quoting the transcript. Numbers, names and dates are spoken clearly.

Return one valid JSON object only, shaped as:
{"listening":{"title":"Listening Practice Test","parts":[{"partNumber":${partNumber || 1},"title":"…","instructions":"…","transcript":"…","questions":[{"id":"l${startId}","type":"…","prompt":"…","options":["…"],"answer":0,"explanation":"…","wordLimit":"…"}]}]}}`;
}

function readingSystem(plan, passageNumber) {
  const selected = plan.questionPlan.reading.filter(p => !passageNumber || p.passage === passageNumber);
  const passageText = selected.map(p => `Passage ${p.passage}: exactly ${p.types.length} questions, in this order: ${JSON.stringify(p.types)}`).join('\n');
  const startId = passageNumber
    ? 1 + plan.questionPlan.reading.slice(0, passageNumber - 1).reduce((n, p) => n + p.types.length, 0)
    : 1;
  const questionCount = selected.reduce((n, p) => n + p.types.length, 0);
  const endId = startId + questionCount - 1;
  const scope = passageNumber
    ? `Generate ONLY Reading Passage ${passageNumber}. Do not include any other passage.`
    : 'Generate all three Reading passages.';
  const angle = passageNumber === 1 ? 'factual or descriptive' : passageNumber === 2 ? 'research or process' : 'argument, debate or application';
  return `${RULES}

TASK: write IELTS Academic Reading practice on "${plan.topics.reading}".
${difficultyLine(plan.difficulty)}
${scope}

Each requested passage needs:
- "passageNumber": 1, 2 or 3; an academic-style "title"; "difficulty": Easier, Medium or Harder (in order).
- 5–7 paragraph objects, each 110–170 words, with paragraph breaks between objects. Passage ${passageNumber || 1} should take a ${angle} angle on the theme.
- Exactly the planned questions in the given order.

Planned types:
${passageText}

Question rules:
- IDs run continuously from r${startId} to r${endId}; types match the planned sequence.
- true-false-not-given answers are TRUE/FALSE/NOT GIVEN; yes-no-not-given answers are YES/NO/NOT GIVEN.
- matching-headings uses 6–8 roman-numeral headings, including one unused example; answer is the correct 0-based index.
- summary-completion uses a gap and 1–3 answer words, with wordLimit "NO MORE THAN THREE WORDS AND/OR A NUMBER". Sentence-completion uses "NO MORE THAN TWO WORDS AND/OR A NUMBER".
- multiple-choice has 4 options and one 0-based answer; multiple-choice-multi has 5 options and exactly two 0-based answers; matching has 5–7 options and one 0-based answer.
- Every question has a one-sentence explanation naming the paragraph letter that proves it.

Return one valid JSON object only, shaped as:
{"reading":{"title":"Reading Practice Test","passages":[{"passageNumber":${passageNumber || 1},"title":"…","difficulty":"Easier","paragraphs":[{"text":"…"}],"questions":[{"id":"r${startId}","type":"…","prompt":"…","options":["…"],"answer":"TRUE","explanation":"…"}]}]}}`;
}

function writingSystem(plan) {
  return `${RULES}

TASK: write the WRITING section of a full IELTS Academic mock test.
${difficultyLine(plan.difficulty)}

Task 1 (Academic, 20 minutes, minimum 150 words):
- "prompt": a full Task 1 instruction that names the visual and the three required moves (select, report, compare).
- "visualType": one of "Bar chart", "Line graph", "Pie charts", "Table", "Process diagram", "Map", "Mixed charts".
- "chartData": the underlying data as plain text, one series per line, e.g. "Country A: 8% (2015), 12% (2019), 41% (2021), 33% (2025)". This is what the candidate sees, so it must be complete and internally consistent.
- "chartSpec": a machine-readable version of the same data:
    { "chartType": "bar" | "line" | "pie" | "table", "title": "…", "unit": "%" | "number" | "£" | "…",
      "labels": ["2015", "2019", "2021", "2025"],
      "series": [ { "name": "Country A", "values": [8, 12, 41, 33] } ] }
  Use 1–3 series and 3–6 labels; every value must match chartData exactly.

Task 2 (20 minutes planning + 40 minutes writing, minimum 250 words):
- "prompt": a genuine IELTS opinion/discussion/problem-solution prompt on the theme "${plan.topics.writing}" that the app can grade (it must state a clear position question).
- "criteria": "Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy."

Return exactly:
{
  "writing": {
    "title": "Writing Practice Test",
    "tasks": [
      { "taskNumber": 1, "title": "Task 1", "minutes": 20, "minWords": 150,
        "prompt": "…", "visualType": "…", "chartData": "…", "chartSpec": { … } },
      { "taskNumber": 2, "title": "Task 2", "minutes": 40, "minWords": 250,
        "prompt": "…", "criteria": "…" }
    ]
  }
}`;
}

function speakingSystem(plan) {
  return `${RULES}

TASK: write the SPEAKING section of a full IELTS mock test. Theme for the whole section: "${plan.topics.speaking}".
${difficultyLine(plan.difficulty)}

- Part 1 (4–5 minutes): three familiar topic areas (they may sit around the theme, plus one everyday area such as work/study or hometown). Each topic has a "title" and 3–4 short, answerable questions.
- Part 2 (3–4 minutes): a cue card. "topic" starts with "Describe …". "bullets" is exactly 3 or 4 prompts (the last one usually starts with "and explain …"). Timers are fixed: prepSeconds 60, talkSeconds 120.
- Part 3 (4–5 minutes): 5–6 abstract, analytical discussion questions that follow naturally from the Part 2 theme (comparison, prediction, evaluation, society-level thinking).

Return exactly:
{
  "speaking": {
    "title": "Speaking Practice Test",
    "parts": [
      { "partNumber": 1, "title": "Part 1 — Introduction and interview", "minutes": "4–5",
        "topics": [ { "title": "…", "questions": ["…", "…", "…"] } ] },
      { "partNumber": 2, "title": "Part 2 — Individual long turn (cue card)", "minutes": "3–4",
        "prepSeconds": 60, "talkSeconds": 120, "topic": "Describe …", "bullets": ["…", "…", "…"] },
      { "partNumber": 3, "title": "Part 3 — Two-way discussion", "minutes": "4–5",
        "linkedTopic": "short restatement of the Part 2 theme", "questions": ["…", "…", "…", "…"] }
    ]
  }
}`;
}

/* ------------------------------------------------------------------
 * NORMALISERS — turn model output into the exact payload shape the
 * admin editor, the validator and the learner runner expect.
 * ------------------------------------------------------------------ */
function firstQuestionId(skill) { return skill === 'reading' ? 'r' : 'l'; }

const OPTION_TYPES = ['multiple-choice', 'multiple-choice-multi', 'matching', 'matching-headings', 'map-labelling'];

/* Shape one answer to a question type. Used both when normalising the
   model output and when the planned type replaces the model's own. */
function coerceAnswer(raw, type) {
  if (OPTION_TYPES.includes(type)) {
    if (type === 'multiple-choice-multi') {
      const picks = (Array.isArray(raw) ? raw : [raw]).map(n => Number(n)).filter(n => Number.isInteger(n));
      return picks.length ? picks.slice(0, 2) : [0, 1];
    }
    const first = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(first);
    return Number.isInteger(n) ? n : 0;
  }
  if (type === 'yes-no-not-given') {
    return /^NO$/i.test(str(raw)) ? 'NO' : /^NOT GIVEN$/i.test(str(raw)) ? 'NOT GIVEN' : 'YES';
  }
  if (type === 'true-false-not-given') {
    return /^FALSE$/i.test(str(raw)) ? 'FALSE' : /^NOT GIVEN$/i.test(str(raw)) ? 'NOT GIVEN' : 'TRUE';
  }
  return str(raw);
}

/* Can this answer honestly carry the given type? A type swap is only
   safe when the model's own answer already fits it — an invented answer
   key is far worse than a slightly different question type. */
function answerFitsType(q, type) {
  if (OPTION_TYPES.includes(type)) {
    const options = (q.options || []).map(x => str(x)).filter(Boolean);
    if (options.length < 2) return false;
    const answer = coerceAnswer(q.answer, type);
    const indexes = Array.isArray(answer) ? answer : [answer];
    if (type === 'multiple-choice-multi') {
      /* "choose TWO" needs two real answers, never an invented one */
      return Array.isArray(q.answer) && q.answer.length >= 2
        && indexes.every(n => Number.isInteger(n) && n >= 0 && n < options.length);
    }
    return indexes.every(n => Number.isInteger(n) && n >= 0 && n < options.length);
  }
  if (type === 'true-false-not-given' || type === 'yes-no-not-given') {
    return /^(TRUE|FALSE|NOT GIVEN|YES|NO)$/i.test(str(q.answer));
  }
  const answer = str(q.answer);
  return answer.length > 0 && answer.length <= 60;
}

/* A "choose TWO" question the model only gave one answer for is turned
   into an ordinary single-answer question, so the saved payload is always
   valid instead of shipping a broken answer key. */
function repairMulti(question) {
  if (question.type !== 'multiple-choice-multi') return question;
  const options = (question.options || []).map(x => str(x)).filter(Boolean);
  const picks = (Array.isArray(question.answer) ? question.answer : [question.answer])
    .map(n => Number(n))
    .filter(n => Number.isInteger(n) && n >= 0 && n < options.length);
  const unique = [];
  picks.forEach(n => { if (!unique.includes(n)) unique.push(n); });
  if (unique.length === 2) return question;
  return { ...question, type: 'multiple-choice', answer: unique.length ? unique[0] : 0 };
}

/* Re-apply the planned type sequence to however many questions the
   model actually produced, so a slightly short answer still lands on
   valid, varied types instead of one repeated type. */
function reconcileTypes(questions, planTypes) {
  const types = Array.isArray(planTypes) && planTypes.length ? planTypes : null;
  return questions.map((q, i) => {
    const wanted = types ? types[i % types.length] : q.type;
    const type = wanted === q.type || answerFitsType(q, wanted) ? wanted : q.type;
    const next = repairMulti({ ...q, type, answer: coerceAnswer(q.answer, type) });
    if (/completion/.test(next.type) && !str(next.wordLimit)) {
      next.wordLimit = next.type === 'summary-completion'
        ? 'NO MORE THAN THREE WORDS AND/OR A NUMBER'
        : 'NO MORE THAN TWO WORDS AND/OR A NUMBER';
    }
    return next;
  });
}

function normalizeQuestion(q, id, skill) {
  const type = str(q.type) || (skill === 'reading' ? 'true-false-not-given' : 'sentence-completion');
  const out = {
    id,
    type,
    prompt: str(q.prompt),
    answer: coerceAnswer(q.answer, type),
    explanation: str(q.explanation)
  };
  /* options are kept whenever the model supplied them, even for
     non-option questions, so a planned type swap can still be honoured */
  const options = (Array.isArray(q.options) ? q.options : []).map(x => str(x)).filter(Boolean);
  if (options.length) out.options = options;
  if (/completion/.test(type)) {
    out.wordLimit = str(q.wordLimit) || (type === 'summary-completion'
      ? 'NO MORE THAN THREE WORDS AND/OR A NUMBER'
      : 'NO MORE THAN TWO WORDS AND/OR A NUMBER');
  }
  return out;
}

function normalizeListening(parsed, plan) {
  const section = parsed.listening || parsed;
  const rawParts = Array.isArray(section.parts) ? section.parts : [];
  if (rawParts.length !== 4) {
    throw new Error(`Listening needs exactly 4 parts — the model produced ${rawParts.length}. Please generate the section again.`);
  }
  let qn = 0;
  const parts = rawParts.map((part, i) => {
    const planned = plan.questionPlan.listening[i] || { types: [] };
    const questions = reconcileTypes(
      (Array.isArray(part.questions) ? part.questions : []).map(q => normalizeQuestion(q, 'x', 'listening')),
      planned.types
    );
    if (questions.length < 8) {
      throw new Error(`Listening Part ${i + 1} only has ${questions.length} questions (10 expected). Please generate the section again.`);
    }
    const transcript = str(part.transcript);
    if (transcript.length < 120) {
      throw new Error(`Listening Part ${i + 1} transcript is too short. Please generate the section again.`);
    }
    return {
      id: 'lp' + (i + 1),
      partNumber: i + 1,
      title: str(part.title) || `Part ${i + 1}`,
      instructions: str(part.instructions) || `Questions ${qn + 1}–${qn + questions.length}. You will hear this recording ONCE.`,
      transcript,
      audioUrl: '',
      audioPath: '',
      questions: questions.map(q => ({ ...q, id: 'l' + (++qn) }))
    };
  });
  return {
    id: 'listening-custom',
    title: str(section.title) || 'Listening Practice Test',
    skill: 'Listening',
    duration: 30,
    parts
  };
}

function normalizeReading(parsed, plan) {
  const section = parsed.reading || parsed;
  const rawPassages = Array.isArray(section.passages) ? section.passages : [];
  if (rawPassages.length !== 3) {
    throw new Error(`Reading needs exactly 3 passages — the model produced ${rawPassages.length}. Please generate the section again.`);
  }
  let qn = 0;
  const passages = rawPassages.map((passage, i) => {
    const planned = plan.questionPlan.reading[i] || { types: [] };
    const paragraphs = (Array.isArray(passage.paragraphs) ? passage.paragraphs : [])
      .map(row => str(row && row.text))
      .filter(Boolean);
    const text = paragraphs.length ? paragraphs.join('\n\n') : str(passage.text);
    if (text.length < 400) {
      throw new Error(`Reading Passage ${i + 1} is too short. Please generate the section again.`);
    }
    const questions = reconcileTypes(
      (Array.isArray(passage.questions) ? passage.questions : []).map(q => normalizeQuestion(q, 'x', 'reading')),
      planned.types
    );
    if (questions.length < 10) {
      throw new Error(`Reading Passage ${i + 1} only has ${questions.length} questions. Please generate the section again.`);
    }
    return {
      id: 'rp' + (i + 1),
      passageNumber: i + 1,
      title: str(passage.title) || `Passage ${i + 1}`,
      difficulty: str(passage.difficulty) || ['Easier', 'Medium', 'Harder'][i],
      text,
      paragraphs: paragraphs.map((t, j) => ({ label: String.fromCharCode(65 + j), text: t })),
      questions: questions.map(q => ({ ...q, id: 'r' + (++qn) }))
    };
  });
  return {
    id: 'reading-custom',
    title: str(section.title) || 'Reading Practice Test',
    skill: 'Reading',
    duration: 60,
    format: 'Academic',
    passages
  };
}

function normalizeWriting(parsed) {
  const section = parsed.writing || parsed;
  const tasks = Array.isArray(section.tasks) ? section.tasks : [];
  if (tasks.length < 2) {
    throw new Error('Writing needs Task 1 and Task 2 — please generate the section again.');
  }
  const t1 = tasks[0] || {};
  const t2 = tasks[1] || {};
  const chartSpec = t1.chartSpec && typeof t1.chartSpec === 'object'
    ? {
        chartType: ['bar', 'line', 'pie', 'table'].includes(str(t1.chartSpec.chartType)) ? str(t1.chartSpec.chartType) : 'bar',
        title: str(t1.chartSpec.title) || 'Task 1 data',
        unit: str(t1.chartSpec.unit),
        labels: (Array.isArray(t1.chartSpec.labels) ? t1.chartSpec.labels : []).map(x => str(x)).filter(Boolean),
        series: (Array.isArray(t1.chartSpec.series) ? t1.chartSpec.series : [])
          .filter(s => s && Array.isArray(s.values))
          .slice(0, 3)
          .map(s => ({ name: str(s.name) || 'Series', values: s.values.map(v => Number(v)).filter(v => Number.isFinite(v)) }))
      }
    : null;
  return {
    id: 'writing-custom',
    title: str(section.title) || 'Writing Practice Test',
    skill: 'Writing',
    format: 'Academic',
    duration: 60,
    tasks: [
      {
        id: 'w1', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
        prompt: str(t1.prompt),
        visualType: str(t1.visualType) || 'Bar chart',
        imageUrl: '', imagePath: '',
        chartData: str(t1.chartData),
        chartSpec,
        criteria: 'Task Achievement · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
      },
      {
        id: 'w2', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
        prompt: str(t2.prompt),
        criteria: str(t2.criteria) || 'Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy.'
      }
    ]
  };
}

function normalizeSpeaking(parsed) {
  const section = parsed.speaking || parsed;
  const parts = Array.isArray(section.parts) ? section.parts : [];
  if (parts.length !== 3) {
    throw new Error('Speaking needs Parts 1, 2 and 3 — please generate the section again.');
  }
  const p1 = parts[0] || {};
  const p2 = parts[1] || {};
  const p3 = parts[2] || {};
  const topics = (Array.isArray(p1.topics) ? p1.topics : [])
    .map(topic => ({
      title: str(topic && topic.title) || 'Topic',
      questions: (Array.isArray(topic && topic.questions) ? topic.questions : []).map(q => str(q)).filter(Boolean)
    }))
    .filter(topic => topic.questions.length);
  if (topics.length < 3) {
    throw new Error('Speaking Part 1 needs 3 topic areas — please generate the section again.');
  }
  const bullets = (Array.isArray(p2.bullets) ? p2.bullets : []).map(b => str(b)).filter(Boolean);
  if (!str(p2.topic) || bullets.length < 3) {
    throw new Error('Speaking Part 2 needs a cue-card topic and 3–4 bullets — please generate the section again.');
  }
  const discussion = (Array.isArray(p3.questions) ? p3.questions : []).map(q => str(q)).filter(Boolean);
  if (discussion.length < 3) {
    throw new Error('Speaking Part 3 needs at least 3 discussion questions — please generate the section again.');
  }
  return {
    id: 'speaking-custom',
    title: str(section.title) || 'Speaking Practice Test',
    skill: 'Speaking',
    duration: 14,
    parts: [
      {
        id: 'sp1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4–5',
        topics,
        questions: topics.flatMap(topic => topic.questions)
      },
      {
        id: 'sp2', partNumber: 2, title: 'Part 2 — Individual long turn (cue card)', minutes: '3–4',
        prepSeconds: 60, talkSeconds: 120,
        topic: str(p2.topic),
        bullets
      },
      {
        id: 'sp3', partNumber: 3, title: 'Part 3 — Two-way discussion', minutes: '4–5',
        linkedTopic: str(p3.linkedTopic) || str(p2.topic),
        questions: discussion
      }
    ]
  };
}

function countQuestions(payload) {
  const blocks = payload.parts || payload.passages || payload.tasks || [];
  return blocks.reduce((sum, b) => sum + ((b && b.questions && b.questions.length) || 0), 0);
}

/* ------------------------------------------------------------------
 * Supabase Storage — upload with the admin's own access token so the
 * existing "only admins may write" storage policies stay in force.
 * ------------------------------------------------------------------ */
function supabaseConfig() {
  const url = str(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = str(process.env.SUPABASE_ANON_KEY);
  return url && key ? { url, key } : null;
}

function accessTokenFrom(req, body) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (header && /^Bearer\s+(.+)/i.test(header)) return header.replace(/^Bearer\s+/i, '').trim();
  return str(body && body.accessToken);
}

async function uploadToStorage(config, token, path, buffer, mime) {
  const res = await fetch(`${config.url}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.key,
      'Content-Type': mime,
      'x-upsert': 'false'
    },
    body: buffer
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    const err = new Error(`Supabase Storage rejected the upload (${res.status}): ${text}`);
    err.status = res.status;
    throw err;
  }
  return `${config.url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

function storagePath(testId, partNumber, ext) {
  const safeTest = str(testId).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'test';
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `audio/${safeTest}-listening-part${partNumber}-${stamp}-${rand}.${ext}`;
}

/* ------------------------------------------------------------------
 * HANDLER
 * ------------------------------------------------------------------ */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed — POST the generation request.' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ ok: false, error: 'Too many generation requests. Wait a few minutes and try again.' });
    return;
  }
  const body = req.body || {};
  const mode = body.mode === 'audio' ? 'audio' : 'section';

  /* ---------------- audio mode ---------------- */
  if (mode === 'audio') {
    const transcript = str(body.transcript);
    if (transcript.length < 40) {
      res.status(400).json({ ok: false, error: 'A transcript of at least 40 characters is required to synthesise audio.' });
      return;
    }
    try {
      const audio = await tts.synthesize(transcript, {
        voice: body.voice || undefined,
        transport: body.transport || undefined
      });
      const token = accessTokenFrom(req, body);
      const config = supabaseConfig();
      if (token && config) {
        try {
          const path = storagePath(body.testId, body.partNumber, audio.ext);
          const url = await uploadToStorage(config, token, path, audio.buffer, audio.mime);
          res.status(200).json({
            ok: true,
            audio: { source: audio.source, mime: audio.mime, ext: audio.ext, bytes: audio.buffer.length, url, path },
            storage: 'supabase'
          });
          return;
        } catch (err) {
          /* fall back to returning the bytes so the browser can upload */
          res.status(200).json({
            ok: true,
            audio: {
              source: audio.source, mime: audio.mime, ext: audio.ext, bytes: audio.buffer.length,
              base64: audio.buffer.toString('base64')
            },
            storage: 'client',
            uploadWarning: err.message
          });
          return;
        }
      }
      res.status(200).json({
        ok: true,
        audio: {
          source: audio.source, mime: audio.mime, ext: audio.ext, bytes: audio.buffer.length,
          base64: audio.buffer.toString('base64')
        },
        storage: 'client'
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        code: 'TTS_FAILED',
        error: 'Audio could not be generated: ' + err.message,
        hint: 'The section was still generated — you can upload an MP3 for this part in the test editor.'
      });
    }
    return;
  }

  /* ---------------- section mode ---------------- */
  if (!aiClient.isConfigured()) {
    res.status(500).json({
      ok: false,
      code: 'GROQ_KEY_MISSING',
      error: 'GROQ_API_KEY is not set on the server.',
      message: 'Iltimos, avval GROQ_API_KEY sozlang — AI generator ishlashi uchun Groq API kaliti kerak.',
      hint: 'Add GROQ_API_KEY in Vercel → Project → Settings → Environment Variables (get a key at https://console.groq.com/keys), then redeploy.'
    });
    return;
  }

  const skill = str(body.skill).toLowerCase();
  if (!SKILLS.includes(skill)) {
    res.status(400).json({ ok: false, error: `Unknown skill "${body.skill}". Expected one of: ${SKILLS.join(', ')}.` });
    return;
  }

  /* The plan decides topics and the question-type mix. The browser sends
     the plan it already built (so the modal can show it); a missing or
     stale plan is rebuilt here — the pool is the single source of truth. */
  const plan = body.plan && body.plan.topics && body.plan.questionPlan
    ? body.plan
    : buildPlan({ difficulty: body.difficulty, topic: body.topic });

  /* Strict IELTS boundary (lib/aiGuardrails.js). The admin may type any
     theme into the modal, so an obviously out-of-scope one is refused with
     the same sentence the other AI endpoints use. The pool themes all
     pass this check — tests/aiGuardrails.test.js pins that. */
  if (guard.isLikelyOffTopic([body.topic, body.label].filter(Boolean).join('\n'))) {
    res.status(400).json({
      ok: false,
      code: guard.OFF_TOPIC,
      error: guard.REFUSAL_MESSAGE,
      message: guard.REFUSAL_MESSAGE
    });
    return;
  }

  try {
    const context = [
      `Test label: ${str(body.label) || 'Practice Test'}`,
      `Test id: ${str(body.testId) || 'test?'}`,
      `Difficulty: ${plan.difficulty}`,
      plan.forcedTopic
        ? `Requested theme (use it for the whole section): ${plan.forcedTopic}`
        : `Theme chosen for this section: ${plan.topics[skill]}`
    ].join('\n');

    const { parsed, usage } = await generateSkill(skill, plan, context);

    const payload = skill === 'listening' ? normalizeListening(parsed, plan)
      : skill === 'reading' ? normalizeReading(parsed, plan)
        : skill === 'writing' ? normalizeWriting(parsed)
          : normalizeSpeaking(parsed);

    res.status(200).json({
      ok: true,
      skill,
      payload,
      plan: {
        difficulty: plan.difficulty,
        topics: plan.topics,
        forcedTopic: plan.forcedTopic,
        questionPlan: plan.questionPlan,
        seed: plan.seed
      },
      counts: {
        questions: countQuestions(payload),
        blocks: (payload.parts || payload.passages || payload.tasks || []).length
      },
      usage
    });
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? 502 : 500;
    res.status(status).json({
      ok: false,
      code: 'GENERATION_FAILED',
      error: err.message || 'Generation failed.',
      hint: 'Try again — a higher temperature occasionally returns an incomplete section. If it keeps failing, shorten the requested theme or switch the difficulty.'
    });
  }
};

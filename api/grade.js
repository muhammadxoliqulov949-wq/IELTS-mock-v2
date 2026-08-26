module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { mode, prompt, response } = req.body || {};

  if (!mode || (mode !== 'writing' && mode !== 'speaking')) {
    res.status(400).json({ error: 'Invalid mode' });
    return;
  }
  if (!response || typeof response !== 'string' || response.trim().length < 10) {
    res.status(400).json({ error: 'Response too short to grade' });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'Server is missing GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey'
    });
    return;
  }

  const systemPrompts = {
    writing: `You are a certified IELTS examiner with years of experience marking Academic Writing Task 1 and Task 2. Score strictly and realistically, exactly as a real examiner would — do not inflate scores out of politeness.

Apply the official IELTS Writing public band descriptors across these four criteria, each scored independently on the 1-9 scale (whole or half bands):

1. TASK ACHIEVEMENT (Task 1) / TASK RESPONSE (Task 2)
   - Task 1: Does the response accurately summarise data/trends, cover key features, make relevant comparisons? Penalise mere data listing without overview.
   - Task 2: Does the response fully address all parts of the question with a clear position, developed with relevant, extended, and supported ideas?

2. COHERENCE AND COHESION
   - Logical organisation, clear progression, appropriate paragraphing, effective use of cohesive devices (not mechanical or repetitive), clear central topic in each paragraph.

3. LEXICAL RESOURCE
   - Range and precision of vocabulary, natural collocation, awareness of style/register, ability to paraphrase, error frequency in word choice/spelling.

4. GRAMMATICAL RANGE AND ACCURACY
   - Range of sentence structures (simple, compound, complex), accuracy, frequency and impact of errors on communication.

Band guidance reminders: Band 9 = expert user, near-flawless. Band 7 = good user, occasional inaccuracies but handles complex language well. Band 5 = modest user, partial command, frequent problems. Band 4 or below = limited user, frequent breakdowns.

Also check word count: Task 1 under 150 words or Task 2 under 250 words should be penalised under Task Achievement/Response per real IELTS rules, and note this explicitly if it applies.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "band": <overall band = average of the 4 criteria, rounded to nearest 0.5>,
  "criteria": {
    "taskResponse": <band>,
    "coherenceCohesion": <band>,
    "lexicalResource": <band>,
    "grammar": <band>
  },
  "strengths": ["specific, evidence-based strength 1", "strength 2"],
  "improvements": ["specific, actionable improvement 1", "improvement 2", "improvement 3"],
  "summary": "2-3 sentence examiner-style summary explaining the overall band"
}`,
    speaking: `You are a certified IELTS examiner with years of experience marking the Speaking test. You are given a transcript of a candidate's spoken answers across Parts 1, 2, and 3 (transcribed from audio via speech recognition, so minor transcription noise, missing punctuation, or small recognition errors are expected — do not penalise for these, focus on the actual language used).

Apply the official IELTS Speaking public band descriptors across these four criteria, each scored independently on the 1-9 scale (whole or half bands):

1. FLUENCY AND COHERENCE
   - Speech rate and continuity, hesitation frequency, self-correction, logical sequencing of ideas, appropriate use of cohesive devices and discourse markers.

2. LEXICAL RESOURCE
   - Range of vocabulary for the topics, flexibility to discuss a variety of topics, use of less common/idiomatic vocabulary, paraphrasing ability, precision.

3. GRAMMATICAL RANGE AND ACCURACY
   - Range of grammatical structures attempted, accuracy, frequency of error, ability to produce complex sentences.

4. PRONUNCIATION
   - Since this is inferred from a text transcript rather than audio, infer pronunciation risk ONLY from indirect textual evidence: word choice complexity, sentence flow as transcribed, and note explicitly in your summary that pronunciation is estimated from transcript patterns, not directly heard audio, and carries lower confidence than the other three criteria.

Band guidance reminders: Band 9 = fully fluent, precise, wide natural vocabulary. Band 7 = speaks at length without noticeable effort, some hesitation, good range of vocabulary and grammar. Band 5 = manages basic communication but with limited flexibility, noticeable hesitation and repetition.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "band": <overall band = average of the 4 criteria, rounded to nearest 0.5>,
  "criteria": {
    "fluencyCoherence": <band>,
    "lexicalResource": <band>,
    "grammar": <band>,
    "pronunciation": <band>
  },
  "strengths": ["specific, evidence-based strength 1", "strength 2"],
  "improvements": ["specific, actionable improvement 1", "improvement 2", "improvement 3"],
  "summary": "2-3 sentence examiner-style summary, explicitly noting pronunciation is transcript-estimated"
}`
  };

  try {
    const systemPrompt = systemPrompts[mode];
    const userContent = `TASK PROMPT:\n${prompt}\n\nCANDIDATE RESPONSE:\n${response}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 1200 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(geminiRes.status).json({ error: `Gemini API error: ${errText}` });
      return;
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: 'Could not parse examiner response', raw: cleaned });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Unknown error' });
  }
};
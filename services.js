window.IELTS_SERVICES = {
  /* Official IELTS conversion table (Listening/Reading): raw score → band */
  bandFromRaw(raw, total) {
    const pct = total ? raw / total : 0;
    const scaled = Math.round(pct * 40);
    const table = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3]];
    for (const [min, band] of table) if (scaled >= min) return band;
    return 2.5;
  },

  /* Tolerant text normalisation: lowercase, punctuation removed, articles stripped */
  normalizeAnswer(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[^a-z0-9'\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(the|a|an)\s+/, '');
  },

  isCorrect(question, given) {
    if (given === undefined || given === null || given === '') return false;
    if (question.type === 'multiple-choice') return Number(given) === Number(question.answer);
    if (question.type === 'true-false-not-given') return String(given).trim().toUpperCase() === String(question.answer).toUpperCase();
    /* open text answers: tolerant match (e.g. "a utility bill" ≈ "utility bill", "£42" ≈ "42") */
    return this.normalizeAnswer(given) === this.normalizeAnswer(question.answer);
  },

  /* ---------- premium helpers ---------- */

  /* Return the content object for a test id (test1/test2/test3/...) and a skill. */
  getSkillContent(skill, testId) {
    const c = window.IELTS_CONTENT || {};
    const id = testId || 'test1';
    const n = /^test(\d+)$/.exec(id);
    if (!n) return c[skill];
    const suffix = n[1] === '1' ? '' : n[1];
    return c[skill + suffix] || c[skill];
  },

  /* Return the human test label (localised when possible). */
  testLabel(testId, lang) {
    const c = window.IELTS_CONTENT || {};
    const meta = c.testMeta || {};
    const found = (meta.tests || []).find(t => t.id === (testId || 'test1'));
    if (!found) return 'IELTS Mock';
    const key = lang === 'uz' ? 'labelUz' : 'label';
    return found[key] || found.label;
  },

  /* Produce an explanation for a question.
   * Priority: question-specific explanation → curated test-1 extras → generic hint.
   */
  explanationFor(question, section, index) {
    const c = window.IELTS_CONTENT || {};
    const extra = (c.extraExplanations || {})[question.id];
    if (question.explanation) return question.explanation;
    if (extra) return extra;
    if (question.type === 'multiple-choice') {
      const opt = question.options ? question.options[question.answer] : '';
      return `The correct answer is option ${String.fromCharCode(65 + Number(question.answer))}: ${opt}. ${section}.`;
    }
    if (question.type === 'true-false-not-given') {
      return `The answer is ${question.answer}. Re-read the part of the passage that matches this statement.`;
    }
    return `The correct answer is "${question.answer}". Check the exact words in the source text.`;
  },

  /* Band trend across an attempt list (newest first), including date labels. */
  bandTrend(attempts) {
    const sorted = [...attempts].sort((a, b) => a.date - b.date);
    return sorted.map((a, i) => ({ i, label: new Date(a.date).toLocaleDateString(), band: Number(a.band) || 0, section: a.section }));
  },

  /* Compute overall estimated band from the latest attempt per section. */
  overallBand(attempts) {
    const sections = ['listening', 'reading', 'writing', 'speaking'];
    const latest = {};
    attempts.forEach(a => { latest[a.section] = a; });
    const bands = sections.map(s => latest[s] ? Number(latest[s].band) : null).filter(b => b !== null && Number.isFinite(b));
    if (!bands.length) return null;
    return Math.round((bands.reduce((s, b) => s + b, 0) / bands.length) * 2) / 2;
  },

  /* Study-minutes estimate: 30 min per objective section, 60 for writing, 14 for speaking. */
  studyMinutes(attempts) {
    const map = { listening: 30, reading: 60, writing: 60, speaking: 14 };
    return attempts.reduce((s, a) => s + (map[a.section] || 20), 0);
  },

  /* Weekly activity: counts attempts per day over the last 7 days. */
  weeklyActivity(attempts) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const count = attempts.filter(a => { const x = new Date(a.date); x.setHours(0, 0, 0, 0); return x.getTime() === d.getTime(); }).length;
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), count });
    }
    const max = Math.max(1, ...days.map(d => d.count));
    return days.map(d => ({ ...d, pct: Math.round((d.count / max) * 100) }));
  },

  /* Build a personal plan from the strongest and weakest sections. */
  personalPlan(attempts) {
    const sections = ['listening', 'reading', 'writing', 'speaking'];
    const latest = {};
    attempts.forEach(a => { latest[a.section] = a; });
    const scored = sections.map(s => ({ s, band: latest[s] ? Number(latest[s].band) : null })).filter(x => x.band !== null);
    if (!scored.length) return [];
    const sorted = [...scored].sort((a, b) => a.band - b.band);
    const weakest = sorted[0].s;
    const strongest = sorted[sorted.length - 1].s;
    return [
      { day: 'Day 1', title: `${weakest} warm-up`, detail: '20 minutes of focused practice on your weakest skill.' },
      { day: 'Day 2', title: 'Mistake review', detail: 'Work through your Mistake Notebook one question at a time.' },
      { day: 'Day 3', title: `${strongest} stamina`, detail: 'Keep your strongest skill sharp with a short timed block.' },
      { day: 'Day 4', title: 'Full mock', detail: 'Complete one full mock in exam conditions.' },
      { day: 'Day 5', title: 'AI coach chat', detail: 'Ask the coach to review your plan and adjust it.' },
      { day: 'Day 6', title: 'Rest + light reading', detail: 'Read one IELTS-style passage; sleep is part of training.' }
    ];
  },

  /* Pick 4 random quiz questions for a quick round. */
  quizFrom(bank, n = 4) {
    const qs = (bank && bank.questions) || [];
    const shuffle = [...qs].sort(() => Math.random() - 0.5);
    return shuffle.slice(0, Math.max(1, Math.min(n, qs.length)));
  },

  /* Vocab mastery %: words the user marked known / total. */
  vocabMastery(known, total) {
    return total ? Math.round((known / total) * 100) : 0;
  }
};

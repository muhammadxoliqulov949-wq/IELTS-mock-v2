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

  /* Index-style question types: the answer is the position of the correct
     option (a number, or a letter like "B" in hand-written JSON). */
  isIndexType(type) {
    return ['multiple-choice', 'matching', 'map-labelling', 'matching-headings'].includes(type);
  },

  /* Accept 2, "2", "B", [0,2], "0,2", "A,C" and always return numbers. */
  toIndexList(value) {
    if (Array.isArray(value)) return value.map(v => this.toIndexList(v)).flat().filter(v => Number.isFinite(v));
    const letter = /^([a-z])$/i.exec(String(value || '').trim());
    if (letter) return [letter[1].toUpperCase().charCodeAt(0) - 65];
    return String(value == null ? '' : value)
      .split(/[,;|\s]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => {
        const l = /^([a-z])$/i.exec(x);
        if (l) return l[1].toUpperCase().charCodeAt(0) - 65;
        const n = Number(x);
        return Number.isFinite(n) ? n : NaN;
      })
      .filter(n => Number.isFinite(n));
  },

  withinWordLimit(answer, rule) {
    const text = String(answer == null ? '' : answer).trim();
    const instruction = String(rule || '').toLowerCase();
    const limitMatch = /no more than\s+(one|two|three|four|five|\d+)\s+words?/.exec(instruction);
    if (!limitMatch) return true;
    const numbers = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const max = numbers[limitMatch[1]] || Number(limitMatch[1]);
    const tokens = text.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) || [];
    if (/and\/or\s+(?:a\s+)?number/.test(instruction)) {
      const numeric = tokens.filter(token => /\d/.test(token)).length;
      const words = tokens.length - numeric;
      return words <= max && numeric <= 1;
    }
    return tokens.length <= max;
  },

  isCorrect(question, given) {
    if (given === undefined || given === null || given === '') return false;
    const type = question.type;
    if (question.wordLimit && !this.isIndexType(type) && type !== 'multiple-choice-multi'
      && !this.withinWordLimit(given, question.wordLimit)) return false;
    /* Multi-answer multiple choice: every correct option and nothing else. */
    if (type === 'multiple-choice-multi' || (type === 'multiple-choice' && Array.isArray(question.answer))) {
      const want = this.toIndexList(question.answer);
      const got = this.toIndexList(given);
      return want.length > 0 && got.length === want.length && want.every(v => got.includes(v));
    }
    if (this.isIndexType(type)) return Number(this.toIndexList(given)[0]) === Number(this.toIndexList(question.answer)[0]);
    if (type === 'true-false-not-given' || type === 'yes-no-not-given') return String(given).trim().toUpperCase() === String(question.answer).trim().toUpperCase();
    /* open text answers (form/note/table, sentence, summary completion):
       tolerant match (e.g. "a utility bill" ≈ "utility bill", "£42" ≈ "42") */
    return this.normalizeAnswer(given) === this.normalizeAnswer(question.answer);
  },

  /* Human label for an answer, used by the mistake notebook and results:
     "B. Sports centre" for option questions, "A, C" for multi, text as-is. */
  answerLabel(question, value) {
    if (value === undefined || value === null || value === '') return '';
    const opts = question && question.options;
    const multi = (question && question.type === 'multiple-choice-multi') || (question && Array.isArray(question.answer)) || Array.isArray(value);
    if (multi && opts) {
      return this.toIndexList(value).map(i => `${String.fromCharCode(65 + i)}. ${opts[i] != null ? opts[i] : '?'}`).join(' · ');
    }
    if (this.isIndexType(question && question.type) && opts) {
      const i = this.toIndexList(value)[0];
      return opts && opts[i] != null ? `${String.fromCharCode(65 + i)}. ${opts[i]}` : String(value);
    }
    return Array.isArray(value) ? value.join(', ') : String(value);
  },

  /* ---------- premium helpers ---------- */

  /* Return the content object for a test id (test1/test2/test3/...) and a skill. */
  getSkillContent(skill, testId) {
    const c = window.IELTS_CONTENT || {};
    const id = testId || 'test1';
    const n = /^test(\d+)$/.exec(id);
    if (!n) return c[skill];
    const suffix = n[1] === '1' ? '' : n[1];
    const found = c[skill + suffix];
    if (found) return found;
    /* Legacy built-ins may safely fall back to Test 1. Admin-authored tests
       must never borrow another test's content if a skill is missing or has
       not loaded yet. */
    return Number(n[1]) <= 4 ? c[skill] : null;
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
    if (question.type === 'multiple-choice-multi') {
      const picks = this.toIndexList(question.answer).map(i => String.fromCharCode(65 + Number(i))).join(' and ');
      return `The correct options are ${picks}. Every one of them is stated in the ${section} material.`;
    }
    if (question.type === 'multiple-choice' || question.type === 'matching' || question.type === 'map-labelling' || question.type === 'matching-headings') {
      const opt = question.options ? question.options[Number(this.toIndexList(question.answer)[0])] : '';
      const noun = question.type === 'matching-headings' ? 'heading' : 'option';
      return `The correct answer is ${noun} ${String.fromCharCode(65 + Number(this.toIndexList(question.answer)[0]))}: ${opt}. ${section}.`;
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
    const bands = sections.map(s => latest[s] && latest[s].band != null ? Number(latest[s].band) : null).filter(b => b !== null && Number.isFinite(b));
    if (!bands.length) return null;
    return Math.round((bands.reduce((s, b) => s + b, 0) / bands.length) * 2) / 2;
  },

  /* Mock sections keep their familiar duration estimate; completed adaptive
     drills add their measured time from public.learning_activity. */
  studyMinutes(attempts, activities = []) {
    const map = { listening: 30, reading: 60, writing: 60, speaking: 14 };
    const mockMinutes = (attempts || []).reduce((sum, attempt) => sum + (map[attempt.section] || 20), 0);
    const drillSeconds = (activities || []).reduce((sum, activity) => {
      if (!activity || activity.kind !== 'drill') return sum;
      const seconds = Number(activity.duration_seconds ?? activity.durationSeconds) || 0;
      return sum + Math.max(0, Math.min(3600, seconds));
    }, 0);
    return mockMinutes + (drillSeconds ? Math.ceil(drillSeconds / 60) : 0);
  },

  /* Weekly activity includes scored mock sections plus Supabase learning
     events (quizzes, games, mocks and adaptive drills). The reference key
     collapses the local mock copy and its remote activity-trigger copy. */
  weeklyActivity(attempts, activities = []) {
    const events = new Map();
    const dateKey = item => {
      const raw = item && (item.activity_date || item.date || item.created_at);
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const value = new Date(raw || 0);
      return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
    };
    const add = (item, key, kind) => {
      const day = dateKey(item);
      if (!day) return;
      const eventKey = `${kind}:${key}:${day}`;
      if (!events.has(eventKey)) events.set(eventKey, day);
    };
    (attempts || []).forEach(attempt => {
      if (!attempt) return;
      add(attempt, `${attempt.test || 'test1'}:${attempt.section}`, 'mock');
    });
    (activities || []).forEach(activity => {
      if (!activity) return;
      const kind = String(activity.kind || 'activity');
      let reference = String(activity.reference || '');
      if (kind === 'mock') reference = reference.replace(/^mock:/, '');
      if (kind === 'drill') reference = reference.replace(/^adaptive:/, '');
      add(activity, reference || `${activity.skill || ''}:${activity.created_at || ''}`, kind);
    });
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(utcToday.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const count = [...events.values()].filter(day => day === key).length;
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }), count });
    }
    const max = Math.max(1, ...days.map(day => day.count));
    return days.map(day => ({ ...day, pct: Math.round((day.count / max) * 100) }));
  },

  /* Build a personal plan from the strongest and weakest sections. */
  personalPlan(attempts) {
    const sections = ['listening', 'reading', 'writing', 'speaking'];
    const latest = {};
    attempts.forEach(a => { latest[a.section] = a; });
    const scored = sections.map(s => ({ s, band: latest[s] && latest[s].band != null ? Number(latest[s].band) : null })).filter(x => x.band !== null);
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

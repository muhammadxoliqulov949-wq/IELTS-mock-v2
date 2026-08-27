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
  }
};

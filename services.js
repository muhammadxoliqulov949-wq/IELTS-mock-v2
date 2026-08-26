window.IELTS_SERVICES = {
  bandFromRaw(raw, total) {
    const pct = total ? raw / total : 0;
    const scaled = Math.round(pct * 40);
    const table = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3]];
    for (const [min, band] of table) if (scaled >= min) return band;
    return 2.5;
  },
  isCorrect(question, given) {
    if (given === undefined || given === null || given === '') return false;
    if (question.type === 'multiple-choice') return Number(given) === Number(question.answer);
    if (question.type === 'true-false-not-given') return String(given).trim().toUpperCase() === String(question.answer).toUpperCase();
    const expected = String(question.answer).trim().toLowerCase();
    const g = String(given).trim().toLowerCase();
    return g === expected;
  }
};
const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
function bandValue(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 9 && value * 2 === Math.round(value * 2) ? value : null;
}
function sectionKey(a) { return `${a.test || 'test1'}:${a.section}`; }
function sectionPayload(a, name) {
  if (!SKILLS.includes(a.section) || !/^test[1-9]\d?$/.test(a.test || 'test1')) throw new Error('Invalid mock test or section.');
  if (!Number.isFinite(a.date)) throw new Error('Invalid result date.');
  const details = { date: a.date, timedOut: !!a.timedOut };
  if (Number.isFinite(a.raw)) details.raw = a.raw;
  if (Number.isFinite(a.total)) details.total = a.total;
  if (a.feedback) details.feedback = a.feedback;
  return {
    p_test_id: a.test || 'test1', p_section: a.section, p_band: bandValue(a.band),
    p_name: String(name || 'User').slice(0, 200), p_details: details
  };
}
function fingerprint(a) { return JSON.stringify(sectionPayload(a, '')); }
function rowsToAttempts(rows) {
  return rows.flatMap(row => SKILLS.filter(s => row.scores && row.scores[s]).map(section => {
    const d = row.scores[section];
    const attempt = {
      section, test: row.test_id, band: bandValue(row[section]),
      date: Number(d.date) || Date.parse(row.updated_at), timedOut: !!d.timedOut
    };
    if (Number.isFinite(d.raw)) attempt.raw = d.raw;
    if (Number.isFinite(d.total)) attempt.total = d.total;
    if (d.feedback && typeof d.feedback === 'object') attempt.feedback = d.feedback;
    return attempt;
  }));
}
module.exports = { SKILLS, bandValue, sectionKey, sectionPayload, fingerprint, rowsToAttempts };

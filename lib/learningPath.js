/* Pure, shared learning helpers. Works in a browser and in Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IELTS_LEARNING_PATH = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const STAGES = ['A1-A2', 'A2-B1', 'B1-B2', 'B2-C1'];
  const DAY = 86400000;
  const utcDay = now => Math.floor(new Date(now === undefined ? Date.now() : now).getTime() / DAY);
  function dateDay(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return NaN;
    return Math.floor(Date.parse(date + 'T00:00:00Z') / DAY);
  }
  function effectiveStreak(profile, now) {
    const today = utcDay(now), last = dateDay(profile && profile.last_active_date);
    return last >= today - 1 && last <= today ? Math.max(0, Number(profile.current_streak) || 0) : 0;
  }
  function activeToday(profile, now) { return dateDay(profile && profile.last_active_date) === utcDay(now); }
  function orderedTopics(topics) {
    return (topics || []).slice().sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)
      || Number(a.order_index) - Number(b.order_index) || String(a.id).localeCompare(String(b.id), 'en'));
  }
  function isUnlocked(topicId, topics, progress) {
    const ordered = orderedTopics(topics), index = ordered.findIndex(topic => topic.id === topicId);
    if (index < 0) return false;
    if (progress && progress[topicId] && progress[topicId].is_completed) return true;
    return ordered.slice(0, index).every(topic => progress && progress[topic.id] && progress[topic.id].is_completed);
  }
  function streakWeek(profile, now) {
    const today = utcDay(now), last = dateDay(profile && profile.last_active_date), streak = effectiveStreak(profile, now);
    return Array.from({ length: 7 }, (_, i) => {
      const day = today - 6 + i;
      return { date: new Date(day * DAY), today: day === today, done: streak > 0 && day <= last && day > last - streak };
    });
  }
  function shuffle(items, random) {
    const out = items.slice(), next = random || Math.random;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(next() * (i + 1))));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function sentenceIsCorrect(sentence, order) {
    return Array.isArray(order) && order.length === sentence.words.length
      && new Set(order).size === order.length
      && order.every(index => Number.isInteger(index) && index >= 0 && index < sentence.words.length)
      && order.map(index => sentence.words[index]).join(' ') === sentence.sentence;
  }
  function speedPoints(correct, combo, elapsedMs) {
    return correct ? 100 + (elapsedMs <= 4000 ? 50 : 0) + Math.min(4, Math.max(0, combo - 1)) * 25 : 0;
  }
  function speedReward(correct, answered, points) {
    const accuracy = answered ? Math.round(correct * 100 / answered) : 0;
    return correct >= 5 && accuracy >= 60 ? 5 + Math.min(10, Math.floor(points / 400)) : 0;
  }
  const paths = {
    flame: '<path fill="#ff9c3f" stroke="none" d="M13 2c1 5-4 6-2 10 2-1 3-3 3-5 4 3 6 6 6 9a8 8 0 0 1-16 0c0-3 2-6 5-8-1 4 1 5 2 5-2-5 4-7 2-11Z"/><path fill="#ffe69a" stroke="none" d="M12 12c1 3-3 4-2 7 1 2 4 2 5 0 1-2-1-5-3-7Z"/>',
    coin: '<circle cx="12" cy="12" r="9" fill="#f8ca70" stroke="#d09b42"/><circle cx="12" cy="12" r="6" stroke="#d09b42"/><path d="m12 7 1.4 3 3.1.5-2.3 2.2.6 3.3-2.8-1.5L9.2 16l.6-3.3-2.3-2.2 3.1-.5Z" fill="#d09b42" stroke="none"/>',
    match: '<rect x="3" y="4" width="7" height="10" rx="2"/><rect x="14" y="10" width="7" height="10" rx="2"/><path d="m5 18 2 2 4-4M13 5h7m-3-3 3 3-3 3"/>',
    speed: '<circle cx="12" cy="14" r="8"/><path d="M12 10v4l3 2M9 2h6m-3 0v4m6 1 2-2"/>',
    scramble: '<path d="M4 5h16M4 12h10M4 19h6m7-3 3 3-3 3m-3-3h6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
    trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4"/>',
    sound: '<path d="m11 4-5 4H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="m11 4-5 4H3v8h3l5 4V4Zm5 5 5 6m0-6-5 6"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    repeat: '<path d="M20 7h-4l3-3m-3 3a8 8 0 1 0 4 8"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  function icon(name, cls) {
    return `<svg class="learning-icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`;
  }
  return { STAGES, utcDay, effectiveStreak, activeToday, orderedTopics, isUnlocked, streakWeek, shuffle, sentenceIsCorrect, speedPoints, speedReward, icon };
});

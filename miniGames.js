/* Bandly's mini-game playground. UI state is ephemeral; only the checked
 * Supabase RPCs can save progress/rewards. Guest rounds are explicitly local.
 * Each async action is scoped to a generation + topic + verified account so
 * closing a lesson, navigating or switching users cannot leak a late result. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lib/learningPath'));
  else root.IELTS_MINI_GAMES = factory(root.IELTS_LEARNING_PATH);
})(typeof window !== 'undefined' ? window : globalThis, function (L) {
  'use strict';
  const TYPES = ['word_match', 'speed_vocabulary', 'sentence_scramble'];
  const META = { word_match: { icon: 'match', coins: '10', accent: 'mint' }, speed_vocabulary: { icon: 'speed', coins: '5–15', accent: 'amber' }, sentence_scramble: { icon: 'scramble', coins: '15', accent: 'violet' } };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  function create(options) {
    const o = options || {}, t = o.t || (key => key), t2 = o.t2 || t;
    const now = o.now || (() => Date.now());
    const defer = o.setTimeout || ((fn, ms) => setTimeout(fn, ms));
    const cancel = o.clearTimeout || (id => clearTimeout(id));
    const repeat = o.setInterval || ((fn, ms) => setInterval(fn, ms));
    const stop = o.clearInterval || (id => clearInterval(id));
    const timers = new Set();
    let interval = null, generation = 0, audio = null, enabled = true;
    let state = { phase: 'lobby', type: null, topicId: '', owner: null };
    try { enabled = localStorage.getItem('ielts-learning-sound') !== 'off'; } catch {}
    const owner = () => o.isSignedIn && o.isSignedIn() && o.getOwner ? o.getOwner() : null;
    const currentTopic = () => o.getTopic && o.getTopic();
    const live = token => token === generation && (currentTopic()?.id || '') === state.topicId && owner() === state.owner;
    function later(fn, ms) { const id = defer(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
    function clearTimers() {
      if (interval !== null) stop(interval);
      interval = null;
      timers.forEach(cancel); timers.clear();
    }
    function reset() {
      generation++; clearTimers();
      state = { phase: 'lobby', type: null, topicId: '', owner: null };
    }
    function prepareAudio() {
      if (!enabled) return;
      try {
        const Audio = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (Audio && !audio) audio = new Audio();
        if (audio?.state === 'suspended') Promise.resolve(audio.resume()).catch(() => {});
      } catch { /* Sound is optional, including in Safari/private browsing. */ }
    }
    function sound(kind) {
      if (!enabled || !audio || audio.state !== 'running') return;
      try {
        const frequencies = kind === 'success' ? [660, 880, 1100] : kind === 'wrong' ? [180] : kind === 'pop' ? [480] : [660, 880];
        frequencies.forEach((frequency, i) => {
          const oscillator = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + i * .075;
          oscillator.type = kind === 'wrong' ? 'triangle' : 'sine';
          oscillator.frequency.setValueAtTime(frequency, at);
          if (kind === 'pop') oscillator.frequency.exponentialRampToValueAtTime(780, at + .07);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(.065, at + .008);
          gain.gain.exponentialRampToValueAtTime(.001, at + .13);
          oscillator.connect(gain); gain.connect(audio.destination);
          oscillator.start(at); oscillator.stop(at + .15);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        });
      } catch {}
    }
    function mute() {
      enabled = !enabled;
      try { localStorage.setItem('ielts-learning-sound', enabled ? 'on' : 'off'); } catch {}
      if (enabled) { prepareAudio(); sound('pop'); }
      renderArea();
    }
    function title(type) { return t('game_' + type + '_title'); }
    function soundButton() { return `<button class="game-sound" data-game-sound aria-pressed="${enabled}" aria-label="${escape(t(enabled ? 'game_sound_off' : 'game_sound_on'))}" title="${escape(t(enabled ? 'game_sound_off' : 'game_sound_on'))}">${L.icon(enabled ? 'sound' : 'muted')}</button>`; }
    function lobby(topic) {
      if (!topic?.game_data?.version) return `<div class="game-empty"><p>${escape(t('game_not_available'))}</p></div>`;
      return `<div class="game-lobby"><div class="game-section-head"><div><span class="eyebrow">${escape(t('game_playground'))}</span><h3>${escape(t('game_choose'))}</h3><p class="micro">${escape(t('game_lobby_hint'))}</p></div>${soundButton()}</div>
        ${!owner() ? `<p class="game-practice-note">${escape(t('game_guest_note'))}</p>` : ''}
        <div class="game-choice-grid">${TYPES.map(type => {
          const done = o.getProgress && o.getProgress(topic.id, type);
          return `<button class="game-choice game-choice--${META[type].accent}" data-game-start="${type}"><span class="game-choice-icon">${L.icon(META[type].icon)}</span><span class="game-choice-title">${escape(title(type))}</span><span class="game-choice-description">${escape(t('game_' + type + '_hint'))}</span><span class="game-choice-bottom"><span>${done?.is_completed ? '✓ ' + escape(t('game_practised')) : escape(t('game_play'))}</span><strong>🪙 +${META[type].coins}</strong></span></button>`;
        }).join('')}</div><p class="game-reward-note">${escape(t('game_reward_rule'))}</p></div>`;
    }
    function gameHeader() {
      return `<div class="game-section-head"><button class="game-back" data-game-back aria-label="${escape(t('game_all_games'))}">← ${escape(t('game_all_games'))}</button><span class="game-type-label">${L.icon(META[state.type].icon)} ${escape(title(state.type))}</span>${soundButton()}</div>`;
    }
    function matchHtml() {
      const m = state.match;
      return `${gameHeader()}<div class="game-instruction"><h3>${escape(t('game_match_instruction'))}</h3><p>${escape(t('game_match_subtitle'))}</p></div>
        <div class="game-round-progress"><span>${escape(t2('game_pairs_count', { n: m.matched.length, total: m.pairs.length }))}</span><span>🪙 +10</span></div>
        <div class="game-progress"><i style="width:${m.matched.length / m.pairs.length * 100}%"></i></div>
        <div class="word-match-grid">${m.cards.map(card => {
          const selected = m.selected.includes(card.key), gone = m.matched.includes(card.pair);
          const feedback = selected ? m.feedback : '';
          return `<button class="match-card ${selected ? 'is-selected' : ''} ${gone ? 'is-matched' : ''} ${feedback ? 'is-' + feedback : ''}" data-match-card="${escape(card.key)}" aria-pressed="${selected}" ${gone || m.selected.length === 2 ? 'disabled' : ''} ${gone ? 'aria-hidden="true" tabindex="-1"' : ''}><small>${escape(t(card.side === 'word' ? 'game_word' : 'game_meaning'))}</small><strong>${escape(card.text)}</strong></button>`;
        }).join('')}</div><p class="game-feedback ${m.feedback === 'correct' ? 'is-correct' : m.feedback === 'wrong' ? 'is-wrong' : ''}" role="status">${escape(t(m.feedback === 'correct' ? 'game_match_correct' : m.feedback === 'wrong' ? 'game_match_wrong' : 'game_match_ready'))}</p>`;
    }
    function scrambleHtml() {
      const s = state.scramble, sentence = s.sentences[s.index];
      return `${gameHeader()}<div class="game-round-progress"><span>${escape(t2('game_sentence_count', { n: s.index + 1, total: s.sentences.length }))}</span><span>🪙 +15</span></div>
        <div class="game-progress"><i style="width:${s.index / s.sentences.length * 100}%"></i></div>
        <div class="game-instruction"><h3>${escape(t('game_scramble_instruction'))}</h3><p>${escape(sentence.hint)}</p></div>
        <div class="sentence-answer ${s.feedback ? 'is-' + s.feedback : ''}" aria-label="${escape(t('game_your_sentence'))}">${s.selected.length ? s.selected.map((index, position) => `<button class="sentence-token is-placed" data-scramble-remove="${position}" ${s.solved ? 'disabled' : ''} aria-label="${escape(t2('game_remove_word', { word: sentence.words[index] }))}">${escape(sentence.words[index])}</button>`).join('') : `<span class="sentence-placeholder">${escape(t('game_scramble_placeholder'))}</span>`}</div>
        <div class="sentence-word-bank" aria-label="${escape(t('game_word_bank'))}">${s.bank.map(index => `<button class="sentence-token ${s.selected.includes(index) ? 'is-used' : ''}" data-scramble-word="${index}" ${s.selected.includes(index) || s.solved ? 'disabled' : ''}>${escape(sentence.words[index])}</button>`).join('')}</div>
        <div class="scramble-tools"><button class="game-text-button" data-scramble-clear ${s.solved || !s.selected.length ? 'disabled' : ''}>↶ ${escape(t('game_reset_words'))}</button><button class="game-text-button" data-scramble-hint>${escape(t('game_show_example'))}</button></div>
        ${s.revealed ? `<p class="game-example">${escape(sentence.sentence)}</p>` : ''}
        <p class="game-feedback ${s.feedback ? 'is-' + s.feedback : ''}" role="status">${escape(t(s.feedback === 'correct' ? 'game_scramble_correct' : s.feedback === 'wrong' ? 'game_scramble_wrong' : 'game_scramble_help'))}</p>
        <div class="game-controls">${s.solved ? `<button class="btn btn-primary" data-scramble-next>${escape(t(s.index === s.sentences.length - 1 ? 'game_finish' : 'game_next_sentence'))} ${L.icon('arrow')}</button>` : `<button class="btn btn-primary" data-scramble-check ${s.selected.length !== sentence.words.length ? 'disabled' : ''}>${escape(t('game_check_sentence'))} ${L.icon('check')}</button>`}</div>`;
    }
    function speedHtml() {
      const s = state.speed, question = s.question;
      return `${gameHeader()}<div class="speed-hud"><div class="speed-clock ${s.remaining <= 10 ? 'is-urgent' : ''}" data-game-clock-wrap>${L.icon('speed')}<strong data-game-clock>${s.remaining}</strong><span>${escape(t('game_seconds'))}</span></div>
        <div class="speed-stat"><span>${escape(t('game_points'))}</span><strong data-game-points>${s.points}</strong></div><div class="speed-stat speed-combo ${s.combo >= 3 ? 'is-hot' : ''}"><span>${escape(t('game_combo'))}</span><strong>${L.icon('bolt')} ×${s.combo}</strong></div></div>
        <div class="game-progress speed-time-bar" role="progressbar" aria-label="${escape(t('game_time_left'))}" aria-valuemin="0" aria-valuemax="60" aria-valuenow="${s.remaining}" data-game-time-bar><i data-game-time-fill style="width:${s.remaining / 60 * 100}%"></i></div>
        ${question ? `<div class="speed-question"><span>${escape(t('game_choose_meaning'))}</span><h3>${escape(question.word)}</h3></div><div class="speed-options">${question.options.map((option, i) => `<button class="speed-option ${s.feedback && i === s.feedback.correct_choice ? 'is-correct' : s.feedback && i === s.chosen ? 'is-wrong' : ''}" data-speed-answer="${i}" ${s.answerBusy || s.answerError || s.remaining <= 0 ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${escape(option)}</span></button>`).join('')}</div>` : `<div class="speed-question"><h3>${escape(t('game_speed_done'))}</h3></div>`}
        <div class="game-feedback ${s.feedback ? s.feedback.correct ? 'is-correct' : 'is-wrong' : ''}" role="status">${s.feedback ? escape(s.feedback.correct ? t2('game_speed_correct', { n: s.feedback.earned_points }) : t('game_speed_wrong')) : escape(t('game_speed_help'))}</div>
        ${s.answerError ? `<div class="game-error" role="alert"><p>${escape(s.answerError)}</p><button class="btn btn-ghost btn-sm" data-game-retry-answer>${escape(t('game_retry_answer'))}</button><p class="micro">${escape(t('game_timer_continues'))}</p></div>` : ''}
        <div class="speed-footer"><span>${escape(t2('game_speed_accuracy', { correct: s.correct, total: s.answered }))}</span><span>${escape(t('game_speed_target'))}</span></div>`;
    }
    function resultHtml() {
      const r = state.result, passed = !!r.is_completed, local = !state.owner;
      return `<div class="game-result ${passed ? 'is-success' : ''}">${passed ? `<div class="game-confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>` : ''}
        <div class="game-result-icon">${L.icon(passed ? 'trophy' : 'book')}</div><span class="eyebrow">${escape(title(state.type))}</span>
        <h3>${escape(t(passed ? local ? 'game_practice_complete' : 'game_complete' : 'game_keep_practising'))}</h3><p class="micro">${escape(t(local ? 'game_guest_result' : r.daily_reward_claimed || r.already_submitted ? 'game_already_rewarded' : passed ? 'game_result_hint' : 'game_result_retry_hint'))}</p>
        <div class="game-result-stats"><div><strong>${r.score_percentage}%</strong><span>${escape(t('game_accuracy'))}</span></div>${state.type === 'speed_vocabulary' ? `<div><strong>${r.max_combo || 0}×</strong><span>${escape(t('game_best_combo'))}</span></div>` : `<div><strong>${r.correct_count}/${r.total_questions}</strong><span>${escape(t('game_correct'))}</span></div>`}${!local ? `<div class="game-result-coins"><strong>🪙 +${r.coins_awarded || 0}</strong><span>${escape(t('roadmap_coins'))}</span></div>` : ''}</div>
        ${!local && r.active_today ? `<p class="game-streak-result">🔥 ${escape(t2('streak_days', { n: r.current_streak }))} · ${escape(t('streak_goal_done'))}</p>` : ''}
        <div class="game-controls"><button class="btn btn-primary" data-game-replay>${L.icon('repeat')} ${escape(t('game_play_again'))}</button><button class="btn btn-ghost" data-game-back>${escape(t('game_all_games'))}</button></div>
        ${local ? `<a class="game-result-link" href="#/signup">${escape(t('game_save_progress'))} →</a>` : `<button class="game-result-link" data-game-quiz>${escape(t('game_continue_quiz'))} →</button>`}</div>`;
    }
    function html(topic) {
      if (state.topicId && state.topicId !== topic?.id) reset();
      if (state.phase === 'lobby') return lobby(topic);
      if (state.phase === 'starting' || state.phase === 'saving') return `${gameHeader()}<div class="game-loading" role="status"><span class="game-spinner"></span><h3>${escape(t(state.phase === 'starting' ? 'game_loading' : 'game_saving'))}</h3><p>${escape(t('game_server_note'))}</p></div>`;
      if (state.phase === 'error') return `${gameHeader()}<div class="game-error" role="alert"><h3>${escape(t('game_save_error'))}</h3><p>${escape(state.error)}</p><button class="btn btn-primary" data-game-retry>${escape(t('roadmap_retry'))}</button><p class="micro">${escape(t('game_retry_safe'))}</p></div>`;
      if (state.phase === 'result') return resultHtml();
      return state.type === 'word_match' ? matchHtml() : state.type === 'sentence_scramble' ? scrambleHtml() : speedHtml();
    }
    function root() { return typeof document !== 'undefined' ? document.querySelector('#roadmapGameArea') : null; }
    function renderArea(focusSelector) {
      const el = root(), topic = currentTopic();
      if (!el || !topic) return;
      el.innerHTML = html(topic); bind(el);
      if (focusSelector) el.querySelector(focusSelector)?.focus?.({ preventScroll: true });
    }
    function startClock() {
      if (interval !== null) stop(interval);
      interval = repeat(tick, 200);
    }
    function tick() {
      if (state.phase !== 'playing' || state.type !== 'speed_vocabulary') return;
      if (!live(generation)) { reset(); return; }
      const s = state.speed;
      s.remaining = Math.max(0, Math.ceil((s.endAt - now()) / 1000));
      const el = root();
      if (el) {
        const clock = el.querySelector('[data-game-clock]'); if (clock) clock.textContent = String(s.remaining);
        el.querySelector('[data-game-clock-wrap]')?.classList.toggle('is-urgent', s.remaining <= 10);
        el.querySelector('[data-game-time-bar]')?.setAttribute('aria-valuenow', String(s.remaining));
        const fill = el.querySelector('[data-game-time-fill]'); if (fill) fill.style.width = s.remaining / 60 * 100 + '%';
      }
      if (!s.remaining) void finish();
    }
    async function start(type) {
      const topic = currentTopic();
      if (!TYPES.includes(type) || !topic?.game_data?.[type] || (o.canPlay && !o.canPlay(topic.id))) return;
      reset(); prepareAudio();
      const token = generation;
      state = { phase: 'starting', type, topicId: topic.id, owner: owner(), sessionId: null, result: null, error: '', retry: 'start' };
      renderArea();
      try {
        let payload = topic.game_data[type], remaining = 60000;
        if (state.owner) {
          if (!o.cloud?.startTopicGame) throw new Error(t('game_migration_required'));
          const response = await o.cloud.startTopicGame(topic.id, type);
          if (!live(token)) return;
          state.sessionId = response.session_id; payload = response.payload; remaining = Number(response.remaining_ms) || 0;
        }
        if (!live(token)) return;
        if (type === 'word_match') {
          state.match = { pairs: payload.pairs, cards: L.shuffle(payload.pairs.flatMap((pair, i) => [{ key: `${i}-w`, pair: i, side: 'word', text: pair.word }, { key: `${i}-m`, pair: i, side: 'meaning', text: pair.meaning }])), selected: [], matched: [], answers: [], feedback: '', mistakes: 0 };
        } else if (type === 'sentence_scramble') {
          state.scramble = { sentences: payload.sentences, index: 0, selected: [], bank: L.shuffle(payload.sentences[0].words.map((_, i) => i)), answers: [], feedback: '', solved: false, revealed: false };
        } else {
          const localOrder = state.owner ? [] : Array.from({ length: 12 }, () => L.shuffle(payload.questions)).flat();
          state.speed = { question: state.owner ? payload.question : { ...localOrder[0], index: 0 }, localOrder, cursor: 0, remaining: Math.ceil(remaining / 1000), endAt: now() + remaining, questionAt: now(), points: 0, correct: 0, answered: 0, combo: 0, maxCombo: 0, chosen: null, answerBusy: false, pending: null, answerError: '', feedback: null };
          startClock();
        }
        state.phase = 'playing'; renderArea(type === 'word_match' ? '[data-match-card]:not([disabled])' : type === 'speed_vocabulary' ? '[data-speed-answer="0"]' : '[data-scramble-word]');
      } catch (error) {
        if (!live(token)) return;
        state.phase = 'error'; state.error = error.message || t('game_save_error'); state.retry = 'start'; renderArea();
      }
    }
    function selectMatch(key) {
      if (state.phase !== 'playing' || state.type !== 'word_match') return;
      const m = state.match, card = m.cards.find(item => item.key === key);
      if (!card || m.matched.includes(card.pair) || m.selected.length === 2) return;
      if (m.selected.includes(key)) m.selected = [];
      else if (m.selected.length && m.cards.find(item => item.key === m.selected[0]).side === card.side) m.selected = [key];
      else m.selected.push(key);
      sound('pop');
      if (m.selected.length < 2) { renderArea(`[data-match-card="${key}"]`); return; }
      const selected = m.selected.map(id => m.cards.find(item => item.key === id));
      const correct = selected[0].pair === selected[1].pair;
      m.feedback = correct ? 'correct' : 'wrong';
      if (!correct) m.mistakes++;
      sound(correct ? 'ding' : 'wrong'); renderArea();
      const token = generation;
      later(() => {
        if (!live(token)) return;
        if (correct) { m.matched.push(card.pair); m.answers.push([card.pair, card.pair]); }
        m.selected = []; m.feedback = '';
        if (m.matched.length === m.pairs.length) void finish();
        else renderArea('[data-match-card]:not([disabled])');
      }, correct ? 450 : 420);
    }
    function addWord(index) {
      if (state.phase !== 'playing' || state.type !== 'sentence_scramble') return;
      const s = state.scramble;
      if (s.solved || s.selected.includes(index) || index < 0 || index >= s.sentences[s.index].words.length) return;
      s.selected.push(index); s.feedback = ''; sound('pop'); renderArea('[data-scramble-word]:not([disabled])');
    }
    function removeWord(position) {
      const s = state.scramble;
      if (!s || s.solved) return;
      s.selected.splice(position, 1); s.feedback = ''; sound('pop'); renderArea('[data-scramble-word]:not([disabled])');
    }
    function checkSentence() {
      const s = state.scramble;
      if (!s || s.solved || s.selected.length !== s.sentences[s.index].words.length) return;
      s.solved = L.sentenceIsCorrect(s.sentences[s.index], s.selected);
      s.feedback = s.solved ? 'correct' : 'wrong';
      if (s.solved) s.answers.push({ sentence_id: s.sentences[s.index].id, order: s.selected.slice() });
      sound(s.solved ? 'ding' : 'wrong'); renderArea(s.solved ? '[data-scramble-next]' : '[data-scramble-remove]');
    }
    function nextSentence() {
      const s = state.scramble;
      if (!s?.solved) return;
      if (s.index === s.sentences.length - 1) { void finish(); return; }
      s.index++; s.selected = []; s.feedback = ''; s.solved = false; s.revealed = false;
      s.bank = L.shuffle(s.sentences[s.index].words.map((_, i) => i)); renderArea('[data-scramble-word]');
    }
    function localSpeedAnswer(choice) {
      const s = state.speed, topic = currentTopic(), q = s.question;
      const meaning = topic.game_data.speed_vocabulary.glossary.find(pair => pair.word === q.word)?.meaning;
      const expected = q.options.indexOf(meaning), correct = choice === expected;
      s.combo = correct ? s.combo + 1 : 0;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      const earned = L.speedPoints(correct, s.combo, now() - s.questionAt);
      s.points += earned; s.correct += correct ? 1 : 0; s.answered++; s.cursor++;
      return { correct, correct_choice: expected, earned_points: earned, combo: s.combo, max_combo: s.maxCombo, points: s.points, correct_count: s.correct, answered_count: s.answered, question: s.localOrder[s.cursor] ? { ...s.localOrder[s.cursor], index: s.cursor } : null, remaining_ms: Math.max(0, s.endAt - now()) };
    }
    async function answerSpeed(choice, retrying) {
      if (state.phase !== 'playing' || state.type !== 'speed_vocabulary') return;
      const s = state.speed;
      if (s.answerBusy || !s.question || s.remaining <= 0 || (s.answerError && !retrying)) return;
      const token = generation;
      s.answerBusy = true; s.answerError = ''; s.chosen = choice; s.feedback = null; renderArea();
      s.pending = (async () => {
        try {
          const response = state.owner ? await o.cloud.answerSpeedQuestion(state.sessionId, s.question.index, choice) : localSpeedAnswer(choice);
          if (!live(token)) return;
          s.endAt = Math.min(s.endAt, now() + Math.max(0, Number(response.remaining_ms) || 0));
          s.points = Number(response.points) || 0; s.combo = Number(response.combo) || 0; s.maxCombo = Number(response.max_combo) || 0;
          s.correct = Number(response.correct_count) || 0; s.answered = Number(response.answered_count) || 0;
          if (response.expired) { s.endAt = now(); tick(); return; }
          s.feedback = response; sound(response.correct ? 'ding' : 'wrong'); renderArea();
          later(() => {
            if (!live(token) || state.phase !== 'playing') return;
            s.question = response.question; s.questionAt = now(); s.feedback = null; s.chosen = null; s.answerBusy = false;
            renderArea('[data-speed-answer="0"]'); tick();
          }, 360);
        } catch (error) {
          if (!live(token)) return;
          s.answerBusy = false; s.answerError = error.message || t('game_connection_error'); renderArea('[data-game-retry-answer]');
        } finally {
          if (live(token)) { s.pending = null; tick(); }
        }
      })();
      return s.pending;
    }
    function localResult() {
      if (state.type === 'word_match') return { is_completed: true, score_percentage: 100, correct_count: state.match.pairs.length, total_questions: state.match.pairs.length, coins_awarded: 0 };
      if (state.type === 'sentence_scramble') return { is_completed: true, score_percentage: 100, correct_count: 3, total_questions: 3, coins_awarded: 0 };
      const s = state.speed, accuracy = s.answered ? Math.round(s.correct * 100 / s.answered) : 0;
      return { is_completed: s.correct >= 5 && accuracy >= 60, score_percentage: accuracy, correct_count: s.correct, total_questions: s.answered, points: s.points, max_combo: s.maxCombo, coins_awarded: 0 };
    }
    async function finish() {
      if (!['playing', 'error'].includes(state.phase) || state.finishing) return;
      const token = generation;
      state.finishing = true;
      if (state.type === 'speed_vocabulary' && state.speed.pending) await state.speed.pending;
      if (!live(token)) return;
      clearTimers(); state.phase = 'saving'; state.retry = 'finish'; renderArea();
      try {
        const answers = state.type === 'word_match' ? state.match.answers : state.type === 'sentence_scramble' ? state.scramble.answers : {};
        const result = state.owner ? await o.cloud.submitTopicGame(state.sessionId, answers) : localResult();
        if (!live(token)) return;
        state.result = result; state.phase = 'result'; state.finishing = false;
        if (result.is_completed) sound('success');
        renderArea('[data-game-replay]');
        if (state.owner && o.onComplete) o.onComplete(result, state.topicId, state.type);
      } catch (error) {
        if (!live(token)) return;
        state.phase = 'error'; state.error = error.message || t('game_save_error'); state.finishing = false; renderArea('[data-game-retry]');
      }
    }
    function back() { reset(); renderArea('[data-game-start]'); }
    function bind(el) {
      const area = el || root(); if (!area) return;
      const all = (selector, fn) => area.querySelectorAll(selector).forEach(button => { button.onclick = fn; });
      all('[data-game-start]', event => { void start(event.currentTarget.dataset.gameStart); });
      all('[data-game-sound]', mute);
      all('[data-game-back]', back);
      all('[data-game-replay]', () => { void start(state.type); });
      all('[data-game-retry]', () => { void (state.retry === 'finish' ? finish() : start(state.type)); });
      all('[data-game-retry-answer]', () => { void answerSpeed(state.speed.chosen, true); });
      all('[data-game-quiz]', () => { reset(); if (o.onQuiz) o.onQuiz(); });
      all('[data-match-card]', event => selectMatch(event.currentTarget.dataset.matchCard));
      all('[data-scramble-word]', event => addWord(Number(event.currentTarget.dataset.scrambleWord)));
      all('[data-scramble-remove]', event => removeWord(Number(event.currentTarget.dataset.scrambleRemove)));
      all('[data-scramble-clear]', () => { state.scramble.selected = []; state.scramble.feedback = ''; renderArea('[data-scramble-word]'); });
      all('[data-scramble-hint]', () => { state.scramble.revealed = !state.scramble.revealed; renderArea('[data-scramble-hint]'); });
      all('[data-scramble-check]', checkSentence);
      all('[data-scramble-next]', nextSentence);
      all('[data-speed-answer]', event => { void answerSpeed(Number(event.currentTarget.dataset.speedAnswer)); });
      area.onkeydown = event => {
        if (state.phase === 'playing' && state.type === 'speed_vocabulary' && ['1', '2', '3'].includes(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat) {
          event.preventDefault(); void answerSpeed(Number(event.key) - 1);
        }
      };
    }
    return { html, bind, reset, start, tick, sound, prepareAudio, finish,
      // Read-only snapshot for deterministic tests, not an authority for rewards.
      snapshot: () => JSON.parse(JSON.stringify({ ...state, speed: state.speed ? { ...state.speed, pending: undefined } : undefined })),
      selectMatch, addWord, removeWord, checkSentence, nextSentence, answerSpeed };
  }
  return { create, TYPES, META };
});

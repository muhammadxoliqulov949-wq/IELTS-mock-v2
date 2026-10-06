/* ===================================================================
 * IELTS topic & question-type diversity pool
 * -------------------------------------------------------------------
 * Shared by the browser (admin "1-Click AI Generator" modal) and by the
 * serverless generator endpoint (api/generate-mock.js). The file is a
 * tiny UMD module so `require('../lib/topicPool.js')` works in Node and
 * `<script src="lib/topicPool.js">` exposes window.IELTS_TOPICS.
 *
 * Why a pool at all? A language model asked for "an IELTS test" keeps
 * drifting back to the same handful of themes (space, the internet,
 * city life). Picking the theme AND the question-type mix before the
 * model sees the prompt is what actually makes every generated test
 * feel like a different paper.
 *
 * Every pick below goes through an injectable random source that
 * defaults to Math.random(), so the diversity is real in production and
 * deterministic under test.
 * =================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.IELTS_TOPICS = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. The official-style topic bank (48 entries — keep it > 40).
   *    Grouped the way IELTS thematic areas are usually described so
   *    the generator can also report which "area" a test came from.
   * ------------------------------------------------------------------ */
  const TOPICS = [
    'Space exploration',
    'Marine biology',
    'Cognitive psychology',
    'Urban architecture',
    'Ancient history',
    'Artificial intelligence',
    'Agricultural innovations',
    'Renewable energy',
    'Coastal erosion',
    'Language acquisition',
    'Ocean conservation',
    'Wildlife migration',
    'Volcanology and geology',
    'The history of medicine',
    'Sleep science',
    'Workplace wellbeing',
    'Distance learning',
    'Museum curation',
    'Archaeological methods',
    'Bees and pollination',
    'Water management',
    'Space tourism',
    'Robotics in manufacturing',
    'Digital privacy',
    'Sustainable fashion',
    'Food security',
    'Remote working',
    'Child development',
    'Ageing populations',
    'Migration and cities',
    'Ecotourism',
    'Forest ecology',
    'Noise pollution',
    'Recycling technologies',
    'The future of work',
    'Quantum computing',
    'Decision-making neuroscience',
    'Traditional crafts',
    'Public libraries',
    'Extreme weather',
    'Animal communication',
    'The history of cartography',
    'Alternative fuels',
    'Green building design',
    'Community volunteering',
    'Genetic engineering ethics',
    'Satellite navigation',
    'Desertification'
  ];

  /* Question types the generator may use. Map-labelling is deliberately
     excluded: the payload validator requires a map image for it, and an
     AI cannot invent a correct map. Admins can still add those by hand. */
  const LISTENING_TYPES = [
    'form-completion', 'note-completion', 'table-completion', 'sentence-completion',
    'multiple-choice', 'multiple-choice-multi', 'matching'
  ];
  const READING_TYPES = [
    'true-false-not-given', 'yes-no-not-given', 'matching-headings',
    'summary-completion', 'sentence-completion', 'multiple-choice',
    'multiple-choice-multi', 'matching'
  ];

  const DIFFICULTIES = ['standard', 'hard'];

  /* ------------------------------------------------------------------
   * 2. Random helpers (Math.random by default, injectable for tests)
   * ------------------------------------------------------------------ */
  function defaultRng() { return Math.random(); }

  function pick(list, rng) {
    const src = Array.isArray(list) ? list : [];
    if (!src.length) return null;
    return src[Math.floor((rng || defaultRng)() * src.length)];
  }

  function shuffle(list, rng) {
    const out = (Array.isArray(list) ? list : []).slice();
    const rand = rng || defaultRng;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* `count` distinct members of `list`, in random order. */
  function pickDistinct(list, count, rng) {
    return shuffle(list, rng).slice(0, Math.max(0, Math.min(count, list.length)));
  }

  /* ------------------------------------------------------------------
   * 3. Question-type mixes
   *
   * `distribute(total, types)` spreads `total` questions over the given
   * types in a shuffled order, so the same "plan" still produces a
   * different sequence of question types on every run.
   * ------------------------------------------------------------------ */
  function distribute(total, types, rng) {
    const wanted = Math.max(1, Number(total) || 1);
    const pool = (Array.isArray(types) && types.length ? types : ['sentence-completion']).slice(0, 4);
    const out = [];
    /* round-robin so every chosen type really appears … */
    while (out.length < wanted) {
      const lap = shuffle(pool, rng);
      for (let i = 0; i < lap.length && out.length < wanted; i++) out.push(lap[i]);
    }
    /* … then shuffle the sequence itself for a different order each time */
    return shuffle(out, rng);
  }

  /* Listening: 4 parts × 10 questions. Each part gets its own mix of
     1–3 types, redrawn from the full type list on every call. */
  function listeningPlan(rng) {
    return [1, 2, 3, 4].map(part => {
      const types = pickDistinct(LISTENING_TYPES, 1 + Math.floor((rng || defaultRng)() * 3), rng);
      return { part, types: distribute(10, types, rng) };
    });
  }

  /* Reading: 3 passages, 13 + 14 + 13 = 40 questions. */
  function readingPlan(rng) {
    const totals = [13, 14, 13];
    return [1, 2, 3].map(passage => {
      const types = pickDistinct(READING_TYPES, 2 + Math.floor((rng || defaultRng)() * 2), rng);
      return { passage, types: distribute(totals[passage - 1], types, rng) };
    });
  }

  /* ------------------------------------------------------------------
   * 4. The plan handed to the generator (and shown in the modal)
   * ------------------------------------------------------------------ */
  function buildPlan(options) {
    const opts = options || {};
    const rng = opts.rng || defaultRng;
    const difficulty = DIFFICULTIES.includes(String(opts.difficulty || '').toLowerCase())
      ? String(opts.difficulty).toLowerCase()
      : 'standard';
    const seed = Math.floor((rng || defaultRng)() * 1e9);

    /* A topic typed by the admin anchors the whole test; otherwise each
       section draws its own, distinct topic from the pool. */
    const forced = String(opts.topic || '').trim();
    const topics = forced
      ? { listening: forced, reading: forced, writing: forced, speaking: forced }
      : {
          listening: pick(TOPICS, rng),
          reading: pick(TOPICS, rng),
          writing: pick(TOPICS, rng),
          speaking: pick(TOPICS, rng)
        };

    return {
      seed,
      difficulty,
      forcedTopic: forced || null,
      topics,
      questionPlan: {
        listening: listeningPlan(rng),
        reading: readingPlan(rng)
      },
      /* Speaking themes follow the same rule: forced topic or random. */
      speakingTheme: forced || pick(TOPICS, rng)
    };
  }

  return {
    TOPICS,
    TOPIC_COUNT: TOPICS.length,
    LISTENING_TYPES,
    READING_TYPES,
    DIFFICULTIES,
    pick,
    shuffle,
    pickDistinct,
    distribute,
    listeningPlan,
    readingPlan,
    buildPlan
  };
});

/* Adaptive Skill Drills — deterministic assessment, daily quest and scoring helpers.
 * This file is deliberately dependency-free so the same rules run in the
 * browser and in Node regression tests. */
(function attachAdaptiveDrills(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.IELTS_ADAPTIVE_DRILLS = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAdaptiveDrills() {
  const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
  const SKILL_ORDER = { listening: 0, reading: 1, writing: 2, speaking: 3 };

  function tierForBand(value) {
    const band = Number(value);
    if (!Number.isFinite(band)) return 1;
    // IELTS bands are normally reported in half bands. At the shared 5.5
    // boundary choose the safer foundation tier; 7.0 starts Tier 3.
    if (band >= 7) return 3;
    if (band > 5.5) return 2;
    return 1;
  }

  function validBand(value) {
    if (value === null || value === undefined || value === '') return false;
    const band = Number(value);
    return Number.isFinite(band) && band >= 0 && band <= 9;
  }

  function diagnosticFor(attempts) {
    const byTest = new Map();
    (Array.isArray(attempts) ? attempts : []).forEach((attempt, index) => {
      if (!attempt || !SKILLS.includes(attempt.section) || !validBand(attempt.band)) return;
      const test = String(attempt.test || 'test1');
      const date = Number(attempt.date) || 0;
      if (!byTest.has(test)) byTest.set(test, {});
      const scores = byTest.get(test);
      const previous = scores[attempt.section];
      if (!previous || date >= previous.date) scores[attempt.section] = { band: Number(attempt.band), date, index };
    });

    const complete = [];
    for (const [test, latest] of byTest) {
      if (!SKILLS.every(skill => latest[skill])) continue;
      const bands = Object.fromEntries(SKILLS.map(skill => [skill, latest[skill].band]));
      const overall = Math.round(SKILLS.reduce((sum, skill) => sum + bands[skill], 0) / SKILLS.length * 2) / 2;
      const weakestSkill = [...SKILLS].sort((a, b) => bands[a] - bands[b] || SKILL_ORDER[a] - SKILL_ORDER[b])[0];
      complete.push({
        test,
        bands,
        overall,
        tier: tierForBand(overall),
        weakestSkill,
        completedAt: Math.max(...SKILLS.map(skill => latest[skill].date)),
        sections: SKILLS.slice()
      });
    }
    complete.sort((a, b) => b.completedAt - a.completedAt || String(a.test).localeCompare(String(b.test)));
    return complete[0] || null;
  }

  function utcDate(value = new Date()) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  }

  function activityDate(activity) {
    if (!activity) return '';
    if (typeof activity.activity_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(activity.activity_date)) return activity.activity_date;
    if (typeof activity.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(activity.date)) return activity.date;
    return utcDate(activity.created_at || activity.date || activity.timestamp);
  }

  function completedSkills(activities, day = new Date()) {
    const today = utcDate(day);
    return new Set((Array.isArray(activities) ? activities : [])
      .filter(activity => activity && activity.kind === 'drill' && activityDate(activity) === today && SKILLS.includes(activity.skill))
      .map(activity => activity.skill));
  }

  function dailyQuests(assessment, date = new Date(), activities = []) {
    const day = utcDate(date);
    const tier = assessment && Number.isInteger(Number(assessment.tier))
      ? Math.max(1, Math.min(3, Number(assessment.tier))) : 1;
    const bands = assessment && assessment.bands || {};
    const weakest = assessment && SKILLS.includes(assessment.weakestSkill) ? assessment.weakestSkill : null;
    const ordered = [...SKILLS].sort((a, b) => {
      const av = validBand(bands[a]) ? Number(bands[a]) : 9;
      const bv = validBand(bands[b]) ? Number(bands[b]) : 9;
      return av - bv || (a === weakest ? -1 : b === weakest ? 1 : SKILL_ORDER[a] - SKILL_ORDER[b]);
    });
    const done = completedSkills(activities, day);
    return ordered.map((skill, index) => ({
      id: `quest-${day}-${skill}`,
      day,
      skill,
      tier,
      index: index + 1,
      band: validBand(bands[skill]) ? Number(bands[skill]) : null,
      priority: skill === weakest,
      completed: done.has(skill)
    }));
  }

  function dayNumber(day = new Date()) {
    const value = utcDate(day);
    if (!value) return 0;
    return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86400000);
  }

  const WRITING_ROUNDS = {
    1: [
      { source: 'Many people use buses because they are cheap.', cue: 'Transform this simple idea into one precise IELTS-style sentence.', model: 'Not only are buses a cost-effective option, but they can also ease congestion when cities invest in reliable public transport.' },
      { source: 'Students do better when they get enough sleep.', cue: 'Express the cause and result with a complex clause and an academic collocation.', model: 'Students are more likely to achieve strong academic outcomes when they get sufficient sleep, which supports concentration and memory.' },
      { source: 'Some people work from home because it is easy.', cue: 'Use a formal collocation and a subordinate clause to develop this idea.', model: 'Remote work has become increasingly attractive because it offers greater flexibility, particularly for employees with long commutes.' }
    ],
    2: [
      { source: 'Cities should build more parks because people need places to relax.', cue: 'Use a complex clause, a precise academic collocation and an emphatic inversion.', model: 'Not only do urban green spaces improve residents’ well-being, but they also provide an effective means of mitigating the health effects of city life.' },
      { source: 'Online learning helps students because they can study anywhere.', cue: 'Make the relationship more nuanced and include an academic collocation.', model: 'Although online learning affords students greater flexibility, its effectiveness depends on whether institutions provide adequate academic support.' },
      { source: 'Governments should spend money on trains because they help the environment.', cue: 'Develop the reason with a conditional clause and a formal collocation.', model: 'Were governments to prioritise low-carbon rail networks, they could substantially reduce transport-related emissions in densely populated regions.' }
    ],
    3: [
      { source: 'People use cars a lot, so the air in cities gets worse.', cue: 'Use inversion, a concessive or conditional clause, and precise academic collocations.', model: 'Were urban authorities to expand reliable public transport, cities could curb car dependency and, in turn, mitigate the adverse effects of air pollution.' },
      { source: 'Schools should teach money skills because young people need them.', cue: 'Express a nuanced argument with inversion and a sophisticated academic collocation.', model: 'Not only would comprehensive financial education equip young people to make informed decisions, but it could also reduce their vulnerability to long-term debt.' },
      { source: 'People read less now because phones are everywhere.', cue: 'Reframe this idea using inversion, complex grammar and formal lexical choices.', model: 'Rarely has access to information been so immediate; nevertheless, sustained reading may decline unless digital platforms are used more deliberately.' }
    ]
  };

  const READING_ROUNDS = {
    1: [
      {
        statement: 'The library’s new borrowing system made checkout quicker.',
        paragraph: [
          { text: 'After the library introduced self-checkout desks, the weekend queue became shorter. Although ' },
          { id: 'distractor', text: 'attendance increased by 30%' },
          { text: ', the main change was that readers could ' },
          { id: 'key', text: 'borrow books without waiting for staff assistance' },
          { text: '. The additional reading rooms were popular with students, but they had little effect on the time needed to check out a book.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“Borrow books without waiting for staff assistance” paraphrases a quicker checkout. The attendance figure is true, but it does not explain the borrowing system’s effect.'
      },
      {
        statement: 'A change to the appointment process reduced waiting at reception.',
        paragraph: [
          { text: 'The clinic extended its opening hours in April, and ' },
          { id: 'distractor', text: 'patient numbers rose slightly' },
          { text: '. The largest improvement came after online check-in was introduced: visitors could ' },
          { id: 'key', text: 'complete their arrival details before reaching the desk' },
          { text: '. By contrast, the new waiting-room chairs improved comfort rather than the speed of registration.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: 'Completing details before reaching reception is the paraphrase for a faster arrival process. The rise in patient numbers is a nearby statistic, not the cause of shorter waits.'
      },
      {
        statement: 'The redesign helped passengers find the correct platform more easily.',
        paragraph: [
          { text: 'The station’s new signs use larger lettering and colour-coded arrows. While train frequency remained unchanged, passengers could ' },
          { id: 'key', text: 'identify their departure platform at a glance' },
          { text: '. The same report notes that ' },
          { id: 'distractor', text: 'overall passenger numbers grew during the summer' },
          { text: '.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“Identify their departure platform at a glance” means finding the platform more easily. Passenger growth is a distracting but unrelated detail.'
      }
    ],
    2: [
      {
        statement: 'The ticketing redesign, rather than faster trains, shortened delays at the station.',
        paragraph: [
          { text: 'At first glance, the new rail service appeared to reduce commuting times. However, a six-month evaluation found that ' },
          { id: 'distractor', text: 'average journeys were only three minutes shorter' },
          { text: '; the revised ticketing system ' },
          { id: 'key', text: 'reduced delays on the platform' },
          { text: ', whereas train travel itself was largely unchanged. Passenger satisfaction also rose as more services arrived on time.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“Reduced delays on the platform” is the key paraphrase. The three-minute figure tempts you toward journey speed, but the passage says the ticketing change affected platform delays.'
      },
      {
        statement: 'The new irrigation method conserved water without reducing harvest size.',
        paragraph: [
          { text: 'A two-year farm trial used drip irrigation on half of each field. The treated crops received less water but produced a ' },
          { id: 'key', text: 'comparable quantity of produce' },
          { text: '. The farms also reported ' },
          { id: 'distractor', text: 'a modest increase in employment' },
          { text: ', although that was not an intended outcome of the trial.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“A comparable quantity of produce” means the harvest was maintained. Employment is mentioned in the same report but is unrelated to water use or yield.'
      },
      {
        statement: 'Flexible start times improved staff retention, even though output stayed steady.',
        paragraph: [
          { text: 'After a company introduced staggered start times, fewer employees left during the following year. Output per worker ' },
          { id: 'key', text: 'remained broadly consistent' },
          { text: ', while ' },
          { id: 'distractor', text: 'the number of applications for new roles increased by 12%' },
          { text: '.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“Remained broadly consistent” paraphrases output staying steady. The applications figure is a plausible distraction, not evidence about productivity.'
      }
    ],
    3: [
      {
        statement: 'Short breaks improved learners’ concentration after each study session.',
        paragraph: [
          { text: 'In a controlled trial, participants paused briefly between study blocks. On resuming, they demonstrated ' },
          { id: 'key', text: 'a stronger ability to sustain attention' },
          { text: ' on demanding tasks. ' },
          { id: 'distractor', text: 'Their total study time was unchanged' },
          { text: ', and the researchers cautioned that the findings may not generalise to every subject.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: '“A stronger ability to sustain attention” paraphrases improved concentration. Unchanged study time is factual but does not answer what happened to attention.'
      },
      {
        statement: 'The policy reduced household energy use without compromising comfort.',
        paragraph: [
          { text: 'Following the insulation programme, participating homes used less electricity during winter. Residents reported that indoor temperatures ' },
          { id: 'key', text: 'remained within their preferred range' },
          { text: ', despite the lower energy consumption. ' },
          { id: 'distractor', text: 'The greatest savings were recorded in older properties' },
          { text: '.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: 'Maintaining a preferred indoor temperature paraphrases preserving comfort. The age of the homes explains where savings were highest, not whether residents remained comfortable.'
      },
      {
        statement: 'The scheme increased cycling mainly by making everyday journeys safer.',
        paragraph: [
          { text: 'After protected lanes were installed, more residents cycled to nearby workplaces. Survey respondents cited ' },
          { id: 'key', text: 'a reduced risk from passing traffic' },
          { text: ' as the primary reason for switching. ' },
          { id: 'distractor', text: 'The number of public bicycles also doubled' },
          { text: ' over the same period.' }
        ],
        keyId: 'key', distractorId: 'distractor',
        explanation: 'A lower risk from traffic paraphrases safer journeys. The increase in bicycle availability happened at the same time, but the survey identifies safety as the main reason.'
      }
    ]
  };

  const SHADOWING_LINES = [
    'Had local authorities invested earlier in reliable public transport, urban congestion might have been considerably reduced.',
    'Not only does lifelong learning broaden professional opportunities, but it also enables individuals to adapt to rapid social change.',
    'While technological innovation can enhance productivity, its benefits are unlikely to be distributed equitably without appropriate safeguards.',
    'Were universities to place greater emphasis on critical thinking, graduates would be better equipped to address complex global challenges.'
  ];

  const DICTATION_ROUNDS = {
    1: [
      [
        { type: 'number', spoken: 'forty-two', answer: '42' },
        { type: 'name', spoken: 'Rachel Green', answer: 'Rachel Green' },
        { type: 'phrase', spoken: 'public transport', answer: 'public transport' }
      ],
      [
        { type: 'number', spoken: 'one hundred and sixteen', answer: '116' },
        { type: 'name', spoken: 'Daniel Carter', answer: 'Daniel Carter' },
        { type: 'phrase', spoken: 'a local library', answer: 'a local library' }
      ],
      [
        { type: 'number', spoken: 'seventy-five', answer: '75' },
        { type: 'name', spoken: 'Maya Patel', answer: 'Maya Patel' },
        { type: 'phrase', spoken: 'daily exercise', answer: 'daily exercise' }
      ]
    ],
    2: [
      [
        { type: 'number', spoken: 'seventeen pounds fifty', answer: '£17.50', aliases: ['17.50', 'seventeen pounds fifty'] },
        { type: 'name', spoken: 'Dr Amelia Chen', answer: 'Dr Amelia Chen', aliases: ['Amelia Chen'] },
        { type: 'phrase', spoken: 'a statistically significant increase', answer: 'a statistically significant increase' }
      ],
      [
        { type: 'number', spoken: 'two thousand and eight', answer: '2008', aliases: ['two thousand and eight'] },
        { type: 'name', spoken: 'Professor James O’Neill', answer: 'Professor James O’Neill', aliases: ['James O Neill', 'James Oneill'] },
        { type: 'phrase', spoken: 'renewable energy consumption', answer: 'renewable energy consumption' }
      ],
      [
        { type: 'number', spoken: 'six point four per cent', answer: '6.4%', aliases: ['6.4', 'six point four per cent'] },
        { type: 'name', spoken: 'Dr Sofia Alvarez', answer: 'Dr Sofia Alvarez', aliases: ['Sofia Alvarez'] },
        { type: 'phrase', spoken: 'a substantial proportion', answer: 'a substantial proportion' }
      ]
    ],
    3: [
      [
        { type: 'number', spoken: 'fifteen thousand two hundred and forty', answer: '15,240', aliases: ['15240', 'fifteen thousand two hundred and forty'] },
        { type: 'name', spoken: 'Professor O’Neill', answer: 'Professor O’Neill', aliases: ['Professor O Neill', 'Professor Oneill'] },
        { type: 'phrase', spoken: 'a substantial proportion of the population', answer: 'a substantial proportion of the population' }
      ],
      [
        { type: 'number', spoken: 'zero point zero eight five', answer: '0.085', aliases: ['zero point zero eight five'] },
        { type: 'name', spoken: 'Dr Eleanor McAllister', answer: 'Dr Eleanor McAllister', aliases: ['Eleanor McAllister'] },
        { type: 'phrase', spoken: 'a long-term socioeconomic consequence', answer: 'a long-term socioeconomic consequence' }
      ],
      [
        { type: 'number', spoken: 'three hundred and sixty-seven thousand', answer: '367,000', aliases: ['367000', 'three hundred and sixty-seven thousand'] },
        { type: 'name', spoken: 'Professor Aisha Rahman', answer: 'Professor Aisha Rahman' },
        { type: 'phrase', spoken: 'a carefully controlled longitudinal study', answer: 'a carefully controlled longitudinal study' }
      ]
    ]
  };

  function roundIndex(day = new Date(), count = 1) {
    const safeCount = Math.max(1, Number(count) || 1);
    return ((dayNumber(day) % safeCount) + safeCount) % safeCount;
  }
  function writingRound(tier = 1, day = new Date()) {
    const rounds = WRITING_ROUNDS[Math.max(1, Math.min(3, Number(tier) || 1))] || WRITING_ROUNDS[1];
    return rounds[roundIndex(day, rounds.length)];
  }
  function readingRound(tier = 1, day = new Date()) {
    const rounds = READING_ROUNDS[Math.max(1, Math.min(3, Number(tier) || 1))] || READING_ROUNDS[1];
    return rounds[roundIndex(day, rounds.length)];
  }
  function shadowingLine(day = new Date()) {
    return SHADOWING_LINES[roundIndex(day, SHADOWING_LINES.length)];
  }
  function dictationRound(tier = 1, day = new Date()) {
    const rounds = DICTATION_ROUNDS[Math.max(1, Math.min(3, Number(tier) || 1))] || DICTATION_ROUNDS[1];
    return rounds[roundIndex(day, rounds.length)];
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘`]/g, "'")
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9.']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normalizeWords(value) {
    return normalizeText(value).replace(/\./g, '').split(/\s+/).filter(Boolean);
  }
  function editDistance(left, right) {
    const a = Array.isArray(left) ? left : normalizeWords(left);
    const b = Array.isArray(right) ? right : normalizeWords(right);
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      previous = current;
    }
    return previous[b.length];
  }
  function transcriptMatch(expected, transcript) {
    const expectedWords = normalizeWords(expected);
    const heardWords = normalizeWords(transcript);
    if (!expectedWords.length) return { score: 0, expectedWords, heardWords, errors: expectedWords.length };
    const errors = editDistance(expectedWords, heardWords);
    return {
      score: Math.max(0, Math.min(100, Math.round((1 - errors / expectedWords.length) * 100))),
      expectedWords,
      heardWords,
      errors
    };
  }
  function dictationCorrect(item, answer) {
    const accepted = [item && item.answer, item && item.spoken, ...((item && item.aliases) || [])]
      .map(normalizeText).filter(Boolean);
    return accepted.includes(normalizeText(answer));
  }

  return {
    SKILLS,
    tierForBand,
    diagnosticFor,
    utcDate,
    activityDate,
    completedSkills,
    dailyQuests,
    writingRound,
    readingRound,
    shadowingLine,
    dictationRound,
    normalizeText,
    normalizeWords,
    editDistance,
    transcriptMatch,
    dictationCorrect
  };
});

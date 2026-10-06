/* Generated public lesson catalogue: npm run seed:roadmap. Quiz keys are NOT shipped.
 * Guest practice is local and cannot change server progress, streaks or coins. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IELTS_ROADMAP_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  return [
  {
    "id": "a1-a2-present-simple",
    "stage": "A1-A2",
    "title": "Present simple and be",
    "summary": "Use am / is / are for facts and descriptions: I am a student; she is friendly; they are ready.\nFor routines and general facts, use the base verb (I work) or add -s / -es for he, she, it (he works).\nNegatives: do not / does not + base verb. Questions: Do / Does + subject + base verb?\nExample: The library opens at 9 a.m. / Does it open on Sundays? No, it does not.",
    "ai_prompt": "Act as a patient English tutor for an A1-A2 learner studying “Present simple and be”. Teach am/is/are and present simple routines in short, plain English. Give two everyday examples, then ask me five new questions one at a time. Wait for my answer before continuing, correct mistakes kindly, and finish with a short recap. Do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "My brother ___ to college by bus every morning.",
        "options": [
          "go",
          "goes",
          "is go",
          "going"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete the question: ___ you usually study in the evening?",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct sentence.",
        "options": [
          "She don't like reading.",
          "She doesn't likes reading.",
          "She doesn't like reading.",
          "She not like reading."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: We ___ ready for class.",
        "placeholder": "am / is / are"
      },
      {
        "type": "multiple-choice",
        "prompt": "What does “I live in Tashkent” describe?",
        "options": [
          "A routine or fact",
          "An action happening right now",
          "A finished past event",
          "A future plan"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 1,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "routine",
            "meaning": "a regular habit"
          },
          {
            "id": "p2",
            "word": "usually",
            "meaning": "on most occasions"
          },
          {
            "id": "p3",
            "word": "attend",
            "meaning": "go to an event"
          },
          {
            "id": "p4",
            "word": "begin",
            "meaning": "start"
          },
          {
            "id": "p5",
            "word": "finish",
            "meaning": "complete"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "routine",
            "meaning": "a regular habit"
          },
          {
            "word": "usually",
            "meaning": "on most occasions"
          },
          {
            "word": "attend",
            "meaning": "go to an event"
          },
          {
            "word": "begin",
            "meaning": "start"
          },
          {
            "word": "finish",
            "meaning": "complete"
          },
          {
            "word": "daily",
            "meaning": "every day"
          },
          {
            "word": "often",
            "meaning": "many times"
          },
          {
            "word": "rarely",
            "meaning": "not often"
          },
          {
            "word": "study",
            "meaning": "learn about a subject"
          },
          {
            "word": "friendly",
            "meaning": "kind and welcoming"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "routine",
            "options": [
              "a regular habit",
              "not often",
              "start"
            ]
          },
          {
            "id": "q2",
            "word": "usually",
            "options": [
              "complete",
              "learn about a subject",
              "on most occasions"
            ]
          },
          {
            "id": "q3",
            "word": "attend",
            "options": [
              "kind and welcoming",
              "every day",
              "go to an event"
            ]
          },
          {
            "id": "q4",
            "word": "begin",
            "options": [
              "a regular habit",
              "many times",
              "start"
            ]
          },
          {
            "id": "q5",
            "word": "finish",
            "options": [
              "on most occasions",
              "not often",
              "complete"
            ]
          },
          {
            "id": "q6",
            "word": "daily",
            "options": [
              "every day",
              "learn about a subject",
              "go to an event"
            ]
          },
          {
            "id": "q7",
            "word": "often",
            "options": [
              "start",
              "many times",
              "kind and welcoming"
            ]
          },
          {
            "id": "q8",
            "word": "rarely",
            "options": [
              "complete",
              "not often",
              "a regular habit"
            ]
          },
          {
            "id": "q9",
            "word": "study",
            "options": [
              "on most occasions",
              "every day",
              "learn about a subject"
            ]
          },
          {
            "id": "q10",
            "word": "friendly",
            "options": [
              "many times",
              "kind and welcoming",
              "go to an event"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "A study routine",
            "sentence": "I study English every evening.",
            "words": [
              "evening.",
              "every",
              "English",
              "study",
              "I"
            ]
          },
          {
            "id": "s2",
            "hint": "A third-person routine",
            "sentence": "The library opens at nine o’clock.",
            "words": [
              "o’clock.",
              "at",
              "library",
              "The",
              "nine",
              "opens"
            ]
          },
          {
            "id": "s3",
            "hint": "A present simple question",
            "sentence": "Do you usually walk to college?",
            "words": [
              "walk",
              "Do",
              "college?",
              "usually",
              "to",
              "you"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-present-continuous",
    "stage": "A1-A2",
    "title": "Present continuous",
    "summary": "Form the present continuous with am / is / are + verb-ing: I am studying; he is reading; they are waiting.\nUse it for an action happening now or a temporary situation. Add -ing (make → making, sit → sitting).\nNegative: She is not working. Question: Are you listening?\nCompare: I work every day (routine) / I am working now (happening now).",
    "ai_prompt": "Act as a supportive A1-A2 English tutor. Teach the present continuous (am/is/are + -ing), including one spelling change and how it differs from a routine. Use simple examples about daily life and study. Quiz me with five short questions one at a time, wait for each response, and explain corrections in plain English.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Look! The children ___ football in the park.",
        "options": [
          "play",
          "plays",
          "are playing",
          "is playing"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: I ___ (write) an email at the moment.",
        "placeholder": "Two words"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence describes a temporary situation?",
        "options": [
          "Mina works at a bank.",
          "Mina is working from home this week.",
          "Mina worked at a bank last year.",
          "Mina will work tomorrow."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: He is ___ (run) to catch the bus.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct negative form.",
        "options": [
          "They not are studying.",
          "They aren't studying.",
          "They don't studying.",
          "They doesn't study."
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 2,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "currently",
            "meaning": "at the moment"
          },
          {
            "id": "p2",
            "word": "temporary",
            "meaning": "lasting a short time"
          },
          {
            "id": "p3",
            "word": "listen",
            "meaning": "pay attention to sound"
          },
          {
            "id": "p4",
            "word": "prepare",
            "meaning": "get ready"
          },
          {
            "id": "p5",
            "word": "wait",
            "meaning": "stay until something happens"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "currently",
            "meaning": "at the moment"
          },
          {
            "word": "temporary",
            "meaning": "lasting a short time"
          },
          {
            "word": "listen",
            "meaning": "pay attention to sound"
          },
          {
            "word": "prepare",
            "meaning": "get ready"
          },
          {
            "word": "wait",
            "meaning": "stay until something happens"
          },
          {
            "word": "happen",
            "meaning": "take place"
          },
          {
            "word": "write",
            "meaning": "put words on paper"
          },
          {
            "word": "read",
            "meaning": "look at written words"
          },
          {
            "word": "speak",
            "meaning": "say words aloud"
          },
          {
            "word": "now",
            "meaning": "at this time"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "currently",
            "options": [
              "look at written words",
              "get ready",
              "at the moment"
            ]
          },
          {
            "id": "q2",
            "word": "temporary",
            "options": [
              "lasting a short time",
              "say words aloud",
              "stay until something happens"
            ]
          },
          {
            "id": "q3",
            "word": "listen",
            "options": [
              "at this time",
              "pay attention to sound",
              "take place"
            ]
          },
          {
            "id": "q4",
            "word": "prepare",
            "options": [
              "put words on paper",
              "get ready",
              "at the moment"
            ]
          },
          {
            "id": "q5",
            "word": "wait",
            "options": [
              "look at written words",
              "lasting a short time",
              "stay until something happens"
            ]
          },
          {
            "id": "q6",
            "word": "happen",
            "options": [
              "pay attention to sound",
              "take place",
              "say words aloud"
            ]
          },
          {
            "id": "q7",
            "word": "write",
            "options": [
              "put words on paper",
              "at this time",
              "get ready"
            ]
          },
          {
            "id": "q8",
            "word": "read",
            "options": [
              "look at written words",
              "stay until something happens",
              "at the moment"
            ]
          },
          {
            "id": "q9",
            "word": "speak",
            "options": [
              "lasting a short time",
              "take place",
              "say words aloud"
            ]
          },
          {
            "id": "q10",
            "word": "now",
            "options": [
              "put words on paper",
              "pay attention to sound",
              "at this time"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "An action happening now",
            "sentence": "The students are preparing for their exam.",
            "words": [
              "are",
              "for",
              "their",
              "The",
              "exam.",
              "preparing",
              "students"
            ]
          },
          {
            "id": "s2",
            "hint": "A negative continuous sentence",
            "sentence": "She is not working at the moment.",
            "words": [
              "at",
              "She",
              "moment.",
              "not",
              "is",
              "working",
              "the"
            ]
          },
          {
            "id": "s3",
            "hint": "A continuous question",
            "sentence": "Are you listening to the recording?",
            "words": [
              "to",
              "you",
              "Are",
              "recording?",
              "listening",
              "the"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-past-simple",
    "stage": "A1-A2",
    "title": "Past simple and time expressions",
    "summary": "Use the past simple for actions finished at a known time: yesterday, last week, in 2022.\nRegular verbs usually end in -ed (visit → visited). Learn common irregular forms (go → went; see → saw).\nFor questions and negatives use did / did not + the base verb: Did you go? I didn't go.\nExample: We visited Samarkand last summer.",
    "ai_prompt": "You are a friendly A1-A2 English tutor. Explain the past simple for finished events, with regular and irregular verbs and did/didn't questions. Give examples using yesterday or last year. Then practise with five questions, one at a time. Let me answer before correcting me, and end with a two-line summary.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "We ___ the museum last Saturday.",
        "options": [
          "visit",
          "visited",
          "visiting",
          "visits"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: She ___ (go) to Bukhara in 2023.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct question.",
        "options": [
          "Did they saw the film?",
          "Did they see the film?",
          "Do they saw the film?",
          "Were they see the film?"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: I didn't ___ (buy) a ticket.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which time expression usually signals the past simple?",
        "options": [
          "right now",
          "every morning",
          "last month",
          "at the moment"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 3,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "yesterday",
            "meaning": "the day before today"
          },
          {
            "id": "p2",
            "word": "recently",
            "meaning": "not long ago"
          },
          {
            "id": "p3",
            "word": "visited",
            "meaning": "went to see a place"
          },
          {
            "id": "p4",
            "word": "arrived",
            "meaning": "reached a destination"
          },
          {
            "id": "p5",
            "word": "left",
            "meaning": "went away"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "yesterday",
            "meaning": "the day before today"
          },
          {
            "word": "recently",
            "meaning": "not long ago"
          },
          {
            "word": "visited",
            "meaning": "went to see a place"
          },
          {
            "word": "arrived",
            "meaning": "reached a destination"
          },
          {
            "word": "left",
            "meaning": "went away"
          },
          {
            "word": "bought",
            "meaning": "purchased in the past"
          },
          {
            "word": "journey",
            "meaning": "a trip from one place to another"
          },
          {
            "word": "ago",
            "meaning": "before the present time"
          },
          {
            "word": "last",
            "meaning": "the previous one"
          },
          {
            "word": "returned",
            "meaning": "came back"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "yesterday",
            "options": [
              "the day before today",
              "before the present time",
              "reached a destination"
            ]
          },
          {
            "id": "q2",
            "word": "recently",
            "options": [
              "not long ago",
              "went away",
              "the previous one"
            ]
          },
          {
            "id": "q3",
            "word": "visited",
            "options": [
              "came back",
              "went to see a place",
              "purchased in the past"
            ]
          },
          {
            "id": "q4",
            "word": "arrived",
            "options": [
              "a trip from one place to another",
              "reached a destination",
              "the day before today"
            ]
          },
          {
            "id": "q5",
            "word": "left",
            "options": [
              "before the present time",
              "went away",
              "not long ago"
            ]
          },
          {
            "id": "q6",
            "word": "bought",
            "options": [
              "went to see a place",
              "the previous one",
              "purchased in the past"
            ]
          },
          {
            "id": "q7",
            "word": "journey",
            "options": [
              "a trip from one place to another",
              "reached a destination",
              "came back"
            ]
          },
          {
            "id": "q8",
            "word": "ago",
            "options": [
              "before the present time",
              "the day before today",
              "went away"
            ]
          },
          {
            "id": "q9",
            "word": "last",
            "options": [
              "purchased in the past",
              "not long ago",
              "the previous one"
            ]
          },
          {
            "id": "q10",
            "word": "returned",
            "options": [
              "a trip from one place to another",
              "went to see a place",
              "came back"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "A completed event",
            "sentence": "We visited the museum last Saturday.",
            "words": [
              "the",
              "Saturday.",
              "visited",
              "museum",
              "last",
              "We"
            ]
          },
          {
            "id": "s2",
            "hint": "An irregular past verb",
            "sentence": "She bought a new dictionary yesterday.",
            "words": [
              "a",
              "dictionary",
              "new",
              "She",
              "bought",
              "yesterday."
            ]
          },
          {
            "id": "s3",
            "hint": "A past question",
            "sentence": "Did you finish your homework on time?",
            "words": [
              "finish",
              "your",
              "Did",
              "you",
              "homework",
              "time?",
              "on"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-future-plans",
    "stage": "A1-A2",
    "title": "Future plans: going to and will",
    "summary": "Use be going to + verb for a plan you have already made.\nUse will + verb for a decision made now or a prediction.\nSay: I am going to revise tonight. / I will help you.\nIn Speaking Part 1, give a plan and one short reason.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Future plans: going to and will”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "I have booked my ticket. I ___ travel tomorrow.",
        "options": [
          "am going to",
          "went to",
          "going",
          "was"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The phone is ringing. I ___ answer it!",
        "options": [
          "answered",
          "am",
          "will",
          "going"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct plan.",
        "options": [
          "She going study.",
          "She is going to study.",
          "She will studying.",
          "She goes to studied."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which phrase introduces a future time?",
        "options": [
          "Last week",
          "Yesterday",
          "Two days ago",
          "Next month"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Complete: They are going to ___ a course.",
        "options": [
          "taking",
          "took",
          "take",
          "takes"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 4,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "plan",
            "meaning": "something you intend to do"
          },
          {
            "id": "p2",
            "word": "predict",
            "meaning": "say what may happen"
          },
          {
            "id": "p3",
            "word": "tomorrow",
            "meaning": "the day after today"
          },
          {
            "id": "p4",
            "word": "book",
            "meaning": "reserve in advance"
          },
          {
            "id": "p5",
            "word": "intend",
            "meaning": "plan to do something"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "plan",
            "meaning": "something you intend to do"
          },
          {
            "word": "predict",
            "meaning": "say what may happen"
          },
          {
            "word": "tomorrow",
            "meaning": "the day after today"
          },
          {
            "word": "book",
            "meaning": "reserve in advance"
          },
          {
            "word": "intend",
            "meaning": "plan to do something"
          },
          {
            "word": "future",
            "meaning": "time that has not happened yet"
          },
          {
            "word": "decide",
            "meaning": "make a choice"
          },
          {
            "word": "promise",
            "meaning": "say you will certainly do something"
          },
          {
            "word": "soon",
            "meaning": "in a short time"
          },
          {
            "word": "revise",
            "meaning": "study something again"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "plan",
            "options": [
              "say you will certainly do something",
              "something you intend to do",
              "reserve in advance"
            ]
          },
          {
            "id": "q2",
            "word": "predict",
            "options": [
              "in a short time",
              "plan to do something",
              "say what may happen"
            ]
          },
          {
            "id": "q3",
            "word": "tomorrow",
            "options": [
              "time that has not happened yet",
              "the day after today",
              "study something again"
            ]
          },
          {
            "id": "q4",
            "word": "book",
            "options": [
              "make a choice",
              "something you intend to do",
              "reserve in advance"
            ]
          },
          {
            "id": "q5",
            "word": "intend",
            "options": [
              "say what may happen",
              "plan to do something",
              "say you will certainly do something"
            ]
          },
          {
            "id": "q6",
            "word": "future",
            "options": [
              "time that has not happened yet",
              "in a short time",
              "the day after today"
            ]
          },
          {
            "id": "q7",
            "word": "decide",
            "options": [
              "make a choice",
              "reserve in advance",
              "study something again"
            ]
          },
          {
            "id": "q8",
            "word": "promise",
            "options": [
              "say you will certainly do something",
              "plan to do something",
              "something you intend to do"
            ]
          },
          {
            "id": "q9",
            "word": "soon",
            "options": [
              "say what may happen",
              "time that has not happened yet",
              "in a short time"
            ]
          },
          {
            "id": "q10",
            "word": "revise",
            "options": [
              "make a choice",
              "study something again",
              "the day after today"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "An arranged plan",
            "sentence": "I am going to take an English course.",
            "words": [
              "course.",
              "take",
              "I",
              "an",
              "am",
              "going",
              "to",
              "English"
            ]
          },
          {
            "id": "s2",
            "hint": "A promise",
            "sentence": "I will help you with your homework.",
            "words": [
              "I",
              "with",
              "you",
              "your",
              "will",
              "help",
              "homework."
            ]
          },
          {
            "id": "s3",
            "hint": "A future question",
            "sentence": "Are you going to study abroad?",
            "words": [
              "abroad?",
              "study",
              "going",
              "you",
              "to",
              "Are"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-everyday-vocabulary",
    "stage": "A1-A2",
    "title": "Everyday words: home, study and work",
    "summary": "Learn words in useful groups: home, education and work.\nA timetable shows when lessons start; a colleague works with you.\nUse a word in a whole sentence, not only in a translation.\nFor Speaking Part 1: describe your home, studies or job in two sentences.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Everyday words: home, study and work”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A person who works with you is a ___.",
        "options": [
          "tourist",
          "colleague",
          "passenger",
          "neighbourhood"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Where can you borrow books?",
        "options": [
          "A pharmacy",
          "A factory",
          "A library",
          "A platform"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A timetable tells you ___.",
        "options": [
          "when activities happen",
          "how much a room costs",
          "who owns a car",
          "why food is fresh"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the natural phrase.",
        "options": [
          "do a job to school",
          "make to homework",
          "go work at homework",
          "do homework"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A neighbourhood is ___.",
        "options": [
          "a school subject",
          "a local area",
          "a train ticket",
          "a daily meal"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 5,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "colleague",
            "meaning": "a person you work with"
          },
          {
            "id": "p2",
            "word": "library",
            "meaning": "a place to borrow books"
          },
          {
            "id": "p3",
            "word": "timetable",
            "meaning": "a schedule of activities"
          },
          {
            "id": "p4",
            "word": "neighbourhood",
            "meaning": "a local area"
          },
          {
            "id": "p5",
            "word": "occupation",
            "meaning": "a job or profession"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "colleague",
            "meaning": "a person you work with"
          },
          {
            "word": "library",
            "meaning": "a place to borrow books"
          },
          {
            "word": "timetable",
            "meaning": "a schedule of activities"
          },
          {
            "word": "neighbourhood",
            "meaning": "a local area"
          },
          {
            "word": "occupation",
            "meaning": "a job or profession"
          },
          {
            "word": "homework",
            "meaning": "study tasks done outside class"
          },
          {
            "word": "commute",
            "meaning": "travel regularly to work"
          },
          {
            "word": "kitchen",
            "meaning": "a room for preparing food"
          },
          {
            "word": "subject",
            "meaning": "an area of study"
          },
          {
            "word": "break",
            "meaning": "a short rest"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "colleague",
            "options": [
              "a person you work with",
              "a local area",
              "a room for preparing food"
            ]
          },
          {
            "id": "q2",
            "word": "library",
            "options": [
              "a job or profession",
              "a place to borrow books",
              "an area of study"
            ]
          },
          {
            "id": "q3",
            "word": "timetable",
            "options": [
              "a short rest",
              "a schedule of activities",
              "study tasks done outside class"
            ]
          },
          {
            "id": "q4",
            "word": "neighbourhood",
            "options": [
              "a local area",
              "a person you work with",
              "travel regularly to work"
            ]
          },
          {
            "id": "q5",
            "word": "occupation",
            "options": [
              "a job or profession",
              "a place to borrow books",
              "a room for preparing food"
            ]
          },
          {
            "id": "q6",
            "word": "homework",
            "options": [
              "an area of study",
              "study tasks done outside class",
              "a schedule of activities"
            ]
          },
          {
            "id": "q7",
            "word": "commute",
            "options": [
              "a local area",
              "a short rest",
              "travel regularly to work"
            ]
          },
          {
            "id": "q8",
            "word": "kitchen",
            "options": [
              "a room for preparing food",
              "a job or profession",
              "a person you work with"
            ]
          },
          {
            "id": "q9",
            "word": "subject",
            "options": [
              "a place to borrow books",
              "study tasks done outside class",
              "an area of study"
            ]
          },
          {
            "id": "q10",
            "word": "break",
            "options": [
              "travel regularly to work",
              "a schedule of activities",
              "a short rest"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Describe your neighbourhood",
            "sentence": "My neighbourhood has a small public library.",
            "words": [
              "neighbourhood",
              "library.",
              "a",
              "My",
              "public",
              "has",
              "small"
            ]
          },
          {
            "id": "s2",
            "hint": "Describe a work routine",
            "sentence": "I travel to work by bus every morning.",
            "words": [
              "work",
              "morning.",
              "travel",
              "bus",
              "I",
              "every",
              "by",
              "to"
            ]
          },
          {
            "id": "s3",
            "hint": "Describe a study habit",
            "sentence": "We do our homework after dinner.",
            "words": [
              "after",
              "do",
              "We",
              "our",
              "homework",
              "dinner."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-questions-and-negatives",
    "stage": "A1-A2",
    "title": "Questions and negatives",
    "summary": "Use do / does with present simple questions and did with past simple.\nAfter does or did, keep the main verb in its base form.\nUse what, where, when, who, why and how to request information.\nExample: Where does she live? / She does not live here.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Questions and negatives”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "___ does the course start? At nine.",
        "options": [
          "Who",
          "When",
          "Why",
          "How many"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct question.",
        "options": [
          "Where does he live?",
          "Where does he lives?",
          "Where he does live?",
          "Where do he live?"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "They ___ go to class yesterday.",
        "options": [
          "does not",
          "are not",
          "did not",
          "has not"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "How ___ does this book cost?",
        "options": [
          "many",
          "old",
          "often",
          "much"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "After did, use ___.",
        "options": [
          "a past form",
          "the base verb",
          "verb-ing",
          "a plural noun"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 6,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "where",
            "meaning": "in which place"
          },
          {
            "id": "p2",
            "word": "when",
            "meaning": "at what time"
          },
          {
            "id": "p3",
            "word": "why",
            "meaning": "for what reason"
          },
          {
            "id": "p4",
            "word": "who",
            "meaning": "which person"
          },
          {
            "id": "p5",
            "word": "how",
            "meaning": "in what way"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "where",
            "meaning": "in which place"
          },
          {
            "word": "when",
            "meaning": "at what time"
          },
          {
            "word": "why",
            "meaning": "for what reason"
          },
          {
            "word": "who",
            "meaning": "which person"
          },
          {
            "word": "how",
            "meaning": "in what way"
          },
          {
            "word": "question",
            "meaning": "a request for information"
          },
          {
            "word": "answer",
            "meaning": "a reply to a question"
          },
          {
            "word": "negative",
            "meaning": "saying that something is not true"
          },
          {
            "word": "information",
            "meaning": "facts about something"
          },
          {
            "word": "cost",
            "meaning": "the price of something"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "where",
            "options": [
              "in which place",
              "saying that something is not true",
              "which person"
            ]
          },
          {
            "id": "q2",
            "word": "when",
            "options": [
              "facts about something",
              "in what way",
              "at what time"
            ]
          },
          {
            "id": "q3",
            "word": "why",
            "options": [
              "for what reason",
              "the price of something",
              "a request for information"
            ]
          },
          {
            "id": "q4",
            "word": "who",
            "options": [
              "in which place",
              "which person",
              "a reply to a question"
            ]
          },
          {
            "id": "q5",
            "word": "how",
            "options": [
              "saying that something is not true",
              "at what time",
              "in what way"
            ]
          },
          {
            "id": "q6",
            "word": "question",
            "options": [
              "for what reason",
              "a request for information",
              "facts about something"
            ]
          },
          {
            "id": "q7",
            "word": "answer",
            "options": [
              "a reply to a question",
              "the price of something",
              "which person"
            ]
          },
          {
            "id": "q8",
            "word": "negative",
            "options": [
              "saying that something is not true",
              "in which place",
              "in what way"
            ]
          },
          {
            "id": "q9",
            "word": "information",
            "options": [
              "at what time",
              "facts about something",
              "a request for information"
            ]
          },
          {
            "id": "q10",
            "word": "cost",
            "options": [
              "the price of something",
              "a reply to a question",
              "for what reason"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Ask about a location",
            "sentence": "Where does your brother live?",
            "words": [
              "live?",
              "Where",
              "your",
              "does",
              "brother"
            ]
          },
          {
            "id": "s2",
            "hint": "Make a past negative",
            "sentence": "They did not attend the lesson yesterday.",
            "words": [
              "yesterday.",
              "lesson",
              "not",
              "did",
              "They",
              "attend",
              "the"
            ]
          },
          {
            "id": "s3",
            "hint": "Ask about frequency",
            "sentence": "How often do you practise English?",
            "words": [
              "do",
              "practise",
              "How",
              "English?",
              "you",
              "often"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-countable-nouns",
    "stage": "A1-A2",
    "title": "Countable nouns and quantities",
    "summary": "Countable nouns have singular and plural forms: a book / two books.\nUncountable nouns include water, information and advice.\nUse many with countable nouns and much with uncountable nouns.\nUse some in positive statements and any in most questions and negatives.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Countable nouns and quantities”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Which noun is uncountable?",
        "options": [
          "Chair",
          "Student",
          "Information",
          "Ticket"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "There are ___ students in the classroom.",
        "options": [
          "many",
          "much",
          "a little",
          "an"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "How ___ water do you drink?",
        "options": [
          "many",
          "a few",
          "any",
          "much"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct phrase.",
        "options": [
          "an advice",
          "a piece of advice",
          "three advices",
          "many advice"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "We do not have ___ milk.",
        "options": [
          "some",
          "a",
          "any",
          "many"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 7,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "quantity",
            "meaning": "an amount of something"
          },
          {
            "id": "p2",
            "word": "several",
            "meaning": "more than two but not many"
          },
          {
            "id": "p3",
            "word": "plenty",
            "meaning": "more than enough"
          },
          {
            "id": "p4",
            "word": "advice",
            "meaning": "a suggestion about what to do"
          },
          {
            "id": "p5",
            "word": "countable",
            "meaning": "able to be counted"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "quantity",
            "meaning": "an amount of something"
          },
          {
            "word": "several",
            "meaning": "more than two but not many"
          },
          {
            "word": "plenty",
            "meaning": "more than enough"
          },
          {
            "word": "advice",
            "meaning": "a suggestion about what to do"
          },
          {
            "word": "countable",
            "meaning": "able to be counted"
          },
          {
            "word": "amount",
            "meaning": "how much there is"
          },
          {
            "word": "bottle",
            "meaning": "a container for liquids"
          },
          {
            "word": "piece",
            "meaning": "a single part of something"
          },
          {
            "word": "enough",
            "meaning": "as much as needed"
          },
          {
            "word": "few",
            "meaning": "a small number"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "quantity",
            "options": [
              "an amount of something",
              "a single part of something",
              "a suggestion about what to do"
            ]
          },
          {
            "id": "q2",
            "word": "several",
            "options": [
              "more than two but not many",
              "able to be counted",
              "as much as needed"
            ]
          },
          {
            "id": "q3",
            "word": "plenty",
            "options": [
              "how much there is",
              "more than enough",
              "a small number"
            ]
          },
          {
            "id": "q4",
            "word": "advice",
            "options": [
              "a container for liquids",
              "an amount of something",
              "a suggestion about what to do"
            ]
          },
          {
            "id": "q5",
            "word": "countable",
            "options": [
              "able to be counted",
              "a single part of something",
              "more than two but not many"
            ]
          },
          {
            "id": "q6",
            "word": "amount",
            "options": [
              "as much as needed",
              "more than enough",
              "how much there is"
            ]
          },
          {
            "id": "q7",
            "word": "bottle",
            "options": [
              "a suggestion about what to do",
              "a small number",
              "a container for liquids"
            ]
          },
          {
            "id": "q8",
            "word": "piece",
            "options": [
              "able to be counted",
              "a single part of something",
              "an amount of something"
            ]
          },
          {
            "id": "q9",
            "word": "enough",
            "options": [
              "as much as needed",
              "how much there is",
              "more than two but not many"
            ]
          },
          {
            "id": "q10",
            "word": "few",
            "options": [
              "a small number",
              "a container for liquids",
              "more than enough"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Use much with water",
            "sentence": "How much water do you need?",
            "words": [
              "water",
              "need?",
              "you",
              "How",
              "do",
              "much"
            ]
          },
          {
            "id": "s2",
            "hint": "Use many with books",
            "sentence": "There are many books in the library.",
            "words": [
              "in",
              "are",
              "books",
              "the",
              "many",
              "There",
              "library."
            ]
          },
          {
            "id": "s3",
            "hint": "Use a quantity with advice",
            "sentence": "The tutor gave me a piece of advice.",
            "words": [
              "me",
              "of",
              "gave",
              "piece",
              "advice.",
              "The",
              "tutor",
              "a"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-prepositions-directions",
    "stage": "A1-A2",
    "title": "Prepositions, places and directions",
    "summary": "Use at for points and times, on for days and surfaces, in for enclosed places and months.\nDirections use turn left, go straight and opposite.\nIn Listening map tasks, follow landmarks instead of guessing.\nExample: The bank is opposite the library. Meet me at six on Monday.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Prepositions, places and directions”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The lesson starts ___ six o’clock.",
        "options": [
          "on",
          "at",
          "in",
          "by in"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "We study ___ Monday.",
        "options": [
          "on",
          "in",
          "at",
          "into"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Opposite means ___.",
        "options": [
          "inside",
          "above",
          "across from",
          "behind and inside"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose a direction.",
        "options": [
          "At Tuesday",
          "In six",
          "On the water",
          "Turn left"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The books are ___ the table.",
        "options": [
          "at",
          "on",
          "during",
          "until"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 8,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "opposite",
            "meaning": "across from"
          },
          {
            "id": "p2",
            "word": "near",
            "meaning": "not far from"
          },
          {
            "id": "p3",
            "word": "behind",
            "meaning": "at the back of"
          },
          {
            "id": "p4",
            "word": "between",
            "meaning": "in the space separating two things"
          },
          {
            "id": "p5",
            "word": "straight",
            "meaning": "without turning"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "opposite",
            "meaning": "across from"
          },
          {
            "word": "near",
            "meaning": "not far from"
          },
          {
            "word": "behind",
            "meaning": "at the back of"
          },
          {
            "word": "between",
            "meaning": "in the space separating two things"
          },
          {
            "word": "straight",
            "meaning": "without turning"
          },
          {
            "word": "junction",
            "meaning": "a place where roads meet"
          },
          {
            "word": "entrance",
            "meaning": "a way into a place"
          },
          {
            "word": "exit",
            "meaning": "a way out of a place"
          },
          {
            "word": "beside",
            "meaning": "next to"
          },
          {
            "word": "landmark",
            "meaning": "an easily recognised place"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "opposite",
            "options": [
              "across from",
              "in the space separating two things",
              "a way out of a place"
            ]
          },
          {
            "id": "q2",
            "word": "near",
            "options": [
              "next to",
              "not far from",
              "without turning"
            ]
          },
          {
            "id": "q3",
            "word": "behind",
            "options": [
              "an easily recognised place",
              "a place where roads meet",
              "at the back of"
            ]
          },
          {
            "id": "q4",
            "word": "between",
            "options": [
              "in the space separating two things",
              "across from",
              "a way into a place"
            ]
          },
          {
            "id": "q5",
            "word": "straight",
            "options": [
              "a way out of a place",
              "without turning",
              "not far from"
            ]
          },
          {
            "id": "q6",
            "word": "junction",
            "options": [
              "at the back of",
              "next to",
              "a place where roads meet"
            ]
          },
          {
            "id": "q7",
            "word": "entrance",
            "options": [
              "in the space separating two things",
              "an easily recognised place",
              "a way into a place"
            ]
          },
          {
            "id": "q8",
            "word": "exit",
            "options": [
              "a way out of a place",
              "across from",
              "without turning"
            ]
          },
          {
            "id": "q9",
            "word": "beside",
            "options": [
              "a place where roads meet",
              "next to",
              "not far from"
            ]
          },
          {
            "id": "q10",
            "word": "landmark",
            "options": [
              "an easily recognised place",
              "at the back of",
              "a way into a place"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Give a location",
            "sentence": "The bank is opposite the public library.",
            "words": [
              "opposite",
              "is",
              "bank",
              "public",
              "The",
              "the",
              "library."
            ]
          },
          {
            "id": "s2",
            "hint": "Give a direction",
            "sentence": "Turn left at the next junction.",
            "words": [
              "Turn",
              "junction.",
              "next",
              "left",
              "at",
              "the"
            ]
          },
          {
            "id": "s3",
            "hint": "Use a time preposition",
            "sentence": "The English lesson starts at six.",
            "words": [
              "at",
              "six.",
              "lesson",
              "English",
              "starts",
              "The"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-listening-numbers",
    "stage": "A1-A2",
    "title": "Listening basics: numbers, dates and spelling",
    "summary": "Before a recording, predict whether the gap needs a number, date or name.\nDistinguish thirteen and thirty; listen to the stressed syllable.\nA speaker may correct a detail: Tuesday—sorry, Thursday. Keep the final answer.\nWrite within the question’s word limit and check spelling.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Listening basics: numbers, dates and spelling”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "“Tuesday—sorry, Thursday.” Which day should you write?",
        "options": [
          "Tuesday",
          "Both days",
          "Thursday",
          "Monday"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Before a recording, first ___.",
        "options": [
          "predict the answer type",
          "write any number",
          "ignore the questions",
          "translate every word"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A phone number gap usually needs ___.",
        "options": [
          "an essay",
          "a verb tense",
          "an opinion",
          "digits"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "NO MORE THAN TWO WORDS allows ___.",
        "options": [
          "three words",
          "one or two words",
          "a paragraph",
          "any number of words"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which is a date?",
        "options": [
          "Library",
          "Room B",
          "15 June",
          "Friendly"
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 9,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "digit",
            "meaning": "a symbol from zero to nine"
          },
          {
            "id": "p2",
            "word": "spell",
            "meaning": "say the letters of a word"
          },
          {
            "id": "p3",
            "word": "surname",
            "meaning": "a family name"
          },
          {
            "id": "p4",
            "word": "date",
            "meaning": "a day of a month and year"
          },
          {
            "id": "p5",
            "word": "correct",
            "meaning": "change a mistake to the right answer"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "digit",
            "meaning": "a symbol from zero to nine"
          },
          {
            "word": "spell",
            "meaning": "say the letters of a word"
          },
          {
            "word": "surname",
            "meaning": "a family name"
          },
          {
            "word": "date",
            "meaning": "a day of a month and year"
          },
          {
            "word": "correct",
            "meaning": "change a mistake to the right answer"
          },
          {
            "word": "recording",
            "meaning": "stored sound"
          },
          {
            "word": "detail",
            "meaning": "a small piece of information"
          },
          {
            "word": "stress",
            "meaning": "emphasis on a syllable"
          },
          {
            "word": "deadline",
            "meaning": "the latest time to finish"
          },
          {
            "word": "postcode",
            "meaning": "a code for a postal area"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "digit",
            "options": [
              "emphasis on a syllable",
              "a day of a month and year",
              "a symbol from zero to nine"
            ]
          },
          {
            "id": "q2",
            "word": "spell",
            "options": [
              "change a mistake to the right answer",
              "the latest time to finish",
              "say the letters of a word"
            ]
          },
          {
            "id": "q3",
            "word": "surname",
            "options": [
              "a family name",
              "stored sound",
              "a code for a postal area"
            ]
          },
          {
            "id": "q4",
            "word": "date",
            "options": [
              "a symbol from zero to nine",
              "a small piece of information",
              "a day of a month and year"
            ]
          },
          {
            "id": "q5",
            "word": "correct",
            "options": [
              "emphasis on a syllable",
              "change a mistake to the right answer",
              "say the letters of a word"
            ]
          },
          {
            "id": "q6",
            "word": "recording",
            "options": [
              "the latest time to finish",
              "stored sound",
              "a family name"
            ]
          },
          {
            "id": "q7",
            "word": "detail",
            "options": [
              "a small piece of information",
              "a day of a month and year",
              "a code for a postal area"
            ]
          },
          {
            "id": "q8",
            "word": "stress",
            "options": [
              "change a mistake to the right answer",
              "a symbol from zero to nine",
              "emphasis on a syllable"
            ]
          },
          {
            "id": "q9",
            "word": "deadline",
            "options": [
              "the latest time to finish",
              "say the letters of a word",
              "stored sound"
            ]
          },
          {
            "id": "q10",
            "word": "postcode",
            "options": [
              "a code for a postal area",
              "a family name",
              "a small piece of information"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Listen for a corrected detail",
            "sentence": "The appointment is on Thursday afternoon.",
            "words": [
              "afternoon.",
              "Thursday",
              "The",
              "is",
              "on",
              "appointment"
            ]
          },
          {
            "id": "s2",
            "hint": "Describe an answer type",
            "sentence": "This gap needs a number or a date.",
            "words": [
              "date.",
              "or",
              "gap",
              "a",
              "needs",
              "a",
              "number",
              "This"
            ]
          },
          {
            "id": "s3",
            "hint": "Ask for spelling",
            "sentence": "Could you spell your surname please?",
            "words": [
              "Could",
              "spell",
              "please?",
              "you",
              "surname",
              "your"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a1-a2-speaking-daily-life",
    "stage": "A1-A2",
    "title": "Speaking Part 1: daily life",
    "summary": "Give a direct answer, then add a reason or a small example.\nUse natural everyday words about hobbies, family and routines.\nAvoid memorised speeches; two or three clear sentences are enough.\nExample: I enjoy walking because it helps me relax after class.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A1 to A2 learner studying “Speaking Part 1: daily life”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A useful Part 1 answer includes ___.",
        "options": [
          "only yes",
          "a direct answer and a reason",
          "a memorised essay",
          "unrelated facts"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the natural answer to “What do you enjoy?”",
        "options": [
          "I enjoyable read.",
          "I enjoy to reading.",
          "I enjoy reading.",
          "I enjoy reads."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which word introduces a reason?",
        "options": [
          "Because",
          "Yesterday",
          "Beside",
          "Whose"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Speaking Part 1 usually covers ___.",
        "options": [
          "only technical research",
          "only maps",
          "only economic policy",
          "familiar personal topics"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence adds an example?",
        "options": [
          "Yes.",
          "For example, I walk in the park.",
          "I do.",
          "No."
        ]
      }
    ],
    "reward_coins": 10,
    "order_index": 10,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "hobby",
            "meaning": "an activity you enjoy in free time"
          },
          {
            "id": "p2",
            "word": "relax",
            "meaning": "become less tense"
          },
          {
            "id": "p3",
            "word": "prefer",
            "meaning": "like one thing more than another"
          },
          {
            "id": "p4",
            "word": "familiar",
            "meaning": "well known to you"
          },
          {
            "id": "p5",
            "word": "reason",
            "meaning": "an explanation for something"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "hobby",
            "meaning": "an activity you enjoy in free time"
          },
          {
            "word": "relax",
            "meaning": "become less tense"
          },
          {
            "word": "prefer",
            "meaning": "like one thing more than another"
          },
          {
            "word": "familiar",
            "meaning": "well known to you"
          },
          {
            "word": "reason",
            "meaning": "an explanation for something"
          },
          {
            "word": "example",
            "meaning": "a case that illustrates an idea"
          },
          {
            "word": "leisure",
            "meaning": "free time"
          },
          {
            "word": "enjoy",
            "meaning": "take pleasure in"
          },
          {
            "word": "routine",
            "meaning": "something you do regularly"
          },
          {
            "word": "local",
            "meaning": "connected to a nearby area"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "hobby",
            "options": [
              "take pleasure in",
              "well known to you",
              "an activity you enjoy in free time"
            ]
          },
          {
            "id": "q2",
            "word": "relax",
            "options": [
              "something you do regularly",
              "an explanation for something",
              "become less tense"
            ]
          },
          {
            "id": "q3",
            "word": "prefer",
            "options": [
              "a case that illustrates an idea",
              "like one thing more than another",
              "connected to a nearby area"
            ]
          },
          {
            "id": "q4",
            "word": "familiar",
            "options": [
              "an activity you enjoy in free time",
              "well known to you",
              "free time"
            ]
          },
          {
            "id": "q5",
            "word": "reason",
            "options": [
              "become less tense",
              "take pleasure in",
              "an explanation for something"
            ]
          },
          {
            "id": "q6",
            "word": "example",
            "options": [
              "something you do regularly",
              "a case that illustrates an idea",
              "like one thing more than another"
            ]
          },
          {
            "id": "q7",
            "word": "leisure",
            "options": [
              "connected to a nearby area",
              "free time",
              "well known to you"
            ]
          },
          {
            "id": "q8",
            "word": "enjoy",
            "options": [
              "an explanation for something",
              "an activity you enjoy in free time",
              "take pleasure in"
            ]
          },
          {
            "id": "q9",
            "word": "routine",
            "options": [
              "something you do regularly",
              "become less tense",
              "a case that illustrates an idea"
            ]
          },
          {
            "id": "q10",
            "word": "local",
            "options": [
              "connected to a nearby area",
              "free time",
              "like one thing more than another"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Give a preference and reason",
            "sentence": "I prefer walking because it helps me relax.",
            "words": [
              "helps",
              "prefer",
              "it",
              "because",
              "walking",
              "me",
              "I",
              "relax."
            ]
          },
          {
            "id": "s2",
            "hint": "Give an everyday example",
            "sentence": "For example, I visit the park on Sundays.",
            "words": [
              "the",
              "on",
              "park",
              "Sundays.",
              "example,",
              "I",
              "For",
              "visit"
            ]
          },
          {
            "id": "s3",
            "hint": "Describe a hobby",
            "sentence": "Reading is my favourite free time activity.",
            "words": [
              "my",
              "activity.",
              "is",
              "favourite",
              "Reading",
              "time",
              "free"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-present-perfect",
    "stage": "A2-B1",
    "title": "Present perfect vs past simple",
    "summary": "Use have / has + past participle for life experiences or results when the exact finished time is not the focus: I have visited Rome.\nUse the past simple with a finished time such as yesterday or in 2021: I visited Rome in 2021.\nEver / never often ask about experience; just / already / yet often describe recent results.\nExample: She has just finished her essay. / She finished it last night.",
    "ai_prompt": "Teach an A2-B1 learner how to choose between the present perfect and past simple. Use “ever/never” for experiences and a finished time expression for past simple. Give a short rule, then ask five varied questions one by one. Wait for each answer, correct gently, and explain why the tense fits.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "I ___ never ___ Japanese food before.",
        "options": [
          "have / tried",
          "did / tried",
          "has / try",
          "am / trying"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete with the past simple: They ___ (move) here in 2020.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence is correct?",
        "options": [
          "Have you ever visited London?",
          "Did you ever visited London?",
          "Have you ever visit London?",
          "Do you have ever visited London?"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: Omar has ___ finished his assignment, so he can relax.",
        "placeholder": "already / yet / ever"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the best sentence with “last week”.",
        "options": [
          "I have met my tutor last week.",
          "I met my tutor last week.",
          "I have meet my tutor last week.",
          "I meet my tutor last week."
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 1,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "experience",
            "meaning": "something you have lived through"
          },
          {
            "id": "p2",
            "word": "already",
            "meaning": "before this time"
          },
          {
            "id": "p3",
            "word": "yet",
            "meaning": "up to now in questions or negatives"
          },
          {
            "id": "p4",
            "word": "ever",
            "meaning": "at any time"
          },
          {
            "id": "p5",
            "word": "never",
            "meaning": "not at any time"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "experience",
            "meaning": "something you have lived through"
          },
          {
            "word": "already",
            "meaning": "before this time"
          },
          {
            "word": "yet",
            "meaning": "up to now in questions or negatives"
          },
          {
            "word": "ever",
            "meaning": "at any time"
          },
          {
            "word": "never",
            "meaning": "not at any time"
          },
          {
            "word": "since",
            "meaning": "from a specific past time"
          },
          {
            "word": "recent",
            "meaning": "having happened not long ago"
          },
          {
            "word": "achievement",
            "meaning": "something successfully completed"
          },
          {
            "word": "abroad",
            "meaning": "in another country"
          },
          {
            "word": "lately",
            "meaning": "in the recent past"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "experience",
            "options": [
              "something you have lived through",
              "something successfully completed",
              "at any time"
            ]
          },
          {
            "id": "q2",
            "word": "already",
            "options": [
              "in another country",
              "not at any time",
              "before this time"
            ]
          },
          {
            "id": "q3",
            "word": "yet",
            "options": [
              "from a specific past time",
              "up to now in questions or negatives",
              "in the recent past"
            ]
          },
          {
            "id": "q4",
            "word": "ever",
            "options": [
              "having happened not long ago",
              "something you have lived through",
              "at any time"
            ]
          },
          {
            "id": "q5",
            "word": "never",
            "options": [
              "not at any time",
              "before this time",
              "something successfully completed"
            ]
          },
          {
            "id": "q6",
            "word": "since",
            "options": [
              "up to now in questions or negatives",
              "in another country",
              "from a specific past time"
            ]
          },
          {
            "id": "q7",
            "word": "recent",
            "options": [
              "at any time",
              "having happened not long ago",
              "in the recent past"
            ]
          },
          {
            "id": "q8",
            "word": "achievement",
            "options": [
              "something you have lived through",
              "something successfully completed",
              "not at any time"
            ]
          },
          {
            "id": "q9",
            "word": "abroad",
            "options": [
              "from a specific past time",
              "in another country",
              "before this time"
            ]
          },
          {
            "id": "q10",
            "word": "lately",
            "options": [
              "up to now in questions or negatives",
              "having happened not long ago",
              "in the recent past"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "An experience without a finished time",
            "sentence": "I have visited several countries.",
            "words": [
              "countries.",
              "I",
              "visited",
              "several",
              "have"
            ]
          },
          {
            "id": "s2",
            "hint": "A completed event with a time",
            "sentence": "She moved to London last year.",
            "words": [
              "last",
              "moved",
              "London",
              "She",
              "year.",
              "to"
            ]
          },
          {
            "id": "s3",
            "hint": "An unfinished period",
            "sentence": "We have studied English since September.",
            "words": [
              "We",
              "English",
              "have",
              "studied",
              "September.",
              "since"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-passive-voice",
    "stage": "A2-B1",
    "title": "Passive voice",
    "summary": "Build the passive with be + past participle. Change be to show the tense: is made (present), was built (past), will be delivered (future).\nUse the passive when the action or result matters more than who did it. Add by + agent only when useful.\nIELTS example: The bridge was built in 2018. / The samples are analysed in a laboratory.",
    "ai_prompt": "Act as a clear A2-B1 grammar coach. Teach passive voice with the formula be + past participle and show present and past examples. Use IELTS-style examples about buildings, processes, and research. Ask five practice questions in sequence and explain each correction simply.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The new sports centre ___ last year.",
        "options": [
          "build",
          "built",
          "was built",
          "is build"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: English ___ (speak) in many countries.",
        "placeholder": "Two words"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct passive sentence.",
        "options": [
          "The results announced yesterday.",
          "The results were announced yesterday.",
          "The results was announce yesterday.",
          "The results did announced yesterday."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: The report will ___ (publish) next month.",
        "placeholder": "be + past participle"
      },
      {
        "type": "multiple-choice",
        "prompt": "Why is the passive useful in “The data were collected in May”? ",
        "options": [
          "The person is more important than the action",
          "The action or result is the focus",
          "It describes a regular habit",
          "It makes the sentence future"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 2,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "produce",
            "meaning": "make or manufacture"
          },
          {
            "id": "p2",
            "word": "deliver",
            "meaning": "take something to a destination"
          },
          {
            "id": "p3",
            "word": "publish",
            "meaning": "make writing publicly available"
          },
          {
            "id": "p4",
            "word": "build",
            "meaning": "construct"
          },
          {
            "id": "p5",
            "word": "discover",
            "meaning": "find something for the first time"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "produce",
            "meaning": "make or manufacture"
          },
          {
            "word": "deliver",
            "meaning": "take something to a destination"
          },
          {
            "word": "publish",
            "meaning": "make writing publicly available"
          },
          {
            "word": "build",
            "meaning": "construct"
          },
          {
            "word": "discover",
            "meaning": "find something for the first time"
          },
          {
            "word": "agent",
            "meaning": "the person who performs an action"
          },
          {
            "word": "process",
            "meaning": "a series of actions"
          },
          {
            "word": "manufacture",
            "meaning": "make goods in a factory"
          },
          {
            "word": "receive",
            "meaning": "get something"
          },
          {
            "word": "invent",
            "meaning": "create something new"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "produce",
            "options": [
              "make or manufacture",
              "make goods in a factory",
              "construct"
            ]
          },
          {
            "id": "q2",
            "word": "deliver",
            "options": [
              "take something to a destination",
              "get something",
              "find something for the first time"
            ]
          },
          {
            "id": "q3",
            "word": "publish",
            "options": [
              "create something new",
              "the person who performs an action",
              "make writing publicly available"
            ]
          },
          {
            "id": "q4",
            "word": "build",
            "options": [
              "construct",
              "a series of actions",
              "make or manufacture"
            ]
          },
          {
            "id": "q5",
            "word": "discover",
            "options": [
              "find something for the first time",
              "make goods in a factory",
              "take something to a destination"
            ]
          },
          {
            "id": "q6",
            "word": "agent",
            "options": [
              "make writing publicly available",
              "get something",
              "the person who performs an action"
            ]
          },
          {
            "id": "q7",
            "word": "process",
            "options": [
              "create something new",
              "construct",
              "a series of actions"
            ]
          },
          {
            "id": "q8",
            "word": "manufacture",
            "options": [
              "make or manufacture",
              "make goods in a factory",
              "find something for the first time"
            ]
          },
          {
            "id": "q9",
            "word": "receive",
            "options": [
              "the person who performs an action",
              "get something",
              "take something to a destination"
            ]
          },
          {
            "id": "q10",
            "word": "invent",
            "options": [
              "make writing publicly available",
              "create something new",
              "a series of actions"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "A present passive",
            "sentence": "English is spoken in many countries.",
            "words": [
              "spoken",
              "in",
              "English",
              "countries.",
              "many",
              "is"
            ]
          },
          {
            "id": "s2",
            "hint": "A past passive",
            "sentence": "The bridge was built in 1998.",
            "words": [
              "was",
              "1998.",
              "built",
              "in",
              "The",
              "bridge"
            ]
          },
          {
            "id": "s3",
            "hint": "A future passive",
            "sentence": "The results will be published next week.",
            "words": [
              "results",
              "next",
              "will",
              "The",
              "be",
              "week.",
              "published"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-first-conditional",
    "stage": "A2-B1",
    "title": "First conditional and future time clauses",
    "summary": "Use if / when + present simple for a real future condition. Use will + base verb in the result clause: If it rains, we will stay inside.\nDo not usually put will directly after if: If I have time, I will revise (not “if I will have time”).\nThe same present-tense rule applies after before, after, and as soon as: I will call you when I arrive.",
    "ai_prompt": "You are a patient A2-B1 tutor. Explain the first conditional for realistic future possibilities and the present simple after if/when. Give two study or travel examples. Ask five questions one at a time; wait for my answer, correct errors kindly, and finish with one memorable rule.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "If the weather ___ sunny, we will walk to the lake.",
        "options": [
          "will be",
          "is",
          "was",
          "would be"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: I will message you as soon as I ___ (arrive).",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct sentence.",
        "options": [
          "If I will finish early, I call you.",
          "If I finish early, I will call you.",
          "If I finished early, I will call you.",
          "If I finish early, I would call you."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: If she studies regularly, she ___ (improve) her score.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which verb form normally follows “when” in a future time clause?",
        "options": [
          "will + verb",
          "present simple",
          "past perfect",
          "would + verb"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 3,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "unless",
            "meaning": "if not"
          },
          {
            "id": "p2",
            "word": "provided",
            "meaning": "on the condition that"
          },
          {
            "id": "p3",
            "word": "likely",
            "meaning": "probable"
          },
          {
            "id": "p4",
            "word": "result",
            "meaning": "an outcome"
          },
          {
            "id": "p5",
            "word": "improve",
            "meaning": "become better"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "unless",
            "meaning": "if not"
          },
          {
            "word": "provided",
            "meaning": "on the condition that"
          },
          {
            "word": "likely",
            "meaning": "probable"
          },
          {
            "word": "result",
            "meaning": "an outcome"
          },
          {
            "word": "improve",
            "meaning": "become better"
          },
          {
            "word": "condition",
            "meaning": "a requirement for something"
          },
          {
            "word": "future",
            "meaning": "time ahead of the present"
          },
          {
            "word": "possible",
            "meaning": "able to happen"
          },
          {
            "word": "prepare",
            "meaning": "make ready"
          },
          {
            "word": "succeed",
            "meaning": "achieve a desired aim"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "unless",
            "options": [
              "an outcome",
              "able to happen",
              "if not"
            ]
          },
          {
            "id": "q2",
            "word": "provided",
            "options": [
              "make ready",
              "become better",
              "on the condition that"
            ]
          },
          {
            "id": "q3",
            "word": "likely",
            "options": [
              "achieve a desired aim",
              "a requirement for something",
              "probable"
            ]
          },
          {
            "id": "q4",
            "word": "result",
            "options": [
              "time ahead of the present",
              "an outcome",
              "if not"
            ]
          },
          {
            "id": "q5",
            "word": "improve",
            "options": [
              "able to happen",
              "become better",
              "on the condition that"
            ]
          },
          {
            "id": "q6",
            "word": "condition",
            "options": [
              "a requirement for something",
              "make ready",
              "probable"
            ]
          },
          {
            "id": "q7",
            "word": "future",
            "options": [
              "time ahead of the present",
              "achieve a desired aim",
              "an outcome"
            ]
          },
          {
            "id": "q8",
            "word": "possible",
            "options": [
              "able to happen",
              "become better",
              "if not"
            ]
          },
          {
            "id": "q9",
            "word": "prepare",
            "options": [
              "on the condition that",
              "make ready",
              "a requirement for something"
            ]
          },
          {
            "id": "q10",
            "word": "succeed",
            "options": [
              "probable",
              "achieve a desired aim",
              "time ahead of the present"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "A real future possibility",
            "sentence": "If I study regularly, I will improve.",
            "words": [
              "improve.",
              "study",
              "I",
              "I",
              "will",
              "regularly,",
              "If"
            ]
          },
          {
            "id": "s2",
            "hint": "A future time clause",
            "sentence": "We will start when everyone arrives.",
            "words": [
              "everyone",
              "arrives.",
              "will",
              "when",
              "We",
              "start"
            ]
          },
          {
            "id": "s3",
            "hint": "A negative condition",
            "sentence": "Unless it rains, we will walk to college.",
            "words": [
              "Unless",
              "college.",
              "to",
              "it",
              "will",
              "walk",
              "rains,",
              "we"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-articles",
    "stage": "A2-B1",
    "title": "Articles: a, an, the and no article",
    "summary": "Use a/an for one nonspecific singular countable noun. Choose an before a vowel sound.\nUse the when a reader or listener knows which item you mean.\nUse no article for general plural nouns or general uncountable nouns.\nExample: I bought a book. The book is useful. Education matters.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Articles: a, an, the and no article”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "She is ___ honest person.",
        "options": [
          "a",
          "the",
          "an",
          "no article"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "___ education is important in general.",
        "options": [
          "No article",
          "An",
          "A",
          "These"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "I saw a film. ___ film was excellent.",
        "options": [
          "A",
          "An",
          "Some",
          "The"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct phrase.",
        "options": [
          "an university",
          "a university",
          "a information",
          "an useful book"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Use the when the item is ___.",
        "options": [
          "always plural",
          "always abstract",
          "specific or already known",
          "mentioned for no reason"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 4,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "specific",
            "meaning": "clearly identified"
          },
          {
            "id": "p2",
            "word": "general",
            "meaning": "not limited to one example"
          },
          {
            "id": "p3",
            "word": "refer",
            "meaning": "mention or point to"
          },
          {
            "id": "p4",
            "word": "identify",
            "meaning": "recognise what something is"
          },
          {
            "id": "p5",
            "word": "unique",
            "meaning": "the only one of its kind"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "specific",
            "meaning": "clearly identified"
          },
          {
            "word": "general",
            "meaning": "not limited to one example"
          },
          {
            "word": "refer",
            "meaning": "mention or point to"
          },
          {
            "word": "identify",
            "meaning": "recognise what something is"
          },
          {
            "word": "unique",
            "meaning": "the only one of its kind"
          },
          {
            "word": "singular",
            "meaning": "referring to one"
          },
          {
            "word": "plural",
            "meaning": "referring to more than one"
          },
          {
            "word": "vowel",
            "meaning": "a speech sound with an open mouth"
          },
          {
            "word": "context",
            "meaning": "the surrounding situation"
          },
          {
            "word": "mention",
            "meaning": "refer to briefly"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "specific",
            "options": [
              "a speech sound with an open mouth",
              "clearly identified",
              "recognise what something is"
            ]
          },
          {
            "id": "q2",
            "word": "general",
            "options": [
              "the only one of its kind",
              "the surrounding situation",
              "not limited to one example"
            ]
          },
          {
            "id": "q3",
            "word": "refer",
            "options": [
              "mention or point to",
              "referring to one",
              "refer to briefly"
            ]
          },
          {
            "id": "q4",
            "word": "identify",
            "options": [
              "clearly identified",
              "recognise what something is",
              "referring to more than one"
            ]
          },
          {
            "id": "q5",
            "word": "unique",
            "options": [
              "not limited to one example",
              "the only one of its kind",
              "a speech sound with an open mouth"
            ]
          },
          {
            "id": "q6",
            "word": "singular",
            "options": [
              "referring to one",
              "mention or point to",
              "the surrounding situation"
            ]
          },
          {
            "id": "q7",
            "word": "plural",
            "options": [
              "refer to briefly",
              "referring to more than one",
              "recognise what something is"
            ]
          },
          {
            "id": "q8",
            "word": "vowel",
            "options": [
              "clearly identified",
              "a speech sound with an open mouth",
              "the only one of its kind"
            ]
          },
          {
            "id": "q9",
            "word": "context",
            "options": [
              "not limited to one example",
              "the surrounding situation",
              "referring to one"
            ]
          },
          {
            "id": "q10",
            "word": "mention",
            "options": [
              "refer to briefly",
              "mention or point to",
              "referring to more than one"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Introduce and identify a noun",
            "sentence": "I bought a book and the book was useful.",
            "words": [
              "bought",
              "the",
              "and",
              "I",
              "a",
              "was",
              "book",
              "book",
              "useful."
            ]
          },
          {
            "id": "s2",
            "hint": "A general plural statement",
            "sentence": "Students need regular opportunities to practise.",
            "words": [
              "to",
              "practise.",
              "regular",
              "opportunities",
              "Students",
              "need"
            ]
          },
          {
            "id": "s3",
            "hint": "A vowel sound",
            "sentence": "She gave an honest answer to the question.",
            "words": [
              "answer",
              "to",
              "an",
              "honest",
              "gave",
              "the",
              "question.",
              "She"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-linkers",
    "stage": "A2-B1",
    "title": "Linking ideas: cause, contrast and result",
    "summary": "Use because to give a reason and so to introduce a result.\nUse although or but for contrast; however normally links complete sentences.\nUse and or also to add information without overusing them.\nPunctuation matters: The course is useful; however, it is expensive.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Linking ideas: cause, contrast and result”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "I stayed home ___ I was ill.",
        "options": [
          "however",
          "because",
          "although",
          "despite"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "___ it was raining, we went out.",
        "options": [
          "Although",
          "Because of",
          "Therefore",
          "So that"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The bus was late, ___ I missed class.",
        "options": [
          "although",
          "despite",
          "so",
          "because of"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "However usually expresses ___.",
        "options": [
          "time",
          "addition",
          "purpose only",
          "contrast"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct structure.",
        "options": [
          "Despite she was tired",
          "Although she was tired",
          "Because of she was tired",
          "However she was tired so"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 5,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "therefore",
            "meaning": "as a result"
          },
          {
            "id": "p2",
            "word": "however",
            "meaning": "used to introduce contrast"
          },
          {
            "id": "p3",
            "word": "although",
            "meaning": "despite the fact that"
          },
          {
            "id": "p4",
            "word": "because",
            "meaning": "for the reason that"
          },
          {
            "id": "p5",
            "word": "moreover",
            "meaning": "in addition"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "therefore",
            "meaning": "as a result"
          },
          {
            "word": "however",
            "meaning": "used to introduce contrast"
          },
          {
            "word": "although",
            "meaning": "despite the fact that"
          },
          {
            "word": "because",
            "meaning": "for the reason that"
          },
          {
            "word": "moreover",
            "meaning": "in addition"
          },
          {
            "word": "contrast",
            "meaning": "a clear difference"
          },
          {
            "word": "cause",
            "meaning": "a reason something happens"
          },
          {
            "word": "consequence",
            "meaning": "a result of an action"
          },
          {
            "word": "addition",
            "meaning": "another piece of information"
          },
          {
            "word": "purpose",
            "meaning": "an aim or intention"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "therefore",
            "options": [
              "as a result",
              "a result of an action",
              "for the reason that"
            ]
          },
          {
            "id": "q2",
            "word": "however",
            "options": [
              "in addition",
              "another piece of information",
              "used to introduce contrast"
            ]
          },
          {
            "id": "q3",
            "word": "although",
            "options": [
              "despite the fact that",
              "an aim or intention",
              "a clear difference"
            ]
          },
          {
            "id": "q4",
            "word": "because",
            "options": [
              "for the reason that",
              "as a result",
              "a reason something happens"
            ]
          },
          {
            "id": "q5",
            "word": "moreover",
            "options": [
              "used to introduce contrast",
              "a result of an action",
              "in addition"
            ]
          },
          {
            "id": "q6",
            "word": "contrast",
            "options": [
              "despite the fact that",
              "a clear difference",
              "another piece of information"
            ]
          },
          {
            "id": "q7",
            "word": "cause",
            "options": [
              "for the reason that",
              "a reason something happens",
              "an aim or intention"
            ]
          },
          {
            "id": "q8",
            "word": "consequence",
            "options": [
              "a result of an action",
              "as a result",
              "in addition"
            ]
          },
          {
            "id": "q9",
            "word": "addition",
            "options": [
              "another piece of information",
              "a clear difference",
              "used to introduce contrast"
            ]
          },
          {
            "id": "q10",
            "word": "purpose",
            "options": [
              "a reason something happens",
              "despite the fact that",
              "an aim or intention"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Express a reason",
            "sentence": "I study every day because I want to improve.",
            "words": [
              "want",
              "because",
              "every",
              "study",
              "improve.",
              "to",
              "I",
              "day",
              "I"
            ]
          },
          {
            "id": "s2",
            "hint": "Express contrast",
            "sentence": "Although the course is challenging, it is useful.",
            "words": [
              "course",
              "the",
              "Although",
              "challenging,",
              "useful.",
              "is",
              "is",
              "it"
            ]
          },
          {
            "id": "s3",
            "hint": "Express a result",
            "sentence": "The bus was late, so I missed the lesson.",
            "words": [
              "missed",
              "late,",
              "was",
              "so",
              "The",
              "I",
              "bus",
              "lesson.",
              "the"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-comparisons",
    "stage": "A2-B1",
    "title": "Comparatives and superlatives",
    "summary": "Use -er for many short adjectives and more for longer ones.\nUse than to compare two things and the -est / the most for a group.\nIrregular forms include good → better → best.\nTask 1 comparisons must reflect the data, not your personal opinions.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Comparatives and superlatives”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "This course is ___ than the old one.",
        "options": [
          "usefulest",
          "more useful",
          "most useful",
          "usefuller"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The comparative of good is ___.",
        "options": [
          "gooder",
          "best",
          "better",
          "more best"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "It is ___ largest city in the region.",
        "options": [
          "the",
          "a",
          "an",
          "no article"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct comparison.",
        "options": [
          "Higher as",
          "More high than",
          "Highest than",
          "Higher than"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "As expensive as expresses ___.",
        "options": [
          "a decrease",
          "equality",
          "a superlative",
          "a past event"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 6,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "higher",
            "meaning": "greater in level"
          },
          {
            "id": "p2",
            "word": "lower",
            "meaning": "smaller in level"
          },
          {
            "id": "p3",
            "word": "similar",
            "meaning": "almost the same"
          },
          {
            "id": "p4",
            "word": "different",
            "meaning": "not the same"
          },
          {
            "id": "p5",
            "word": "equal",
            "meaning": "the same in amount"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "higher",
            "meaning": "greater in level"
          },
          {
            "word": "lower",
            "meaning": "smaller in level"
          },
          {
            "word": "similar",
            "meaning": "almost the same"
          },
          {
            "word": "different",
            "meaning": "not the same"
          },
          {
            "word": "equal",
            "meaning": "the same in amount"
          },
          {
            "word": "compare",
            "meaning": "examine similarities and differences"
          },
          {
            "word": "cheaper",
            "meaning": "costing less money"
          },
          {
            "word": "largest",
            "meaning": "greatest in size"
          },
          {
            "word": "whereas",
            "meaning": "in contrast with"
          },
          {
            "word": "slightly",
            "meaning": "by a small amount"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "higher",
            "options": [
              "greater in level",
              "greatest in size",
              "not the same"
            ]
          },
          {
            "id": "q2",
            "word": "lower",
            "options": [
              "in contrast with",
              "the same in amount",
              "smaller in level"
            ]
          },
          {
            "id": "q3",
            "word": "similar",
            "options": [
              "by a small amount",
              "almost the same",
              "examine similarities and differences"
            ]
          },
          {
            "id": "q4",
            "word": "different",
            "options": [
              "greater in level",
              "costing less money",
              "not the same"
            ]
          },
          {
            "id": "q5",
            "word": "equal",
            "options": [
              "smaller in level",
              "greatest in size",
              "the same in amount"
            ]
          },
          {
            "id": "q6",
            "word": "compare",
            "options": [
              "examine similarities and differences",
              "almost the same",
              "in contrast with"
            ]
          },
          {
            "id": "q7",
            "word": "cheaper",
            "options": [
              "costing less money",
              "by a small amount",
              "not the same"
            ]
          },
          {
            "id": "q8",
            "word": "largest",
            "options": [
              "the same in amount",
              "greater in level",
              "greatest in size"
            ]
          },
          {
            "id": "q9",
            "word": "whereas",
            "options": [
              "examine similarities and differences",
              "smaller in level",
              "in contrast with"
            ]
          },
          {
            "id": "q10",
            "word": "slightly",
            "options": [
              "costing less money",
              "almost the same",
              "by a small amount"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Compare two cities",
            "sentence": "London is larger than my home town.",
            "words": [
              "than",
              "my",
              "home",
              "is",
              "larger",
              "town.",
              "London"
            ]
          },
          {
            "id": "s2",
            "hint": "Describe equality",
            "sentence": "This course is as useful as the previous one.",
            "words": [
              "as",
              "the",
              "is",
              "as",
              "useful",
              "previous",
              "one.",
              "This",
              "course"
            ]
          },
          {
            "id": "s3",
            "hint": "Describe a superlative",
            "sentence": "It is the most popular subject at college.",
            "words": [
              "popular",
              "college.",
              "at",
              "most",
              "is",
              "It",
              "the",
              "subject"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-modals-advice",
    "stage": "A2-B1",
    "title": "Modals: ability, advice and obligation",
    "summary": "Can expresses ability; should offers advice; must or have to expresses obligation.\nPut the base verb after a modal: should revise, not should to revise.\nMust not means prohibition; do not have to means no necessity.\nUse polite could questions when requesting help in everyday situations.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Modals: ability, advice and obligation”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "For friendly advice, use ___.",
        "options": [
          "must not",
          "should",
          "cannot",
          "did"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "You ___ bring a passport; it is required.",
        "options": [
          "must",
          "might not",
          "can sometimes",
          "would like"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct phrase.",
        "options": [
          "should to study",
          "should studying",
          "should study",
          "should studies"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Do not have to means ___.",
        "options": [
          "it is forbidden",
          "it is impossible",
          "it is compulsory",
          "it is not necessary"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which is a polite request?",
        "options": [
          "You giving me help.",
          "Could you help me?",
          "Must help you?",
          "You help must."
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 7,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "ability",
            "meaning": "the power to do something"
          },
          {
            "id": "p2",
            "word": "obligation",
            "meaning": "something you must do"
          },
          {
            "id": "p3",
            "word": "advice",
            "meaning": "a recommendation"
          },
          {
            "id": "p4",
            "word": "permission",
            "meaning": "being allowed to do something"
          },
          {
            "id": "p5",
            "word": "prohibit",
            "meaning": "officially forbid"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "ability",
            "meaning": "the power to do something"
          },
          {
            "word": "obligation",
            "meaning": "something you must do"
          },
          {
            "word": "advice",
            "meaning": "a recommendation"
          },
          {
            "word": "permission",
            "meaning": "being allowed to do something"
          },
          {
            "word": "prohibit",
            "meaning": "officially forbid"
          },
          {
            "word": "necessary",
            "meaning": "needed or required"
          },
          {
            "word": "compulsory",
            "meaning": "required by a rule"
          },
          {
            "word": "optional",
            "meaning": "not required"
          },
          {
            "word": "polite",
            "meaning": "showing respect for others"
          },
          {
            "word": "request",
            "meaning": "ask for something"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "ability",
            "options": [
              "being allowed to do something",
              "not required",
              "the power to do something"
            ]
          },
          {
            "id": "q2",
            "word": "obligation",
            "options": [
              "showing respect for others",
              "something you must do",
              "officially forbid"
            ]
          },
          {
            "id": "q3",
            "word": "advice",
            "options": [
              "needed or required",
              "ask for something",
              "a recommendation"
            ]
          },
          {
            "id": "q4",
            "word": "permission",
            "options": [
              "the power to do something",
              "required by a rule",
              "being allowed to do something"
            ]
          },
          {
            "id": "q5",
            "word": "prohibit",
            "options": [
              "officially forbid",
              "not required",
              "something you must do"
            ]
          },
          {
            "id": "q6",
            "word": "necessary",
            "options": [
              "showing respect for others",
              "needed or required",
              "a recommendation"
            ]
          },
          {
            "id": "q7",
            "word": "compulsory",
            "options": [
              "ask for something",
              "required by a rule",
              "being allowed to do something"
            ]
          },
          {
            "id": "q8",
            "word": "optional",
            "options": [
              "officially forbid",
              "not required",
              "the power to do something"
            ]
          },
          {
            "id": "q9",
            "word": "polite",
            "options": [
              "needed or required",
              "something you must do",
              "showing respect for others"
            ]
          },
          {
            "id": "q10",
            "word": "request",
            "options": [
              "ask for something",
              "required by a rule",
              "a recommendation"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Give advice",
            "sentence": "You should revise new vocabulary every day.",
            "words": [
              "vocabulary",
              "new",
              "day.",
              "should",
              "revise",
              "You",
              "every"
            ]
          },
          {
            "id": "s2",
            "hint": "Express a requirement",
            "sentence": "Candidates must bring valid identification.",
            "words": [
              "valid",
              "must",
              "bring",
              "Candidates",
              "identification."
            ]
          },
          {
            "id": "s3",
            "hint": "Make a polite request",
            "sentence": "Could you explain this question to me?",
            "words": [
              "this",
              "explain",
              "you",
              "Could",
              "to",
              "question",
              "me?"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-preintermediate-vocabulary",
    "stage": "A2-B1",
    "title": "Pre-intermediate vocabulary: travel and services",
    "summary": "Build useful travel and service vocabulary through word partnerships.\nMake a reservation, catch a train, ask for a refund and pay a fee.\nIn IELTS Listening Part 1, expect bookings, prices, facilities and schedules.\nKeep a notebook of words together with their common verb or adjective.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Pre-intermediate vocabulary: travel and services”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A reservation is ___.",
        "options": [
          "a complaint only",
          "a delay",
          "an advance booking",
          "a departure gate"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the natural phrase.",
        "options": [
          "Catch a train",
          "Do a train",
          "Make a train journey ticket",
          "Take a refund price"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Money returned to a customer is a ___.",
        "options": [
          "facility",
          "farewell",
          "platform",
          "refund"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A fee is ___.",
        "options": [
          "a travel document",
          "a charge for a service",
          "a hotel room",
          "a weather report"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Facilities are ___.",
        "options": [
          "past journeys",
          "spelling errors",
          "available services or equipment",
          "only train delays"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 8,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "reservation",
            "meaning": "an advance booking"
          },
          {
            "id": "p2",
            "word": "refund",
            "meaning": "money returned to a customer"
          },
          {
            "id": "p3",
            "word": "fee",
            "meaning": "a charge for a service"
          },
          {
            "id": "p4",
            "word": "facility",
            "meaning": "available equipment or a service"
          },
          {
            "id": "p5",
            "word": "departure",
            "meaning": "the act of leaving"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "reservation",
            "meaning": "an advance booking"
          },
          {
            "word": "refund",
            "meaning": "money returned to a customer"
          },
          {
            "word": "fee",
            "meaning": "a charge for a service"
          },
          {
            "word": "facility",
            "meaning": "available equipment or a service"
          },
          {
            "word": "departure",
            "meaning": "the act of leaving"
          },
          {
            "word": "arrival",
            "meaning": "the act of reaching a place"
          },
          {
            "word": "accommodation",
            "meaning": "a place to stay"
          },
          {
            "word": "destination",
            "meaning": "the place you are travelling to"
          },
          {
            "word": "delay",
            "meaning": "being later than expected"
          },
          {
            "word": "fare",
            "meaning": "the price of a journey"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "reservation",
            "options": [
              "the place you are travelling to",
              "available equipment or a service",
              "an advance booking"
            ]
          },
          {
            "id": "q2",
            "word": "refund",
            "options": [
              "the act of leaving",
              "money returned to a customer",
              "being later than expected"
            ]
          },
          {
            "id": "q3",
            "word": "fee",
            "options": [
              "the act of reaching a place",
              "the price of a journey",
              "a charge for a service"
            ]
          },
          {
            "id": "q4",
            "word": "facility",
            "options": [
              "a place to stay",
              "an advance booking",
              "available equipment or a service"
            ]
          },
          {
            "id": "q5",
            "word": "departure",
            "options": [
              "the place you are travelling to",
              "money returned to a customer",
              "the act of leaving"
            ]
          },
          {
            "id": "q6",
            "word": "arrival",
            "options": [
              "being later than expected",
              "the act of reaching a place",
              "a charge for a service"
            ]
          },
          {
            "id": "q7",
            "word": "accommodation",
            "options": [
              "available equipment or a service",
              "the price of a journey",
              "a place to stay"
            ]
          },
          {
            "id": "q8",
            "word": "destination",
            "options": [
              "the act of leaving",
              "an advance booking",
              "the place you are travelling to"
            ]
          },
          {
            "id": "q9",
            "word": "delay",
            "options": [
              "being later than expected",
              "the act of reaching a place",
              "money returned to a customer"
            ]
          },
          {
            "id": "q10",
            "word": "fare",
            "options": [
              "a place to stay",
              "a charge for a service",
              "the price of a journey"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Ask about a booking",
            "sentence": "I would like to make a reservation.",
            "words": [
              "a",
              "like",
              "I",
              "would",
              "make",
              "to",
              "reservation."
            ]
          },
          {
            "id": "s2",
            "hint": "Describe a travel problem",
            "sentence": "Our train was delayed by thirty minutes.",
            "words": [
              "thirty",
              "train",
              "delayed",
              "was",
              "by",
              "Our",
              "minutes."
            ]
          },
          {
            "id": "s3",
            "hint": "Ask about facilities",
            "sentence": "Does the accommodation have a study room?",
            "words": [
              "study",
              "accommodation",
              "room?",
              "the",
              "a",
              "have",
              "Does"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-listening-distractors",
    "stage": "A2-B1",
    "title": "Listening: distractors and note completion",
    "summary": "A distractor is a plausible detail that is not the final answer.\nListen for corrections, contrast words and changed decisions.\nPredict a noun, verb or number from the grammar around a gap.\nCheck the word limit, plural endings and spelling before moving on.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Listening: distractors and note completion”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "“It was £40, but now it costs £35.” What is the current price?",
        "options": [
          "£40",
          "£35",
          "£75",
          "£5"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "In “two ___”, the gap probably needs ___.",
        "options": [
          "a plural countable noun",
          "a singular article",
          "a whole essay",
          "a contrast linker"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A distractor is ___.",
        "options": [
          "always the correct answer",
          "background music only",
          "a plausible but incorrect detail",
          "a word limit"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "“Actually” can signal ___.",
        "options": [
          "a spelling test only",
          "the end of all recordings",
          "a map north point",
          "a correction"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "When you miss an answer, you should ___.",
        "options": [
          "stop reading all questions",
          "move on and stay with the recording",
          "write many unrelated words",
          "replay a live exam recording"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 9,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "distractor",
            "meaning": "a plausible but incorrect detail"
          },
          {
            "id": "p2",
            "word": "correction",
            "meaning": "a change that fixes an error"
          },
          {
            "id": "p3",
            "word": "actually",
            "meaning": "in fact or as a correction"
          },
          {
            "id": "p4",
            "word": "instead",
            "meaning": "in place of something else"
          },
          {
            "id": "p5",
            "word": "confirm",
            "meaning": "check that something is correct"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "distractor",
            "meaning": "a plausible but incorrect detail"
          },
          {
            "word": "correction",
            "meaning": "a change that fixes an error"
          },
          {
            "word": "actually",
            "meaning": "in fact or as a correction"
          },
          {
            "word": "instead",
            "meaning": "in place of something else"
          },
          {
            "word": "confirm",
            "meaning": "check that something is correct"
          },
          {
            "word": "note",
            "meaning": "a short written record"
          },
          {
            "word": "plural",
            "meaning": "more than one"
          },
          {
            "word": "predict",
            "meaning": "anticipate what is likely"
          },
          {
            "word": "limit",
            "meaning": "a maximum allowed amount"
          },
          {
            "word": "focus",
            "meaning": "direct your attention"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "distractor",
            "options": [
              "in place of something else",
              "anticipate what is likely",
              "a plausible but incorrect detail"
            ]
          },
          {
            "id": "q2",
            "word": "correction",
            "options": [
              "a maximum allowed amount",
              "a change that fixes an error",
              "check that something is correct"
            ]
          },
          {
            "id": "q3",
            "word": "actually",
            "options": [
              "in fact or as a correction",
              "direct your attention",
              "a short written record"
            ]
          },
          {
            "id": "q4",
            "word": "instead",
            "options": [
              "a plausible but incorrect detail",
              "more than one",
              "in place of something else"
            ]
          },
          {
            "id": "q5",
            "word": "confirm",
            "options": [
              "a change that fixes an error",
              "anticipate what is likely",
              "check that something is correct"
            ]
          },
          {
            "id": "q6",
            "word": "note",
            "options": [
              "a short written record",
              "a maximum allowed amount",
              "in fact or as a correction"
            ]
          },
          {
            "id": "q7",
            "word": "plural",
            "options": [
              "direct your attention",
              "more than one",
              "in place of something else"
            ]
          },
          {
            "id": "q8",
            "word": "predict",
            "options": [
              "check that something is correct",
              "a plausible but incorrect detail",
              "anticipate what is likely"
            ]
          },
          {
            "id": "q9",
            "word": "limit",
            "options": [
              "a maximum allowed amount",
              "a short written record",
              "a change that fixes an error"
            ]
          },
          {
            "id": "q10",
            "word": "focus",
            "options": [
              "more than one",
              "direct your attention",
              "in fact or as a correction"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Listen for a correction",
            "sentence": "The meeting is on Friday not Thursday.",
            "words": [
              "is",
              "meeting",
              "not",
              "Friday",
              "The",
              "Thursday.",
              "on"
            ]
          },
          {
            "id": "s2",
            "hint": "Use grammar to predict",
            "sentence": "This gap probably needs a plural noun.",
            "words": [
              "This",
              "plural",
              "probably",
              "noun.",
              "gap",
              "a",
              "needs"
            ]
          },
          {
            "id": "s3",
            "hint": "Explain a changed plan",
            "sentence": "We chose the afternoon session instead.",
            "words": [
              "the",
              "session",
              "chose",
              "We",
              "afternoon",
              "instead."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "a2-b1-gerunds-infinitives",
    "stage": "A2-B1",
    "title": "Gerunds, infinitives and verb patterns",
    "summary": "Use -ing after enjoy, avoid and finish: I enjoy reading.\nUse to + base verb after want, hope and decide: I hope to study abroad.\nAfter a preposition, use -ing: interested in learning.\nRecord the verb together with its pattern to build natural sentences.",
    "ai_prompt": "Act as a supportive IELTS tutor for a A2 to B1 learner studying “Gerunds, infinitives and verb patterns”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "I enjoy ___ new languages.",
        "options": [
          "to learn",
          "learning",
          "learn",
          "learns"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "She hopes ___ abroad.",
        "options": [
          "to study",
          "studying",
          "study",
          "studied"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "After a preposition, usually use ___.",
        "options": [
          "a bare infinitive only",
          "a past tense only",
          "the -ing form",
          "will plus a verb"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct phrase.",
        "options": [
          "avoid to drive",
          "want studying",
          "finish to read",
          "avoid driving"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "They decided ___ a course.",
        "options": [
          "joining",
          "to join",
          "join",
          "joins"
        ]
      }
    ],
    "reward_coins": 20,
    "order_index": 10,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "enjoy",
            "meaning": "take pleasure in"
          },
          {
            "id": "p2",
            "word": "avoid",
            "meaning": "keep away from"
          },
          {
            "id": "p3",
            "word": "hope",
            "meaning": "want something to happen"
          },
          {
            "id": "p4",
            "word": "decide",
            "meaning": "make a choice"
          },
          {
            "id": "p5",
            "word": "aim",
            "meaning": "try to achieve"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "enjoy",
            "meaning": "take pleasure in"
          },
          {
            "word": "avoid",
            "meaning": "keep away from"
          },
          {
            "word": "hope",
            "meaning": "want something to happen"
          },
          {
            "word": "decide",
            "meaning": "make a choice"
          },
          {
            "word": "aim",
            "meaning": "try to achieve"
          },
          {
            "word": "consider",
            "meaning": "think carefully about"
          },
          {
            "word": "manage",
            "meaning": "succeed in doing something"
          },
          {
            "word": "finish",
            "meaning": "complete an activity"
          },
          {
            "word": "interested",
            "meaning": "wanting to know more"
          },
          {
            "word": "intend",
            "meaning": "plan to do something"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "enjoy",
            "options": [
              "complete an activity",
              "make a choice",
              "take pleasure in"
            ]
          },
          {
            "id": "q2",
            "word": "avoid",
            "options": [
              "wanting to know more",
              "keep away from",
              "try to achieve"
            ]
          },
          {
            "id": "q3",
            "word": "hope",
            "options": [
              "want something to happen",
              "think carefully about",
              "plan to do something"
            ]
          },
          {
            "id": "q4",
            "word": "decide",
            "options": [
              "take pleasure in",
              "make a choice",
              "succeed in doing something"
            ]
          },
          {
            "id": "q5",
            "word": "aim",
            "options": [
              "try to achieve",
              "keep away from",
              "complete an activity"
            ]
          },
          {
            "id": "q6",
            "word": "consider",
            "options": [
              "wanting to know more",
              "want something to happen",
              "think carefully about"
            ]
          },
          {
            "id": "q7",
            "word": "manage",
            "options": [
              "plan to do something",
              "succeed in doing something",
              "make a choice"
            ]
          },
          {
            "id": "q8",
            "word": "finish",
            "options": [
              "take pleasure in",
              "complete an activity",
              "try to achieve"
            ]
          },
          {
            "id": "q9",
            "word": "interested",
            "options": [
              "wanting to know more",
              "keep away from",
              "think carefully about"
            ]
          },
          {
            "id": "q10",
            "word": "intend",
            "options": [
              "plan to do something",
              "succeed in doing something",
              "want something to happen"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Use a gerund",
            "sentence": "I enjoy learning new words every day.",
            "words": [
              "I",
              "words",
              "learning",
              "new",
              "day.",
              "enjoy",
              "every"
            ]
          },
          {
            "id": "s2",
            "hint": "Use an infinitive",
            "sentence": "She hopes to study at a British university.",
            "words": [
              "hopes",
              "She",
              "study",
              "British",
              "a",
              "at",
              "university.",
              "to"
            ]
          },
          {
            "id": "s3",
            "hint": "Use a preposition and gerund",
            "sentence": "They are interested in improving their English.",
            "words": [
              "interested",
              "improving",
              "in",
              "are",
              "their",
              "They",
              "English."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-conditionals-modals",
    "stage": "B1-B2",
    "title": "Conditionals and modal verbs",
    "summary": "Second conditional: If + past simple, would + base verb for an unreal or unlikely situation now: If I had more time, I would read more.\nThird conditional: If + past perfect, would have + past participle for an unreal past: If we had left earlier, we would have arrived on time.\nModals soften advice and claims: may, might, could, should. Example: Governments could invest more in public transport.",
    "ai_prompt": "Teach a B1-B2 learner to distinguish the second and third conditionals and use modals for possibility or advice. Keep the explanations concise and use IELTS discussion examples. Give five questions one at a time; wait for each response and explain corrections with the time meaning.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "If I ___ more free time, I would volunteer at the library.",
        "options": [
          "have",
          "had",
          "will have",
          "would have"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete the third conditional: If they had booked earlier, they ___ (find) cheaper tickets.",
        "placeholder": "Two words"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence expresses a possible suggestion rather than certainty?",
        "options": [
          "The city will certainly remove every car.",
          "The city could improve its bus network.",
          "The city removed its bus network.",
          "The city must have removed every car."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: If I had known about the deadline, I ___ (submit) the form sooner.",
        "placeholder": "Two words"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which structure describes an unreal present situation?",
        "options": [
          "If + present, will + verb",
          "If + past simple, would + verb",
          "If + past perfect, would have + participle",
          "When + present, will + verb"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 1,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "hypothetical",
            "meaning": "imagined rather than real"
          },
          {
            "id": "p2",
            "word": "regret",
            "meaning": "sadness about a past choice"
          },
          {
            "id": "p3",
            "word": "possibility",
            "meaning": "something that might happen"
          },
          {
            "id": "p4",
            "word": "deduce",
            "meaning": "reach a conclusion from evidence"
          },
          {
            "id": "p5",
            "word": "certainty",
            "meaning": "being sure about something"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "hypothetical",
            "meaning": "imagined rather than real"
          },
          {
            "word": "regret",
            "meaning": "sadness about a past choice"
          },
          {
            "word": "possibility",
            "meaning": "something that might happen"
          },
          {
            "word": "deduce",
            "meaning": "reach a conclusion from evidence"
          },
          {
            "word": "certainty",
            "meaning": "being sure about something"
          },
          {
            "word": "outcome",
            "meaning": "the final result"
          },
          {
            "word": "alternative",
            "meaning": "another available choice"
          },
          {
            "word": "unlikely",
            "meaning": "not probable"
          },
          {
            "word": "assume",
            "meaning": "accept something without proof"
          },
          {
            "word": "consequence",
            "meaning": "a resulting effect"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "hypothetical",
            "options": [
              "reach a conclusion from evidence",
              "not probable",
              "imagined rather than real"
            ]
          },
          {
            "id": "q2",
            "word": "regret",
            "options": [
              "accept something without proof",
              "sadness about a past choice",
              "being sure about something"
            ]
          },
          {
            "id": "q3",
            "word": "possibility",
            "options": [
              "the final result",
              "a resulting effect",
              "something that might happen"
            ]
          },
          {
            "id": "q4",
            "word": "deduce",
            "options": [
              "another available choice",
              "imagined rather than real",
              "reach a conclusion from evidence"
            ]
          },
          {
            "id": "q5",
            "word": "certainty",
            "options": [
              "sadness about a past choice",
              "being sure about something",
              "not probable"
            ]
          },
          {
            "id": "q6",
            "word": "outcome",
            "options": [
              "accept something without proof",
              "the final result",
              "something that might happen"
            ]
          },
          {
            "id": "q7",
            "word": "alternative",
            "options": [
              "reach a conclusion from evidence",
              "a resulting effect",
              "another available choice"
            ]
          },
          {
            "id": "q8",
            "word": "unlikely",
            "options": [
              "being sure about something",
              "not probable",
              "imagined rather than real"
            ]
          },
          {
            "id": "q9",
            "word": "assume",
            "options": [
              "the final result",
              "accept something without proof",
              "sadness about a past choice"
            ]
          },
          {
            "id": "q10",
            "word": "consequence",
            "options": [
              "another available choice",
              "a resulting effect",
              "something that might happen"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "An unreal present condition",
            "sentence": "If I had more time, I would study abroad.",
            "words": [
              "had",
              "I",
              "I",
              "If",
              "time,",
              "would",
              "more",
              "study",
              "abroad."
            ]
          },
          {
            "id": "s2",
            "hint": "An unreal past condition",
            "sentence": "If she had revised, she would have passed.",
            "words": [
              "she",
              "have",
              "she",
              "had",
              "would",
              "If",
              "passed.",
              "revised,"
            ]
          },
          {
            "id": "s3",
            "hint": "A deduction about the past",
            "sentence": "He must have missed the early train.",
            "words": [
              "must",
              "early",
              "have",
              "the",
              "train.",
              "He",
              "missed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-relative-clauses",
    "stage": "B1-B2",
    "title": "Relative clauses and complex sentences",
    "summary": "Use who for people, which for things, and where for places. A defining clause identifies the noun: Students who revise regularly improve.\nA non-defining clause adds extra information and uses commas: Samarkand, which is a historic city, attracts visitors.\nUse that in many defining clauses, but not in non-defining clauses. Relative clauses help combine ideas without repeating nouns.",
    "ai_prompt": "Act as a B1-B2 writing tutor. Explain defining versus non-defining relative clauses and the use of who/which/where. Give examples about education and cities. Ask five short questions one by one and wait after each. Correct punctuation and word choice in a supportive way.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The researcher ___ wrote the report works at our university.",
        "options": [
          "who",
          "where",
          "which",
          "when"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: This is the town ___ my grandparents were born.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence uses commas correctly for extra information?",
        "options": [
          "My laptop which I bought last year, is very fast.",
          "My laptop, which I bought last year, is very fast.",
          "My laptop, which I bought last year is very fast.",
          "My laptop which, I bought last year is very fast."
        ]
      },
      {
        "type": "input",
        "prompt": "Combine with a relative pronoun: I met a teacher. She speaks five languages. I met a teacher ___ speaks five languages.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which relative clause identifies exactly which students are meant?",
        "options": [
          "Students, who attend regularly, make progress.",
          "Students who attend regularly make progress.",
          "Students, which attend regularly, make progress.",
          "Students where attend regularly make progress."
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 2,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "define",
            "meaning": "explain exactly what something is"
          },
          {
            "id": "p2",
            "word": "essential",
            "meaning": "absolutely necessary"
          },
          {
            "id": "p3",
            "word": "additional",
            "meaning": "extra or supplementary"
          },
          {
            "id": "p4",
            "word": "referent",
            "meaning": "the thing a word refers to"
          },
          {
            "id": "p5",
            "word": "clause",
            "meaning": "a group of words with a subject and verb"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "define",
            "meaning": "explain exactly what something is"
          },
          {
            "word": "essential",
            "meaning": "absolutely necessary"
          },
          {
            "word": "additional",
            "meaning": "extra or supplementary"
          },
          {
            "word": "referent",
            "meaning": "the thing a word refers to"
          },
          {
            "word": "clause",
            "meaning": "a group of words with a subject and verb"
          },
          {
            "word": "restrict",
            "meaning": "limit the range of something"
          },
          {
            "word": "combine",
            "meaning": "join together"
          },
          {
            "word": "specify",
            "meaning": "state clearly and precisely"
          },
          {
            "word": "omit",
            "meaning": "leave out"
          },
          {
            "word": "punctuation",
            "meaning": "marks used in writing"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "define",
            "options": [
              "state clearly and precisely",
              "the thing a word refers to",
              "explain exactly what something is"
            ]
          },
          {
            "id": "q2",
            "word": "essential",
            "options": [
              "absolutely necessary",
              "leave out",
              "a group of words with a subject and verb"
            ]
          },
          {
            "id": "q3",
            "word": "additional",
            "options": [
              "marks used in writing",
              "extra or supplementary",
              "limit the range of something"
            ]
          },
          {
            "id": "q4",
            "word": "referent",
            "options": [
              "the thing a word refers to",
              "explain exactly what something is",
              "join together"
            ]
          },
          {
            "id": "q5",
            "word": "clause",
            "options": [
              "a group of words with a subject and verb",
              "absolutely necessary",
              "state clearly and precisely"
            ]
          },
          {
            "id": "q6",
            "word": "restrict",
            "options": [
              "limit the range of something",
              "extra or supplementary",
              "leave out"
            ]
          },
          {
            "id": "q7",
            "word": "combine",
            "options": [
              "the thing a word refers to",
              "join together",
              "marks used in writing"
            ]
          },
          {
            "id": "q8",
            "word": "specify",
            "options": [
              "state clearly and precisely",
              "a group of words with a subject and verb",
              "explain exactly what something is"
            ]
          },
          {
            "id": "q9",
            "word": "omit",
            "options": [
              "limit the range of something",
              "absolutely necessary",
              "leave out"
            ]
          },
          {
            "id": "q10",
            "word": "punctuation",
            "options": [
              "extra or supplementary",
              "join together",
              "marks used in writing"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Define a person",
            "sentence": "Students who practise regularly usually make progress.",
            "words": [
              "who",
              "regularly",
              "usually",
              "make",
              "progress.",
              "practise",
              "Students"
            ]
          },
          {
            "id": "s2",
            "hint": "Add non-defining information",
            "sentence": "The library, which opened recently, is very popular.",
            "words": [
              "recently,",
              "library,",
              "opened",
              "is",
              "which",
              "very",
              "popular.",
              "The"
            ]
          },
          {
            "id": "s3",
            "hint": "Use a place relative",
            "sentence": "This is the college where I studied English.",
            "words": [
              "This",
              "I",
              "where",
              "college",
              "studied",
              "is",
              "English.",
              "the"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-cohesion-coherence",
    "stage": "B1-B2",
    "title": "Cohesion and coherence",
    "summary": "Coherence means ideas are logically ordered and easy to follow. Cohesion means sentences are linked with references, substitution, and linking words.\nGive each paragraph one clear central idea. Use linking words accurately: however (contrast), therefore (result), for example (illustration).\nAvoid starting every sentence with a linker; repeat key terms when a synonym would be unclear.",
    "ai_prompt": "You are an IELTS writing coach for a B1-B2 learner. Explain the difference between coherence (logical organisation) and cohesion (language links). Give one short paragraph example with a clear topic sentence and a contrast linker. Then ask five questions one at a time and give concise feedback.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Which linking word most clearly introduces a contrast?",
        "options": [
          "therefore",
          "however",
          "for example",
          "firstly"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: The bus is cheaper; ___, the train is faster.",
        "placeholder": "One contrast linker"
      },
      {
        "type": "multiple-choice",
        "prompt": "What is coherence mainly about?",
        "options": [
          "Logical order and clear relationships between ideas",
          "Using as many long words as possible",
          "Adding a linker to every sentence",
          "Repeating the same noun in every line"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence best works as a paragraph topic sentence?",
        "options": [
          "For example, some students take the bus.",
          "Public transport can make city travel more affordable.",
          "However, it was raining on Tuesday.",
          "This is also another point."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete the result link: The sample was small; ___, the findings should be treated cautiously.",
        "placeholder": "One result linker"
      }
    ],
    "reward_coins": 35,
    "order_index": 3,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "cohesion",
            "meaning": "connections made through language"
          },
          {
            "id": "p2",
            "word": "coherence",
            "meaning": "logical organisation of ideas"
          },
          {
            "id": "p3",
            "word": "linker",
            "meaning": "a word that connects ideas"
          },
          {
            "id": "p4",
            "word": "reference",
            "meaning": "pointing back to another idea"
          },
          {
            "id": "p5",
            "word": "paragraph",
            "meaning": "a group of related sentences"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "cohesion",
            "meaning": "connections made through language"
          },
          {
            "word": "coherence",
            "meaning": "logical organisation of ideas"
          },
          {
            "word": "linker",
            "meaning": "a word that connects ideas"
          },
          {
            "word": "reference",
            "meaning": "pointing back to another idea"
          },
          {
            "word": "paragraph",
            "meaning": "a group of related sentences"
          },
          {
            "word": "contrast",
            "meaning": "a difference between ideas"
          },
          {
            "word": "consequently",
            "meaning": "as a result"
          },
          {
            "word": "furthermore",
            "meaning": "in addition"
          },
          {
            "word": "sequence",
            "meaning": "an ordered series"
          },
          {
            "word": "unity",
            "meaning": "focus on one central idea"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "cohesion",
            "options": [
              "pointing back to another idea",
              "in addition",
              "connections made through language"
            ]
          },
          {
            "id": "q2",
            "word": "coherence",
            "options": [
              "an ordered series",
              "logical organisation of ideas",
              "a group of related sentences"
            ]
          },
          {
            "id": "q3",
            "word": "linker",
            "options": [
              "a word that connects ideas",
              "focus on one central idea",
              "a difference between ideas"
            ]
          },
          {
            "id": "q4",
            "word": "reference",
            "options": [
              "connections made through language",
              "pointing back to another idea",
              "as a result"
            ]
          },
          {
            "id": "q5",
            "word": "paragraph",
            "options": [
              "a group of related sentences",
              "logical organisation of ideas",
              "in addition"
            ]
          },
          {
            "id": "q6",
            "word": "contrast",
            "options": [
              "a difference between ideas",
              "an ordered series",
              "a word that connects ideas"
            ]
          },
          {
            "id": "q7",
            "word": "consequently",
            "options": [
              "pointing back to another idea",
              "focus on one central idea",
              "as a result"
            ]
          },
          {
            "id": "q8",
            "word": "furthermore",
            "options": [
              "connections made through language",
              "a group of related sentences",
              "in addition"
            ]
          },
          {
            "id": "q9",
            "word": "sequence",
            "options": [
              "an ordered series",
              "a difference between ideas",
              "logical organisation of ideas"
            ]
          },
          {
            "id": "q10",
            "word": "unity",
            "options": [
              "a word that connects ideas",
              "focus on one central idea",
              "as a result"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Write a topic sentence",
            "sentence": "Public transport can make city travel more affordable.",
            "words": [
              "travel",
              "make",
              "city",
              "affordable.",
              "more",
              "transport",
              "Public",
              "can"
            ]
          },
          {
            "id": "s2",
            "hint": "Show a contrast",
            "sentence": "However, some rural areas have limited services.",
            "words": [
              "rural",
              "areas",
              "some",
              "have",
              "However,",
              "services.",
              "limited"
            ]
          },
          {
            "id": "s3",
            "hint": "Draw a conclusion",
            "sentence": "Consequently, investment in reliable routes is essential.",
            "words": [
              "reliable",
              "Consequently,",
              "is",
              "routes",
              "investment",
              "essential.",
              "in"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-awl-research",
    "stage": "B1-B2",
    "title": "Academic Word List: research and evidence",
    "summary": "Use AWL words to report research accurately: analyse, assess, evidence, method and significant.\nEvidence supports a claim; a method explains how information was collected.\nSignificant can mean important, but statistical significance has a specific technical meaning.\nUse academic vocabulary only when its meaning fits the sentence.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Academic Word List: research and evidence”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Evidence is ___.",
        "options": [
          "an unsupported opinion",
          "information that supports a claim",
          "always a personal story",
          "a transition word"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "To analyse data means to ___.",
        "options": [
          "examine it systematically",
          "copy it without reading",
          "remove every detail",
          "guess a result"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A research method describes ___.",
        "options": [
          "the essay title only",
          "the author’s hobbies",
          "how a study was carried out",
          "a conclusion with no evidence"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the most appropriate phrase.",
        "options": [
          "Do a significant to",
          "Evidence are a people",
          "Analyse of strongly",
          "Assess the evidence"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Academic vocabulary should be ___.",
        "options": [
          "as rare as possible",
          "accurate and appropriate",
          "used in every single word",
          "unrelated to the topic"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 4,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "analyse",
            "meaning": "examine systematically"
          },
          {
            "id": "p2",
            "word": "assess",
            "meaning": "evaluate carefully"
          },
          {
            "id": "p3",
            "word": "evidence",
            "meaning": "information supporting a claim"
          },
          {
            "id": "p4",
            "word": "method",
            "meaning": "a way of doing something"
          },
          {
            "id": "p5",
            "word": "significant",
            "meaning": "important or meaningful"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "analyse",
            "meaning": "examine systematically"
          },
          {
            "word": "assess",
            "meaning": "evaluate carefully"
          },
          {
            "word": "evidence",
            "meaning": "information supporting a claim"
          },
          {
            "word": "method",
            "meaning": "a way of doing something"
          },
          {
            "word": "significant",
            "meaning": "important or meaningful"
          },
          {
            "word": "data",
            "meaning": "collected facts or measurements"
          },
          {
            "word": "indicate",
            "meaning": "show or suggest"
          },
          {
            "word": "research",
            "meaning": "a systematic investigation"
          },
          {
            "word": "factor",
            "meaning": "an element influencing a result"
          },
          {
            "word": "derive",
            "meaning": "obtain from a source"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "analyse",
            "options": [
              "a way of doing something",
              "examine systematically",
              "a systematic investigation"
            ]
          },
          {
            "id": "q2",
            "word": "assess",
            "options": [
              "evaluate carefully",
              "important or meaningful",
              "an element influencing a result"
            ]
          },
          {
            "id": "q3",
            "word": "evidence",
            "options": [
              "information supporting a claim",
              "collected facts or measurements",
              "obtain from a source"
            ]
          },
          {
            "id": "q4",
            "word": "method",
            "options": [
              "examine systematically",
              "show or suggest",
              "a way of doing something"
            ]
          },
          {
            "id": "q5",
            "word": "significant",
            "options": [
              "evaluate carefully",
              "important or meaningful",
              "a systematic investigation"
            ]
          },
          {
            "id": "q6",
            "word": "data",
            "options": [
              "information supporting a claim",
              "an element influencing a result",
              "collected facts or measurements"
            ]
          },
          {
            "id": "q7",
            "word": "indicate",
            "options": [
              "obtain from a source",
              "show or suggest",
              "a way of doing something"
            ]
          },
          {
            "id": "q8",
            "word": "research",
            "options": [
              "important or meaningful",
              "a systematic investigation",
              "examine systematically"
            ]
          },
          {
            "id": "q9",
            "word": "factor",
            "options": [
              "an element influencing a result",
              "collected facts or measurements",
              "evaluate carefully"
            ]
          },
          {
            "id": "q10",
            "word": "derive",
            "options": [
              "show or suggest",
              "obtain from a source",
              "information supporting a claim"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Report evidence",
            "sentence": "Researchers analyse data to identify significant patterns.",
            "words": [
              "Researchers",
              "analyse",
              "significant",
              "data",
              "identify",
              "to",
              "patterns."
            ]
          },
          {
            "id": "s2",
            "hint": "Describe a method",
            "sentence": "The study used a survey to collect evidence.",
            "words": [
              "survey",
              "a",
              "The",
              "collect",
              "evidence.",
              "used",
              "to",
              "study"
            ]
          },
          {
            "id": "s3",
            "hint": "Assess a claim",
            "sentence": "Several factors may influence the final outcome.",
            "words": [
              "may",
              "influence",
              "outcome.",
              "final",
              "Several",
              "factors",
              "the"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-awl-society",
    "stage": "B1-B2",
    "title": "Academic Word List: education and society",
    "summary": "Practise access, benefit, policy, sector, resource and sustainable in common IELTS topics.\nUse verb–noun partnerships: allocate resources, implement policy, improve access.\nExplain a word in context rather than replacing every simple word with a long one.\nExample: Public funding can improve access to higher education.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Academic Word List: education and society”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Allocate resources means ___.",
        "options": [
          "ignore available funding",
          "copy a policy",
          "distribute available supplies or money",
          "close every school"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the natural collocation.",
        "options": [
          "Implement a policy",
          "Invent access to a policy",
          "Do sector resources",
          "Make sustainable into"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A benefit is ___.",
        "options": [
          "a barrier only",
          "a financial penalty",
          "a spelling correction",
          "an advantage"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Access to education means ___.",
        "options": [
          "an examination essay",
          "the opportunity to receive education",
          "only private tuition",
          "a school building number"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Sustainable means ___.",
        "options": [
          "impossible to maintain",
          "brief and temporary only",
          "able to continue without exhausting resources",
          "unplanned"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 5,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "access",
            "meaning": "the opportunity to use something"
          },
          {
            "id": "p2",
            "word": "benefit",
            "meaning": "an advantage"
          },
          {
            "id": "p3",
            "word": "policy",
            "meaning": "a plan adopted by an organisation"
          },
          {
            "id": "p4",
            "word": "sector",
            "meaning": "a part of the economy or society"
          },
          {
            "id": "p5",
            "word": "resource",
            "meaning": "a useful supply or asset"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "access",
            "meaning": "the opportunity to use something"
          },
          {
            "word": "benefit",
            "meaning": "an advantage"
          },
          {
            "word": "policy",
            "meaning": "a plan adopted by an organisation"
          },
          {
            "word": "sector",
            "meaning": "a part of the economy or society"
          },
          {
            "word": "resource",
            "meaning": "a useful supply or asset"
          },
          {
            "word": "allocate",
            "meaning": "distribute for a particular purpose"
          },
          {
            "word": "implement",
            "meaning": "put a plan into action"
          },
          {
            "word": "sustainable",
            "meaning": "able to continue without exhausting resources"
          },
          {
            "word": "community",
            "meaning": "a group sharing a place or interest"
          },
          {
            "word": "equity",
            "meaning": "fairness in treatment and opportunity"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "access",
            "options": [
              "the opportunity to use something",
              "a part of the economy or society",
              "able to continue without exhausting resources"
            ]
          },
          {
            "id": "q2",
            "word": "benefit",
            "options": [
              "a useful supply or asset",
              "a group sharing a place or interest",
              "an advantage"
            ]
          },
          {
            "id": "q3",
            "word": "policy",
            "options": [
              "fairness in treatment and opportunity",
              "a plan adopted by an organisation",
              "distribute for a particular purpose"
            ]
          },
          {
            "id": "q4",
            "word": "sector",
            "options": [
              "the opportunity to use something",
              "put a plan into action",
              "a part of the economy or society"
            ]
          },
          {
            "id": "q5",
            "word": "resource",
            "options": [
              "an advantage",
              "able to continue without exhausting resources",
              "a useful supply or asset"
            ]
          },
          {
            "id": "q6",
            "word": "allocate",
            "options": [
              "distribute for a particular purpose",
              "a group sharing a place or interest",
              "a plan adopted by an organisation"
            ]
          },
          {
            "id": "q7",
            "word": "implement",
            "options": [
              "put a plan into action",
              "fairness in treatment and opportunity",
              "a part of the economy or society"
            ]
          },
          {
            "id": "q8",
            "word": "sustainable",
            "options": [
              "able to continue without exhausting resources",
              "the opportunity to use something",
              "a useful supply or asset"
            ]
          },
          {
            "id": "q9",
            "word": "community",
            "options": [
              "an advantage",
              "a group sharing a place or interest",
              "distribute for a particular purpose"
            ]
          },
          {
            "id": "q10",
            "word": "equity",
            "options": [
              "put a plan into action",
              "a plan adopted by an organisation",
              "fairness in treatment and opportunity"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Discuss public funding",
            "sentence": "Governments should allocate resources to public education.",
            "words": [
              "resources",
              "to",
              "Governments",
              "allocate",
              "should",
              "public",
              "education."
            ]
          },
          {
            "id": "s2",
            "hint": "Discuss access",
            "sentence": "Online courses can improve access to higher education.",
            "words": [
              "higher",
              "can",
              "improve",
              "education.",
              "Online",
              "to",
              "courses",
              "access"
            ]
          },
          {
            "id": "s3",
            "hint": "Discuss a policy",
            "sentence": "A sustainable policy benefits the wider community.",
            "words": [
              "wider",
              "community.",
              "A",
              "benefits",
              "sustainable",
              "the",
              "policy"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-advanced-passive",
    "stage": "B1-B2",
    "title": "Passive voice for processes and reports",
    "summary": "Use the passive when the process or result matters more than the agent.\nPresent perfect passive: has/have been + past participle. Modal passive: must be + past participle.\nIn Task 1 processes, sequence stages clearly: First, materials are collected.\nAvoid a passive form when an active sentence is clearer.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Passive voice for processes and reports”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The samples ___ analysed already.",
        "options": [
          "have be",
          "have been",
          "has being",
          "are been"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the modal passive.",
        "options": [
          "The data must be checked.",
          "The data must checked.",
          "The data must checking.",
          "The data must been checked."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "In a process description, the passive often focuses on ___.",
        "options": [
          "personal feelings",
          "the reader’s hobbies",
          "the stages and materials",
          "a memorised conclusion"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The report will ___ next week.",
        "options": [
          "publish",
          "publishing",
          "been publishing",
          "be published"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which is present perfect passive?",
        "options": [
          "They produced paper.",
          "Paper has been produced.",
          "They have produced paper.",
          "Paper is producing itself."
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 6,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "extract",
            "meaning": "remove from a source"
          },
          {
            "id": "p2",
            "word": "filter",
            "meaning": "remove unwanted material"
          },
          {
            "id": "p3",
            "word": "assemble",
            "meaning": "put parts together"
          },
          {
            "id": "p4",
            "word": "transport",
            "meaning": "move from one place to another"
          },
          {
            "id": "p5",
            "word": "convert",
            "meaning": "change into another form"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "extract",
            "meaning": "remove from a source"
          },
          {
            "word": "filter",
            "meaning": "remove unwanted material"
          },
          {
            "word": "assemble",
            "meaning": "put parts together"
          },
          {
            "word": "transport",
            "meaning": "move from one place to another"
          },
          {
            "word": "convert",
            "meaning": "change into another form"
          },
          {
            "word": "stage",
            "meaning": "a step in a process"
          },
          {
            "word": "raw",
            "meaning": "not yet processed"
          },
          {
            "word": "output",
            "meaning": "the result of production"
          },
          {
            "word": "treat",
            "meaning": "process with a substance or method"
          },
          {
            "word": "distribute",
            "meaning": "supply to different places"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "extract",
            "options": [
              "the result of production",
              "move from one place to another",
              "remove from a source"
            ]
          },
          {
            "id": "q2",
            "word": "filter",
            "options": [
              "process with a substance or method",
              "remove unwanted material",
              "change into another form"
            ]
          },
          {
            "id": "q3",
            "word": "assemble",
            "options": [
              "put parts together",
              "supply to different places",
              "a step in a process"
            ]
          },
          {
            "id": "q4",
            "word": "transport",
            "options": [
              "remove from a source",
              "not yet processed",
              "move from one place to another"
            ]
          },
          {
            "id": "q5",
            "word": "convert",
            "options": [
              "change into another form",
              "remove unwanted material",
              "the result of production"
            ]
          },
          {
            "id": "q6",
            "word": "stage",
            "options": [
              "process with a substance or method",
              "put parts together",
              "a step in a process"
            ]
          },
          {
            "id": "q7",
            "word": "raw",
            "options": [
              "not yet processed",
              "move from one place to another",
              "supply to different places"
            ]
          },
          {
            "id": "q8",
            "word": "output",
            "options": [
              "remove from a source",
              "change into another form",
              "the result of production"
            ]
          },
          {
            "id": "q9",
            "word": "treat",
            "options": [
              "a step in a process",
              "process with a substance or method",
              "remove unwanted material"
            ]
          },
          {
            "id": "q10",
            "word": "distribute",
            "options": [
              "not yet processed",
              "supply to different places",
              "put parts together"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "A present perfect passive",
            "sentence": "The raw materials have been transported to the factory.",
            "words": [
              "to",
              "materials",
              "have",
              "factory.",
              "been",
              "the",
              "The",
              "transported",
              "raw"
            ]
          },
          {
            "id": "s2",
            "hint": "A modal passive",
            "sentence": "The final product must be checked carefully.",
            "words": [
              "product",
              "be",
              "The",
              "final",
              "must",
              "checked",
              "carefully."
            ]
          },
          {
            "id": "s3",
            "hint": "Describe a process stage",
            "sentence": "After filtration, the water is stored in tanks.",
            "words": [
              "After",
              "is",
              "in",
              "water",
              "stored",
              "the",
              "filtration,",
              "tanks."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-paraphrasing",
    "stage": "B1-B2",
    "title": "Paraphrasing without changing meaning",
    "summary": "A paraphrase preserves the original meaning while changing wording or structure.\nCombine accurate synonyms with word-family or clause changes.\nDo not alter quantities, certainty or the writer’s position.\nOriginal: Car use increased. Paraphrase: There was a rise in car use.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Paraphrasing without changing meaning”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A good paraphrase must preserve ___.",
        "options": [
          "every original word",
          "the meaning",
          "only the length",
          "only the punctuation"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "“There was a rise in sales” paraphrases ___.",
        "options": [
          "Sales increased.",
          "Sales disappeared.",
          "Sales stayed unchanged.",
          "Sales were always highest."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which changes the meaning of “may reduce costs”?",
        "options": [
          "Could lower expenses",
          "Might cut costs",
          "Will eliminate all costs",
          "May lower spending"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "One useful paraphrasing technique is ___.",
        "options": [
          "adding unrelated facts",
          "reversing the conclusion",
          "removing all quantities",
          "changing word families"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "“People use more electricity” can become ___.",
        "options": [
          "People use no electricity.",
          "Electricity consumption is higher.",
          "Electricity never changes.",
          "All energy is free."
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 7,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "increase",
            "meaning": "a rise"
          },
          {
            "id": "p2",
            "word": "decrease",
            "meaning": "a reduction"
          },
          {
            "id": "p3",
            "word": "purchase",
            "meaning": "buy"
          },
          {
            "id": "p4",
            "word": "consume",
            "meaning": "use up"
          },
          {
            "id": "p5",
            "word": "maintain",
            "meaning": "keep at the same level"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "increase",
            "meaning": "a rise"
          },
          {
            "word": "decrease",
            "meaning": "a reduction"
          },
          {
            "word": "purchase",
            "meaning": "buy"
          },
          {
            "word": "consume",
            "meaning": "use up"
          },
          {
            "word": "maintain",
            "meaning": "keep at the same level"
          },
          {
            "word": "paraphrase",
            "meaning": "express the same meaning differently"
          },
          {
            "word": "equivalent",
            "meaning": "equal in meaning or value"
          },
          {
            "word": "accurate",
            "meaning": "correct and precise"
          },
          {
            "word": "transform",
            "meaning": "change the form of"
          },
          {
            "word": "preserve",
            "meaning": "keep something unchanged"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "increase",
            "options": [
              "correct and precise",
              "a rise",
              "use up"
            ]
          },
          {
            "id": "q2",
            "word": "decrease",
            "options": [
              "keep at the same level",
              "a reduction",
              "change the form of"
            ]
          },
          {
            "id": "q3",
            "word": "purchase",
            "options": [
              "keep something unchanged",
              "express the same meaning differently",
              "buy"
            ]
          },
          {
            "id": "q4",
            "word": "consume",
            "options": [
              "use up",
              "a rise",
              "equal in meaning or value"
            ]
          },
          {
            "id": "q5",
            "word": "maintain",
            "options": [
              "correct and precise",
              "keep at the same level",
              "a reduction"
            ]
          },
          {
            "id": "q6",
            "word": "paraphrase",
            "options": [
              "change the form of",
              "express the same meaning differently",
              "buy"
            ]
          },
          {
            "id": "q7",
            "word": "equivalent",
            "options": [
              "keep something unchanged",
              "equal in meaning or value",
              "use up"
            ]
          },
          {
            "id": "q8",
            "word": "accurate",
            "options": [
              "keep at the same level",
              "a rise",
              "correct and precise"
            ]
          },
          {
            "id": "q9",
            "word": "transform",
            "options": [
              "express the same meaning differently",
              "change the form of",
              "a reduction"
            ]
          },
          {
            "id": "q10",
            "word": "preserve",
            "options": [
              "keep something unchanged",
              "buy",
              "equal in meaning or value"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Change a verb to a noun",
            "sentence": "There was a significant rise in electricity consumption.",
            "words": [
              "electricity",
              "consumption.",
              "rise",
              "significant",
              "a",
              "There",
              "was",
              "in"
            ]
          },
          {
            "id": "s2",
            "hint": "Use accurate synonyms",
            "sentence": "Many people purchase goods through online platforms.",
            "words": [
              "goods",
              "purchase",
              "online",
              "platforms.",
              "Many",
              "people",
              "through"
            ]
          },
          {
            "id": "s3",
            "hint": "Preserve cautious meaning",
            "sentence": "This policy may reduce household expenses.",
            "words": [
              "household",
              "policy",
              "reduce",
              "may",
              "expenses.",
              "This"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-task1-trends",
    "stage": "B1-B2",
    "title": "Academic Task 1: trends and comparisons",
    "summary": "Describe the overall pattern before selecting important details.\nUse rose/fell, remained stable, peaked and fluctuated with accurate data.\nUse by for the amount of change and to for the final value.\nTask 1 reports describe the visual information; they do not need personal opinions.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Academic Task 1: trends and comparisons”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A value moves from 20 to 30. It increased ___ 10.",
        "options": [
          "to",
          "by",
          "at",
          "with"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "An overview should identify ___.",
        "options": [
          "the main patterns",
          "every number in order",
          "your personal preference",
          "an invented cause"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Fluctuated means ___.",
        "options": [
          "stayed perfectly constant",
          "only rose",
          "rose and fell repeatedly",
          "was never measured"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "The maximum value is a ___.",
        "options": [
          "decline",
          "plateau only",
          "fraction",
          "peak"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Task 1 should avoid ___.",
        "options": [
          "accurate comparisons",
          "unsupported personal opinions",
          "an overview",
          "relevant numbers"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 8,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "peak",
            "meaning": "reach the highest point"
          },
          {
            "id": "p2",
            "word": "fluctuate",
            "meaning": "rise and fall repeatedly"
          },
          {
            "id": "p3",
            "word": "remain stable",
            "meaning": "stay at the same level"
          },
          {
            "id": "p4",
            "word": "decline",
            "meaning": "decrease over time"
          },
          {
            "id": "p5",
            "word": "gradual",
            "meaning": "happening slowly"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "peak",
            "meaning": "reach the highest point"
          },
          {
            "word": "fluctuate",
            "meaning": "rise and fall repeatedly"
          },
          {
            "word": "remain stable",
            "meaning": "stay at the same level"
          },
          {
            "word": "decline",
            "meaning": "decrease over time"
          },
          {
            "word": "gradual",
            "meaning": "happening slowly"
          },
          {
            "word": "sharp",
            "meaning": "large and sudden"
          },
          {
            "word": "proportion",
            "meaning": "a part of a total"
          },
          {
            "word": "approximately",
            "meaning": "about but not exactly"
          },
          {
            "word": "plateau",
            "meaning": "stay flat after a change"
          },
          {
            "word": "overall",
            "meaning": "considering the whole picture"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "peak",
            "options": [
              "decrease over time",
              "about but not exactly",
              "reach the highest point"
            ]
          },
          {
            "id": "q2",
            "word": "fluctuate",
            "options": [
              "happening slowly",
              "stay flat after a change",
              "rise and fall repeatedly"
            ]
          },
          {
            "id": "q3",
            "word": "remain stable",
            "options": [
              "large and sudden",
              "considering the whole picture",
              "stay at the same level"
            ]
          },
          {
            "id": "q4",
            "word": "decline",
            "options": [
              "reach the highest point",
              "decrease over time",
              "a part of a total"
            ]
          },
          {
            "id": "q5",
            "word": "gradual",
            "options": [
              "rise and fall repeatedly",
              "about but not exactly",
              "happening slowly"
            ]
          },
          {
            "id": "q6",
            "word": "sharp",
            "options": [
              "large and sudden",
              "stay flat after a change",
              "stay at the same level"
            ]
          },
          {
            "id": "q7",
            "word": "proportion",
            "options": [
              "a part of a total",
              "decrease over time",
              "considering the whole picture"
            ]
          },
          {
            "id": "q8",
            "word": "approximately",
            "options": [
              "reach the highest point",
              "happening slowly",
              "about but not exactly"
            ]
          },
          {
            "id": "q9",
            "word": "plateau",
            "options": [
              "rise and fall repeatedly",
              "stay flat after a change",
              "large and sudden"
            ]
          },
          {
            "id": "q10",
            "word": "overall",
            "options": [
              "stay at the same level",
              "a part of a total",
              "considering the whole picture"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Describe an increase",
            "sentence": "The figure rose sharply between 2010 and 2020.",
            "words": [
              "sharply",
              "2020.",
              "and",
              "rose",
              "figure",
              "2010",
              "between",
              "The"
            ]
          },
          {
            "id": "s2",
            "hint": "Describe a comparison",
            "sentence": "Bus travel was more popular than rail travel.",
            "words": [
              "Bus",
              "than",
              "more",
              "travel.",
              "popular",
              "rail",
              "travel",
              "was"
            ]
          },
          {
            "id": "s3",
            "hint": "Write an overview",
            "sentence": "Overall, electricity consumption increased in both countries.",
            "words": [
              "in",
              "increased",
              "consumption",
              "Overall,",
              "electricity",
              "both",
              "countries."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-reading-strategies",
    "stage": "B1-B2",
    "title": "Reading: skimming, scanning and inference",
    "summary": "Skim to understand the main idea; scan to locate a specific detail.\nMatch meaning, not only repeated words, because questions often paraphrase the passage.\nFALSE contradicts the text; NOT GIVEN means the text does not settle the claim.\nUse evidence from the passage, not outside knowledge.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Reading: skimming, scanning and inference”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Skimming is mainly used to ___.",
        "options": [
          "find one phone number",
          "understand the general idea",
          "translate every word",
          "memorise punctuation"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Scanning helps you ___.",
        "options": [
          "locate a specific detail",
          "write a full essay",
          "invent a main idea",
          "ignore dates"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "NOT GIVEN means ___.",
        "options": [
          "the statement is always false",
          "the author disagrees explicitly",
          "the text does not provide enough information",
          "you personally disagree"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Answers should be based on ___.",
        "options": [
          "your general knowledge alone",
          "the longest option",
          "repeated words alone",
          "evidence in the passage"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "An inference is ___.",
        "options": [
          "a copied title only",
          "a conclusion supported by clues",
          "an unrelated assumption",
          "a spelling rule"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 9,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "skim",
            "meaning": "read quickly for the main idea"
          },
          {
            "id": "p2",
            "word": "scan",
            "meaning": "look quickly for specific information"
          },
          {
            "id": "p3",
            "word": "infer",
            "meaning": "reach a conclusion from clues"
          },
          {
            "id": "p4",
            "word": "contradict",
            "meaning": "state the opposite of"
          },
          {
            "id": "p5",
            "word": "explicit",
            "meaning": "clearly stated"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "skim",
            "meaning": "read quickly for the main idea"
          },
          {
            "word": "scan",
            "meaning": "look quickly for specific information"
          },
          {
            "word": "infer",
            "meaning": "reach a conclusion from clues"
          },
          {
            "word": "contradict",
            "meaning": "state the opposite of"
          },
          {
            "word": "explicit",
            "meaning": "clearly stated"
          },
          {
            "word": "implicit",
            "meaning": "suggested rather than directly stated"
          },
          {
            "word": "claim",
            "meaning": "a statement presented as true"
          },
          {
            "word": "locate",
            "meaning": "find the position of"
          },
          {
            "word": "heading",
            "meaning": "a title for a section"
          },
          {
            "word": "evidence",
            "meaning": "information supporting an answer"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "skim",
            "options": [
              "find the position of",
              "read quickly for the main idea",
              "state the opposite of"
            ]
          },
          {
            "id": "q2",
            "word": "scan",
            "options": [
              "look quickly for specific information",
              "a title for a section",
              "clearly stated"
            ]
          },
          {
            "id": "q3",
            "word": "infer",
            "options": [
              "information supporting an answer",
              "suggested rather than directly stated",
              "reach a conclusion from clues"
            ]
          },
          {
            "id": "q4",
            "word": "contradict",
            "options": [
              "state the opposite of",
              "read quickly for the main idea",
              "a statement presented as true"
            ]
          },
          {
            "id": "q5",
            "word": "explicit",
            "options": [
              "clearly stated",
              "look quickly for specific information",
              "find the position of"
            ]
          },
          {
            "id": "q6",
            "word": "implicit",
            "options": [
              "reach a conclusion from clues",
              "suggested rather than directly stated",
              "a title for a section"
            ]
          },
          {
            "id": "q7",
            "word": "claim",
            "options": [
              "a statement presented as true",
              "state the opposite of",
              "information supporting an answer"
            ]
          },
          {
            "id": "q8",
            "word": "locate",
            "options": [
              "clearly stated",
              "read quickly for the main idea",
              "find the position of"
            ]
          },
          {
            "id": "q9",
            "word": "heading",
            "options": [
              "look quickly for specific information",
              "a title for a section",
              "suggested rather than directly stated"
            ]
          },
          {
            "id": "q10",
            "word": "evidence",
            "options": [
              "information supporting an answer",
              "reach a conclusion from clues",
              "a statement presented as true"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Describe skimming",
            "sentence": "Skimming helps readers identify the main idea quickly.",
            "words": [
              "the",
              "idea",
              "Skimming",
              "identify",
              "helps",
              "readers",
              "quickly.",
              "main"
            ]
          },
          {
            "id": "s2",
            "hint": "Describe evidence",
            "sentence": "The statement is contradicted by the final paragraph.",
            "words": [
              "the",
              "statement",
              "final",
              "contradicted",
              "paragraph.",
              "is",
              "The",
              "by"
            ]
          },
          {
            "id": "s3",
            "hint": "Describe an inference",
            "sentence": "This conclusion is supported by several clues.",
            "words": [
              "by",
              "several",
              "is",
              "conclusion",
              "supported",
              "This",
              "clues."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b1-b2-academic-listening",
    "stage": "B1-B2",
    "title": "Academic listening: lectures and signposting",
    "summary": "Follow a lecture through signposts: first, in contrast, a key finding, to summarise.\nDistinguish the main argument from examples and background details.\nPredict answer types and listen for paraphrases rather than exact repeated words.\nIn note completion, retain the required noun and respect the word limit.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B1 to B2 learner studying “Academic listening: lectures and signposting”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "To summarise usually introduces ___.",
        "options": [
          "an unrelated example",
          "a recap of main points",
          "a booking price",
          "a spelling correction"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "In contrast signals ___.",
        "options": [
          "a difference between ideas",
          "only a date",
          "an identical point",
          "the start of a phone number"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A lecture example normally ___.",
        "options": [
          "replaces the main claim entirely",
          "is always the final answer",
          "illustrates a main point",
          "must be ignored"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "When wording differs, match ___.",
        "options": [
          "the first sound only",
          "the longest sentence",
          "the exact spelling alone",
          "the meaning"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Useful lecture notes should prioritise ___.",
        "options": [
          "every spoken filler",
          "key ideas and required details",
          "unrelated opinions",
          "full translations of every word"
        ]
      }
    ],
    "reward_coins": 35,
    "order_index": 10,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "signpost",
            "meaning": "a phrase showing the direction of a talk"
          },
          {
            "id": "p2",
            "word": "finding",
            "meaning": "a research result"
          },
          {
            "id": "p3",
            "word": "highlight",
            "meaning": "draw attention to"
          },
          {
            "id": "p4",
            "word": "summarise",
            "meaning": "state the main points briefly"
          },
          {
            "id": "p5",
            "word": "distinguish",
            "meaning": "recognise a difference"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "signpost",
            "meaning": "a phrase showing the direction of a talk"
          },
          {
            "word": "finding",
            "meaning": "a research result"
          },
          {
            "word": "highlight",
            "meaning": "draw attention to"
          },
          {
            "word": "summarise",
            "meaning": "state the main points briefly"
          },
          {
            "word": "distinguish",
            "meaning": "recognise a difference"
          },
          {
            "word": "lecture",
            "meaning": "an educational talk"
          },
          {
            "word": "illustration",
            "meaning": "an example explaining a point"
          },
          {
            "word": "emphasise",
            "meaning": "give special importance to"
          },
          {
            "word": "in contrast",
            "meaning": "showing a difference"
          },
          {
            "word": "conclude",
            "meaning": "bring a discussion to an end"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "signpost",
            "options": [
              "a phrase showing the direction of a talk",
              "give special importance to",
              "state the main points briefly"
            ]
          },
          {
            "id": "q2",
            "word": "finding",
            "options": [
              "a research result",
              "showing a difference",
              "recognise a difference"
            ]
          },
          {
            "id": "q3",
            "word": "highlight",
            "options": [
              "an educational talk",
              "draw attention to",
              "bring a discussion to an end"
            ]
          },
          {
            "id": "q4",
            "word": "summarise",
            "options": [
              "state the main points briefly",
              "a phrase showing the direction of a talk",
              "an example explaining a point"
            ]
          },
          {
            "id": "q5",
            "word": "distinguish",
            "options": [
              "a research result",
              "give special importance to",
              "recognise a difference"
            ]
          },
          {
            "id": "q6",
            "word": "lecture",
            "options": [
              "showing a difference",
              "an educational talk",
              "draw attention to"
            ]
          },
          {
            "id": "q7",
            "word": "illustration",
            "options": [
              "state the main points briefly",
              "bring a discussion to an end",
              "an example explaining a point"
            ]
          },
          {
            "id": "q8",
            "word": "emphasise",
            "options": [
              "give special importance to",
              "a phrase showing the direction of a talk",
              "recognise a difference"
            ]
          },
          {
            "id": "q9",
            "word": "in contrast",
            "options": [
              "an educational talk",
              "a research result",
              "showing a difference"
            ]
          },
          {
            "id": "q10",
            "word": "conclude",
            "options": [
              "bring a discussion to an end",
              "an example explaining a point",
              "draw attention to"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Introduce a finding",
            "sentence": "A key finding was the importance of regular feedback.",
            "words": [
              "key",
              "regular",
              "was",
              "feedback.",
              "finding",
              "A",
              "of",
              "importance",
              "the"
            ]
          },
          {
            "id": "s2",
            "hint": "Contrast two results",
            "sentence": "In contrast, the second group showed little improvement.",
            "words": [
              "group",
              "improvement.",
              "showed",
              "the",
              "second",
              "contrast,",
              "In",
              "little"
            ]
          },
          {
            "id": "s3",
            "hint": "Summarise a lecture",
            "sentence": "To summarise, several factors influenced the final outcome.",
            "words": [
              "factors",
              "summarise,",
              "To",
              "final",
              "several",
              "the",
              "influenced",
              "outcome."
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-academic-hedging",
    "stage": "B2-C1",
    "title": "Academic hedging and stance",
    "summary": "Hedging makes an academic claim appropriately cautious rather than absolute. Use may, might, appears to, tends to, and suggests that when evidence is limited.\nCompare: “This proves...” (very strong) / “This suggests...” (cautious and evidence-based).\nDo not hedge established facts unnecessarily. Match the strength of your language to the quality and amount of evidence.",
    "ai_prompt": "Act as an IELTS Academic Writing tutor for a B2-C1 learner. Teach hedging and cautious claims using may, might, appears to, and suggests. Explain why evidence should determine certainty. Give two improved sentence examples, then quiz me with five items one by one and explain each answer.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Which phrase makes a claim appropriately cautious?",
        "options": [
          "This proves beyond doubt that...",
          "The findings may indicate that...",
          "Everyone knows that...",
          "It is impossible that..."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete cautiously: The results ___ suggest a link between sleep and memory.",
        "placeholder": "One modal verb"
      },
      {
        "type": "multiple-choice",
        "prompt": "The study used only 20 participants. Which conclusion is best calibrated?",
        "options": [
          "This proves the treatment always works.",
          "The results may suggest a benefit, but further research is needed.",
          "No other study will be useful.",
          "The treatment is certainly ineffective."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "When should academic writers use hedging?",
        "options": [
          "Whenever they want a sentence to sound longer",
          "When the available evidence does not justify certainty",
          "Only when stating basic facts",
          "In every sentence, without exception"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: The policy ___ (appear) to have reduced waiting times.",
        "placeholder": "One word"
      }
    ],
    "reward_coins": 50,
    "order_index": 1,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "tentative",
            "meaning": "not fully certain"
          },
          {
            "id": "p2",
            "word": "plausible",
            "meaning": "reasonable and believable"
          },
          {
            "id": "p3",
            "word": "suggest",
            "meaning": "indicate without proving"
          },
          {
            "id": "p4",
            "word": "arguably",
            "meaning": "as can reasonably be argued"
          },
          {
            "id": "p5",
            "word": "tendency",
            "meaning": "a general pattern or inclination"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "tentative",
            "meaning": "not fully certain"
          },
          {
            "word": "plausible",
            "meaning": "reasonable and believable"
          },
          {
            "word": "suggest",
            "meaning": "indicate without proving"
          },
          {
            "word": "arguably",
            "meaning": "as can reasonably be argued"
          },
          {
            "word": "tendency",
            "meaning": "a general pattern or inclination"
          },
          {
            "word": "nuance",
            "meaning": "a subtle difference in meaning"
          },
          {
            "word": "qualify",
            "meaning": "limit the strength of a statement"
          },
          {
            "word": "stance",
            "meaning": "a position on an issue"
          },
          {
            "word": "apparent",
            "meaning": "seeming to be true"
          },
          {
            "word": "cautious",
            "meaning": "careful to avoid overstatement"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "tentative",
            "options": [
              "a position on an issue",
              "as can reasonably be argued",
              "not fully certain"
            ]
          },
          {
            "id": "q2",
            "word": "plausible",
            "options": [
              "seeming to be true",
              "a general pattern or inclination",
              "reasonable and believable"
            ]
          },
          {
            "id": "q3",
            "word": "suggest",
            "options": [
              "a subtle difference in meaning",
              "careful to avoid overstatement",
              "indicate without proving"
            ]
          },
          {
            "id": "q4",
            "word": "arguably",
            "options": [
              "not fully certain",
              "as can reasonably be argued",
              "limit the strength of a statement"
            ]
          },
          {
            "id": "q5",
            "word": "tendency",
            "options": [
              "a general pattern or inclination",
              "a position on an issue",
              "reasonable and believable"
            ]
          },
          {
            "id": "q6",
            "word": "nuance",
            "options": [
              "seeming to be true",
              "a subtle difference in meaning",
              "indicate without proving"
            ]
          },
          {
            "id": "q7",
            "word": "qualify",
            "options": [
              "as can reasonably be argued",
              "careful to avoid overstatement",
              "limit the strength of a statement"
            ]
          },
          {
            "id": "q8",
            "word": "stance",
            "options": [
              "a general pattern or inclination",
              "not fully certain",
              "a position on an issue"
            ]
          },
          {
            "id": "q9",
            "word": "apparent",
            "options": [
              "a subtle difference in meaning",
              "seeming to be true",
              "reasonable and believable"
            ]
          },
          {
            "id": "q10",
            "word": "cautious",
            "options": [
              "indicate without proving",
              "limit the strength of a statement",
              "careful to avoid overstatement"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Hedge a claim",
            "sentence": "The findings appear to support this interpretation.",
            "words": [
              "to",
              "support",
              "findings",
              "interpretation.",
              "this",
              "The",
              "appear"
            ]
          },
          {
            "id": "s2",
            "hint": "Express a possibility",
            "sentence": "This policy may contribute to lower emissions.",
            "words": [
              "This",
              "to",
              "policy",
              "lower",
              "emissions.",
              "contribute",
              "may"
            ]
          },
          {
            "id": "s3",
            "hint": "Qualify a generalisation",
            "sentence": "In some circumstances, online learning can be beneficial.",
            "words": [
              "be",
              "beneficial.",
              "circumstances,",
              "online",
              "learning",
              "some",
              "can",
              "In"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-inversion-emphasis",
    "stage": "B2-C1",
    "title": "Inversion and emphasis",
    "summary": "Formal inversion can follow a negative or restrictive phrase at the start of a sentence: Never have I seen such rapid change; Not only did costs fall, but access improved.\nAfter Not only, use auxiliary + subject + main verb. With no auxiliary, add do / does / did.\nUse inversion sparingly in formal writing; it creates emphasis but can sound unnatural if overused.",
    "ai_prompt": "Teach a B2-C1 learner how formal inversion works after “never” and “not only”. Show the auxiliary-before-subject pattern and warn against overuse. Use IELTS-style formal examples. Ask five short transformation or choice questions one at a time, and explain the grammar after each response.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Choose the correct inversion: Never ___ such a rapid change.",
        "options": [
          "I have seen",
          "have I seen",
          "I saw",
          "did I have seen"
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: Not only ___ the policy reduce costs, but it also improved access.",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "Which sentence is grammatically correct?",
        "options": [
          "Rarely people consider the long-term effect.",
          "Rarely do people consider the long-term effect.",
          "Rarely people do consider the long-term effect.",
          "Rarely does people consider the long-term effect."
        ]
      },
      {
        "type": "input",
        "prompt": "Complete: Not only did the city expand the network, but it ___ (also / improve) service frequency.",
        "placeholder": "Two words"
      },
      {
        "type": "multiple-choice",
        "prompt": "What does formal inversion mainly add?",
        "options": [
          "A question mark",
          "Emphasis after a negative or restrictive opening",
          "A change to the past tense",
          "A less formal conversational tone"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 2,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "rarely",
            "meaning": "not often"
          },
          {
            "id": "p2",
            "word": "seldom",
            "meaning": "almost never"
          },
          {
            "id": "p3",
            "word": "hardly",
            "meaning": "almost not"
          },
          {
            "id": "p4",
            "word": "scarcely",
            "meaning": "barely"
          },
          {
            "id": "p5",
            "word": "not only",
            "meaning": "used to emphasise an additional point"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "rarely",
            "meaning": "not often"
          },
          {
            "word": "seldom",
            "meaning": "almost never"
          },
          {
            "word": "hardly",
            "meaning": "almost not"
          },
          {
            "word": "scarcely",
            "meaning": "barely"
          },
          {
            "word": "not only",
            "meaning": "used to emphasise an additional point"
          },
          {
            "word": "emphasis",
            "meaning": "extra importance placed on something"
          },
          {
            "word": "inversion",
            "meaning": "reversal of normal word order"
          },
          {
            "word": "auxiliary",
            "meaning": "a helping verb"
          },
          {
            "word": "restrictive",
            "meaning": "limiting what is allowed"
          },
          {
            "word": "under no circumstances",
            "meaning": "not in any situation"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "rarely",
            "options": [
              "not often",
              "barely",
              "a helping verb"
            ]
          },
          {
            "id": "q2",
            "word": "seldom",
            "options": [
              "limiting what is allowed",
              "used to emphasise an additional point",
              "almost never"
            ]
          },
          {
            "id": "q3",
            "word": "hardly",
            "options": [
              "not in any situation",
              "extra importance placed on something",
              "almost not"
            ]
          },
          {
            "id": "q4",
            "word": "scarcely",
            "options": [
              "reversal of normal word order",
              "barely",
              "not often"
            ]
          },
          {
            "id": "q5",
            "word": "not only",
            "options": [
              "used to emphasise an additional point",
              "a helping verb",
              "almost never"
            ]
          },
          {
            "id": "q6",
            "word": "emphasis",
            "options": [
              "extra importance placed on something",
              "limiting what is allowed",
              "almost not"
            ]
          },
          {
            "id": "q7",
            "word": "inversion",
            "options": [
              "not in any situation",
              "barely",
              "reversal of normal word order"
            ]
          },
          {
            "id": "q8",
            "word": "auxiliary",
            "options": [
              "a helping verb",
              "used to emphasise an additional point",
              "not often"
            ]
          },
          {
            "id": "q9",
            "word": "restrictive",
            "options": [
              "extra importance placed on something",
              "almost never",
              "limiting what is allowed"
            ]
          },
          {
            "id": "q10",
            "word": "under no circumstances",
            "options": [
              "almost not",
              "not in any situation",
              "reversal of normal word order"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Invert after a negative adverb",
            "sentence": "Rarely do students achieve fluency without regular practice.",
            "words": [
              "without",
              "regular",
              "students",
              "do",
              "achieve",
              "practice.",
              "fluency",
              "Rarely"
            ]
          },
          {
            "id": "s2",
            "hint": "Use not only inversion",
            "sentence": "Not only did the policy reduce costs, but it also improved access.",
            "words": [
              "costs,",
              "policy",
              "it",
              "also",
              "reduce",
              "access.",
              "Not",
              "improved",
              "the",
              "but",
              "did",
              "only"
            ]
          },
          {
            "id": "s3",
            "hint": "Use a restrictive phrase",
            "sentence": "Under no circumstances should evidence be fabricated.",
            "words": [
              "should",
              "be",
              "circumstances",
              "evidence",
              "Under",
              "fabricated.",
              "no"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-task2-argument",
    "stage": "B2-C1",
    "title": "IELTS Task 2 argument development",
    "summary": "Answer every part of the question and state a clear position. Build each body paragraph around one main claim, explain why it matters, and support it with a relevant example.\nA useful chain is: point → explanation → example → link to the question. Address an opposing view when it strengthens your argument.\nPrefer precise vocabulary and natural collocations to memorised phrases. Keep conclusions consistent with your position.",
    "ai_prompt": "Act as an experienced IELTS Writing Task 2 tutor for a B2-C1 learner. Teach a practical paragraph chain (point, explanation, example, link) and how to keep a clear position. Use the topic of public transport or education. Give a short model plan, then ask five planning or revision questions one at a time. Do not write a full essay for me.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "What should a strong body paragraph usually develop?",
        "options": [
          "Several unrelated claims",
          "One main claim supported with explanation and evidence",
          "Only a quotation",
          "A new position that contradicts the introduction"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "After making a point, what is a useful next step?",
        "options": [
          "Explain why it matters",
          "Start an unrelated paragraph",
          "Repeat the thesis word for word",
          "Add a memorised idiom"
        ]
      },
      {
        "type": "input",
        "prompt": "In the chain point → explanation → example → ___, what final step links the idea back to the question?",
        "placeholder": "One word"
      },
      {
        "type": "multiple-choice",
        "prompt": "What is the best approach to an opposing view?",
        "options": [
          "Ignore the question prompt",
          "Address it when doing so strengthens a balanced argument",
          "Replace your position with the opposite one",
          "Mention it without explaining it"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which vocabulary choice is strongest for IELTS writing?",
        "options": [
          "A precise natural collocation that fits the meaning",
          "A rare word used without checking its meaning",
          "A memorised phrase in every paragraph",
          "A synonym that changes the original meaning"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 3,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "thesis",
            "meaning": "the central position of an essay"
          },
          {
            "id": "p2",
            "word": "justify",
            "meaning": "give reasons supporting a claim"
          },
          {
            "id": "p3",
            "word": "counterargument",
            "meaning": "an opposing line of reasoning"
          },
          {
            "id": "p4",
            "word": "illustrate",
            "meaning": "explain with an example"
          },
          {
            "id": "p5",
            "word": "concession",
            "meaning": "acknowledgement of an opposing point"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "thesis",
            "meaning": "the central position of an essay"
          },
          {
            "word": "justify",
            "meaning": "give reasons supporting a claim"
          },
          {
            "word": "counterargument",
            "meaning": "an opposing line of reasoning"
          },
          {
            "word": "illustrate",
            "meaning": "explain with an example"
          },
          {
            "word": "concession",
            "meaning": "acknowledgement of an opposing point"
          },
          {
            "word": "elaborate",
            "meaning": "explain in more detail"
          },
          {
            "word": "implication",
            "meaning": "a possible effect or consequence"
          },
          {
            "word": "position",
            "meaning": "a view on an issue"
          },
          {
            "word": "evaluate",
            "meaning": "judge strengths and weaknesses"
          },
          {
            "word": "persuasive",
            "meaning": "able to convince a reader"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "thesis",
            "options": [
              "explain with an example",
              "the central position of an essay",
              "a view on an issue"
            ]
          },
          {
            "id": "q2",
            "word": "justify",
            "options": [
              "judge strengths and weaknesses",
              "give reasons supporting a claim",
              "acknowledgement of an opposing point"
            ]
          },
          {
            "id": "q3",
            "word": "counterargument",
            "options": [
              "explain in more detail",
              "able to convince a reader",
              "an opposing line of reasoning"
            ]
          },
          {
            "id": "q4",
            "word": "illustrate",
            "options": [
              "a possible effect or consequence",
              "the central position of an essay",
              "explain with an example"
            ]
          },
          {
            "id": "q5",
            "word": "concession",
            "options": [
              "a view on an issue",
              "acknowledgement of an opposing point",
              "give reasons supporting a claim"
            ]
          },
          {
            "id": "q6",
            "word": "elaborate",
            "options": [
              "an opposing line of reasoning",
              "judge strengths and weaknesses",
              "explain in more detail"
            ]
          },
          {
            "id": "q7",
            "word": "implication",
            "options": [
              "a possible effect or consequence",
              "able to convince a reader",
              "explain with an example"
            ]
          },
          {
            "id": "q8",
            "word": "position",
            "options": [
              "acknowledgement of an opposing point",
              "the central position of an essay",
              "a view on an issue"
            ]
          },
          {
            "id": "q9",
            "word": "evaluate",
            "options": [
              "judge strengths and weaknesses",
              "explain in more detail",
              "give reasons supporting a claim"
            ]
          },
          {
            "id": "q10",
            "word": "persuasive",
            "options": [
              "able to convince a reader",
              "a possible effect or consequence",
              "an opposing line of reasoning"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "State a clear position",
            "sentence": "Governments should prioritise affordable public transport.",
            "words": [
              "public",
              "should",
              "transport.",
              "prioritise",
              "affordable",
              "Governments"
            ]
          },
          {
            "id": "s2",
            "hint": "Develop a concession",
            "sentence": "Although this approach is costly, its long-term benefits are substantial.",
            "words": [
              "approach",
              "its",
              "are",
              "is",
              "substantial.",
              "costly,",
              "long-term",
              "Although",
              "this",
              "benefits"
            ]
          },
          {
            "id": "s3",
            "hint": "Link evidence to a claim",
            "sentence": "This example illustrates why reliable services are essential.",
            "words": [
              "illustrates",
              "This",
              "reliable",
              "essential.",
              "why",
              "are",
              "example",
              "services"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-idioms-collocations",
    "stage": "B2-C1",
    "title": "C1 idioms and precise collocations",
    "summary": "Use natural collocations in writing: compelling evidence, pose a threat, address an issue.\nUse conversational idioms selectively in Speaking, not automatically in formal essays.\nOn the same page means sharing an understanding; a double-edged sword has benefits and drawbacks.\nAccuracy and register matter more than the number of idioms you use.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “C1 idioms and precise collocations”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Choose the natural collocation.",
        "options": [
          "Do a threat",
          "Pose a threat",
          "Make evidence compellingly of",
          "Take an issue address"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A double-edged sword has ___.",
        "options": [
          "both advantages and disadvantages",
          "only advantages",
          "only financial costs",
          "no consequences"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Conversational idioms are generally best suited to ___.",
        "options": [
          "every Task 1 statistic",
          "formal citations only",
          "natural Speaking responses",
          "all essay introductions"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Compelling evidence is ___.",
        "options": [
          "irrelevant evidence",
          "evidence that was hidden",
          "always a personal opinion",
          "strong and convincing evidence"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "On the same page means ___.",
        "options": [
          "reading identical books only",
          "sharing an understanding",
          "having different opinions always",
          "finishing an exam early"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 4,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "compelling",
            "meaning": "strong and convincing"
          },
          {
            "id": "p2",
            "word": "pose a threat",
            "meaning": "create a danger"
          },
          {
            "id": "p3",
            "word": "address an issue",
            "meaning": "deal with a problem"
          },
          {
            "id": "p4",
            "word": "on the same page",
            "meaning": "sharing an understanding"
          },
          {
            "id": "p5",
            "word": "double-edged sword",
            "meaning": "something with benefits and drawbacks"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "compelling",
            "meaning": "strong and convincing"
          },
          {
            "word": "pose a threat",
            "meaning": "create a danger"
          },
          {
            "word": "address an issue",
            "meaning": "deal with a problem"
          },
          {
            "word": "on the same page",
            "meaning": "sharing an understanding"
          },
          {
            "word": "double-edged sword",
            "meaning": "something with benefits and drawbacks"
          },
          {
            "word": "take into account",
            "meaning": "consider"
          },
          {
            "word": "far-reaching",
            "meaning": "having wide effects"
          },
          {
            "word": "a steep learning curve",
            "meaning": "a period requiring rapid learning"
          },
          {
            "word": "strike a balance",
            "meaning": "find a fair compromise"
          },
          {
            "word": "bear in mind",
            "meaning": "remember when considering something"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "compelling",
            "options": [
              "sharing an understanding",
              "strong and convincing",
              "a period requiring rapid learning"
            ]
          },
          {
            "id": "q2",
            "word": "pose a threat",
            "options": [
              "something with benefits and drawbacks",
              "create a danger",
              "find a fair compromise"
            ]
          },
          {
            "id": "q3",
            "word": "address an issue",
            "options": [
              "deal with a problem",
              "consider",
              "remember when considering something"
            ]
          },
          {
            "id": "q4",
            "word": "on the same page",
            "options": [
              "sharing an understanding",
              "strong and convincing",
              "having wide effects"
            ]
          },
          {
            "id": "q5",
            "word": "double-edged sword",
            "options": [
              "something with benefits and drawbacks",
              "a period requiring rapid learning",
              "create a danger"
            ]
          },
          {
            "id": "q6",
            "word": "take into account",
            "options": [
              "deal with a problem",
              "find a fair compromise",
              "consider"
            ]
          },
          {
            "id": "q7",
            "word": "far-reaching",
            "options": [
              "remember when considering something",
              "sharing an understanding",
              "having wide effects"
            ]
          },
          {
            "id": "q8",
            "word": "a steep learning curve",
            "options": [
              "a period requiring rapid learning",
              "something with benefits and drawbacks",
              "strong and convincing"
            ]
          },
          {
            "id": "q9",
            "word": "strike a balance",
            "options": [
              "consider",
              "find a fair compromise",
              "create a danger"
            ]
          },
          {
            "id": "q10",
            "word": "bear in mind",
            "options": [
              "having wide effects",
              "remember when considering something",
              "deal with a problem"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Use a formal collocation",
            "sentence": "The report provides compelling evidence for policy reform.",
            "words": [
              "reform.",
              "provides",
              "report",
              "evidence",
              "for",
              "compelling",
              "policy",
              "The"
            ]
          },
          {
            "id": "s2",
            "hint": "Use an appropriate idiom",
            "sentence": "Technology can be a double-edged sword for learners.",
            "words": [
              "be",
              "can",
              "Technology",
              "double-edged",
              "learners.",
              "a",
              "sword",
              "for"
            ]
          },
          {
            "id": "s3",
            "hint": "Express a balanced aim",
            "sentence": "Policymakers should strike a balance between cost and access.",
            "words": [
              "access.",
              "between",
              "should",
              "cost",
              "Policymakers",
              "strike",
              "and",
              "balance",
              "a"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-advanced-task2-structures",
    "stage": "B2-C1",
    "title": "Advanced Task 2: essay architecture",
    "summary": "Match your structure to the question: opinion, discussion, advantages/disadvantages or two-part.\nWrite a clear thesis; each body paragraph needs one controlling idea and developed support.\nFor a discussion essay, address both views and make your own position clear.\nA conclusion synthesises your argument instead of introducing new evidence.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “Advanced Task 2: essay architecture”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The essay structure should be chosen according to ___.",
        "options": [
          "a memorised template only",
          "the exact question requirements",
          "the longest introduction",
          "the number of rare words"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A discussion essay must ___.",
        "options": [
          "address both stated views",
          "ignore one view",
          "only list examples",
          "avoid any position when asked"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A body paragraph is strongest when it ___.",
        "options": [
          "lists unrelated ideas",
          "contains only linkers",
          "develops one controlling idea",
          "repeats the introduction word for word"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A conclusion should ___.",
        "options": [
          "add a new research study",
          "change the thesis completely",
          "raise an unrelated topic",
          "synthesise the argument"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "In a two-part question, you should ___.",
        "options": [
          "answer only the easier part",
          "address both parts adequately",
          "always write a cause essay",
          "omit examples"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 5,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "architecture",
            "meaning": "the overall structure"
          },
          {
            "id": "p2",
            "word": "synthesise",
            "meaning": "combine ideas into a coherent whole"
          },
          {
            "id": "p3",
            "word": "controlling idea",
            "meaning": "the central focus of a paragraph"
          },
          {
            "id": "p4",
            "word": "scope",
            "meaning": "the range covered by an argument"
          },
          {
            "id": "p5",
            "word": "address",
            "meaning": "deal directly with"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "architecture",
            "meaning": "the overall structure"
          },
          {
            "word": "synthesise",
            "meaning": "combine ideas into a coherent whole"
          },
          {
            "word": "controlling idea",
            "meaning": "the central focus of a paragraph"
          },
          {
            "word": "scope",
            "meaning": "the range covered by an argument"
          },
          {
            "word": "address",
            "meaning": "deal directly with"
          },
          {
            "word": "coherent",
            "meaning": "logically connected"
          },
          {
            "word": "substantiate",
            "meaning": "support with evidence"
          },
          {
            "word": "relevance",
            "meaning": "connection to the question"
          },
          {
            "word": "thesis",
            "meaning": "an essay’s central position"
          },
          {
            "word": "outline",
            "meaning": "a brief plan"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "architecture",
            "options": [
              "the range covered by an argument",
              "the overall structure",
              "connection to the question"
            ]
          },
          {
            "id": "q2",
            "word": "synthesise",
            "options": [
              "deal directly with",
              "combine ideas into a coherent whole",
              "an essay’s central position"
            ]
          },
          {
            "id": "q3",
            "word": "controlling idea",
            "options": [
              "the central focus of a paragraph",
              "a brief plan",
              "logically connected"
            ]
          },
          {
            "id": "q4",
            "word": "scope",
            "options": [
              "support with evidence",
              "the overall structure",
              "the range covered by an argument"
            ]
          },
          {
            "id": "q5",
            "word": "address",
            "options": [
              "connection to the question",
              "combine ideas into a coherent whole",
              "deal directly with"
            ]
          },
          {
            "id": "q6",
            "word": "coherent",
            "options": [
              "an essay’s central position",
              "logically connected",
              "the central focus of a paragraph"
            ]
          },
          {
            "id": "q7",
            "word": "substantiate",
            "options": [
              "the range covered by an argument",
              "support with evidence",
              "a brief plan"
            ]
          },
          {
            "id": "q8",
            "word": "relevance",
            "options": [
              "the overall structure",
              "connection to the question",
              "deal directly with"
            ]
          },
          {
            "id": "q9",
            "word": "thesis",
            "options": [
              "combine ideas into a coherent whole",
              "logically connected",
              "an essay’s central position"
            ]
          },
          {
            "id": "q10",
            "word": "outline",
            "options": [
              "support with evidence",
              "a brief plan",
              "the central focus of a paragraph"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "State an essay aim",
            "sentence": "This essay will examine both views before presenting a conclusion.",
            "words": [
              "This",
              "both",
              "views",
              "before",
              "examine",
              "will",
              "a",
              "essay",
              "presenting",
              "conclusion."
            ]
          },
          {
            "id": "s2",
            "hint": "Develop a controlling idea",
            "sentence": "One compelling reason is the long-term benefit to society.",
            "words": [
              "compelling",
              "long-term",
              "benefit",
              "is",
              "the",
              "society.",
              "One",
              "to",
              "reason"
            ]
          },
          {
            "id": "s3",
            "hint": "Write a conclusion",
            "sentence": "Overall the advantages outweigh the drawbacks in this context.",
            "words": [
              "outweigh",
              "the",
              "Overall",
              "this",
              "the",
              "context.",
              "drawbacks",
              "in",
              "advantages"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-counterarguments",
    "stage": "B2-C1",
    "title": "Counterarguments, concession and rebuttal",
    "summary": "Acknowledge a reasonable opposing point before explaining why your position is stronger.\nUse while, admittedly or despite this for a measured concession.\nRebut a claim with reasoning and evidence, not dismissive language.\nKeep your overall position consistent from introduction to conclusion.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “Counterarguments, concession and rebuttal”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "A concession ___.",
        "options": [
          "always abandons your position",
          "acknowledges a reasonable opposing point",
          "introduces unrelated facts",
          "repeats a heading"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A rebuttal should be supported by ___.",
        "options": [
          "reasoning and evidence",
          "insults",
          "rare adjectives only",
          "an unexamined assumption"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which phrase signals a concession?",
        "options": [
          "As a final result",
          "In precisely 2010",
          "Admittedly",
          "For the first question number"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Your overall position should be ___.",
        "options": [
          "different in every paragraph",
          "left completely unstated",
          "based only on anecdotes",
          "consistent"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose a balanced response.",
        "options": [
          "All opponents are foolish.",
          "While costs are high, the benefits can justify investment.",
          "There are no possible drawbacks.",
          "Evidence is never necessary."
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 6,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "concede",
            "meaning": "acknowledge a point as valid"
          },
          {
            "id": "p2",
            "word": "rebut",
            "meaning": "argue against a claim"
          },
          {
            "id": "p3",
            "word": "admittedly",
            "meaning": "acknowledging a point frankly"
          },
          {
            "id": "p4",
            "word": "nevertheless",
            "meaning": "despite what was just stated"
          },
          {
            "id": "p5",
            "word": "objection",
            "meaning": "a reason for disagreement"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "concede",
            "meaning": "acknowledge a point as valid"
          },
          {
            "word": "rebut",
            "meaning": "argue against a claim"
          },
          {
            "word": "admittedly",
            "meaning": "acknowledging a point frankly"
          },
          {
            "word": "nevertheless",
            "meaning": "despite what was just stated"
          },
          {
            "word": "objection",
            "meaning": "a reason for disagreement"
          },
          {
            "word": "valid",
            "meaning": "well founded or reasonable"
          },
          {
            "word": "outweigh",
            "meaning": "be more important than"
          },
          {
            "word": "refute",
            "meaning": "show a claim to be false"
          },
          {
            "word": "balanced",
            "meaning": "considering different sides fairly"
          },
          {
            "word": "consistency",
            "meaning": "keeping the same underlying position"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "concede",
            "options": [
              "show a claim to be false",
              "acknowledge a point as valid",
              "despite what was just stated"
            ]
          },
          {
            "id": "q2",
            "word": "rebut",
            "options": [
              "considering different sides fairly",
              "a reason for disagreement",
              "argue against a claim"
            ]
          },
          {
            "id": "q3",
            "word": "admittedly",
            "options": [
              "acknowledging a point frankly",
              "keeping the same underlying position",
              "well founded or reasonable"
            ]
          },
          {
            "id": "q4",
            "word": "nevertheless",
            "options": [
              "be more important than",
              "acknowledge a point as valid",
              "despite what was just stated"
            ]
          },
          {
            "id": "q5",
            "word": "objection",
            "options": [
              "a reason for disagreement",
              "argue against a claim",
              "show a claim to be false"
            ]
          },
          {
            "id": "q6",
            "word": "valid",
            "options": [
              "acknowledging a point frankly",
              "considering different sides fairly",
              "well founded or reasonable"
            ]
          },
          {
            "id": "q7",
            "word": "outweigh",
            "options": [
              "keeping the same underlying position",
              "despite what was just stated",
              "be more important than"
            ]
          },
          {
            "id": "q8",
            "word": "refute",
            "options": [
              "acknowledge a point as valid",
              "show a claim to be false",
              "a reason for disagreement"
            ]
          },
          {
            "id": "q9",
            "word": "balanced",
            "options": [
              "well founded or reasonable",
              "considering different sides fairly",
              "argue against a claim"
            ]
          },
          {
            "id": "q10",
            "word": "consistency",
            "options": [
              "keeping the same underlying position",
              "be more important than",
              "acknowledging a point frankly"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Make a concession",
            "sentence": "Admittedly, the initial investment may be substantial.",
            "words": [
              "Admittedly,",
              "investment",
              "substantial.",
              "be",
              "the",
              "initial",
              "may"
            ]
          },
          {
            "id": "s2",
            "hint": "Rebut an objection",
            "sentence": "Nevertheless, the long-term benefits outweigh these costs.",
            "words": [
              "long-term",
              "benefits",
              "Nevertheless,",
              "the",
              "costs.",
              "outweigh",
              "these"
            ]
          },
          {
            "id": "s3",
            "hint": "Keep a clear position",
            "sentence": "While alternatives exist, public funding remains essential.",
            "words": [
              "essential.",
              "While",
              "remains",
              "public",
              "exist,",
              "funding",
              "alternatives"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-nominalisation",
    "stage": "B2-C1",
    "title": "Nominalisation and formal register",
    "summary": "Nominalisation turns verbs or adjectives into nouns: expand → expansion, efficient → efficiency.\nIt can create concise academic phrasing, but too many abstract nouns obscure meaning.\nChoose formal, precise wording rather than inflated language.\nOriginal: Cities expanded quickly. Formal: Rapid urban expansion created pressure on housing.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “Nominalisation and formal register”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "The noun form of expand is ___.",
        "options": [
          "expandingness",
          "expansion",
          "expansive verb",
          "expandmently"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Nominalisation turns a verb or adjective into ___.",
        "options": [
          "a noun",
          "only a preposition",
          "an informal idiom",
          "a punctuation mark"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Excessive nominalisation may ___.",
        "options": [
          "always improve clarity",
          "remove every argument",
          "make writing difficult to understand",
          "guarantee Band 9"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose a formal phrase.",
        "options": [
          "Loads of stuff got better",
          "Things did a good thing",
          "Really super big city stuff",
          "Improvements in public services"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A suitable formal register is ___.",
        "options": [
          "vague and inflated",
          "precise and clear",
          "full of slang",
          "always passive"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 7,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "expansion",
            "meaning": "the act of becoming larger"
          },
          {
            "id": "p2",
            "word": "efficiency",
            "meaning": "effective use of time or resources"
          },
          {
            "id": "p3",
            "word": "implementation",
            "meaning": "putting a plan into effect"
          },
          {
            "id": "p4",
            "word": "development",
            "meaning": "the process of growth or improvement"
          },
          {
            "id": "p5",
            "word": "regulation",
            "meaning": "control through rules"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "expansion",
            "meaning": "the act of becoming larger"
          },
          {
            "word": "efficiency",
            "meaning": "effective use of time or resources"
          },
          {
            "word": "implementation",
            "meaning": "putting a plan into effect"
          },
          {
            "word": "development",
            "meaning": "the process of growth or improvement"
          },
          {
            "word": "regulation",
            "meaning": "control through rules"
          },
          {
            "word": "nominalisation",
            "meaning": "forming a noun from another word class"
          },
          {
            "word": "register",
            "meaning": "a style suited to a context"
          },
          {
            "word": "concise",
            "meaning": "brief but clear"
          },
          {
            "word": "obscure",
            "meaning": "make difficult to understand"
          },
          {
            "word": "precision",
            "meaning": "exactness of meaning"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "expansion",
            "options": [
              "brief but clear",
              "the act of becoming larger",
              "the process of growth or improvement"
            ]
          },
          {
            "id": "q2",
            "word": "efficiency",
            "options": [
              "control through rules",
              "make difficult to understand",
              "effective use of time or resources"
            ]
          },
          {
            "id": "q3",
            "word": "implementation",
            "options": [
              "putting a plan into effect",
              "exactness of meaning",
              "forming a noun from another word class"
            ]
          },
          {
            "id": "q4",
            "word": "development",
            "options": [
              "a style suited to a context",
              "the act of becoming larger",
              "the process of growth or improvement"
            ]
          },
          {
            "id": "q5",
            "word": "regulation",
            "options": [
              "brief but clear",
              "effective use of time or resources",
              "control through rules"
            ]
          },
          {
            "id": "q6",
            "word": "nominalisation",
            "options": [
              "forming a noun from another word class",
              "make difficult to understand",
              "putting a plan into effect"
            ]
          },
          {
            "id": "q7",
            "word": "register",
            "options": [
              "a style suited to a context",
              "exactness of meaning",
              "the process of growth or improvement"
            ]
          },
          {
            "id": "q8",
            "word": "concise",
            "options": [
              "control through rules",
              "brief but clear",
              "the act of becoming larger"
            ]
          },
          {
            "id": "q9",
            "word": "obscure",
            "options": [
              "forming a noun from another word class",
              "effective use of time or resources",
              "make difficult to understand"
            ]
          },
          {
            "id": "q10",
            "word": "precision",
            "options": [
              "putting a plan into effect",
              "exactness of meaning",
              "a style suited to a context"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Use a nominalisation",
            "sentence": "Rapid urban expansion has increased pressure on housing.",
            "words": [
              "pressure",
              "on",
              "expansion",
              "urban",
              "housing.",
              "Rapid",
              "has",
              "increased"
            ]
          },
          {
            "id": "s2",
            "hint": "Use a formal noun phrase",
            "sentence": "The implementation of this policy requires careful planning.",
            "words": [
              "requires",
              "implementation",
              "planning.",
              "careful",
              "policy",
              "The",
              "this",
              "of"
            ]
          },
          {
            "id": "s3",
            "hint": "Keep formal writing clear",
            "sentence": "Greater efficiency can reduce the overall cost of services.",
            "words": [
              "overall",
              "of",
              "services.",
              "efficiency",
              "the",
              "Greater",
              "cost",
              "reduce",
              "can"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-complex-sentences",
    "stage": "B2-C1",
    "title": "Advanced clauses and sentence control",
    "summary": "Use concessive, relative and participle clauses to show relationships precisely.\nA participle clause must refer to the logical subject of the main clause.\nVary sentence forms, but do not sacrifice clarity for length.\nExample: Having considered both options, the council chose the more sustainable plan.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “Advanced clauses and sentence control”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "In a participle clause, the implied subject should ___.",
        "options": [
          "be unrelated to the main clause",
          "match the logical subject of the main clause",
          "always be an object",
          "never be a person"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the logical sentence.",
        "options": [
          "Having reviewed the evidence, the researchers revised their claim.",
          "Having reviewed the evidence, the claim revised the researchers.",
          "Having reviewed the evidence, it raining.",
          "Having reviewed evidence, revised."
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A concessive clause often begins with ___.",
        "options": [
          "because of plus a noun only",
          "a full stop",
          "although",
          "and then at"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Complex sentences should prioritise ___.",
        "options": [
          "maximum length",
          "as many clauses as possible",
          "unnecessary punctuation",
          "clear relationships between ideas"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which phrase can introduce a participle clause?",
        "options": [
          "There is to",
          "Having considered",
          "Despite of that is",
          "However because"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 8,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "concessive",
            "meaning": "expressing contrast with an expectation"
          },
          {
            "id": "p2",
            "word": "participle",
            "meaning": "a verb form used in a clause or as an adjective"
          },
          {
            "id": "p3",
            "word": "subordinate",
            "meaning": "dependent on a main clause"
          },
          {
            "id": "p4",
            "word": "logical",
            "meaning": "following sound reasoning"
          },
          {
            "id": "p5",
            "word": "modify",
            "meaning": "change or describe something"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "concessive",
            "meaning": "expressing contrast with an expectation"
          },
          {
            "word": "participle",
            "meaning": "a verb form used in a clause or as an adjective"
          },
          {
            "word": "subordinate",
            "meaning": "dependent on a main clause"
          },
          {
            "word": "logical",
            "meaning": "following sound reasoning"
          },
          {
            "word": "modify",
            "meaning": "change or describe something"
          },
          {
            "word": "refer",
            "meaning": "point to a person or idea"
          },
          {
            "word": "clarity",
            "meaning": "ease of understanding"
          },
          {
            "word": "vary",
            "meaning": "use different forms"
          },
          {
            "word": "succinct",
            "meaning": "expressed briefly and clearly"
          },
          {
            "word": "ambiguity",
            "meaning": "having more than one possible meaning"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "concessive",
            "options": [
              "expressing contrast with an expectation",
              "following sound reasoning",
              "use different forms"
            ]
          },
          {
            "id": "q2",
            "word": "participle",
            "options": [
              "expressed briefly and clearly",
              "a verb form used in a clause or as an adjective",
              "change or describe something"
            ]
          },
          {
            "id": "q3",
            "word": "subordinate",
            "options": [
              "dependent on a main clause",
              "having more than one possible meaning",
              "point to a person or idea"
            ]
          },
          {
            "id": "q4",
            "word": "logical",
            "options": [
              "following sound reasoning",
              "ease of understanding",
              "expressing contrast with an expectation"
            ]
          },
          {
            "id": "q5",
            "word": "modify",
            "options": [
              "change or describe something",
              "use different forms",
              "a verb form used in a clause or as an adjective"
            ]
          },
          {
            "id": "q6",
            "word": "refer",
            "options": [
              "point to a person or idea",
              "expressed briefly and clearly",
              "dependent on a main clause"
            ]
          },
          {
            "id": "q7",
            "word": "clarity",
            "options": [
              "ease of understanding",
              "having more than one possible meaning",
              "following sound reasoning"
            ]
          },
          {
            "id": "q8",
            "word": "vary",
            "options": [
              "use different forms",
              "change or describe something",
              "expressing contrast with an expectation"
            ]
          },
          {
            "id": "q9",
            "word": "succinct",
            "options": [
              "expressed briefly and clearly",
              "point to a person or idea",
              "a verb form used in a clause or as an adjective"
            ]
          },
          {
            "id": "q10",
            "word": "ambiguity",
            "options": [
              "having more than one possible meaning",
              "dependent on a main clause",
              "ease of understanding"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Use a participle clause",
            "sentence": "Having considered the evidence, the council revised its policy.",
            "words": [
              "Having",
              "evidence,",
              "its",
              "the",
              "the",
              "considered",
              "revised",
              "policy.",
              "council"
            ]
          },
          {
            "id": "s2",
            "hint": "Use concession",
            "sentence": "Although the proposal is ambitious, it remains financially viable.",
            "words": [
              "Although",
              "financially",
              "it",
              "ambitious,",
              "viable.",
              "is",
              "proposal",
              "the",
              "remains"
            ]
          },
          {
            "id": "s3",
            "hint": "Use a relative clause",
            "sentence": "The initiative, which targets rural areas, could improve access.",
            "words": [
              "could",
              "initiative,",
              "targets",
              "access.",
              "The",
              "rural",
              "which",
              "improve",
              "areas,"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-speaking-discussion",
    "stage": "B2-C1",
    "title": "Speaking Part 3: nuanced discussion",
    "summary": "Part 3 requires extended discussion of abstract ideas related to Part 2.\nState a view, explain a mechanism and illustrate it with an example.\nQualify generalisations: in many cases, to some extent, depending on context.\nIf you need time, paraphrase the question naturally rather than reciting a filler.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “Speaking Part 3: nuanced discussion”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "Part 3 mainly tests discussion of ___.",
        "options": [
          "your passport number",
          "broader and more abstract ideas",
          "only yesterday’s breakfast",
          "a memorised story only"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "To qualify a generalisation, use ___.",
        "options": [
          "In many cases",
          "Always without exception",
          "Everyone agrees entirely",
          "It is impossible to differ"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A developed answer should include ___.",
        "options": [
          "only a yes/no response",
          "unrelated idioms",
          "an explanation and relevant example",
          "an essay read from a page"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A nuanced view ___.",
        "options": [
          "has no clear position",
          "uses the rarest possible words",
          "ignores all exceptions",
          "recognises relevant differences and limits"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which is an appropriate cautious phrase?",
        "options": [
          "All people never differ.",
          "To some extent",
          "Definitely always every person",
          "Obviously nobody can disagree"
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 9,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "nuanced",
            "meaning": "recognising subtle differences"
          },
          {
            "id": "p2",
            "word": "perspective",
            "meaning": "a way of looking at an issue"
          },
          {
            "id": "p3",
            "word": "to some extent",
            "meaning": "partly but not completely"
          },
          {
            "id": "p4",
            "word": "in many cases",
            "meaning": "often but not universally"
          },
          {
            "id": "p5",
            "word": "underlying",
            "meaning": "existing beneath the obvious surface"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "nuanced",
            "meaning": "recognising subtle differences"
          },
          {
            "word": "perspective",
            "meaning": "a way of looking at an issue"
          },
          {
            "word": "to some extent",
            "meaning": "partly but not completely"
          },
          {
            "word": "in many cases",
            "meaning": "often but not universally"
          },
          {
            "word": "underlying",
            "meaning": "existing beneath the obvious surface"
          },
          {
            "word": "mechanism",
            "meaning": "the way something works"
          },
          {
            "word": "generalisation",
            "meaning": "a broad statement about a group"
          },
          {
            "word": "illustrate",
            "meaning": "explain through an example"
          },
          {
            "word": "context",
            "meaning": "the circumstances of an issue"
          },
          {
            "word": "implication",
            "meaning": "a possible consequence"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "nuanced",
            "options": [
              "recognising subtle differences",
              "often but not universally",
              "explain through an example"
            ]
          },
          {
            "id": "q2",
            "word": "perspective",
            "options": [
              "existing beneath the obvious surface",
              "the circumstances of an issue",
              "a way of looking at an issue"
            ]
          },
          {
            "id": "q3",
            "word": "to some extent",
            "options": [
              "a possible consequence",
              "partly but not completely",
              "the way something works"
            ]
          },
          {
            "id": "q4",
            "word": "in many cases",
            "options": [
              "recognising subtle differences",
              "often but not universally",
              "a broad statement about a group"
            ]
          },
          {
            "id": "q5",
            "word": "underlying",
            "options": [
              "existing beneath the obvious surface",
              "explain through an example",
              "a way of looking at an issue"
            ]
          },
          {
            "id": "q6",
            "word": "mechanism",
            "options": [
              "the circumstances of an issue",
              "partly but not completely",
              "the way something works"
            ]
          },
          {
            "id": "q7",
            "word": "generalisation",
            "options": [
              "often but not universally",
              "a possible consequence",
              "a broad statement about a group"
            ]
          },
          {
            "id": "q8",
            "word": "illustrate",
            "options": [
              "recognising subtle differences",
              "explain through an example",
              "existing beneath the obvious surface"
            ]
          },
          {
            "id": "q9",
            "word": "context",
            "options": [
              "a way of looking at an issue",
              "the circumstances of an issue",
              "the way something works"
            ]
          },
          {
            "id": "q10",
            "word": "implication",
            "options": [
              "a broad statement about a group",
              "partly but not completely",
              "a possible consequence"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Qualify a view",
            "sentence": "To some extent, technology has changed how people communicate.",
            "words": [
              "how",
              "To",
              "extent,",
              "communicate.",
              "changed",
              "has",
              "some",
              "people",
              "technology"
            ]
          },
          {
            "id": "s2",
            "hint": "Explain a mechanism",
            "sentence": "One underlying reason is the growing demand for flexibility.",
            "words": [
              "demand",
              "reason",
              "for",
              "growing",
              "flexibility.",
              "the",
              "underlying",
              "One",
              "is"
            ]
          },
          {
            "id": "s3",
            "hint": "Recognise context",
            "sentence": "The impact depends largely on the local social context.",
            "words": [
              "the",
              "on",
              "impact",
              "depends",
              "context.",
              "The",
              "local",
              "largely",
              "social"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "b2-c1-editing-precision",
    "stage": "B2-C1",
    "title": "C1 editing: precision, concision and accuracy",
    "summary": "Revise for task response, paragraph logic, precise vocabulary and grammatical control.\nRemove redundant phrases and unsupported absolute claims.\nCheck articles, agreement, reference words and punctuation in your final review.\nA clear, accurate sentence is stronger than a long sentence with avoidable errors.",
    "ai_prompt": "Act as a supportive IELTS tutor for a B2 to C1 learner studying “C1 editing: precision, concision and accuracy”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.",
    "questions": [
      {
        "type": "multiple-choice",
        "prompt": "An effective final review checks ___.",
        "options": [
          "only essay length",
          "meaning, logic and language accuracy",
          "only rare vocabulary",
          "only the introduction"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "A redundant phrase ___.",
        "options": [
          "repeats information unnecessarily",
          "always adds evidence",
          "must stay in every paragraph",
          "is a required idiom"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Which wording is more concise?",
        "options": [
          "Due to the fact that",
          "In view of the fact that",
          "Because",
          "For the reason that it is"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "An absolute claim should be ___.",
        "options": [
          "made without evidence",
          "used in every sentence",
          "longer than an example",
          "qualified when evidence is limited"
        ]
      },
      {
        "type": "multiple-choice",
        "prompt": "Choose the accurate agreement.",
        "options": [
          "The evidence show a pattern.",
          "The evidence shows a pattern.",
          "The evidences shows a pattern.",
          "The evidence are show a pattern."
        ]
      }
    ],
    "reward_coins": 50,
    "order_index": 10,
    "game_data": {
      "version": 1,
      "word_match": {
        "pairs": [
          {
            "id": "p1",
            "word": "redundant",
            "meaning": "unnecessarily repetitive"
          },
          {
            "id": "p2",
            "word": "concise",
            "meaning": "brief and clear"
          },
          {
            "id": "p3",
            "word": "precise",
            "meaning": "exact in meaning"
          },
          {
            "id": "p4",
            "word": "revise",
            "meaning": "review and improve a text"
          },
          {
            "id": "p5",
            "word": "proofread",
            "meaning": "check a text for errors"
          }
        ]
      },
      "speed_vocabulary": {
        "duration_seconds": 60,
        "glossary": [
          {
            "word": "redundant",
            "meaning": "unnecessarily repetitive"
          },
          {
            "word": "concise",
            "meaning": "brief and clear"
          },
          {
            "word": "precise",
            "meaning": "exact in meaning"
          },
          {
            "word": "revise",
            "meaning": "review and improve a text"
          },
          {
            "word": "proofread",
            "meaning": "check a text for errors"
          },
          {
            "word": "consistency",
            "meaning": "agreement throughout a text"
          },
          {
            "word": "ambiguity",
            "meaning": "more than one possible meaning"
          },
          {
            "word": "coherent",
            "meaning": "logically connected"
          },
          {
            "word": "substantiate",
            "meaning": "support a claim with evidence"
          },
          {
            "word": "qualify",
            "meaning": "limit the strength of a claim"
          }
        ],
        "questions": [
          {
            "id": "q1",
            "word": "redundant",
            "options": [
              "logically connected",
              "unnecessarily repetitive",
              "review and improve a text"
            ]
          },
          {
            "id": "q2",
            "word": "concise",
            "options": [
              "check a text for errors",
              "support a claim with evidence",
              "brief and clear"
            ]
          },
          {
            "id": "q3",
            "word": "precise",
            "options": [
              "limit the strength of a claim",
              "agreement throughout a text",
              "exact in meaning"
            ]
          },
          {
            "id": "q4",
            "word": "revise",
            "options": [
              "unnecessarily repetitive",
              "review and improve a text",
              "more than one possible meaning"
            ]
          },
          {
            "id": "q5",
            "word": "proofread",
            "options": [
              "check a text for errors",
              "logically connected",
              "brief and clear"
            ]
          },
          {
            "id": "q6",
            "word": "consistency",
            "options": [
              "agreement throughout a text",
              "exact in meaning",
              "support a claim with evidence"
            ]
          },
          {
            "id": "q7",
            "word": "ambiguity",
            "options": [
              "limit the strength of a claim",
              "more than one possible meaning",
              "review and improve a text"
            ]
          },
          {
            "id": "q8",
            "word": "coherent",
            "options": [
              "logically connected",
              "unnecessarily repetitive",
              "check a text for errors"
            ]
          },
          {
            "id": "q9",
            "word": "substantiate",
            "options": [
              "support a claim with evidence",
              "brief and clear",
              "agreement throughout a text"
            ]
          },
          {
            "id": "q10",
            "word": "qualify",
            "options": [
              "more than one possible meaning",
              "limit the strength of a claim",
              "exact in meaning"
            ]
          }
        ]
      },
      "sentence_scramble": {
        "sentences": [
          {
            "id": "s1",
            "hint": "Check agreement",
            "sentence": "The evidence shows a consistent pattern across the groups.",
            "words": [
              "shows",
              "pattern",
              "groups.",
              "the",
              "evidence",
              "consistent",
              "across",
              "The",
              "a"
            ]
          },
          {
            "id": "s2",
            "hint": "Make a cautious claim",
            "sentence": "These findings may have important implications for education.",
            "words": [
              "important",
              "education.",
              "for",
              "findings",
              "have",
              "These",
              "implications",
              "may"
            ]
          },
          {
            "id": "s3",
            "hint": "Remove repetition",
            "sentence": "Clear writing communicates complex ideas with precision.",
            "words": [
              "precision.",
              "with",
              "ideas",
              "communicates",
              "complex",
              "writing",
              "Clear"
            ]
          }
        ]
      }
    }
  }
];
});

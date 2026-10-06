'use strict';
/* Authoritative learning catalogue. The 12 original lesson IDs, quizzes and
 * rewards are preserved; this file adds 28 lessons and games for all 40.
 * Run `npm run seed:roadmap` after editing; --check detects SQL/public drift.
 * This authoring file is NEVER included in the public build (quiz keys). */
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const stages = ['A1-A2', 'A2-B1', 'B1-B2', 'B2-C1'];
const rewards = [10, 20, 35, 50];
const mc = (prompt, options, answer) => ({ question: { type: 'multiple-choice', prompt, options }, answer });
const words = text => text.split('|').map(pair => { const [word, meaning] = pair.split('='); return { word: word.trim(), meaning: meaning.trim() }; });
const lines = text => text.split('|').map(pair => { const [hint, sentence] = pair.split('::'); return { hint: hint.trim(), sentence: sentence.trim() }; });
const old = (id, glossary, sentences) => ({ id, glossary: words(glossary), sentences: lines(sentences) });
const lesson = (id, stage, title, summary, quiz, glossary, sentences) => ({ id, stage, title, summary, quiz, glossary: words(glossary), sentences: lines(sentences) });

const catalogue = [
  old('a1-a2-present-simple',
    'routine=a regular habit|usually=on most occasions|attend=go to an event|begin=start|finish=complete|daily=every day|often=many times|rarely=not often|study=learn about a subject|friendly=kind and welcoming',
    'A study routine::I study English every evening.|A third-person routine::The library opens at nine o’clock.|A present simple question::Do you usually walk to college?'),
  old('a1-a2-present-continuous',
    'currently=at the moment|temporary=lasting a short time|listen=pay attention to sound|prepare=get ready|wait=stay until something happens|happen=take place|write=put words on paper|read=look at written words|speak=say words aloud|now=at this time',
    'An action happening now::The students are preparing for their exam.|A negative continuous sentence::She is not working at the moment.|A continuous question::Are you listening to the recording?'),
  old('a1-a2-past-simple',
    'yesterday=the day before today|recently=not long ago|visited=went to see a place|arrived=reached a destination|left=went away|bought=purchased in the past|journey=a trip from one place to another|ago=before the present time|last=the previous one|returned=came back',
    'A completed event::We visited the museum last Saturday.|An irregular past verb::She bought a new dictionary yesterday.|A past question::Did you finish your homework on time?'),
  lesson('a1-a2-future-plans', 'A1-A2', 'Future plans: going to and will',
    'Use be going to + verb for a plan you have already made.\nUse will + verb for a decision made now or a prediction.\nSay: I am going to revise tonight. / I will help you.\nIn Speaking Part 1, give a plan and one short reason.', [
      mc('I have booked my ticket. I ___ travel tomorrow.', ['am going to', 'went to', 'going', 'was'], 0),
      mc('The phone is ringing. I ___ answer it!', ['answered', 'am', 'will', 'going'], 2),
      mc('Choose the correct plan.', ['She going study.', 'She is going to study.', 'She will studying.', 'She goes to studied.'], 1),
      mc('Which phrase introduces a future time?', ['Last week', 'Yesterday', 'Two days ago', 'Next month'], 3),
      mc('Complete: They are going to ___ a course.', ['taking', 'took', 'take', 'takes'], 2)
    ], 'plan=something you intend to do|predict=say what may happen|tomorrow=the day after today|book=reserve in advance|intend=plan to do something|future=time that has not happened yet|decide=make a choice|promise=say you will certainly do something|soon=in a short time|revise=study something again',
    'An arranged plan::I am going to take an English course.|A promise::I will help you with your homework.|A future question::Are you going to study abroad?'),
  lesson('a1-a2-everyday-vocabulary', 'A1-A2', 'Everyday words: home, study and work',
    'Learn words in useful groups: home, education and work.\nA timetable shows when lessons start; a colleague works with you.\nUse a word in a whole sentence, not only in a translation.\nFor Speaking Part 1: describe your home, studies or job in two sentences.', [
      mc('A person who works with you is a ___.', ['tourist', 'colleague', 'passenger', 'neighbourhood'], 1),
      mc('Where can you borrow books?', ['A pharmacy', 'A factory', 'A library', 'A platform'], 2),
      mc('A timetable tells you ___.', ['when activities happen', 'how much a room costs', 'who owns a car', 'why food is fresh'], 0),
      mc('Choose the natural phrase.', ['do a job to school', 'make to homework', 'go work at homework', 'do homework'], 3),
      mc('A neighbourhood is ___.', ['a school subject', 'a local area', 'a train ticket', 'a daily meal'], 1)
    ], 'colleague=a person you work with|library=a place to borrow books|timetable=a schedule of activities|neighbourhood=a local area|occupation=a job or profession|homework=study tasks done outside class|commute=travel regularly to work|kitchen=a room for preparing food|subject=an area of study|break=a short rest',
    'Describe your neighbourhood::My neighbourhood has a small public library.|Describe a work routine::I travel to work by bus every morning.|Describe a study habit::We do our homework after dinner.'),
  lesson('a1-a2-questions-and-negatives', 'A1-A2', 'Questions and negatives',
    'Use do / does with present simple questions and did with past simple.\nAfter does or did, keep the main verb in its base form.\nUse what, where, when, who, why and how to request information.\nExample: Where does she live? / She does not live here.', [
      mc('___ does the course start? At nine.', ['Who', 'When', 'Why', 'How many'], 1),
      mc('Choose the correct question.', ['Where does he live?', 'Where does he lives?', 'Where he does live?', 'Where do he live?'], 0),
      mc('They ___ go to class yesterday.', ['does not', 'are not', 'did not', 'has not'], 2),
      mc('How ___ does this book cost?', ['many', 'old', 'often', 'much'], 3),
      mc('After did, use ___.', ['a past form', 'the base verb', 'verb-ing', 'a plural noun'], 1)
    ], 'where=in which place|when=at what time|why=for what reason|who=which person|how=in what way|question=a request for information|answer=a reply to a question|negative=saying that something is not true|information=facts about something|cost=the price of something',
    'Ask about a location::Where does your brother live?|Make a past negative::They did not attend the lesson yesterday.|Ask about frequency::How often do you practise English?'),
  lesson('a1-a2-countable-nouns', 'A1-A2', 'Countable nouns and quantities',
    'Countable nouns have singular and plural forms: a book / two books.\nUncountable nouns include water, information and advice.\nUse many with countable nouns and much with uncountable nouns.\nUse some in positive statements and any in most questions and negatives.', [
      mc('Which noun is uncountable?', ['Chair', 'Student', 'Information', 'Ticket'], 2),
      mc('There are ___ students in the classroom.', ['many', 'much', 'a little', 'an'], 0),
      mc('How ___ water do you drink?', ['many', 'a few', 'any', 'much'], 3),
      mc('Choose the correct phrase.', ['an advice', 'a piece of advice', 'three advices', 'many advice'], 1),
      mc('We do not have ___ milk.', ['some', 'a', 'any', 'many'], 2)
    ], 'quantity=an amount of something|several=more than two but not many|plenty=more than enough|advice=a suggestion about what to do|countable=able to be counted|amount=how much there is|bottle=a container for liquids|piece=a single part of something|enough=as much as needed|few=a small number',
    'Use much with water::How much water do you need?|Use many with books::There are many books in the library.|Use a quantity with advice::The tutor gave me a piece of advice.'),
  lesson('a1-a2-prepositions-directions', 'A1-A2', 'Prepositions, places and directions',
    'Use at for points and times, on for days and surfaces, in for enclosed places and months.\nDirections use turn left, go straight and opposite.\nIn Listening map tasks, follow landmarks instead of guessing.\nExample: The bank is opposite the library. Meet me at six on Monday.', [
      mc('The lesson starts ___ six o’clock.', ['on', 'at', 'in', 'by in'], 1),
      mc('We study ___ Monday.', ['on', 'in', 'at', 'into'], 0),
      mc('Opposite means ___.', ['inside', 'above', 'across from', 'behind and inside'], 2),
      mc('Choose a direction.', ['At Tuesday', 'In six', 'On the water', 'Turn left'], 3),
      mc('The books are ___ the table.', ['at', 'on', 'during', 'until'], 1)
    ], 'opposite=across from|near=not far from|behind=at the back of|between=in the space separating two things|straight=without turning|junction=a place where roads meet|entrance=a way into a place|exit=a way out of a place|beside=next to|landmark=an easily recognised place',
    'Give a location::The bank is opposite the public library.|Give a direction::Turn left at the next junction.|Use a time preposition::The English lesson starts at six.'),
  lesson('a1-a2-listening-numbers', 'A1-A2', 'Listening basics: numbers, dates and spelling',
    'Before a recording, predict whether the gap needs a number, date or name.\nDistinguish thirteen and thirty; listen to the stressed syllable.\nA speaker may correct a detail: Tuesday—sorry, Thursday. Keep the final answer.\nWrite within the question’s word limit and check spelling.', [
      mc('“Tuesday—sorry, Thursday.” Which day should you write?', ['Tuesday', 'Both days', 'Thursday', 'Monday'], 2),
      mc('Before a recording, first ___.', ['predict the answer type', 'write any number', 'ignore the questions', 'translate every word'], 0),
      mc('A phone number gap usually needs ___.', ['an essay', 'a verb tense', 'an opinion', 'digits'], 3),
      mc('NO MORE THAN TWO WORDS allows ___.', ['three words', 'one or two words', 'a paragraph', 'any number of words'], 1),
      mc('Which is a date?', ['Library', 'Room B', '15 June', 'Friendly'], 2)
    ], 'digit=a symbol from zero to nine|spell=say the letters of a word|surname=a family name|date=a day of a month and year|correct=change a mistake to the right answer|recording=stored sound|detail=a small piece of information|stress=emphasis on a syllable|deadline=the latest time to finish|postcode=a code for a postal area',
    'Listen for a corrected detail::The appointment is on Thursday afternoon.|Describe an answer type::This gap needs a number or a date.|Ask for spelling::Could you spell your surname please?'),
  lesson('a1-a2-speaking-daily-life', 'A1-A2', 'Speaking Part 1: daily life',
    'Give a direct answer, then add a reason or a small example.\nUse natural everyday words about hobbies, family and routines.\nAvoid memorised speeches; two or three clear sentences are enough.\nExample: I enjoy walking because it helps me relax after class.', [
      mc('A useful Part 1 answer includes ___.', ['only yes', 'a direct answer and a reason', 'a memorised essay', 'unrelated facts'], 1),
      mc('Choose the natural answer to “What do you enjoy?”', ['I enjoyable read.', 'I enjoy to reading.', 'I enjoy reading.', 'I enjoy reads.'], 2),
      mc('Which word introduces a reason?', ['Because', 'Yesterday', 'Beside', 'Whose'], 0),
      mc('Speaking Part 1 usually covers ___.', ['only technical research', 'only maps', 'only economic policy', 'familiar personal topics'], 3),
      mc('Which sentence adds an example?', ['Yes.', 'For example, I walk in the park.', 'I do.', 'No.'], 1)
    ], 'hobby=an activity you enjoy in free time|relax=become less tense|prefer=like one thing more than another|familiar=well known to you|reason=an explanation for something|example=a case that illustrates an idea|leisure=free time|enjoy=take pleasure in|routine=something you do regularly|local=connected to a nearby area',
    'Give a preference and reason::I prefer walking because it helps me relax.|Give an everyday example::For example, I visit the park on Sundays.|Describe a hobby::Reading is my favourite free time activity.'),

  old('a2-b1-present-perfect',
    'experience=something you have lived through|already=before this time|yet=up to now in questions or negatives|ever=at any time|never=not at any time|since=from a specific past time|recent=having happened not long ago|achievement=something successfully completed|abroad=in another country|lately=in the recent past',
    'An experience without a finished time::I have visited several countries.|A completed event with a time::She moved to London last year.|An unfinished period::We have studied English since September.'),
  old('a2-b1-passive-voice',
    'produce=make or manufacture|deliver=take something to a destination|publish=make writing publicly available|build=construct|discover=find something for the first time|agent=the person who performs an action|process=a series of actions|manufacture=make goods in a factory|receive=get something|invent=create something new',
    'A present passive::English is spoken in many countries.|A past passive::The bridge was built in 1998.|A future passive::The results will be published next week.'),
  old('a2-b1-first-conditional',
    'unless=if not|provided=on the condition that|likely=probable|result=an outcome|improve=become better|condition=a requirement for something|future=time ahead of the present|possible=able to happen|prepare=make ready|succeed=achieve a desired aim',
    'A real future possibility::If I study regularly, I will improve.|A future time clause::We will start when everyone arrives.|A negative condition::Unless it rains, we will walk to college.'),
  lesson('a2-b1-articles', 'A2-B1', 'Articles: a, an, the and no article',
    'Use a/an for one nonspecific singular countable noun. Choose an before a vowel sound.\nUse the when a reader or listener knows which item you mean.\nUse no article for general plural nouns or general uncountable nouns.\nExample: I bought a book. The book is useful. Education matters.', [
      mc('She is ___ honest person.', ['a', 'the', 'an', 'no article'], 2),
      mc('___ education is important in general.', ['No article', 'An', 'A', 'These'], 0),
      mc('I saw a film. ___ film was excellent.', ['A', 'An', 'Some', 'The'], 3),
      mc('Choose the correct phrase.', ['an university', 'a university', 'a information', 'an useful book'], 1),
      mc('Use the when the item is ___.', ['always plural', 'always abstract', 'specific or already known', 'mentioned for no reason'], 2)
    ], 'specific=clearly identified|general=not limited to one example|refer=mention or point to|identify=recognise what something is|unique=the only one of its kind|singular=referring to one|plural=referring to more than one|vowel=a speech sound with an open mouth|context=the surrounding situation|mention=refer to briefly',
    'Introduce and identify a noun::I bought a book and the book was useful.|A general plural statement::Students need regular opportunities to practise.|A vowel sound::She gave an honest answer to the question.'),
  lesson('a2-b1-linkers', 'A2-B1', 'Linking ideas: cause, contrast and result',
    'Use because to give a reason and so to introduce a result.\nUse although or but for contrast; however normally links complete sentences.\nUse and or also to add information without overusing them.\nPunctuation matters: The course is useful; however, it is expensive.', [
      mc('I stayed home ___ I was ill.', ['however', 'because', 'although', 'despite'], 1),
      mc('___ it was raining, we went out.', ['Although', 'Because of', 'Therefore', 'So that'], 0),
      mc('The bus was late, ___ I missed class.', ['although', 'despite', 'so', 'because of'], 2),
      mc('However usually expresses ___.', ['time', 'addition', 'purpose only', 'contrast'], 3),
      mc('Choose the correct structure.', ['Despite she was tired', 'Although she was tired', 'Because of she was tired', 'However she was tired so'], 1)
    ], 'therefore=as a result|however=used to introduce contrast|although=despite the fact that|because=for the reason that|moreover=in addition|contrast=a clear difference|cause=a reason something happens|consequence=a result of an action|addition=another piece of information|purpose=an aim or intention',
    'Express a reason::I study every day because I want to improve.|Express contrast::Although the course is challenging, it is useful.|Express a result::The bus was late, so I missed the lesson.'),
  lesson('a2-b1-comparisons', 'A2-B1', 'Comparatives and superlatives',
    'Use -er for many short adjectives and more for longer ones.\nUse than to compare two things and the -est / the most for a group.\nIrregular forms include good → better → best.\nTask 1 comparisons must reflect the data, not your personal opinions.', [
      mc('This course is ___ than the old one.', ['usefulest', 'more useful', 'most useful', 'usefuller'], 1),
      mc('The comparative of good is ___.', ['gooder', 'best', 'better', 'more best'], 2),
      mc('It is ___ largest city in the region.', ['the', 'a', 'an', 'no article'], 0),
      mc('Choose the correct comparison.', ['Higher as', 'More high than', 'Highest than', 'Higher than'], 3),
      mc('As expensive as expresses ___.', ['a decrease', 'equality', 'a superlative', 'a past event'], 1)
    ], 'higher=greater in level|lower=smaller in level|similar=almost the same|different=not the same|equal=the same in amount|compare=examine similarities and differences|cheaper=costing less money|largest=greatest in size|whereas=in contrast with|slightly=by a small amount',
    'Compare two cities::London is larger than my home town.|Describe equality::This course is as useful as the previous one.|Describe a superlative::It is the most popular subject at college.'),
  lesson('a2-b1-modals-advice', 'A2-B1', 'Modals: ability, advice and obligation',
    'Can expresses ability; should offers advice; must or have to expresses obligation.\nPut the base verb after a modal: should revise, not should to revise.\nMust not means prohibition; do not have to means no necessity.\nUse polite could questions when requesting help in everyday situations.', [
      mc('For friendly advice, use ___.', ['must not', 'should', 'cannot', 'did'], 1),
      mc('You ___ bring a passport; it is required.', ['must', 'might not', 'can sometimes', 'would like'], 0),
      mc('Choose the correct phrase.', ['should to study', 'should studying', 'should study', 'should studies'], 2),
      mc('Do not have to means ___.', ['it is forbidden', 'it is impossible', 'it is compulsory', 'it is not necessary'], 3),
      mc('Which is a polite request?', ['You giving me help.', 'Could you help me?', 'Must help you?', 'You help must.'], 1)
    ], 'ability=the power to do something|obligation=something you must do|advice=a recommendation|permission=being allowed to do something|prohibit=officially forbid|necessary=needed or required|compulsory=required by a rule|optional=not required|polite=showing respect for others|request=ask for something',
    'Give advice::You should revise new vocabulary every day.|Express a requirement::Candidates must bring valid identification.|Make a polite request::Could you explain this question to me?'),
  lesson('a2-b1-preintermediate-vocabulary', 'A2-B1', 'Pre-intermediate vocabulary: travel and services',
    'Build useful travel and service vocabulary through word partnerships.\nMake a reservation, catch a train, ask for a refund and pay a fee.\nIn IELTS Listening Part 1, expect bookings, prices, facilities and schedules.\nKeep a notebook of words together with their common verb or adjective.', [
      mc('A reservation is ___.', ['a complaint only', 'a delay', 'an advance booking', 'a departure gate'], 2),
      mc('Choose the natural phrase.', ['Catch a train', 'Do a train', 'Make a train journey ticket', 'Take a refund price'], 0),
      mc('Money returned to a customer is a ___.', ['facility', 'farewell', 'platform', 'refund'], 3),
      mc('A fee is ___.', ['a travel document', 'a charge for a service', 'a hotel room', 'a weather report'], 1),
      mc('Facilities are ___.', ['past journeys', 'spelling errors', 'available services or equipment', 'only train delays'], 2)
    ], 'reservation=an advance booking|refund=money returned to a customer|fee=a charge for a service|facility=available equipment or a service|departure=the act of leaving|arrival=the act of reaching a place|accommodation=a place to stay|destination=the place you are travelling to|delay=being later than expected|fare=the price of a journey',
    'Ask about a booking::I would like to make a reservation.|Describe a travel problem::Our train was delayed by thirty minutes.|Ask about facilities::Does the accommodation have a study room?'),
  lesson('a2-b1-listening-distractors', 'A2-B1', 'Listening: distractors and note completion',
    'A distractor is a plausible detail that is not the final answer.\nListen for corrections, contrast words and changed decisions.\nPredict a noun, verb or number from the grammar around a gap.\nCheck the word limit, plural endings and spelling before moving on.', [
      mc('“It was £40, but now it costs £35.” What is the current price?', ['£40', '£35', '£75', '£5'], 1),
      mc('In “two ___”, the gap probably needs ___.', ['a plural countable noun', 'a singular article', 'a whole essay', 'a contrast linker'], 0),
      mc('A distractor is ___.', ['always the correct answer', 'background music only', 'a plausible but incorrect detail', 'a word limit'], 2),
      mc('“Actually” can signal ___.', ['a spelling test only', 'the end of all recordings', 'a map north point', 'a correction'], 3),
      mc('When you miss an answer, you should ___.', ['stop reading all questions', 'move on and stay with the recording', 'write many unrelated words', 'replay a live exam recording'], 1)
    ], 'distractor=a plausible but incorrect detail|correction=a change that fixes an error|actually=in fact or as a correction|instead=in place of something else|confirm=check that something is correct|note=a short written record|plural=more than one|predict=anticipate what is likely|limit=a maximum allowed amount|focus=direct your attention',
    'Listen for a correction::The meeting is on Friday not Thursday.|Use grammar to predict::This gap probably needs a plural noun.|Explain a changed plan::We chose the afternoon session instead.'),

  lesson('a2-b1-gerunds-infinitives', 'A2-B1', 'Gerunds, infinitives and verb patterns',
    'Use -ing after enjoy, avoid and finish: I enjoy reading.\nUse to + base verb after want, hope and decide: I hope to study abroad.\nAfter a preposition, use -ing: interested in learning.\nRecord the verb together with its pattern to build natural sentences.', [
      mc('I enjoy ___ new languages.', ['to learn', 'learning', 'learn', 'learns'], 1),
      mc('She hopes ___ abroad.', ['to study', 'studying', 'study', 'studied'], 0),
      mc('After a preposition, usually use ___.', ['a bare infinitive only', 'a past tense only', 'the -ing form', 'will plus a verb'], 2),
      mc('Choose the correct phrase.', ['avoid to drive', 'want studying', 'finish to read', 'avoid driving'], 3),
      mc('They decided ___ a course.', ['joining', 'to join', 'join', 'joins'], 1)
    ], 'enjoy=take pleasure in|avoid=keep away from|hope=want something to happen|decide=make a choice|aim=try to achieve|consider=think carefully about|manage=succeed in doing something|finish=complete an activity|interested=wanting to know more|intend=plan to do something',
    'Use a gerund::I enjoy learning new words every day.|Use an infinitive::She hopes to study at a British university.|Use a preposition and gerund::They are interested in improving their English.'),

  old('b1-b2-conditionals-modals',
    'hypothetical=imagined rather than real|regret=sadness about a past choice|possibility=something that might happen|deduce=reach a conclusion from evidence|certainty=being sure about something|outcome=the final result|alternative=another available choice|unlikely=not probable|assume=accept something without proof|consequence=a resulting effect',
    'An unreal present condition::If I had more time, I would study abroad.|An unreal past condition::If she had revised, she would have passed.|A deduction about the past::He must have missed the early train.'),
  old('b1-b2-relative-clauses',
    'define=explain exactly what something is|essential=absolutely necessary|additional=extra or supplementary|referent=the thing a word refers to|clause=a group of words with a subject and verb|restrict=limit the range of something|combine=join together|specify=state clearly and precisely|omit=leave out|punctuation=marks used in writing',
    'Define a person::Students who practise regularly usually make progress.|Add non-defining information::The library, which opened recently, is very popular.|Use a place relative::This is the college where I studied English.'),
  old('b1-b2-cohesion-coherence',
    'cohesion=connections made through language|coherence=logical organisation of ideas|linker=a word that connects ideas|reference=pointing back to another idea|paragraph=a group of related sentences|contrast=a difference between ideas|consequently=as a result|furthermore=in addition|sequence=an ordered series|unity=focus on one central idea',
    'Write a topic sentence::Public transport can make city travel more affordable.|Show a contrast::However, some rural areas have limited services.|Draw a conclusion::Consequently, investment in reliable routes is essential.'),
  lesson('b1-b2-awl-research', 'B1-B2', 'Academic Word List: research and evidence',
    'Use AWL words to report research accurately: analyse, assess, evidence, method and significant.\nEvidence supports a claim; a method explains how information was collected.\nSignificant can mean important, but statistical significance has a specific technical meaning.\nUse academic vocabulary only when its meaning fits the sentence.', [
      mc('Evidence is ___.', ['an unsupported opinion', 'information that supports a claim', 'always a personal story', 'a transition word'], 1),
      mc('To analyse data means to ___.', ['examine it systematically', 'copy it without reading', 'remove every detail', 'guess a result'], 0),
      mc('A research method describes ___.', ['the essay title only', 'the author’s hobbies', 'how a study was carried out', 'a conclusion with no evidence'], 2),
      mc('Choose the most appropriate phrase.', ['Do a significant to', 'Evidence are a people', 'Analyse of strongly', 'Assess the evidence'], 3),
      mc('Academic vocabulary should be ___.', ['as rare as possible', 'accurate and appropriate', 'used in every single word', 'unrelated to the topic'], 1)
    ], 'analyse=examine systematically|assess=evaluate carefully|evidence=information supporting a claim|method=a way of doing something|significant=important or meaningful|data=collected facts or measurements|indicate=show or suggest|research=a systematic investigation|factor=an element influencing a result|derive=obtain from a source',
    'Report evidence::Researchers analyse data to identify significant patterns.|Describe a method::The study used a survey to collect evidence.|Assess a claim::Several factors may influence the final outcome.'),
  lesson('b1-b2-awl-society', 'B1-B2', 'Academic Word List: education and society',
    'Practise access, benefit, policy, sector, resource and sustainable in common IELTS topics.\nUse verb–noun partnerships: allocate resources, implement policy, improve access.\nExplain a word in context rather than replacing every simple word with a long one.\nExample: Public funding can improve access to higher education.', [
      mc('Allocate resources means ___.', ['ignore available funding', 'copy a policy', 'distribute available supplies or money', 'close every school'], 2),
      mc('Choose the natural collocation.', ['Implement a policy', 'Invent access to a policy', 'Do sector resources', 'Make sustainable into'], 0),
      mc('A benefit is ___.', ['a barrier only', 'a financial penalty', 'a spelling correction', 'an advantage'], 3),
      mc('Access to education means ___.', ['an examination essay', 'the opportunity to receive education', 'only private tuition', 'a school building number'], 1),
      mc('Sustainable means ___.', ['impossible to maintain', 'brief and temporary only', 'able to continue without exhausting resources', 'unplanned'], 2)
    ], 'access=the opportunity to use something|benefit=an advantage|policy=a plan adopted by an organisation|sector=a part of the economy or society|resource=a useful supply or asset|allocate=distribute for a particular purpose|implement=put a plan into action|sustainable=able to continue without exhausting resources|community=a group sharing a place or interest|equity=fairness in treatment and opportunity',
    'Discuss public funding::Governments should allocate resources to public education.|Discuss access::Online courses can improve access to higher education.|Discuss a policy::A sustainable policy benefits the wider community.'),
  lesson('b1-b2-advanced-passive', 'B1-B2', 'Passive voice for processes and reports',
    'Use the passive when the process or result matters more than the agent.\nPresent perfect passive: has/have been + past participle. Modal passive: must be + past participle.\nIn Task 1 processes, sequence stages clearly: First, materials are collected.\nAvoid a passive form when an active sentence is clearer.', [
      mc('The samples ___ analysed already.', ['have be', 'have been', 'has being', 'are been'], 1),
      mc('Choose the modal passive.', ['The data must be checked.', 'The data must checked.', 'The data must checking.', 'The data must been checked.'], 0),
      mc('In a process description, the passive often focuses on ___.', ['personal feelings', 'the reader’s hobbies', 'the stages and materials', 'a memorised conclusion'], 2),
      mc('The report will ___ next week.', ['publish', 'publishing', 'been publishing', 'be published'], 3),
      mc('Which is present perfect passive?', ['They produced paper.', 'Paper has been produced.', 'They have produced paper.', 'Paper is producing itself.'], 1)
    ], 'extract=remove from a source|filter=remove unwanted material|assemble=put parts together|transport=move from one place to another|convert=change into another form|stage=a step in a process|raw=not yet processed|output=the result of production|treat=process with a substance or method|distribute=supply to different places',
    'A present perfect passive::The raw materials have been transported to the factory.|A modal passive::The final product must be checked carefully.|Describe a process stage::After filtration, the water is stored in tanks.'),
  lesson('b1-b2-paraphrasing', 'B1-B2', 'Paraphrasing without changing meaning',
    'A paraphrase preserves the original meaning while changing wording or structure.\nCombine accurate synonyms with word-family or clause changes.\nDo not alter quantities, certainty or the writer’s position.\nOriginal: Car use increased. Paraphrase: There was a rise in car use.', [
      mc('A good paraphrase must preserve ___.', ['every original word', 'the meaning', 'only the length', 'only the punctuation'], 1),
      mc('“There was a rise in sales” paraphrases ___.', ['Sales increased.', 'Sales disappeared.', 'Sales stayed unchanged.', 'Sales were always highest.'], 0),
      mc('Which changes the meaning of “may reduce costs”?', ['Could lower expenses', 'Might cut costs', 'Will eliminate all costs', 'May lower spending'], 2),
      mc('One useful paraphrasing technique is ___.', ['adding unrelated facts', 'reversing the conclusion', 'removing all quantities', 'changing word families'], 3),
      mc('“People use more electricity” can become ___.', ['People use no electricity.', 'Electricity consumption is higher.', 'Electricity never changes.', 'All energy is free.'], 1)
    ], 'increase=a rise|decrease=a reduction|purchase=buy|consume=use up|maintain=keep at the same level|paraphrase=express the same meaning differently|equivalent=equal in meaning or value|accurate=correct and precise|transform=change the form of|preserve=keep something unchanged',
    'Change a verb to a noun::There was a significant rise in electricity consumption.|Use accurate synonyms::Many people purchase goods through online platforms.|Preserve cautious meaning::This policy may reduce household expenses.'),
  lesson('b1-b2-task1-trends', 'B1-B2', 'Academic Task 1: trends and comparisons',
    'Describe the overall pattern before selecting important details.\nUse rose/fell, remained stable, peaked and fluctuated with accurate data.\nUse by for the amount of change and to for the final value.\nTask 1 reports describe the visual information; they do not need personal opinions.', [
      mc('A value moves from 20 to 30. It increased ___ 10.', ['to', 'by', 'at', 'with'], 1),
      mc('An overview should identify ___.', ['the main patterns', 'every number in order', 'your personal preference', 'an invented cause'], 0),
      mc('Fluctuated means ___.', ['stayed perfectly constant', 'only rose', 'rose and fell repeatedly', 'was never measured'], 2),
      mc('The maximum value is a ___.', ['decline', 'plateau only', 'fraction', 'peak'], 3),
      mc('Task 1 should avoid ___.', ['accurate comparisons', 'unsupported personal opinions', 'an overview', 'relevant numbers'], 1)
    ], 'peak=reach the highest point|fluctuate=rise and fall repeatedly|remain stable=stay at the same level|decline=decrease over time|gradual=happening slowly|sharp=large and sudden|proportion=a part of a total|approximately=about but not exactly|plateau=stay flat after a change|overall=considering the whole picture',
    'Describe an increase::The figure rose sharply between 2010 and 2020.|Describe a comparison::Bus travel was more popular than rail travel.|Write an overview::Overall, electricity consumption increased in both countries.'),
  lesson('b1-b2-reading-strategies', 'B1-B2', 'Reading: skimming, scanning and inference',
    'Skim to understand the main idea; scan to locate a specific detail.\nMatch meaning, not only repeated words, because questions often paraphrase the passage.\nFALSE contradicts the text; NOT GIVEN means the text does not settle the claim.\nUse evidence from the passage, not outside knowledge.', [
      mc('Skimming is mainly used to ___.', ['find one phone number', 'understand the general idea', 'translate every word', 'memorise punctuation'], 1),
      mc('Scanning helps you ___.', ['locate a specific detail', 'write a full essay', 'invent a main idea', 'ignore dates'], 0),
      mc('NOT GIVEN means ___.', ['the statement is always false', 'the author disagrees explicitly', 'the text does not provide enough information', 'you personally disagree'], 2),
      mc('Answers should be based on ___.', ['your general knowledge alone', 'the longest option', 'repeated words alone', 'evidence in the passage'], 3),
      mc('An inference is ___.', ['a copied title only', 'a conclusion supported by clues', 'an unrelated assumption', 'a spelling rule'], 1)
    ], 'skim=read quickly for the main idea|scan=look quickly for specific information|infer=reach a conclusion from clues|contradict=state the opposite of|explicit=clearly stated|implicit=suggested rather than directly stated|claim=a statement presented as true|locate=find the position of|heading=a title for a section|evidence=information supporting an answer',
    'Describe skimming::Skimming helps readers identify the main idea quickly.|Describe evidence::The statement is contradicted by the final paragraph.|Describe an inference::This conclusion is supported by several clues.'),

  lesson('b1-b2-academic-listening', 'B1-B2', 'Academic listening: lectures and signposting',
    'Follow a lecture through signposts: first, in contrast, a key finding, to summarise.\nDistinguish the main argument from examples and background details.\nPredict answer types and listen for paraphrases rather than exact repeated words.\nIn note completion, retain the required noun and respect the word limit.', [
      mc('To summarise usually introduces ___.', ['an unrelated example', 'a recap of main points', 'a booking price', 'a spelling correction'], 1),
      mc('In contrast signals ___.', ['a difference between ideas', 'only a date', 'an identical point', 'the start of a phone number'], 0),
      mc('A lecture example normally ___.', ['replaces the main claim entirely', 'is always the final answer', 'illustrates a main point', 'must be ignored'], 2),
      mc('When wording differs, match ___.', ['the first sound only', 'the longest sentence', 'the exact spelling alone', 'the meaning'], 3),
      mc('Useful lecture notes should prioritise ___.', ['every spoken filler', 'key ideas and required details', 'unrelated opinions', 'full translations of every word'], 1)
    ], 'signpost=a phrase showing the direction of a talk|finding=a research result|highlight=draw attention to|summarise=state the main points briefly|distinguish=recognise a difference|lecture=an educational talk|illustration=an example explaining a point|emphasise=give special importance to|in contrast=showing a difference|conclude=bring a discussion to an end',
    'Introduce a finding::A key finding was the importance of regular feedback.|Contrast two results::In contrast, the second group showed little improvement.|Summarise a lecture::To summarise, several factors influenced the final outcome.'),

  old('b2-c1-academic-hedging',
    'tentative=not fully certain|plausible=reasonable and believable|suggest=indicate without proving|arguably=as can reasonably be argued|tendency=a general pattern or inclination|nuance=a subtle difference in meaning|qualify=limit the strength of a statement|stance=a position on an issue|apparent=seeming to be true|cautious=careful to avoid overstatement',
    'Hedge a claim::The findings appear to support this interpretation.|Express a possibility::This policy may contribute to lower emissions.|Qualify a generalisation::In some circumstances, online learning can be beneficial.'),
  old('b2-c1-inversion-emphasis',
    'rarely=not often|seldom=almost never|hardly=almost not|scarcely=barely|not only=used to emphasise an additional point|emphasis=extra importance placed on something|inversion=reversal of normal word order|auxiliary=a helping verb|restrictive=limiting what is allowed|under no circumstances=not in any situation',
    'Invert after a negative adverb::Rarely do students achieve fluency without regular practice.|Use not only inversion::Not only did the policy reduce costs, but it also improved access.|Use a restrictive phrase::Under no circumstances should evidence be fabricated.'),
  old('b2-c1-task2-argument',
    'thesis=the central position of an essay|justify=give reasons supporting a claim|counterargument=an opposing line of reasoning|illustrate=explain with an example|concession=acknowledgement of an opposing point|elaborate=explain in more detail|implication=a possible effect or consequence|position=a view on an issue|evaluate=judge strengths and weaknesses|persuasive=able to convince a reader',
    'State a clear position::Governments should prioritise affordable public transport.|Develop a concession::Although this approach is costly, its long-term benefits are substantial.|Link evidence to a claim::This example illustrates why reliable services are essential.'),
  lesson('b2-c1-idioms-collocations', 'B2-C1', 'C1 idioms and precise collocations',
    'Use natural collocations in writing: compelling evidence, pose a threat, address an issue.\nUse conversational idioms selectively in Speaking, not automatically in formal essays.\nOn the same page means sharing an understanding; a double-edged sword has benefits and drawbacks.\nAccuracy and register matter more than the number of idioms you use.', [
      mc('Choose the natural collocation.', ['Do a threat', 'Pose a threat', 'Make evidence compellingly of', 'Take an issue address'], 1),
      mc('A double-edged sword has ___.', ['both advantages and disadvantages', 'only advantages', 'only financial costs', 'no consequences'], 0),
      mc('Conversational idioms are generally best suited to ___.', ['every Task 1 statistic', 'formal citations only', 'natural Speaking responses', 'all essay introductions'], 2),
      mc('Compelling evidence is ___.', ['irrelevant evidence', 'evidence that was hidden', 'always a personal opinion', 'strong and convincing evidence'], 3),
      mc('On the same page means ___.', ['reading identical books only', 'sharing an understanding', 'having different opinions always', 'finishing an exam early'], 1)
    ], 'compelling=strong and convincing|pose a threat=create a danger|address an issue=deal with a problem|on the same page=sharing an understanding|double-edged sword=something with benefits and drawbacks|take into account=consider|far-reaching=having wide effects|a steep learning curve=a period requiring rapid learning|strike a balance=find a fair compromise|bear in mind=remember when considering something',
    'Use a formal collocation::The report provides compelling evidence for policy reform.|Use an appropriate idiom::Technology can be a double-edged sword for learners.|Express a balanced aim::Policymakers should strike a balance between cost and access.'),
  lesson('b2-c1-advanced-task2-structures', 'B2-C1', 'Advanced Task 2: essay architecture',
    'Match your structure to the question: opinion, discussion, advantages/disadvantages or two-part.\nWrite a clear thesis; each body paragraph needs one controlling idea and developed support.\nFor a discussion essay, address both views and make your own position clear.\nA conclusion synthesises your argument instead of introducing new evidence.', [
      mc('The essay structure should be chosen according to ___.', ['a memorised template only', 'the exact question requirements', 'the longest introduction', 'the number of rare words'], 1),
      mc('A discussion essay must ___.', ['address both stated views', 'ignore one view', 'only list examples', 'avoid any position when asked'], 0),
      mc('A body paragraph is strongest when it ___.', ['lists unrelated ideas', 'contains only linkers', 'develops one controlling idea', 'repeats the introduction word for word'], 2),
      mc('A conclusion should ___.', ['add a new research study', 'change the thesis completely', 'raise an unrelated topic', 'synthesise the argument'], 3),
      mc('In a two-part question, you should ___.', ['answer only the easier part', 'address both parts adequately', 'always write a cause essay', 'omit examples'], 1)
    ], 'architecture=the overall structure|synthesise=combine ideas into a coherent whole|controlling idea=the central focus of a paragraph|scope=the range covered by an argument|address=deal directly with|coherent=logically connected|substantiate=support with evidence|relevance=connection to the question|thesis=an essay’s central position|outline=a brief plan',
    'State an essay aim::This essay will examine both views before presenting a conclusion.|Develop a controlling idea::One compelling reason is the long-term benefit to society.|Write a conclusion::Overall the advantages outweigh the drawbacks in this context.'),
  lesson('b2-c1-counterarguments', 'B2-C1', 'Counterarguments, concession and rebuttal',
    'Acknowledge a reasonable opposing point before explaining why your position is stronger.\nUse while, admittedly or despite this for a measured concession.\nRebut a claim with reasoning and evidence, not dismissive language.\nKeep your overall position consistent from introduction to conclusion.', [
      mc('A concession ___.', ['always abandons your position', 'acknowledges a reasonable opposing point', 'introduces unrelated facts', 'repeats a heading'], 1),
      mc('A rebuttal should be supported by ___.', ['reasoning and evidence', 'insults', 'rare adjectives only', 'an unexamined assumption'], 0),
      mc('Which phrase signals a concession?', ['As a final result', 'In precisely 2010', 'Admittedly', 'For the first question number'], 2),
      mc('Your overall position should be ___.', ['different in every paragraph', 'left completely unstated', 'based only on anecdotes', 'consistent'], 3),
      mc('Choose a balanced response.', ['All opponents are foolish.', 'While costs are high, the benefits can justify investment.', 'There are no possible drawbacks.', 'Evidence is never necessary.'], 1)
    ], 'concede=acknowledge a point as valid|rebut=argue against a claim|admittedly=acknowledging a point frankly|nevertheless=despite what was just stated|objection=a reason for disagreement|valid=well founded or reasonable|outweigh=be more important than|refute=show a claim to be false|balanced=considering different sides fairly|consistency=keeping the same underlying position',
    'Make a concession::Admittedly, the initial investment may be substantial.|Rebut an objection::Nevertheless, the long-term benefits outweigh these costs.|Keep a clear position::While alternatives exist, public funding remains essential.'),
  lesson('b2-c1-nominalisation', 'B2-C1', 'Nominalisation and formal register',
    'Nominalisation turns verbs or adjectives into nouns: expand → expansion, efficient → efficiency.\nIt can create concise academic phrasing, but too many abstract nouns obscure meaning.\nChoose formal, precise wording rather than inflated language.\nOriginal: Cities expanded quickly. Formal: Rapid urban expansion created pressure on housing.', [
      mc('The noun form of expand is ___.', ['expandingness', 'expansion', 'expansive verb', 'expandmently'], 1),
      mc('Nominalisation turns a verb or adjective into ___.', ['a noun', 'only a preposition', 'an informal idiom', 'a punctuation mark'], 0),
      mc('Excessive nominalisation may ___.', ['always improve clarity', 'remove every argument', 'make writing difficult to understand', 'guarantee Band 9'], 2),
      mc('Choose a formal phrase.', ['Loads of stuff got better', 'Things did a good thing', 'Really super big city stuff', 'Improvements in public services'], 3),
      mc('A suitable formal register is ___.', ['vague and inflated', 'precise and clear', 'full of slang', 'always passive'], 1)
    ], 'expansion=the act of becoming larger|efficiency=effective use of time or resources|implementation=putting a plan into effect|development=the process of growth or improvement|regulation=control through rules|nominalisation=forming a noun from another word class|register=a style suited to a context|concise=brief but clear|obscure=make difficult to understand|precision=exactness of meaning',
    'Use a nominalisation::Rapid urban expansion has increased pressure on housing.|Use a formal noun phrase::The implementation of this policy requires careful planning.|Keep formal writing clear::Greater efficiency can reduce the overall cost of services.'),
  lesson('b2-c1-complex-sentences', 'B2-C1', 'Advanced clauses and sentence control',
    'Use concessive, relative and participle clauses to show relationships precisely.\nA participle clause must refer to the logical subject of the main clause.\nVary sentence forms, but do not sacrifice clarity for length.\nExample: Having considered both options, the council chose the more sustainable plan.', [
      mc('In a participle clause, the implied subject should ___.', ['be unrelated to the main clause', 'match the logical subject of the main clause', 'always be an object', 'never be a person'], 1),
      mc('Choose the logical sentence.', ['Having reviewed the evidence, the researchers revised their claim.', 'Having reviewed the evidence, the claim revised the researchers.', 'Having reviewed the evidence, it raining.', 'Having reviewed evidence, revised.'], 0),
      mc('A concessive clause often begins with ___.', ['because of plus a noun only', 'a full stop', 'although', 'and then at'], 2),
      mc('Complex sentences should prioritise ___.', ['maximum length', 'as many clauses as possible', 'unnecessary punctuation', 'clear relationships between ideas'], 3),
      mc('Which phrase can introduce a participle clause?', ['There is to', 'Having considered', 'Despite of that is', 'However because'], 1)
    ], 'concessive=expressing contrast with an expectation|participle=a verb form used in a clause or as an adjective|subordinate=dependent on a main clause|logical=following sound reasoning|modify=change or describe something|refer=point to a person or idea|clarity=ease of understanding|vary=use different forms|succinct=expressed briefly and clearly|ambiguity=having more than one possible meaning',
    'Use a participle clause::Having considered the evidence, the council revised its policy.|Use concession::Although the proposal is ambitious, it remains financially viable.|Use a relative clause::The initiative, which targets rural areas, could improve access.'),
  lesson('b2-c1-speaking-discussion', 'B2-C1', 'Speaking Part 3: nuanced discussion',
    'Part 3 requires extended discussion of abstract ideas related to Part 2.\nState a view, explain a mechanism and illustrate it with an example.\nQualify generalisations: in many cases, to some extent, depending on context.\nIf you need time, paraphrase the question naturally rather than reciting a filler.', [
      mc('Part 3 mainly tests discussion of ___.', ['your passport number', 'broader and more abstract ideas', 'only yesterday’s breakfast', 'a memorised story only'], 1),
      mc('To qualify a generalisation, use ___.', ['In many cases', 'Always without exception', 'Everyone agrees entirely', 'It is impossible to differ'], 0),
      mc('A developed answer should include ___.', ['only a yes/no response', 'unrelated idioms', 'an explanation and relevant example', 'an essay read from a page'], 2),
      mc('A nuanced view ___.', ['has no clear position', 'uses the rarest possible words', 'ignores all exceptions', 'recognises relevant differences and limits'], 3),
      mc('Which is an appropriate cautious phrase?', ['All people never differ.', 'To some extent', 'Definitely always every person', 'Obviously nobody can disagree'], 1)
    ], 'nuanced=recognising subtle differences|perspective=a way of looking at an issue|to some extent=partly but not completely|in many cases=often but not universally|underlying=existing beneath the obvious surface|mechanism=the way something works|generalisation=a broad statement about a group|illustrate=explain through an example|context=the circumstances of an issue|implication=a possible consequence',
    'Qualify a view::To some extent, technology has changed how people communicate.|Explain a mechanism::One underlying reason is the growing demand for flexibility.|Recognise context::The impact depends largely on the local social context.'),
  lesson('b2-c1-editing-precision', 'B2-C1', 'C1 editing: precision, concision and accuracy',
    'Revise for task response, paragraph logic, precise vocabulary and grammatical control.\nRemove redundant phrases and unsupported absolute claims.\nCheck articles, agreement, reference words and punctuation in your final review.\nA clear, accurate sentence is stronger than a long sentence with avoidable errors.', [
      mc('An effective final review checks ___.', ['only essay length', 'meaning, logic and language accuracy', 'only rare vocabulary', 'only the introduction'], 1),
      mc('A redundant phrase ___.', ['repeats information unnecessarily', 'always adds evidence', 'must stay in every paragraph', 'is a required idiom'], 0),
      mc('Which wording is more concise?', ['Due to the fact that', 'In view of the fact that', 'Because', 'For the reason that it is'], 2),
      mc('An absolute claim should be ___.', ['made without evidence', 'used in every sentence', 'longer than an example', 'qualified when evidence is limited'], 3),
      mc('Choose the accurate agreement.', ['The evidence show a pattern.', 'The evidence shows a pattern.', 'The evidences shows a pattern.', 'The evidence are show a pattern.'], 1)
    ], 'redundant=unnecessarily repetitive|concise=brief and clear|precise=exact in meaning|revise=review and improve a text|proofread=check a text for errors|consistency=agreement throughout a text|ambiguity=more than one possible meaning|coherent=logically connected|substantiate=support a claim with evidence|qualify=limit the strength of a claim',
    'Check agreement::The evidence shows a consistent pattern across the groups.|Make a cautious claim::These findings may have important implications for education.|Remove repetition::Clear writing communicates complex ideas with precision.')
];

function rng(seed) {
  let state = 2166136261;
  for (const c of seed) { state ^= c.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
function shuffle(values, seed) {
  const out = values.slice(), random = rng(seed);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function originalLessons() {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610060001_roadmap_gamification.sql'), 'utf8');
  const original = new Map();
  const pattern = /\(\s*'([^']+)', '([^']+)', '((?:[^']|'')+)',\s*\$summary\$([\s\S]*?)\$summary\$,\s*\$prompt\$([\s\S]*?)\$prompt\$,\s*\$questions\$([\s\S]*?)\$questions\$::jsonb,\s*(\d+), (\d+)\s*\)/g;
  for (const match of sql.matchAll(pattern)) original.set(match[1], { id: match[1], stage: match[2], title: match[3].replace(/''/g, "'"), summary: match[4], ai_prompt: match[5], questions: JSON.parse(match[6]), reward_coins: Number(match[7]), order_index: Number(match[8]) });
  if (original.size !== 12) throw new Error('Expected the 12 original lessons.');
  const keys = new Map();
  for (const match of sql.matchAll(/\('([^']+)', \$answers\$([\s\S]*?)\$answers\$::jsonb\)/g)) keys.set(match[1], JSON.parse(match[2]));
  return { original, keys };
}
function buildCatalogue() {
  const { original, keys } = originalLessons();
  const positions = new Map(stages.map(stage => [stage, 0]));
  return catalogue.map(entry => {
    const inherited = original.get(entry.id);
    const stage = entry.stage || inherited?.stage;
    if (!stage || entry.glossary.length !== 10 || entry.sentences.length !== 3) throw new Error('Invalid lesson ' + entry.id);
    const order = positions.get(stage) + 1;
    positions.set(stage, order);
    const topic = inherited ? { ...inherited } : {
      id: entry.id, stage, title: entry.title, summary: entry.summary,
      ai_prompt: `Act as a supportive IELTS tutor for a ${stage.replace('-', ' to ')} learner studying “${entry.title}”. Explain the key ideas using two clear examples. Then ask five new practice questions one at a time and wait for each answer. Correct mistakes kindly, explain the reason, and finish with a brief recap. Keep the content appropriate for this level and do not reveal all answers in advance.`,
      questions: entry.quiz.map(q => q.question), reward_coins: rewards[stages.indexOf(stage)]
    };
    topic.order_index = order;
    const gameKeys = { speed_vocabulary: {}, sentence_scramble: {} };
    const questions = entry.glossary.map((pair, i) => {
      const options = shuffle([pair.meaning, entry.glossary[(i + 3) % 10].meaning, entry.glossary[(i + 7) % 10].meaning], `${entry.id}-q${i}`);
      const id = `q${i + 1}`;
      gameKeys.speed_vocabulary[id] = options.indexOf(pair.meaning);
      return { id, word: pair.word, options };
    });
    const sentences = entry.sentences.map((item, i) => {
      const originalWords = item.sentence.split(/\s+/);
      let indexes = shuffle(originalWords.map((_, n) => n), `${entry.id}-s${i}`);
      if (indexes.every((value, n) => value === n)) indexes = indexes.slice(1).concat(indexes[0]);
      const id = `s${i + 1}`;
      gameKeys.sentence_scramble[id] = originalWords.map((_, n) => indexes.indexOf(n));
      return { id, hint: item.hint, sentence: item.sentence, words: indexes.map(n => originalWords[n]) };
    });
    topic.game_data = {
      version: 1,
      word_match: { pairs: entry.glossary.slice(0, 5).map((pair, i) => ({ id: `p${i + 1}`, ...pair })) },
      speed_vocabulary: { duration_seconds: 60, glossary: entry.glossary, questions },
      sentence_scramble: { sentences }
    };
    return { topic, quizKeys: inherited ? keys.get(entry.id) : entry.quiz.map(q => q.answer), gameKeys };
  });
}
const quote = value => "'" + String(value).replace(/'/g, "''") + "'";
const json = value => quote(JSON.stringify(value)) + '::jsonb';
function seedSQL(records) {
  const topics = records.map(({ topic: t }) => `(${[t.id, t.stage, t.title, t.summary, t.ai_prompt].map(quote).join(', ')}, ${json(t.questions)}, ${t.reward_coins}, ${t.order_index}, ${json(t.game_data)})`);
  return `-- BEGIN GENERATED ROADMAP SEED (npm run seed:roadmap)\n` +
    `insert into public.topics (id,stage,title,summary,ai_prompt,questions,reward_coins,order_index,game_data) values\n${topics.join(',\n')}\non conflict (id) do update set stage=excluded.stage,title=excluded.title,summary=excluded.summary,ai_prompt=excluded.ai_prompt,questions=excluded.questions,reward_coins=excluded.reward_coins,order_index=excluded.order_index,game_data=excluded.game_data;\n\n` +
    `insert into public.topic_answer_keys (topic_id,answers) values\n${records.map(r => `(${quote(r.topic.id)},${json(r.quizKeys)})`).join(',\n')}\non conflict (topic_id) do update set answers=excluded.answers,updated_at=now();\n\n` +
    `insert into public.topic_game_keys (topic_id,answers) values\n${records.map(r => `(${quote(r.topic.id)},${json(r.gameKeys)})`).join(',\n')}\non conflict (topic_id) do update set answers=excluded.answers;\n-- END GENERATED ROADMAP SEED`;
}
function publicJS(records) {
  return `/* Generated public lesson catalogue: npm run seed:roadmap. Quiz keys are NOT shipped.\n * Guest practice is local and cannot change server progress, streaks or coins. */\n(function (root, factory) {\n  const api = factory();\n  if (typeof module === 'object' && module.exports) module.exports = api;\n  else root.IELTS_ROADMAP_CONTENT = api;\n})(typeof window !== 'undefined' ? window : globalThis, function () {\n  return ${JSON.stringify(records.map(r => r.topic), null, 2)};\n});\n`;
}
function generate(check = false) {
  const records = buildCatalogue();
  if (records.length !== 40 || stages.some(stage => records.filter(r => r.topic.stage === stage).length !== 10)) throw new Error('Expected ten lessons per stage.');
  const migration = path.join(root, 'supabase/migrations/202610060003_interactive_learning.sql');
  const existing = fs.readFileSync(migration, 'utf8');
  const generatedSQL = existing.replace(/-- BEGIN GENERATED ROADMAP SEED[\s\S]*?-- END GENERATED ROADMAP SEED/, seedSQL(records));
  if (generatedSQL === existing && !existing.includes('insert into public.topic_game_keys')) throw new Error('Missing seed markers.');
  const publicPath = path.join(root, 'lib/roadmapContent.js');
  const generatedJS = publicJS(records);
  if (check) {
    if (generatedSQL !== existing || !fs.existsSync(publicPath) || fs.readFileSync(publicPath, 'utf8') !== generatedJS) throw new Error('Roadmap seed is out of date. Run npm run seed:roadmap.');
  } else {
    fs.writeFileSync(migration, generatedSQL);
    fs.writeFileSync(publicPath, generatedJS);
  }
  console.log(`${check ? 'Verified' : 'Generated'} 40 lessons, 200 quiz questions and 120 mini-games.`);
}
module.exports = { buildCatalogue, generate, shuffle, stages };
if (require.main === module) generate(process.argv.includes('--check'));

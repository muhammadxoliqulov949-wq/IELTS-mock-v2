-- =====================================================================
-- Roadmap (A1-C1) + coins + leaderboard
-- Run AFTER 202610050001_admin.sql (and the mock_results migration).
--
-- Rewards are never supplied as an amount by the browser:
--   • submit_topic_quiz() grades answers against the private answer key;
--   • add_user_coins() derives topic/mock rewards from database records;
--   • coin_transactions makes each reward idempotent and auditable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Wallet balance (users may read it, but cannot update it directly)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists coins integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_coins_nonnegative_check'
  ) then
    alter table public.profiles
      add constraint profiles_coins_nonnegative_check check (coins >= 0);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Public lesson content, private answer keys, and learner progress
-- ---------------------------------------------------------------------
create table if not exists public.topics (
  id           text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stage        text not null check (stage in ('A1-A2', 'A2-B1', 'B1-B2', 'B2-C1')),
  title        text not null check (char_length(title) between 1 and 200),
  summary      text not null check (char_length(summary) between 1 and 10000),
  ai_prompt    text not null check (char_length(ai_prompt) between 1 and 5000),
  questions    jsonb not null check (
    case when jsonb_typeof(questions) = 'array'
      then jsonb_array_length(questions) = 5
      else false end
  ),
  reward_coins integer not null check (reward_coins > 0),
  order_index  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (stage, order_index)
);

create index if not exists topics_stage_order_idx
  on public.topics (stage, order_index, id);

-- Answer keys are deliberately separate from topics.questions, so a learner
-- can load and render a quiz without receiving its solutions in the payload.
create table if not exists public.topic_answer_keys (
  topic_id text primary key references public.topics(id) on delete cascade,
  answers  jsonb not null check (
    case when jsonb_typeof(answers) = 'array'
      then jsonb_array_length(answers) = 5
      else false end
  ),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_topic_progress (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  topic_id         text not null references public.topics(id) on delete cascade,
  score_percentage integer not null default 0 check (score_percentage between 0 and 100),
  is_completed     boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (user_id, topic_id),
  check (not is_completed or score_percentage >= 80)
);

create index if not exists user_topic_progress_user_idx
  on public.user_topic_progress (user_id, updated_at desc);

-- Immutable reward ledger; a topic or mock section can pay only once per user.
create table if not exists public.coin_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  source     text not null check (source in ('roadmap', 'mock')),
  source_id  text not null check (char_length(source_id) between 1 and 160),
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create index if not exists coin_transactions_user_idx
  on public.coin_transactions (user_id, created_at desc);

alter table public.topics enable row level security;
alter table public.topic_answer_keys enable row level security;
alter table public.user_topic_progress enable row level security;
alter table public.coin_transactions enable row level security;

revoke all on public.topics, public.topic_answer_keys,
  public.user_topic_progress, public.coin_transactions from anon, authenticated;
grant select on public.topics to authenticated;
grant select on public.user_topic_progress, public.coin_transactions to authenticated;

-- Lessons are shared; progress and wallet history are private to the owner.
drop policy if exists "Roadmap topics: authenticated read" on public.topics;
create policy "Roadmap topics: authenticated read" on public.topics
  for select to authenticated using (true);

drop policy if exists "Roadmap progress: read own" on public.user_topic_progress;
create policy "Roadmap progress: read own" on public.user_topic_progress
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Coin transactions: read own" on public.coin_transactions;
create policy "Coin transactions: read own" on public.coin_transactions
  for select to authenticated using (user_id = (select auth.uid()));

-- There is intentionally no client SELECT policy for answer keys and no
-- client INSERT/UPDATE/DELETE policy for progress or the reward ledger.

-- ---------------------------------------------------------------------
-- 3. 12 ready-to-use topics (3 for each level, 5 questions each)
-- ---------------------------------------------------------------------
insert into public.topics
  (id, stage, title, summary, ai_prompt, questions, reward_coins, order_index)
values
(
  'a1-a2-present-simple', 'A1-A2', 'Present simple and be',
  $summary$Use am / is / are for facts and descriptions: I am a student; she is friendly; they are ready.
For routines and general facts, use the base verb (I work) or add -s / -es for he, she, it (he works).
Negatives: do not / does not + base verb. Questions: Do / Does + subject + base verb?
Example: The library opens at 9 a.m. / Does it open on Sundays? No, it does not.$summary$,
  $prompt$Act as a patient English tutor for an A1-A2 learner studying “Present simple and be”. Teach am/is/are and present simple routines in short, plain English. Give two everyday examples, then ask me five new questions one at a time. Wait for my answer before continuing, correct mistakes kindly, and finish with a short recap. Do not reveal all answers in advance.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"My brother ___ to college by bus every morning.","options":["go","goes","is go","going"]},
    {"type":"input","prompt":"Complete the question: ___ you usually study in the evening?","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Choose the correct sentence.","options":["She don't like reading.","She doesn't likes reading.","She doesn't like reading.","She not like reading."]},
    {"type":"input","prompt":"Complete: We ___ ready for class.","placeholder":"am / is / are"},
    {"type":"multiple-choice","prompt":"What does “I live in Tashkent” describe?","options":["A routine or fact","An action happening right now","A finished past event","A future plan"]}
  ]$questions$::jsonb,
  10, 1
),
(
  'a1-a2-present-continuous', 'A1-A2', 'Present continuous',
  $summary$Form the present continuous with am / is / are + verb-ing: I am studying; he is reading; they are waiting.
Use it for an action happening now or a temporary situation. Add -ing (make → making, sit → sitting).
Negative: She is not working. Question: Are you listening?
Compare: I work every day (routine) / I am working now (happening now).$summary$,
  $prompt$Act as a supportive A1-A2 English tutor. Teach the present continuous (am/is/are + -ing), including one spelling change and how it differs from a routine. Use simple examples about daily life and study. Quiz me with five short questions one at a time, wait for each response, and explain corrections in plain English.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"Look! The children ___ football in the park.","options":["play","plays","are playing","is playing"]},
    {"type":"input","prompt":"Complete: I ___ (write) an email at the moment.","placeholder":"Two words"},
    {"type":"multiple-choice","prompt":"Which sentence describes a temporary situation?","options":["Mina works at a bank.","Mina is working from home this week.","Mina worked at a bank last year.","Mina will work tomorrow."]},
    {"type":"input","prompt":"Complete: He is ___ (run) to catch the bus.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Choose the correct negative form.","options":["They not are studying.","They aren't studying.","They don't studying.","They doesn't study."]}
  ]$questions$::jsonb,
  10, 2
),
(
  'a1-a2-past-simple', 'A1-A2', 'Past simple and time expressions',
  $summary$Use the past simple for actions finished at a known time: yesterday, last week, in 2022.
Regular verbs usually end in -ed (visit → visited). Learn common irregular forms (go → went; see → saw).
For questions and negatives use did / did not + the base verb: Did you go? I didn't go.
Example: We visited Samarkand last summer.$summary$,
  $prompt$You are a friendly A1-A2 English tutor. Explain the past simple for finished events, with regular and irregular verbs and did/didn't questions. Give examples using yesterday or last year. Then practise with five questions, one at a time. Let me answer before correcting me, and end with a two-line summary.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"We ___ the museum last Saturday.","options":["visit","visited","visiting","visits"]},
    {"type":"input","prompt":"Complete: She ___ (go) to Bukhara in 2023.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Choose the correct question.","options":["Did they saw the film?","Did they see the film?","Do they saw the film?","Were they see the film?"]},
    {"type":"input","prompt":"Complete: I didn't ___ (buy) a ticket.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which time expression usually signals the past simple?","options":["right now","every morning","last month","at the moment"]}
  ]$questions$::jsonb,
  10, 3
),
(
  'a2-b1-present-perfect', 'A2-B1', 'Present perfect vs past simple',
  $summary$Use have / has + past participle for life experiences or results when the exact finished time is not the focus: I have visited Rome.
Use the past simple with a finished time such as yesterday or in 2021: I visited Rome in 2021.
Ever / never often ask about experience; just / already / yet often describe recent results.
Example: She has just finished her essay. / She finished it last night.$summary$,
  $prompt$Teach an A2-B1 learner how to choose between the present perfect and past simple. Use “ever/never” for experiences and a finished time expression for past simple. Give a short rule, then ask five varied questions one by one. Wait for each answer, correct gently, and explain why the tense fits.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"I ___ never ___ Japanese food before.","options":["have / tried","did / tried","has / try","am / trying"]},
    {"type":"input","prompt":"Complete with the past simple: They ___ (move) here in 2020.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which sentence is correct?","options":["Have you ever visited London?","Did you ever visited London?","Have you ever visit London?","Do you have ever visited London?"]},
    {"type":"input","prompt":"Complete: Omar has ___ finished his assignment, so he can relax.","placeholder":"already / yet / ever"},
    {"type":"multiple-choice","prompt":"Choose the best sentence with “last week”.","options":["I have met my tutor last week.","I met my tutor last week.","I have meet my tutor last week.","I meet my tutor last week."]}
  ]$questions$::jsonb,
  20, 1
),
(
  'a2-b1-passive-voice', 'A2-B1', 'Passive voice',
  $summary$Build the passive with be + past participle. Change be to show the tense: is made (present), was built (past), will be delivered (future).
Use the passive when the action or result matters more than who did it. Add by + agent only when useful.
IELTS example: The bridge was built in 2018. / The samples are analysed in a laboratory.$summary$,
  $prompt$Act as a clear A2-B1 grammar coach. Teach passive voice with the formula be + past participle and show present and past examples. Use IELTS-style examples about buildings, processes, and research. Ask five practice questions in sequence and explain each correction simply.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"The new sports centre ___ last year.","options":["build","built","was built","is build"]},
    {"type":"input","prompt":"Complete: English ___ (speak) in many countries.","placeholder":"Two words"},
    {"type":"multiple-choice","prompt":"Choose the correct passive sentence.","options":["The results announced yesterday.","The results were announced yesterday.","The results was announce yesterday.","The results did announced yesterday."]},
    {"type":"input","prompt":"Complete: The report will ___ (publish) next month.","placeholder":"be + past participle"},
    {"type":"multiple-choice","prompt":"Why is the passive useful in “The data were collected in May”? ","options":["The person is more important than the action","The action or result is the focus","It describes a regular habit","It makes the sentence future"]}
  ]$questions$::jsonb,
  20, 2
),
(
  'a2-b1-first-conditional', 'A2-B1', 'First conditional and future time clauses',
  $summary$Use if / when + present simple for a real future condition. Use will + base verb in the result clause: If it rains, we will stay inside.
Do not usually put will directly after if: If I have time, I will revise (not “if I will have time”).
The same present-tense rule applies after before, after, and as soon as: I will call you when I arrive.$summary$,
  $prompt$You are a patient A2-B1 tutor. Explain the first conditional for realistic future possibilities and the present simple after if/when. Give two study or travel examples. Ask five questions one at a time; wait for my answer, correct errors kindly, and finish with one memorable rule.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"If the weather ___ sunny, we will walk to the lake.","options":["will be","is","was","would be"]},
    {"type":"input","prompt":"Complete: I will message you as soon as I ___ (arrive).","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Choose the correct sentence.","options":["If I will finish early, I call you.","If I finish early, I will call you.","If I finished early, I will call you.","If I finish early, I would call you."]},
    {"type":"input","prompt":"Complete: If she studies regularly, she ___ (improve) her score.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which verb form normally follows “when” in a future time clause?","options":["will + verb","present simple","past perfect","would + verb"]}
  ]$questions$::jsonb,
  20, 3
),
(
  'b1-b2-conditionals-modals', 'B1-B2', 'Conditionals and modal verbs',
  $summary$Second conditional: If + past simple, would + base verb for an unreal or unlikely situation now: If I had more time, I would read more.
Third conditional: If + past perfect, would have + past participle for an unreal past: If we had left earlier, we would have arrived on time.
Modals soften advice and claims: may, might, could, should. Example: Governments could invest more in public transport.$summary$,
  $prompt$Teach a B1-B2 learner to distinguish the second and third conditionals and use modals for possibility or advice. Keep the explanations concise and use IELTS discussion examples. Give five questions one at a time; wait for each response and explain corrections with the time meaning.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"If I ___ more free time, I would volunteer at the library.","options":["have","had","will have","would have"]},
    {"type":"input","prompt":"Complete the third conditional: If they had booked earlier, they ___ (find) cheaper tickets.","placeholder":"Two words"},
    {"type":"multiple-choice","prompt":"Which sentence expresses a possible suggestion rather than certainty?","options":["The city will certainly remove every car.","The city could improve its bus network.","The city removed its bus network.","The city must have removed every car."]},
    {"type":"input","prompt":"Complete: If I had known about the deadline, I ___ (submit) the form sooner.","placeholder":"Two words"},
    {"type":"multiple-choice","prompt":"Which structure describes an unreal present situation?","options":["If + present, will + verb","If + past simple, would + verb","If + past perfect, would have + participle","When + present, will + verb"]}
  ]$questions$::jsonb,
  35, 1
),
(
  'b1-b2-relative-clauses', 'B1-B2', 'Relative clauses and complex sentences',
  $summary$Use who for people, which for things, and where for places. A defining clause identifies the noun: Students who revise regularly improve.
A non-defining clause adds extra information and uses commas: Samarkand, which is a historic city, attracts visitors.
Use that in many defining clauses, but not in non-defining clauses. Relative clauses help combine ideas without repeating nouns.$summary$,
  $prompt$Act as a B1-B2 writing tutor. Explain defining versus non-defining relative clauses and the use of who/which/where. Give examples about education and cities. Ask five short questions one by one and wait after each. Correct punctuation and word choice in a supportive way.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"The researcher ___ wrote the report works at our university.","options":["who","where","which","when"]},
    {"type":"input","prompt":"Complete: This is the town ___ my grandparents were born.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which sentence uses commas correctly for extra information?","options":["My laptop which I bought last year, is very fast.","My laptop, which I bought last year, is very fast.","My laptop, which I bought last year is very fast.","My laptop which, I bought last year is very fast."]},
    {"type":"input","prompt":"Combine with a relative pronoun: I met a teacher. She speaks five languages. I met a teacher ___ speaks five languages.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which relative clause identifies exactly which students are meant?","options":["Students, who attend regularly, make progress.","Students who attend regularly make progress.","Students, which attend regularly, make progress.","Students where attend regularly make progress."]}
  ]$questions$::jsonb,
  35, 2
),
(
  'b1-b2-cohesion-coherence', 'B1-B2', 'Cohesion and coherence',
  $summary$Coherence means ideas are logically ordered and easy to follow. Cohesion means sentences are linked with references, substitution, and linking words.
Give each paragraph one clear central idea. Use linking words accurately: however (contrast), therefore (result), for example (illustration).
Avoid starting every sentence with a linker; repeat key terms when a synonym would be unclear.$summary$,
  $prompt$You are an IELTS writing coach for a B1-B2 learner. Explain the difference between coherence (logical organisation) and cohesion (language links). Give one short paragraph example with a clear topic sentence and a contrast linker. Then ask five questions one at a time and give concise feedback.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"Which linking word most clearly introduces a contrast?","options":["therefore","however","for example","firstly"]},
    {"type":"input","prompt":"Complete: The bus is cheaper; ___, the train is faster.","placeholder":"One contrast linker"},
    {"type":"multiple-choice","prompt":"What is coherence mainly about?","options":["Logical order and clear relationships between ideas","Using as many long words as possible","Adding a linker to every sentence","Repeating the same noun in every line"]},
    {"type":"multiple-choice","prompt":"Which sentence best works as a paragraph topic sentence?","options":["For example, some students take the bus.","Public transport can make city travel more affordable.","However, it was raining on Tuesday.","This is also another point."]},
    {"type":"input","prompt":"Complete the result link: The sample was small; ___, the findings should be treated cautiously.","placeholder":"One result linker"}
  ]$questions$::jsonb,
  35, 3
),
(
  'b2-c1-academic-hedging', 'B2-C1', 'Academic hedging and stance',
  $summary$Hedging makes an academic claim appropriately cautious rather than absolute. Use may, might, appears to, tends to, and suggests that when evidence is limited.
Compare: “This proves...” (very strong) / “This suggests...” (cautious and evidence-based).
Do not hedge established facts unnecessarily. Match the strength of your language to the quality and amount of evidence.$summary$,
  $prompt$Act as an IELTS Academic Writing tutor for a B2-C1 learner. Teach hedging and cautious claims using may, might, appears to, and suggests. Explain why evidence should determine certainty. Give two improved sentence examples, then quiz me with five items one by one and explain each answer.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"Which phrase makes a claim appropriately cautious?","options":["This proves beyond doubt that...","The findings may indicate that...","Everyone knows that...","It is impossible that..."]},
    {"type":"input","prompt":"Complete cautiously: The results ___ suggest a link between sleep and memory.","placeholder":"One modal verb"},
    {"type":"multiple-choice","prompt":"The study used only 20 participants. Which conclusion is best calibrated?","options":["This proves the treatment always works.","The results may suggest a benefit, but further research is needed.","No other study will be useful.","The treatment is certainly ineffective."]},
    {"type":"multiple-choice","prompt":"When should academic writers use hedging?","options":["Whenever they want a sentence to sound longer","When the available evidence does not justify certainty","Only when stating basic facts","In every sentence, without exception"]},
    {"type":"input","prompt":"Complete: The policy ___ (appear) to have reduced waiting times.","placeholder":"One word"}
  ]$questions$::jsonb,
  50, 1
),
(
  'b2-c1-inversion-emphasis', 'B2-C1', 'Inversion and emphasis',
  $summary$Formal inversion can follow a negative or restrictive phrase at the start of a sentence: Never have I seen such rapid change; Not only did costs fall, but access improved.
After Not only, use auxiliary + subject + main verb. With no auxiliary, add do / does / did.
Use inversion sparingly in formal writing; it creates emphasis but can sound unnatural if overused.$summary$,
  $prompt$Teach a B2-C1 learner how formal inversion works after “never” and “not only”. Show the auxiliary-before-subject pattern and warn against overuse. Use IELTS-style formal examples. Ask five short transformation or choice questions one at a time, and explain the grammar after each response.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"Choose the correct inversion: Never ___ such a rapid change.","options":["I have seen","have I seen","I saw","did I have seen"]},
    {"type":"input","prompt":"Complete: Not only ___ the policy reduce costs, but it also improved access.","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"Which sentence is grammatically correct?","options":["Rarely people consider the long-term effect.","Rarely do people consider the long-term effect.","Rarely people do consider the long-term effect.","Rarely does people consider the long-term effect."]},
    {"type":"input","prompt":"Complete: Not only did the city expand the network, but it ___ (also / improve) service frequency.","placeholder":"Two words"},
    {"type":"multiple-choice","prompt":"What does formal inversion mainly add?","options":["A question mark","Emphasis after a negative or restrictive opening","A change to the past tense","A less formal conversational tone"]}
  ]$questions$::jsonb,
  50, 2
),
(
  'b2-c1-task2-argument', 'B2-C1', 'IELTS Task 2 argument development',
  $summary$Answer every part of the question and state a clear position. Build each body paragraph around one main claim, explain why it matters, and support it with a relevant example.
A useful chain is: point → explanation → example → link to the question. Address an opposing view when it strengthens your argument.
Prefer precise vocabulary and natural collocations to memorised phrases. Keep conclusions consistent with your position.$summary$,
  $prompt$Act as an experienced IELTS Writing Task 2 tutor for a B2-C1 learner. Teach a practical paragraph chain (point, explanation, example, link) and how to keep a clear position. Use the topic of public transport or education. Give a short model plan, then ask five planning or revision questions one at a time. Do not write a full essay for me.$prompt$,
  $questions$[
    {"type":"multiple-choice","prompt":"What should a strong body paragraph usually develop?","options":["Several unrelated claims","One main claim supported with explanation and evidence","Only a quotation","A new position that contradicts the introduction"]},
    {"type":"multiple-choice","prompt":"After making a point, what is a useful next step?","options":["Explain why it matters","Start an unrelated paragraph","Repeat the thesis word for word","Add a memorised idiom"]},
    {"type":"input","prompt":"In the chain point → explanation → example → ___, what final step links the idea back to the question?","placeholder":"One word"},
    {"type":"multiple-choice","prompt":"What is the best approach to an opposing view?","options":["Ignore the question prompt","Address it when doing so strengthens a balanced argument","Replace your position with the opposite one","Mention it without explaining it"]},
    {"type":"multiple-choice","prompt":"Which vocabulary choice is strongest for IELTS writing?","options":["A precise natural collocation that fits the meaning","A rare word used without checking its meaning","A memorised phrase in every paragraph","A synonym that changes the original meaning"]}
  ]$questions$::jsonb,
  50, 3
)
on conflict (id) do update set
  stage = excluded.stage,
  title = excluded.title,
  summary = excluded.summary,
  ai_prompt = excluded.ai_prompt,
  questions = excluded.questions,
  reward_coins = excluded.reward_coins,
  order_index = excluded.order_index,
  updated_at = now();

insert into public.topic_answer_keys (topic_id, answers) values
  ('a1-a2-present-simple', $answers$[1,"do",2,"are",0]$answers$::jsonb),
  ('a1-a2-present-continuous', $answers$[2,"am writing",1,"running",1]$answers$::jsonb),
  ('a1-a2-past-simple', $answers$[1,"went",1,"buy",2]$answers$::jsonb),
  ('a2-b1-present-perfect', $answers$[0,"moved",0,"already",1]$answers$::jsonb),
  ('a2-b1-passive-voice', $answers$[2,"is spoken",1,"be published",1]$answers$::jsonb),
  ('a2-b1-first-conditional', $answers$[1,"arrive",1,"will improve",1]$answers$::jsonb),
  ('b1-b2-conditionals-modals', $answers$[1,"would have found",1,"would have submitted",1]$answers$::jsonb),
  ('b1-b2-relative-clauses', $answers$[0,"where",1,"who",1]$answers$::jsonb),
  ('b1-b2-cohesion-coherence', $answers$[1,"however",0,"however",["therefore","thus","consequently","as a result"]]$answers$::jsonb),
  ('b2-c1-academic-hedging', $answers$[1,["may","might","could"],1,1,"appears"]$answers$::jsonb),
  ('b2-c1-inversion-emphasis', $answers$[1,"did",1,"also improved",1]$answers$::jsonb),
  ('b2-c1-task2-argument', $answers$[1,0,"link",1,0]$answers$::jsonb)
on conflict (topic_id) do update set
  answers = excluded.answers,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 4. Harden result writes: clients use the checked RPC, not direct table DML
-- ---------------------------------------------------------------------
revoke insert, update on public.mock_results from anon, authenticated;
-- Admin deletion remains available through the admin-only RLS policy created
-- by 202610050001_admin.sql; ordinary learners have no DELETE policy.
grant select, delete on public.mock_results to authenticated;

create or replace function public.save_mock_section(
  p_test_id text, p_section text, p_band numeric, p_name text, p_details jsonb, p_owner uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then
    raise exception 'Authentication required or account changed';
  end if;
  if p_section is null or p_section not in ('listening','reading','writing','speaking') then
    raise exception 'Invalid section';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object'
     or octet_length(p_details::text) > 100000
     or jsonb_typeof(p_details->'date') is distinct from 'number' then
    raise exception 'Invalid score details';
  end if;
  if p_band is not null and (p_band < 0 or p_band > 9 or mod(p_band, 0.5) <> 0) then
    raise exception 'Invalid band';
  end if;

  insert into public.mock_results as r
    (user_id, name, test_id, scores, listening, reading, writing, speaking)
  values (
    auth.uid(), p_name, p_test_id,
    jsonb_build_object(p_section, p_details || jsonb_build_object('band', p_band)),
    case when p_section = 'listening' then p_band end,
    case when p_section = 'reading' then p_band end,
    case when p_section = 'writing' then p_band end,
    case when p_section = 'speaking' then p_band end
  ) on conflict (user_id, test_id) do update set
    name = excluded.name,
    scores = r.scores || excluded.scores,
    listening = case when p_section = 'listening' then p_band else r.listening end,
    reading = case when p_section = 'reading' then p_band else r.reading end,
    writing = case when p_section = 'writing' then p_band else r.writing end,
    speaking = case when p_section = 'speaking' then p_band else r.speaking end,
    updated_at = now()
  where coalesce((r.scores->p_section->>'date')::numeric, 0) <= (p_details->>'date')::numeric;
end;
$$;

revoke all on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) from public, anon;
grant execute on function public.save_mock_section(text,text,numeric,text,jsonb,uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Atomic, idempotent reward RPC (the browser never sends an amount)
-- ---------------------------------------------------------------------
create or replace function public.add_user_coins(p_source text, p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_amount integer := 0;
  v_balance integer := 0;
  v_test_id text;
  v_skill text;
  v_band numeric;
  v_details jsonb;
  v_transaction uuid;
  v_already_awarded boolean := false;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_source = 'roadmap' then
    select t.reward_coins
      into v_amount
      from public.topics t
      join public.user_topic_progress p on p.topic_id = t.id
     where t.id = p_reference
       and p.user_id = v_user
       and p.is_completed
       and p.score_percentage >= 80;
    if not found then
      raise exception 'Complete the topic quiz with at least 80 percent first';
    end if;
  elsif p_source = 'mock' then
    if p_reference is null or p_reference !~ '^test[1-9][0-9]?:((listening)|(reading))$' then
      raise exception 'Invalid mock reward reference';
    end if;
    v_test_id := split_part(p_reference, ':', 1);
    v_skill := split_part(p_reference, ':', 2);

    select case when v_skill = 'listening' then r.listening else r.reading end,
           r.scores -> v_skill
      into v_band, v_details
      from public.mock_results r
     where r.user_id = v_user and r.test_id = v_test_id;
    if not found or v_band is null then
      raise exception 'A scored Listening or Reading result is required';
    end if;
    if v_details is null or (v_details ->> 'band') is null
       or (v_details ->> 'band')::numeric is distinct from v_band then
      raise exception 'Mock score details do not match the saved result';
    end if;

    v_amount := case
      when v_band between 5.5 and 6.5 then 30
      when v_band between 7 and 8 then 60
      when v_band between 8.5 and 9 then 100
      else 0
    end;
    if v_amount = 0 then
      select p.coins into v_balance from public.profiles p where p.id = v_user;
      return jsonb_build_object(
        'source', p_source, 'source_id', p_reference,
        'awarded_coins', 0, 'coins_balance', coalesce(v_balance, 0),
        'already_awarded', false
      );
    end if;
  else
    raise exception 'Unsupported coin reward source';
  end if;

  insert into public.coin_transactions (user_id, source, source_id, amount)
  values (v_user, p_source, p_reference, v_amount)
  on conflict (user_id, source, source_id) do nothing
  returning id into v_transaction;

  if v_transaction is null then
    v_already_awarded := true;
    v_amount := 0;
  else
    update public.profiles p
       set coins = p.coins + v_amount
     where p.id = v_user
     returning p.coins into v_balance;
    if not found then
      raise exception 'Profile not found';
    end if;
  end if;

  if v_transaction is null then
    select p.coins into v_balance from public.profiles p where p.id = v_user;
  end if;

  return jsonb_build_object(
    'source', p_source, 'source_id', p_reference,
    'awarded_coins', v_amount, 'coins_balance', coalesce(v_balance, 0),
    'already_awarded', v_already_awarded
  );
end;
$$;

revoke all on function public.add_user_coins(text, text) from public, anon;
grant execute on function public.add_user_coins(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Grade the five answers on the server, keep best progress, award once
-- ---------------------------------------------------------------------
create or replace function public.submit_topic_quiz(p_topic_id text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_questions jsonb;
  v_keys jsonb;
  v_total integer;
  v_correct integer := 0;
  v_index integer;
  v_given text;
  v_expected jsonb;
  v_variant jsonb;
  v_expected_text text;
  v_given_text text;
  v_matches boolean;
  v_score integer;
  v_best integer;
  v_completed boolean;
  v_reward jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select t.questions, k.answers
    into v_questions, v_keys
    from public.topics t
    join public.topic_answer_keys k on k.topic_id = t.id
   where t.id = p_topic_id;
  if not found then
    raise exception 'Topic not found';
  end if;

  v_total := jsonb_array_length(v_questions);
  if v_total <> 5 or jsonb_typeof(p_answers) is distinct from 'array'
     or jsonb_array_length(p_answers) <> v_total
     or jsonb_array_length(v_keys) <> v_total then
    raise exception 'Submit exactly five answers';
  end if;

  for v_index in 0..v_total - 1 loop
    v_expected := v_keys -> v_index;
    v_given := coalesce(p_answers ->> v_index, '');
    if jsonb_typeof(v_expected) = 'number' then
      if v_given = v_expected::text then
        v_correct := v_correct + 1;
      end if;
    else
      v_given_text := lower(regexp_replace(trim(v_given), '[[:space:][:punct:]]+', ' ', 'g'));
      v_matches := false;
      if jsonb_typeof(v_expected) = 'array' then
        for v_variant in select value from jsonb_array_elements(v_expected) as answer(value) loop
          v_expected_text := lower(regexp_replace(trim(v_variant #>> '{}'), '[[:space:][:punct:]]+', ' ', 'g'));
          if v_given_text = v_expected_text then
            v_matches := true;
            exit;
          end if;
        end loop;
      else
        v_expected_text := lower(regexp_replace(trim(v_expected #>> '{}'), '[[:space:][:punct:]]+', ' ', 'g'));
        v_matches := v_given_text = v_expected_text;
      end if;
      if v_matches then v_correct := v_correct + 1; end if;
    end if;
  end loop;

  v_score := round((v_correct::numeric * 100) / v_total)::integer;
  insert into public.user_topic_progress as progress
    (user_id, topic_id, score_percentage, is_completed, updated_at)
  values (v_user, p_topic_id, v_score, v_score >= 80, now())
  on conflict (user_id, topic_id) do update set
    score_percentage = greatest(progress.score_percentage, excluded.score_percentage),
    is_completed = progress.is_completed or excluded.is_completed,
    updated_at = now()
  returning score_percentage, is_completed into v_best, v_completed;

  v_reward := null;
  if v_completed then
    v_reward := public.add_user_coins('roadmap', p_topic_id);
  end if;

  return jsonb_build_object(
    'topic_id', p_topic_id,
    'correct_count', v_correct,
    'total_questions', v_total,
    'score_percentage', v_score,
    'best_score_percentage', v_best,
    'is_completed', v_completed,
    'coins_awarded', coalesce((v_reward ->> 'awarded_coins')::integer, 0),
    'coins_balance', coalesce((v_reward ->> 'coins_balance')::integer,
      (select p.coins from public.profiles p where p.id = v_user), 0)
  );
end;
$$;

revoke all on function public.submit_topic_quiz(text, jsonb) from public, anon;
grant execute on function public.submit_topic_quiz(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Safe global leaderboard: expose only chosen public fields, not emails
-- ---------------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit integer default 100)
returns table (
  rank_position bigint,
  display_name text,
  avatar_url text,
  coins integer,
  level_badge text,
  is_you boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  v_limit := least(greatest(coalesce(p_limit, 100), 1), 100);

  return query
  with stage_progress as (
    select p.id as uid,
      count(*) filter (where t.stage = 'A1-A2')::integer as a1_total,
      count(*) filter (where t.stage = 'A1-A2' and coalesce(up.is_completed, false))::integer as a1_done,
      count(*) filter (where t.stage = 'A2-B1')::integer as a2_total,
      count(*) filter (where t.stage = 'A2-B1' and coalesce(up.is_completed, false))::integer as a2_done,
      count(*) filter (where t.stage = 'B1-B2')::integer as b1_total,
      count(*) filter (where t.stage = 'B1-B2' and coalesce(up.is_completed, false))::integer as b1_done,
      count(*) filter (where t.stage = 'B2-C1')::integer as b2_total,
      count(*) filter (where t.stage = 'B2-C1' and coalesce(up.is_completed, false))::integer as b2_done
    from public.profiles p
    cross join public.topics t
    left join public.user_topic_progress up
      on up.user_id = p.id and up.topic_id = t.id
    group by p.id
  ), badges as (
    select s.uid,
      case
        when s.a1_total > 0 and s.a1_done = s.a1_total
          and s.a2_total > 0 and s.a2_done = s.a2_total
          and s.b1_total > 0 and s.b1_done = s.b1_total
          and s.b2_total > 0 and s.b2_done = s.b2_total then 'C1 Master'
        when s.a1_total > 0 and s.a1_done = s.a1_total
          and s.a2_total > 0 and s.a2_done = s.a2_total
          and s.b1_total > 0 and s.b1_done = s.b1_total then 'B2 Achiever'
        when s.a1_total > 0 and s.a1_done = s.a1_total
          and s.a2_total > 0 and s.a2_done = s.a2_total then 'B1 Builder'
        when s.a1_total > 0 and s.a1_done = s.a1_total then 'A2 Explorer'
        else 'A1 Starter'
      end as badge
    from stage_progress s
  ), ranked as (
    select
      row_number() over (
        order by p.coins desc,
          lower(coalesce(nullif(trim(p.name), ''), 'learner')) asc,
          p.id asc
      ) as place,
      p.id as uid,
      coalesce(nullif(trim(p.name), ''), 'Learner') as learner_name,
      p.avatar_url as learner_avatar,
      p.coins as learner_coins,
      b.badge as learner_badge
    from public.profiles p
    join badges b on b.uid = p.id
  )
  select r.place, r.learner_name, r.learner_avatar,
         r.learner_coins, r.learner_badge, (r.uid = v_user)
    from ranked r
   where r.place <= v_limit or r.uid = v_user
   order by r.place;
end;
$$;

revoke all on function public.get_leaderboard(integer) from public, anon;
grant execute on function public.get_leaderboard(integer) to authenticated;

-- Keep topic timestamps tidy when admins update the seed content later.
create or replace function public.roadmap_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists topics_touch on public.topics;
create trigger topics_touch before update on public.topics
  for each row execute function public.roadmap_touch_updated_at();

-- Quick check after applying:
-- select id, stage, title, reward_coins, jsonb_array_length(questions) as questions from public.topics order by stage, order_index;
-- select public.add_user_coins('mock', 'test1:listening'); -- derives the reward; no amount is accepted.

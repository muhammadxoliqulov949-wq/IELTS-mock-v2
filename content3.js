/* Bandly AI — Test 3 (premium, upper-intermediate difficulty).
 * All content is original and written for this app; not copied from any
 * copyrighted IELTS material. Written at a deliberately harder level than
 * Test 1–2: subtle distractors, self-corrections in speech, denser
 * academic vocabulary, and "not given" traps in Reading.
 */
(function () {
  const C = window.IELTS_CONTENT || {};

  /* ================= LISTENING · PRACTICE TEST 3 ================= */
  C.listening3 = {
    id: 'listening-03', title: 'Listening Practice Test 3', skill: 'Listening',
    difficulty: 'Upper-Intermediate', duration: 30,
    parts: [
      {
        id: 'l3p1', partNumber: 1, title: 'Part 1 — Everyday conversation',
        instructions: 'Questions 1–10. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Woman: Harbourview Aquarium, this is Priya speaking. How can I help?
Man: Hi, I'm calling about a school group visit. I'm the head of the science department at Westfield High. I'd like to book around 45 students for next month.
Woman: Great. We host school groups on Tuesday, Wednesday and Thursday mornings. The session starts at ten a.m. — sorry, that's for primary schools; secondary groups start at ten thirty.
Man: Ten thirty works. How much would it cost for 45 students?
Woman: For secondary students it's four pounds fifty per student. Actually, hold on — if your group is more than forty students, we apply the group rate of three pounds fifty each.
Man: Oh, that's useful. And what about teachers?
Woman: One teacher is free for every ten students, so you'd need three paying teachers. Teacher tickets are six pounds.
Man: Good. We also want the touch session — the one where students handle starfish?
Woman: Right, the intertidal touch session. That's an extra two pounds per student, and it needs to be booked at least two weeks ahead.
Man: Noted. One more thing — is there a place for us to eat afterwards?
Woman: The café is open to groups until one p.m., and you can bring your own food for the picnic area, but only from sealed containers.
Man: Perfect. Could you confirm the reference code you've assigned to the booking?
Woman: Of course. Your reference is H-A-R-V, dash, two, zero, four, one.
Man: H-A-R-V-2041. Thank you.`,
        questions: [
          { id: 'l301', type: 'sentence-completion', prompt: 'The booking is for around ______ students.', answer: '45', explanation: 'The man says he would like to book "around 45 students".' },
          { id: 'l302', type: 'sentence-completion', prompt: 'Secondary school sessions start at ______ (write the time).', answer: '10:30', explanation: 'She first says ten a.m., then corrects herself: that is for primary schools; secondary groups start at ten thirty.' },
          { id: 'l303', type: 'multiple-choice', prompt: 'Why does the woman change the time she first gives?', options: ['The primary school session was cancelled', 'She first gave the time for a different group', 'The aquarium changes times on weekdays', 'The man asked to move it earlier'], answer: 1, explanation: 'Ten a.m. is the start time for primary schools; the correction applies it to the right group.' },
          { id: 'l304', type: 'sentence-completion', prompt: 'The group rate applies when the group has more than ______ students.', answer: '40', explanation: '"If your group is more than forty students, we apply the group rate."' },
          { id: 'l305', type: 'sentence-completion', prompt: 'Each student in the group pays £______.', answer: '3.50', explanation: 'The group rate is "three pounds fifty each" — not the four pounds fifty for smaller groups.' },
          { id: 'l306', type: 'sentence-completion', prompt: 'Each paying teacher pays £______.', answer: '6', explanation: '"Teacher tickets are six pounds." Only three teachers pay; the rest are free.' },
          { id: 'l307', type: 'sentence-completion', prompt: 'The touch session adds £______ to each student\u2019s fee.', answer: '2', explanation: 'The intertidal touch session costs "an extra two pounds per student".' },
          { id: 'l308', type: 'sentence-completion', prompt: 'The touch session needs to be booked at least ______ ahead.', answer: 'two weeks', explanation: 'Verbatim from the transcript: "it needs to be booked at least two weeks ahead."' },
          { id: 'l309', type: 'multiple-choice', prompt: 'Which of the following is TRUE about the café?', options: ['It serves only pre-packaged food', 'Groups may eat there until 1 p.m.', 'Outside food is allowed inside the café', 'The man\u2019s group must pre-book a table'], answer: 1, explanation: 'The café "is open to groups until one p.m." Outside food is allowed in the picnic area only, not in the café.' },
          { id: 'l310', type: 'sentence-completion', prompt: 'The number part of the booking reference is ______.', answer: '2041', explanation: 'The reference is H-A-R-V-2041; the numeric part is 2041.' }
        ]
      },
      {
        id: 'l3p2', partNumber: 2, title: 'Part 2 — Monologue (orientation talk)',
        instructions: 'Questions 11–20. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Welcome, everyone, to the first orientation for the Department of Environmental Science. My name is Dr. Ellen Marsh, and I'm the programme director. Before we start, a quick note about the building. We've just moved our second-year labs to the south wing, so if you see "ES2" posted on the white door — that's your lab from next semester. For the first year, though, you'll be in room 114, on the first floor of the north wing, next to the old chemistry store.

Now, about your timetable. Most of us expect to be in lectures on Monday mornings, and indeed that's still true for most modules. However, the statistics module has changed: it now runs on Tuesday afternoons, and the first three sessions are compulsory — the attendance record from those weeks is counted, so please don't skip.

A few practical matters — er, mostly practical. The department library opens at eight in the morning on weekdays, and since we're a small department, you don't need a reservation to use the study desks. But the microscopes — yes, the ones with the gold rings — are limited: forty in total, and this year they're booked by half-hour slots, not by the hour as before. If you try to book the whole afternoon, the system will simply reject it.

About fieldwork: our first field trip goes to the marshes at Larkwater, and we travel on the morning bus. This year, because of the river works, we've swapped the dates — it's now the 14th of September rather than the 11th. Bring waterproofs, and leave your phones in the bag if you can, because signal on the marsh is poor anyway.

Finally, the department's social event — the autumn fair — has been moved indoors to the hall, and it starts at six. I hope to see as many of you there as possible. Thank you, and welcome.`,
        questions: [
          { id: 'l311', type: 'sentence-completion', prompt: 'First-year students use lab room ______.', answer: '114', explanation: 'Second-year labs moved to the south wing, but first-years are "in room 114, on the first floor of the north wing".' },
          { id: 'l312', type: 'sentence-completion', prompt: 'The statistics module now runs on ______ afternoons.', answer: 'Tuesday', explanation: 'Most lectures are on Monday mornings, "however, the statistics module has changed: it now runs on Tuesday afternoons".' },
          { id: 'l313', type: 'sentence-completion', prompt: 'The department library opens on weekdays at ______ (number) in the morning.', answer: '8', explanation: '"The department library opens at eight in the morning on weekdays."' },
          { id: 'l314', type: 'sentence-completion', prompt: 'This year the microscopes are booked by ______, not by the hour.', answer: 'half-hour slots', explanation: 'Verbatim: "they\u2019re booked by half-hour slots, not by the hour as before."' },
          { id: 'l315', type: 'multiple-choice', prompt: 'What happens if a student tries to book a microscope for the whole afternoon?', options: ['They pay an extra fee', 'The booking is rejected automatically', 'They must ask the lab manager', 'They can book it for one hour only'], answer: 1, explanation: '"If you try to book the whole afternoon, the system will simply reject it."' },
          { id: 'l316', type: 'sentence-completion', prompt: 'The first field trip now takes place on the ______ of September.', answer: '14', explanation: 'The dates were swapped because of the river works: "now the 14th of September rather than the 11th".' },
          { id: 'l317', type: 'multiple-choice', prompt: 'Why does the speaker mention the river works?', options: ['To explain a date change', 'To describe a new lab', 'To warn about the weather', 'To introduce the field trip leader'], answer: 0, explanation: 'The river works are the reason the field trip moved from the 11th to the 14th.' },
          { id: 'l318', type: 'sentence-completion', prompt: 'Students are advised to leave their phones in the bag because signal on the marsh is ______.', answer: 'poor', explanation: '"...because signal on the marsh is poor anyway."' },
          { id: 'l319', type: 'sentence-completion', prompt: 'The autumn fair starts at ______ (number) in the evening.', answer: '6', explanation: '"...the autumn fair — has been moved indoors to the hall, and it starts at six."' },
          { id: 'l320', type: 'multiple-choice', prompt: 'Where will the autumn fair be held?', options: ['In the north wing', 'At the marshes', 'In the hall', 'In the old chemistry store'], answer: 2, explanation: 'The fair "has been moved indoors to the hall."' }
        ]
      },
      {
        id: 'l3p3', partNumber: 3, title: 'Part 3 — Academic discussion',
        instructions: 'Questions 21–30. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Tutor: Right, I'd like to move on to your group project on urban beekeeping. Nina, you handled the background reading — give us the state of play.
Nina: Sure. The main finding across the papers I read was that urban hives tend to outperform rural ones in mild years — cities are warmer and have more varied flowering, so the foraging range is richer.
Rob: That was my impression too, but one paper I found actually contradicted it. It showed urban hives in that study had higher mite counts, so the productivity advantage disappeared once you accounted for colony losses.
Tutor: Interesting. So the "urban is better" claim depends on which metric you track — honey yield or colony survival?
Nina: Exactly. And that's the point I want the presentation to make: the literature isn't inconsistent, it's just measuring different things.
Rob: I'd go further, actually. I think the real driver is less about urban versus rural and more about management quality — the best-managed rural colonies in one study beat the worst-managed urban ones easily.
Tutor: That's a fair reading. Let's test it: what would your presentation's structure look like?
Rob: Part one, the conflicting evidence; part two, the management-quality explanation; and then a short section on what that means for city councils.
Nina: I'd put the policy bit last, yes, but I'd start with the mite data instead, because that's the surprise element — the audience expects urban to be better.
Tutor: I like the mite opening. One caution, though: don't present the management-quality theory as settled fact. It's a hypothesis from one study. How do you plan to signal that?
Rob: We can say it's preliminary and cite the sample size.
Tutor: Good. And Rob, who will speak for the policy section?
Rob: Me. Nina will do the first two parts, and Tom takes the conclusion.
Tutor: Make sure Tom's conclusion references both the mite finding and the management hypothesis, or the talk will feel disconnected.
Nina: Agreed. We'll rehearse on Friday.`,
        questions: [
          { id: 'l321', type: 'multiple-choice', prompt: 'What did Nina\u2019s reading suggest about urban hives in mild years?', options: ['They need more management', 'They usually outperform rural hives', 'They produce less honey than rural ones', 'They are more affected by mites'], answer: 1, explanation: 'Nina: "urban hives tend to outperform rural ones in mild years".' },
          { id: 'l322', type: 'sentence-completion', prompt: 'Rob\u2019s paper found that urban hives in that study had higher counts of ______.', answer: 'mites', explanation: 'The contradicting paper "showed urban hives in that study had higher mite counts".' },
          { id: 'l323', type: 'multiple-choice', prompt: 'According to the tutor, the "urban is better" claim depends on what?', options: ['The quality of the management', 'Which outcome is measured', 'How mild the year is', 'The size of the hive'], answer: 1, explanation: 'Tutor: "the \u2018urban is better\u2019 claim depends on which metric you track — honey yield or colony survival?"' },
          { id: 'l324', type: 'sentence-completion', prompt: 'Rob believes the real driver is management ______, not location.', answer: 'quality', explanation: 'Rob: "the real driver is less about urban versus rural and more about management quality".' },
          { id: 'l325', type: 'sentence-completion', prompt: 'Nina agrees that the policy section should be the ______ part of the presentation.', answer: 'last', explanation: 'Nina: "I\u2019d put the policy bit last, yes".' },
          { id: 'l326', type: 'multiple-choice', prompt: 'Why does Nina want to start with the mite data?', options: ['It contradicts the audience\u2019s expectation', 'It is the longest part', 'The tutor required it', 'It is from the most recent study'], answer: 0, explanation: 'She calls it "the surprise element — the audience expects urban to be better".' },
          { id: 'l327', type: 'sentence-completion', prompt: 'The tutor says the management hypothesis is from ______ study.', answer: 'one', explanation: 'Tutor: "It\u2019s a hypothesis from one study" — so it must not be presented as settled fact.' },
          { id: 'l328', type: 'sentence-completion', prompt: '______ will speak about the policy section.', answer: 'Rob', explanation: 'Rob: "Me. Nina will do the first two parts, and Tom takes the conclusion."' },
          { id: 'l329', type: 'multiple-choice', prompt: 'What does the tutor ask of Tom\u2019s conclusion?', options: ['It should repeat the introduction', 'It should connect the mite finding with the management hypothesis', 'It should cite more sources', 'It should be delivered slowly'], answer: 1, explanation: '"Make sure Tom\u2019s conclusion references both the mite finding and the management hypothesis".' },
          { id: 'l330', type: 'sentence-completion', prompt: 'The group plans to rehearse on ______.', answer: 'Friday', explanation: 'Nina ends: "We\u2019ll rehearse on Friday."' }
        ]
      },
      {
        id: 'l3p4', partNumber: 4, title: 'Part 4 — Academic lecture',
        instructions: 'Questions 31–40. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Today's lecture is about problem-solving in one of the most cognitively flexible invertebrates we know: the octopus. I want to start with a historical note, because a lot of what we assume about "intelligence without a brain" in these animals comes from a single strand of work. In the early 1970s, a team at a California aquarium did something quite simple: they gave octopuses a jar with a screw top containing a prawn. Some octopuses figured out the lid; others just smashed the glass, which is, of course, an effective solution, but not the intended one.

That little experiment raised a bigger question. Octopuses have no long-term social learning in the way we mean it — they are largely solitary, and a mother abandons her young after they hatch. So where do new problem-solving strategies come from? The answer, in brief, is trial, error, and a very flexible nervous system: roughly a third of an octopus's neurons sit in its arms, which means each arm can explore a solution semi-independently. When a researcher blocks the obvious path, an octopus will often explore with a different arm, as if the arm itself is testing the idea.

The second theme of the lecture is what we call "tool use without tools". Octopuses don't carry tools, but they do combine objects: a well-documented case is the giant Pacific octopus assembling a pile of coconut shells to shelter in. Now — and this is important for your essay — the standard interpretation is that this is habit, not planning. The animal builds the shell suit repeatedly; it doesn't appear to plan ahead for it. So when you read the claim "octopuses plan ahead using tools", treat it as contested.

The third theme is memory. Short-term working memory in octopuses is excellent — they can hold a sequence of several dozen moves. Long-term memory is where it gets harder to measure, because you can't run the classic human experiments. Recent work using repeated, modified puzzle boxes suggests memory that lasts weeks, but the studies are small.

To sum up: flexible neural architecture, solitary learning, and an object-combining behaviour that looks like tool use but probably isn't planning. Those three ideas are the skeleton you should use in your assignments. Thank you.`,
        questions: [
          { id: 'l331', type: 'sentence-completion', prompt: 'In the early 1970s experiment, the jar contained a ______.', answer: 'prawn', explanation: '"They gave octopuses a jar with a screw top containing a prawn."' },
          { id: 'l332', type: 'multiple-choice', prompt: 'What did some octopuses do instead of opening the jar?', options: ['They ignored it', 'They broke the glass', 'They called for help', 'They escaped through the water'], answer: 1, explanation: '"Others just smashed the glass, which is, of course, an effective solution, but not the intended one."' },
          { id: 'l333', type: 'sentence-completion', prompt: 'Roughly a third of an octopus\u2019s neurons are located in its ______.', answer: 'arms', explanation: '"Roughly a third of an octopus\u2019s neurons sit in its arms" — which allows semi-independent exploration.' },
          { id: 'l334', type: 'multiple-choice', prompt: 'According to the speaker, why are octopus offspring raised alone?', options: ['The mother leaves them after hatching', 'They cannot find food', 'They are too aggressive', 'The tank is too small'], answer: 0, explanation: '"They are largely solitary, and a mother abandons her young after they hatch."' },
          { id: 'l335', type: 'sentence-completion', prompt: 'The giant Pacific octopus combines ______ to build a shelter.', answer: 'coconut shells', explanation: 'The well-documented case is the octopus "assembling a pile of coconut shells to shelter in".' },
          { id: 'l336', type: 'multiple-choice', prompt: 'What does the speaker say about the "planning" interpretation of shell suits?', options: ['It is now accepted fact', 'It is probably wrong', 'It needs no evidence', 'It was proved in the 1970s'], answer: 1, explanation: 'The standard interpretation is "habit, not planning" — so the planning claim should be treated as contested.' },
          { id: 'l337', type: 'sentence-completion', prompt: 'Octopuses can hold a sequence of ______ moves in short-term memory.', answer: 'several dozen', explanation: '"They can hold a sequence of several dozen moves."' },
          { id: 'l338', type: 'sentence-completion', prompt: 'Recent memory studies using modified puzzle boxes suggest memory that lasts ______.', answer: 'weeks', explanation: '"Recent work using repeated, modified puzzle boxes suggests memory that lasts weeks".' },
          { id: 'l339', type: 'multiple-choice', prompt: 'Why are long-term memory experiments difficult on octopuses?', options: ['They refuse to participate', 'The classic human methods cannot be applied', 'They forget too quickly', 'The tanks are too small'], answer: 1, explanation: '"Long-term memory is where it gets harder to measure, because you can\u2019t run the classic human experiments."' },
          { id: 'l340', type: 'sentence-completion', prompt: 'The lecturer says students should use ______ main ideas in their assignments.', answer: 'three', explanation: 'He lists three ideas and concludes: "Those three ideas are the skeleton you should use in your assignments."' }
        ]
      }
    ]
  };

  /* ================= READING · PRACTICE TEST 3 ================= */
  C.reading3 = {
    id: 'reading-03', title: 'Reading Practice Test 3', skill: 'Reading',
    difficulty: 'Upper-Intermediate', duration: 60,
    passages: [
      {
        id: 'r3p1', passageNumber: 1, title: 'The Procrastination Paradox', difficulty: 'Upper-Intermediate',
        text: `For most of the history of psychology, procrastination was treated as a character flaw — a moral shortcoming rather than a measurable phenomenon. The view began to change in the 1980s, when researchers started to quantify the delay between intending to act and actually acting, and a curious pattern emerged: the people who procrastinated most were not, on the whole, the laziest. In a series of studies, people high in conscientiousness and people low in it both delayed; what differed between them was not the amount of delay but the experience of it. Those low in conscientiousness delayed and felt little about it; those high in conscientiousness delayed and then punished themselves with self-criticism. The finding reframed procrastination as a problem of self-regulation rather than of effort.

The leading explanation today is what is called the affect-regulation account. Procrastination, on this view, is a short-term mood repair: the task is threatening, boring or painful, and putting it off makes the person feel better right now. The cost is deferred. This has two consequences that are easy to overlook. First, because the relief is immediate and the punishment is delayed, procrastination is especially strong for tasks whose consequences are far off — hence the classic finding that students put off assignments with distant deadlines more than those due the next week. Second, the relief produced by delay is tiny and brief. Laboratory studies measuring mood minute by minute find that the improvement lasts, on average, a matter of minutes, and the avoided anxiety returns with interest once the deadline nears. Procrastination is, in a sense, an advance withdrawal on a debt that will be repaid with compound interest.

A common misconception is that deadline pressure is the enemy of procrastination. In fact, the opposite is often true: vague or flexible deadlines are more procrastinable than fixed ones. When a deadline is distant and movable, the task can be "postponed until later" indefinitely; when it is fixed and public, the social cost of delay becomes visible. This is why the so-called commitment device literature — pre-paying for a deadline, announcing a goal publicly — tends to work: it does not change the difficulty of the task, it changes the cost of delay.

The paradox, then, is this: procrastination is simultaneously a rational and an irrational strategy. It is rational in the narrow, moment-by-moment sense — it reliably improves mood in the short term, which is why the behaviour is so common and so hard to suppress. It is irrational in the longer run, because the total cost — stress, quality, opportunity — exceeds the total benefit for the large majority of people. The same structure appears in economics under the name hyperbolic discounting: people value a small present relief more than a larger future gain, and then reverse the preference as the future becomes the present. A procrastinator who puts off an essay on Monday and then frantically finishes it on Friday is not behaving inconsistently; she is behaving consistently from two different moments, each with its own sensible priority.

None of this justifies the behaviour, of course. But the clinical literature suggests that treatment works better when it attacks the affect component rather than the effort component. Simply "trying harder" or buying a productivity app addresses neither the threat the task poses nor the mood repair the delay provides. Interventions that reframe the task (making it smaller, more concrete, or more interesting), that reduce the approach cost (a timer, a fixed start time), and that pre-commit the person to the first ten minutes all show modest but consistent effects in controlled studies. What they share is a design principle: make the first action cheaper than the imagined action. The imagined version of an essay is a whole, threatening object; the real first step — opening the document, writing one clumsy paragraph — is almost nothing, and that gap between the imagined and the actual cost is exactly where procrastination lives.`,
        questions: [
          { id: 'r301', type: 'multiple-choice', prompt: 'According to the early studies, what distinguished high- and low-conscientious procrastinators?', options: ['The amount of delay they showed', 'How they felt about the delay', 'The number of tasks they abandoned', 'Their ability to set deadlines'], answer: 1, explanation: 'The text says "what differed between them was not the amount of delay but the experience of it."' },
          { id: 'r302', type: 'multiple-choice', prompt: 'The affect-regulation account describes procrastination primarily as', options: ['a habit formed in childhood', 'a short-term mood-repair strategy', 'a symptom of low intelligence', 'a response to external pressure'], answer: 1, explanation: 'On this view, putting a task off "makes the person feel better right now" — a short-term mood repair with deferred cost.' },
          { id: 'r303', type: 'sentence-completion', prompt: 'The mood improvement produced by delay typically lasts only a matter of ______.', answer: 'minutes', explanation: 'Lab studies "find that the improvement lasts, on average, a matter of minutes."' },
          { id: 'r304', type: 'true-false-not-given', prompt: 'Procrastination is more common for tasks with near, fixed deadlines.', answer: 'FALSE', explanation: 'The opposite: "vague or flexible deadlines are more procrastinable than fixed ones", and students put off assignments with distant deadlines more.' },
          { id: 'r305', type: 'true-false-not-given', prompt: 'Commitment devices work by making the task itself easier.', answer: 'FALSE', explanation: 'The text states they "do not change the difficulty of the task, it changes the cost of delay."' },
          { id: 'r306', type: 'true-false-not-given', prompt: 'People tend to put off tasks that are threatening, boring or painful.', answer: 'TRUE', explanation: 'The affect-regulation account says "the task is threatening, boring or painful, and putting it off makes the person feel better right now."' },
          { id: 'r307', type: 'true-false-not-given', prompt: 'A specific productivity app is named in the passage as effective in controlled studies.', answer: 'NOT GIVEN', explanation: 'A productivity app is mentioned as something that does NOT work, but no app is named and no app is shown to be effective.' },
          { id: 'r308', type: 'sentence-completion', prompt: 'Announcing a goal publicly changes the ______ of delay.', answer: 'cost', explanation: 'Commitment devices "do not change the difficulty of the task, it changes the cost of delay."' },
          { id: 'r309', type: 'multiple-choice', prompt: 'The term "hyperbolic discounting" is introduced to explain', options: ['why people value present relief over larger future gains', 'how deadlines are mathematically set', 'the difference between lazy and busy students', 'why mood repair lasts only minutes'], answer: 0, explanation: 'In this economic concept "people value a small present relief more than a larger future gain, and then reverse the preference".' },
          { id: 'r310', type: 'multiple-choice', prompt: 'According to the passage, a procrastinator who finishes an essay on Friday after delaying from Monday is', options: ['behaving inconsistently', 'applying a commitment device', 'behaving consistently from two different moments', 'using the affect-regulation account correctly'], answer: 2, explanation: '"She is behaving consistently from two different moments, each with its own sensible priority."' },
          { id: 'r311', type: 'true-false-not-given', prompt: 'Controlled studies show large, consistent effects of the described interventions.', answer: 'FALSE', explanation: 'The effects are "modest but consistent" — not large.' },
          { id: 'r312', type: 'sentence-completion', prompt: 'The described interventions share the aim of making the ______ action cheaper than the imagined one.', answer: 'first', explanation: 'The design principle: "make the first action cheaper than the imagined action."' },
          { id: 'r313', type: 'multiple-choice', prompt: 'What does the passage identify as the "gap" where procrastination lives?', options: ['Between the start and the end of a task', 'Between the imagined cost and the actual cost of starting', 'Between students with fixed and flexible deadlines', 'Between the present and the future'], answer: 1, explanation: '"That gap between the imagined and the actual cost is exactly where procrastination lives."' }
        ]
      },
      {
        id: 'r3p2', passageNumber: 2, title: 'Bioluminescence: The Chemistry and Strategy of Living Light', difficulty: 'Upper-Intermediate',
        text: `About four out of every five animals in the deep sea produce light, yet the phenomenon still surprises most people, because the light is not borrowed or reflected: it is manufactured, atom by atom, by the animal itself. Bioluminescence is a chemical reaction in which a molecule called luciferin is oxidised — that is, made to give up electrons — in a process catalysed by an enzyme called luciferase. The reaction is extraordinarily efficient: unlike a filament or an LED, it produces almost no heat, and the light is emitted in a single, chosen colour. No known bioluminescent animal produces light in more than one colour, which is a striking fact, because the same chemistry, in other organisms, can in principle be tuned across the visible spectrum.

The reasons animals bother to make light fall into a handful of strategies, and the deep sea provides the cleanest examples. The first strategy is offence: a flash of light used to startle or confuse a predator. Many shrimp, for instance, produce a bright burst when attacked, and the predator, suddenly blinded by a light it has not evolved to handle, releases its prey. The second strategy is defence by deception: some fish carry a patch of light on their bellies that matches the faint glow coming down from the surface — a process called counter-illumination — which erases their shadow and makes them invisible from below. The third strategy is attraction. Anglerfish famously dangle a glowing lure, but a subtler version is the courtship display of certain dragonfish, which flash a red light invisible to most other deep-sea animals. Red is the rarest light in the dark ocean because sunlight of that wavelength is absorbed within the first hundred metres, so a red flash is, in effect, a private channel.

A further complication is that much of the light in the deep sea is not made by the animal that shows it. Many squid, fish and jellyfish harbour symbiotic bacteria in specialised organs, and the bacteria — not the host — carry the luciferin chemistry. The host provides the food and the address; the bacteria provide the light. When a predator approaches, some squid can dim their bacterial lights, an act of "self-eclipse" that is thought to work as a kind of panic button: the sudden disappearance of the glow confuses the attacker just as effectively as a flash would have.

Colour, too, is a strategic variable. Almost all deep-sea bioluminescence is blue, around 470 nanometres, because blue light travels farthest in water. The consequence for an animal is straightforward: a blue signal is the one your neighbour can see from the greatest distance. The few animals that make green light use it for short-range signals, and the rare red emitters, as we have seen, use it for private ones. The distribution is a little like the choice of radio frequencies on a crowded band: everyone settles on the wavelength that carries furthest, unless there is a specific reason to be private.

The study of bioluminescence has become, in recent years, a main tool of biology rather than merely a curiosity. Luciferase reactions are so efficient and so clean that they are used as "reporters" in the laboratory: attach the luciferin-luciferase chemistry to a gene of interest, and when that gene is active, the cell glows. In this way, scientists can watch gene activity in living animals in real time, something that dyes and stains cannot do, because they require the organism to be cut open. The same principle underlies some modern cancer research, where injected cells carrying a reporter glow when they reach a tumour.

None of this should be taken to mean the chemistry is well understood. The family of luciferins is chemically diverse — the molecule in a firefly is not the same as the one in a jellyfish, or in the deep-sea worm that glows blue. Convergence has produced the same trick many times over, in unrelated lineages, and that repeated invention is itself evidence of how useful the solution is: in the dark ocean, light is information, and the animals that make it control the conversation.`,
        questions: [
          { id: 'r314', type: 'multiple-choice', prompt: 'What makes bioluminescence different from reflected or borrowed light?', options: ['It comes in a single chosen colour', 'It is produced by a chemical reaction inside the animal', 'It produces no heat at all', 'It only works in the deep sea'], answer: 1, explanation: 'The light "is not borrowed or reflected: it is manufactured, atom by atom, by the animal itself" via the luciferin–luciferase reaction.' },
          { id: 'r315', type: 'sentence-completion', prompt: 'The enzyme that catalyses the reaction is called ______.', answer: 'luciferase', explanation: '"...a process catalysed by an enzyme called luciferase."' },
          { id: 'r316', type: 'multiple-choice', prompt: 'Counter-illumination, as described, works by', options: ['blinding the predator', 'matching the light from above to erase the animal\u2019s shadow', 'confusing the prey with a flash', 'attracting predators away'], answer: 1, explanation: 'The belly light "matches the faint glow coming down from the surface... which erases their shadow".' },
          { id: 'r317', type: 'true-false-not-given', prompt: 'All bioluminescent animals can produce light in several colours.', answer: 'FALSE', explanation: 'The text states the opposite: "No known bioluminescent animal produces light in more than one colour."' },
          { id: 'r318', type: 'true-false-not-given', prompt: 'The red light of certain dragonfish is visible to most deep-sea animals.', answer: 'FALSE', explanation: 'Their red light is "invisible to most other deep-sea animals" because red is absorbed within the first hundred metres.' },
          { id: 'r319', type: 'true-false-not-given', prompt: 'The passage gives the exact name of the bacteria that produce light in squid.', answer: 'NOT GIVEN', explanation: 'Symbiotic bacteria are described in detail, but no species is named anywhere in the passage.' },
          { id: 'r320', type: 'sentence-completion', prompt: 'In the "self-eclipse" strategy, the sudden ______ of the glow is thought to confuse the attacker.', answer: 'disappearance', explanation: '"The sudden disappearance of the glow confuses the attacker just as effectively as a flash would have."' },
          { id: 'r321', type: 'multiple-choice', prompt: 'Why can scientists watch gene activity in living animals using the reporter technique?', options: ['Because dyes work better in living tissue', 'Because the attached chemistry glows when the gene is active', 'Because the animals are cut open and stained', 'Because the genes naturally produce light'], answer: 1, explanation: '"Attach the luciferin-luciferase chemistry to a gene of interest, and when that gene is active, the cell glows."' },
          { id: 'r322', type: 'true-false-not-given', prompt: 'Luciferase reactions are used in some modern cancer research.', answer: 'TRUE', explanation: '"The same principle underlies some modern cancer research, where injected cells carrying a reporter glow when they reach a tumour."' },
          { id: 'r323', type: 'sentence-completion', prompt: 'Most deep-sea bioluminescence is blue because blue light ______ farthest in water.', answer: 'travels', explanation: '"Almost all deep-sea bioluminescence is blue... because blue light travels farthest in water."' },
          { id: 'r324', type: 'multiple-choice', prompt: 'The passage compares the distribution of bioluminescent colours to', options: ['the colours of the rainbow', 'the choice of radio frequencies on a crowded band', 'the depth of the ocean', 'the brightness of stars'], answer: 1, explanation: '"The distribution is a little like the choice of radio frequencies on a crowded band."' },
          { id: 'r325', type: 'true-false-not-given', prompt: 'The luciferin molecule in a firefly is chemically identical to the one in a jellyfish.', answer: 'FALSE', explanation: '"The molecule in a firefly is not the same as the one in a jellyfish" — the family is chemically diverse.' },
          { id: 'r326', type: 'sentence-completion', prompt: 'In symbiotic light organs, the bacteria provide the light while the host provides the food and the ______.', answer: 'address', explanation: 'Verbatim: "The host provides the food and the address; the bacteria provide the light."' }
        ]
      },
      {
        id: 'r3p3', passageNumber: 3, title: 'The Attention Economy: Who Is Paying for Your Focus?', difficulty: 'Upper-Intermediate',
        text: `When you open a free social-media app, you are not the customer; you are, in the language of the industry, the product. The phrase "attention economy" was coined in the 1990s by two economists who noticed that, as information became nearly free, the scarce resource was no longer data but the human capacity to process it. Companies therefore compete for what is now called "dwell time" — the minutes a person spends looking at a screen — and the market value of that time is real, measurable and, in most cases, substantial: the average adult spends several hours a day on social platforms, and each of those minutes is auctioned in fragments to advertisers.

The mechanisms that extend dwell time are well documented. One is the variable reward: the feed is structured so that the next item is only sometimes interesting, which is exactly the pattern that makes slot machines addictive. A fixed reward — every post equally good — is actually less compelling, because the brain stops orienting to what it can predict. Two, the interface removes friction: no typing, no searching, no decision; the scroll is a continuous, low-effort stream, and the cost of "just one more" is close to zero. Three, the social layer: notifications and likes tie the behaviour to a person's self-image, so checking the phone becomes a way of checking on one's own standing.

There is a subtler point that is rarely discussed: much of what looks like design is actually constraint. A feed is not a neutral list of everything that happened; it is a ranking, and the ranking is optimised for engagement, not for truth, novelty or wellbeing. The engineers who built these systems have said so publicly, and the internal research — a small fraction of which has leaked — repeatedly found the same uncomfortable result: the system performs best when it keeps users in a state of mild emotional agitation. Not rage, precisely; agitation. The person who is mildly unsettled returns more often than the person who is content.

The economic consequence is a strange inversion of the usual market. In a normal market, the seller of a product bears the risk of the product's quality. In the attention market, the seller of your attention — the platform — earns the advertising revenue, while you, the nominal "customer", pay with your time and, depending on the content, with your mood. The platform's cost structure is almost unrelated to how much value you receive: it keeps earning as long as you keep looking, even if what you look at is worthless to you. This is why the rational response of a user is so often different from the response the platform expects: the user who leaves at the point of diminishing returns is, economically speaking, a failure of the system.

Whether the total effect is harmful is the live question. The strongest evidence comes not from lab experiments but from the rare natural experiments that occur when a service shuts down or a feature is removed: in several such cases, measures of wellbeing and time use moved in the expected direction within weeks. The evidence is consistent with the claim that a substantial part of habitual screen time is not chosen but engineered. It is not, however, evidence that all attention to screens is bad: the same mechanisms can be, and are, used for reading, learning and communication. The difference is not the screen but the objective function — whether the system is trying to help you finish, or to keep you going.

Regulation, where it has been attempted, has so far favoured transparency over design change: labels disclosing the use of persuasive techniques, and requirements to show how the ranking works. Critics note that a disclosure without a design constraint is like a warning label on a drug whose dose is determined by the manufacturer; the user is told what is in the feed but cannot change the feed. A stronger line of argument — still a minority position — holds that the ranking itself should be treated as a kind of utility infrastructure, with public-interest obligations: that the default sort order should be chronological, or at least that users should be given a one-tap, durable choice of an unranked feed. None of these solutions has yet been tested at scale, which is itself a telling fact: the industry, which moves quickly on growth features, has moved slowly on the design of exit.`,
        questions: [
          { id: 'r327', type: 'multiple-choice', prompt: 'The phrase "attention economy" was introduced to describe a situation in which', options: ['information became scarce and expensive', 'the scarce resource was the capacity to process information', 'data became nearly free and unimportant', 'advertisers stopped paying for advertisements'], answer: 1, explanation: 'As information became nearly free, "the scarce resource was no longer data but the human capacity to process it."' },
          { id: 'r328', type: 'sentence-completion', prompt: 'The term for the minutes a person spends on a screen is "dwell ______".', answer: 'time', explanation: '"...compete for what is now called \u2018dwell time\u2019 — the minutes a person spends looking at a screen."' },
          { id: 'r329', type: 'multiple-choice', prompt: 'According to the passage, a feed of fixed rewards is', options: ['more addictive than a variable one', 'less compelling because it can be predicted', 'preferred by most users', 'the standard design of social platforms'], answer: 1, explanation: '"A fixed reward... is actually less compelling, because the brain stops orienting to what it can predict."' },
          { id: 'r330', type: 'true-false-not-given', prompt: 'The feed ranking is optimised mainly for truth and novelty.', answer: 'FALSE', explanation: 'The ranking "is optimised for engagement, not for truth, novelty or wellbeing."' },
          { id: 'r331', type: 'true-false-not-given', prompt: 'Internal research found that the system performs best when users feel mild emotional agitation.', answer: 'TRUE', explanation: '"The system performs best when it keeps users in a state of mild emotional agitation. Not rage, precisely; agitation."' },
          { id: 'r332', type: 'true-false-not-given', prompt: 'The passage states the exact annual revenue of the largest social platform.', answer: 'NOT GIVEN', explanation: 'Revenue is described in general terms ("real, measurable and, in most cases, substantial") but no figure for any company is given.' },
          { id: 'r333', type: 'sentence-completion', prompt: 'In the attention market, the platform\u2019s cost structure is almost unrelated to how much ______ the user receives.', answer: 'value', explanation: 'Verbatim: "The platform\u2019s cost structure is almost unrelated to how much value you receive."' },
          { id: 'r334', type: 'multiple-choice', prompt: 'In the attention market, who earns the advertising revenue?', options: ['The user', 'The advertiser', 'The platform', 'The ranking algorithm'], answer: 2, explanation: '"The seller of your attention — the platform — earns the advertising revenue."' },
          { id: 'r335', type: 'true-false-not-given', prompt: 'The strongest evidence cited comes from controlled laboratory experiments.', answer: 'FALSE', explanation: '"The strongest evidence comes not from lab experiments but from the rare natural experiments".' },
          { id: 'r336', type: 'true-false-not-given', prompt: 'The passage argues that the difference between harmful and helpful screen use lies in the objective function.', answer: 'TRUE', explanation: '"The difference is not the screen but the objective function — whether the system is trying to help you finish, or to keep you going."' },
          { id: 'r337', type: 'sentence-completion', prompt: 'Critics say a disclosure without a design constraint is like a warning label on a ______.', answer: 'drug', explanation: 'Verbatim: "like a warning label on a drug whose dose is determined by the manufacturer".' },
          { id: 'r338', type: 'multiple-choice', prompt: 'According to the minority position described, the ranking should', options: ['be abolished entirely', 'be treated as a kind of utility infrastructure', 'be sold to the highest bidder', 'be made more aggressive'], answer: 1, explanation: '"...holds that the ranking itself should be treated as a kind of utility infrastructure, with public-interest obligations."' },
          { id: 'r339', type: 'true-false-not-given', prompt: 'The industry has moved quickly on the design of exit.', answer: 'FALSE', explanation: 'The opposite: it "moves quickly on growth features, has moved slowly on the design of exit."' },
          { id: 'r340', type: 'multiple-choice', prompt: 'The passage suggests that a user who leaves at the point of diminishing returns is', options: ['behaving irrationally', 'a failure of the system', 'being used by the platform', 'unlikely to return'], answer: 1, explanation: '"The user who leaves at the point of diminishing returns is, economically speaking, a failure of the system."' }
        ]
      }
    ]
  };

  /* ================= WRITING · PRACTICE TEST 3 ================= */
  C.writing3 = {
    id: 'writing-03', title: 'Writing Practice Test 3', skill: 'Writing',
    difficulty: 'Upper-Intermediate', format: 'Academic', duration: 60,
    tasks: [
      {
        id: 'w301', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
        prompt: 'The line graph below shows the percentage of residents who exercised at least twice a week in two British cities, Hartford and Milford, by age group, in 1990, 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        chartData: `Hartford, ages 18–34: 52% (1990) → 47% (2005) → 58% (2020)
Hartford, ages 35–54: 44% (1990) → 39% (2005) → 46% (2020)
Hartford, ages 55 and over: 31% (1990) → 28% (2005) → 35% (2020)
Milford, ages 18–34: 49% (1990) → 44% (2005) → 55% (2020)
Milford, ages 35–54: 41% (1990) → 43% (2005) → 51% (2020)
Milford, ages 55 and over: 27% (1990) → 33% (2005) → 44% (2020)

Suggested overview: between 1990 and 2005 most groups in both cities fell or stalled, with the sharpest drops among the under-35s; after 2005 every series recovered, and by 2020 Milford's over-55s (44%) had outstripped Hartford's middle-aged group (46% is slightly higher). In both cities the under-35s were always the most active, and Milford's middle-aged residents were the only group to rise between 1990 and 2005.`,
        explanation: 'A strong answer opens with a paraphrased overview (fall-then-recovery pattern), groups data by trend rather than listing every figure, compares the two cities and age bands with accurate numbers, and ends with the most notable contrast (e.g. Milford over-55s vs Hartford under-35s).'
      },
      {
        id: 'w302', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
        prompt: 'Some people believe that governments should impose heavy taxes on unhealthy food and drink, while others think that individuals should have the freedom to make their own choices about what they eat and drink. Discuss both views and give your own opinion.',
        explanation: 'A band 7+ essay presents both sides in separate, well-developed paragraphs (health-cost argument vs personal freedom / market-choice argument), states a clear opinion, and links ideas with precise cohesion. Avoid listing unrelated ideas; one developed reason per paragraph beats three shallow ones.'
      }
    ]
  };

  /* ================= SPEAKING · PRACTICE TEST 3 ================= */
  C.speaking3 = {
    id: 'speaking-03', title: 'Speaking Practice Test 3', skill: 'Speaking',
    difficulty: 'Upper-Intermediate', duration: 14,
    parts: [
      {
        id: 'sp3p1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4-5',
        questions: [
          "Do you usually follow a fixed daily routine, or do you prefer to keep things flexible?",
          "What do you usually do on an evening when you have nothing planned?",
          "What kind of music do you listen to, and when?",
          "Do you think music can change the atmosphere of a place? Why?"
        ]
      },
      {
        id: 'sp3p2', partNumber: 2, title: 'Part 2 — Long turn (cue card)', minutes: '3-4',
        prepSeconds: 60, talkSeconds: 120,
        topic: 'Describe a skill you are currently trying to learn.',
        bullets: [
          'what the skill is',
          'why you decided to learn it',
          'how you are learning it',
          'and explain how it has affected you so far.'
        ]
      },
      {
        id: 'sp3p3', partNumber: 3, title: 'Part 3 — Discussion', minutes: '4-5',
        questions: [
          'Do you think people over fifty find it harder to learn new skills? Why or why not?',
          'How has technology changed the way people learn new skills in your country?',
          'Should schools teach practical life skills as well as academic subjects? What would you include?',
          'Will the skills people need for work change significantly in the next twenty years? How can people prepare?'
        ]
      }
    ]
  };

  /* ================= TEST META (add Test 3 to the selector) ================= */
  const existingTests = (C.testMeta && Array.isArray(C.testMeta.tests))
    ? C.testMeta.tests.filter(t => t.id !== 'test3')
    : [
        { id: 'test1', label: 'Practice Test 1', labelUz: 'Amaliyot testi 1' },
        { id: 'test2', label: 'Practice Test 2', labelUz: 'Amaliyot testi 2', premium: true }
      ];
  C.testMeta = {
    version: 3,
    tests: [...existingTests, { id: 'test3', label: 'Practice Test 3', labelUz: 'Amaliyot testi 3', premium: true }]
  };

  /* Keep the object in sync (content2.js assigns a fresh object to IELTS_CONTENT). */
  if (window.IELTS_CONTENT) window.IELTS_CONTENT = C;
})();

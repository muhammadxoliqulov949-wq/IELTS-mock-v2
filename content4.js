/* Bandly AI — Test 4 (premium, upper-intermediate difficulty).
 * All content is original and written for this app; not copied from any
 * copyrighted IELTS material. Fresh topics (no overlap with Tests 1–3):
 * film-festival phone call, food-bank orientation, microplastics
 * discussion, lighthouse lecture; reading on dream forgetting,
 * subtitles and carbon capture; Writing Task 1 is a MAP.
 */
(function () {
  const C = window.IELTS_CONTENT || {};

  /* ================= LISTENING · PRACTICE TEST 4 ================= */
  C.listening4 = {
    id: 'listening-04', title: 'Listening Practice Test 4', skill: 'Listening',
    difficulty: 'Upper-Intermediate', duration: 30,
    parts: [
      {
        id: 'l4p1', partNumber: 1, title: 'Part 1 — Everyday conversation',
        instructions: 'Questions 1–10. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Man: Palace Cinema, this is Marco. How can I help?
Woman: Hi — I'm ringing about the Autumn Film Festival next weekend. I'd like to book tickets for a group of friends, about 20 of us.
Man: Great. The festival runs from Thursday to Sunday, and the group rate is twelve pounds per ticket — actually, let me check, that's for groups of fifteen or more, and your booking needs to be made at least seventy-two hours in advance.
Woman: Seventy-two hours — so if I want the Thursday film, I need to book by Monday night?
Man: Correct. Monday at 8 p.m. is the deadline for Thursday screenings.
Woman: Good, I'm calling on time then. Which film is on Thursday at 7?
Man: That's the documentary "The Last Lighthouse Keepers" — forty minutes? No — ninety-five minutes. One of the festival highlights, actually.
Woman: Oh, that sounds good. Is it suitable for everyone?
Man: It's rated 12, so anyone under twelve would need to be accompanied by an adult.
Woman: No problem. And can we get adjacent seats?
Man: For groups of twenty, we can offer the reserved section in rows A to D, but I can only guarantee seats if I take the booking now.
Woman: I'll do it now. That's twenty tickets at the group rate, right?
Man: Twenty at twelve pounds — two hundred and forty pounds in total. I'll take card payment, and the confirmation code will start with P-C-F.`,
        questions: [
          { id: 'l401', type: 'sentence-completion', prompt: 'The caller wants tickets for about ______ friends.', answer: '20', explanation: 'The woman says "a group of friends, about 20 of us".' },
          { id: 'l402', type: 'sentence-completion', prompt: 'The group rate is available for groups of ______ or more.', answer: '15', explanation: '"...that\u2019s for groups of fifteen or more" — the man corrects himself after checking.' },
          { id: 'l403', type: 'sentence-completion', prompt: 'The group rate is £______ per ticket.', answer: '12', explanation: '"The group rate is twelve pounds per ticket."' },
          { id: 'l404', type: 'multiple-choice', prompt: 'What is the deadline for booking Thursday screenings?', options: ['Sunday 8 a.m.', 'Monday 8 p.m.', 'Tuesday 8 p.m.', 'Wednesday 7 p.m.'], answer: 1, explanation: '"Monday at 8 p.m. is the deadline for Thursday screenings."' },
          { id: 'l405', type: 'sentence-completion', prompt: 'The documentary is called "The Last ______ Keepers".', answer: 'Lighthouse', explanation: 'The Thursday film is the documentary "The Last Lighthouse Keepers".' },
          { id: 'l406', type: 'multiple-choice', prompt: 'What does the man do about the length of the documentary?', options: ['He first gives the wrong length, then corrects himself', 'He says it is one of the shortest films of the festival', 'He says it lasts exactly one hour', 'He does not know the length'], answer: 0, explanation: '"Forty minutes? No — ninety-five minutes." — a self-correction, so option A is correct.' },
          { id: 'l407', type: 'sentence-completion', prompt: 'Viewers under the age of ______ must be accompanied by an adult.', answer: '12', explanation: '"It\u2019s rated 12, so anyone under twelve would need to be accompanied by an adult."' },
          { id: 'l408', type: 'sentence-completion', prompt: 'Group seats are offered in the reserved section in rows ______.', answer: 'A to D', explanation: '"We can offer the reserved section in rows A to D".' },
          { id: 'l409', type: 'sentence-completion', prompt: 'The total price for twenty tickets is £______.', answer: '240', explanation: '"Twenty at twelve pounds — two hundred and forty pounds in total."' },
          { id: 'l410', type: 'multiple-choice', prompt: 'What will the confirmation code start with?', options: ['P-C-F', 'A-F-C', 'C-F-P', 'PCF-20'], answer: 0, explanation: '"The confirmation code will start with P-C-F."' }
        ]
      },
      {
        id: 'l4p2', partNumber: 2, title: 'Part 2 — Monologue (volunteer orientation)',
        instructions: 'Questions 11–20. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Good afternoon, and welcome to the Riverside Food Bank — I'm Dana, the volunteer coordinator. Before we start, a word about what we do: we take donated groceries from four local supermarkets and distribute them, every week, to about two hundred families in the district.

Your role, this term, is on the sorting shelf, on Wednesday afternoons, from two until five. That's when the supermarket vans arrive, and the work is physical — boxes of up to fifteen kilos — so wear closed shoes. The first Wednesday is always a shadow day: you work alongside an experienced volunteer, and you don't handle anything on your own.

A few practical matters. The food bank is in the old grain warehouse, next to the bus station — if you cycle, there are racks outside the north door. The building has a lift now, which wasn't the case last year, so the upper store is accessible to everyone. Volunteers park in the staff car park behind the warehouse; the visitor car park on the corner is not available to us — I know it's closer, but there have been issues with the security gates.

One important rule: anything you handle must stay sealed. If a box is open or damaged, set it on the red shelf at the end of the room, and someone will check it with the supplier. Don't decide to use it or throw it out yourself — that's the one rule we ask everyone to follow, without exceptions.

And finally, two little things. Bring your own water bottle — there's no café on site, and the kettle is for the staff only. And if you're bringing a friend along to the shadow day, let me know in advance, because the warehouse is licensed for a maximum of twelve volunteers at a time.

Thank you all, and — despite what you've just heard about the boxes — I promise it's more rewarding than heavy.`,
        questions: [
          { id: 'l411', type: 'sentence-completion', prompt: 'The food bank serves about ______ families each week.', answer: '200', explanation: 'They distribute to "about two hundred families in the district" every week.' },
          { id: 'l412', type: 'sentence-completion', prompt: 'Volunteers work on the sorting shelf on ______ afternoons.', answer: 'Wednesday', explanation: '"Your role, this term, is on the sorting shelf, on Wednesday afternoons".' },
          { id: 'l413', type: 'sentence-completion', prompt: 'The boxes can weigh up to ______ kilos.', answer: '15', explanation: '"The work is physical — boxes of up to fifteen kilos."' },
          { id: 'l414', type: 'sentence-completion', prompt: 'On the first Wednesday, volunteers work alongside an experienced ______.', answer: 'volunteer', explanation: 'The first Wednesday "is always a shadow day: you work alongside an experienced volunteer".' },
          { id: 'l415', type: 'multiple-choice', prompt: 'Why does the speaker mention the lift?', options: ['To explain where the car park is', 'To say the upper store is now accessible to everyone', 'To describe a new building', 'To warn about the stairs'], answer: 1, explanation: '"The building has a lift now... so the upper store is accessible to everyone."' },
          { id: 'l416', type: 'sentence-completion', prompt: 'Volunteers should park in the car park ______ the warehouse.', answer: 'behind', explanation: '"Volunteers park in the staff car park behind the warehouse" — the closer visitor car park is not available.' },
          { id: 'l417', type: 'sentence-completion', prompt: 'Open or damaged boxes must be put on the ______ shelf.', answer: 'red', explanation: '"If a box is open or damaged, set it on the red shelf at the end of the room".' },
          { id: 'l418', type: 'multiple-choice', prompt: 'What should a volunteer do with an open box?', options: ['Use it themselves', 'Throw it out', 'Put it on the red shelf for checking', 'Seal it and keep it'], answer: 2, explanation: 'The one rule: set it on the red shelf and let someone check it with the supplier — "without exceptions".' },
          { id: 'l419', type: 'sentence-completion', prompt: 'The kettle in the building is for ______ only.', answer: 'staff', explanation: '"There\u2019s no café on site, and the kettle is for the staff only".' },
          { id: 'l420', type: 'sentence-completion', prompt: 'The warehouse is licensed for a maximum of ______ volunteers at a time.', answer: '12', explanation: '"The warehouse is licensed for a maximum of twelve volunteers at a time."' }
        ]
      },
      {
        id: 'l4p3', partNumber: 3, title: 'Part 3 — Academic discussion',
        instructions: 'Questions 21–30. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Tutor: So — your group project on microplastics in the food chain. Amira, you've read the marine studies; walk us through the headline finding.
Amira: Right. The central result is that microplastics now appear in virtually every food group we tested in the literature — fish, shellfish, but also salt, beer and honey. The amounts are small, but the ubiquity is the story, not the concentration.
Ben: That matches what I found for shellfish specifically. One review I read found particles in over ninety percent of the samples, and the oysters had the highest load, because they filter huge volumes of water.
Tutor: Good. Now — the part that's caused the most debate. What does the evidence say about whether this is a health risk?
Amira: Honestly, less than you'd expect. Most of the studies are animal studies, and the doses are far higher than human exposure. A few human trials have been started, but the findings so far are mixed.
Ben: And I'd add that "small amounts" cuts both ways. The risk might be negligible — or it might be an effect we haven't measured yet, because we lack long-term human data.
Tutor: Exactly. So how do you plan to handle that in your presentation?
Ben: We'll present it in two halves: part one, the evidence we have; part two, the evidence we don't. And we'll make the uncertainty explicit, rather than pretending to have an answer.
Amira: I'd add one more element — a short section on what individuals can realistically do, because the audience will ask. But I want to keep it honest: the evidence that filters or diet changes make a big difference is, frankly, thin.
Tutor: That's the right instinct. One caution, though: don't let the "what you can do" part turn into a shopping list.
Ben: Understood — we'll keep it to one slide.
Tutor: Who takes which part?
Amira: I'll open with the evidence we have. Ben does the uncertainty section, and Yara closes with the individual-actions slide and the conclusion.
Tutor: And make sure the conclusion returns to the opening point — ubiquity, not concentration — so the talk feels like an arc, not a list.
Ben: We'll rehearse it on Thursday after lectures.`,
        questions: [
          { id: 'l421', type: 'multiple-choice', prompt: 'According to Amira, what is the central story of the research?', options: ['The high concentrations found', 'The wide spread of microplastics across food groups', 'The proven health risks to humans', 'The quality of the studies'], answer: 1, explanation: '"The amounts are small, but the ubiquity is the story, not the concentration."' },
          { id: 'l422', type: 'sentence-completion', prompt: 'In one review, particles were found in over ______ percent of shellfish samples.', answer: '90', explanation: 'Ben: "one review I read found particles in over ninety percent of the samples".' },
          { id: 'l423', type: 'sentence-completion', prompt: 'Oysters showed the highest load because they filter huge volumes of ______.', answer: 'water', explanation: '"...the oysters had the highest load, because they filter huge volumes of water."' },
          { id: 'l424', type: 'multiple-choice', prompt: 'Why is the health-risk evidence considered limited?', options: ['Most studies use human volunteers', 'The doses in animal studies are far above human exposure', 'The studies were all done on oysters', 'No human trials have been started'], answer: 1, explanation: '"Most of the studies are animal studies, and the doses are far higher than human exposure."' },
          { id: 'l425', type: 'sentence-completion', prompt: 'The group will make the ______ of the evidence explicit in their presentation.', answer: 'uncertainty', explanation: 'Ben: "we\u2019ll make the uncertainty explicit, rather than pretending to have an answer."' },
          { id: 'l426', type: 'multiple-choice', prompt: 'How will the group handle the "what can individuals do" section?', options: ['With a detailed shopping list', 'With one honest slide, noting the evidence is thin', 'By recommending water filters', 'By avoiding the topic entirely'], answer: 1, explanation: 'Amira wants to "keep it honest: the evidence... is, frankly, thin", and Ben keeps it to one slide.' },
          { id: 'l427', type: 'sentence-completion', prompt: '______ will give the conclusion.', answer: 'Yara', explanation: 'Amira: "Yara closes with the individual-actions slide and the conclusion."' },
          { id: 'l428', type: 'multiple-choice', prompt: 'Why does the tutor want the conclusion to return to the opening point?', options: ['To make the talk longer', 'So the presentation feels like an arc, not a list', 'Because the audience will ask', 'To check the slide count'], answer: 1, explanation: '"...so the talk feels like an arc, not a list."' },
          { id: 'l429', type: 'sentence-completion', prompt: 'The group plans to rehearse on ______.', answer: 'Thursday', explanation: 'Ben: "We\u2019ll rehearse it on Thursday after lectures."' },
          { id: 'l430', type: 'sentence-completion', prompt: 'Amira says the evidence that filters or diet changes help is, frankly, ______.', answer: 'thin', explanation: 'Verbatim: "the evidence that filters or diet changes make a big difference is, frankly, thin."' }
        ]
      },
      {
        id: 'l4p4', partNumber: 4, title: 'Part 4 — Academic lecture',
        instructions: 'Questions 31–40. You will hear this recording ONCE. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.',
        transcript: `Today's lecture follows the story of the lighthouse — one of the oldest pieces of safety engineering we have, and a better design history than most people assume.

The oldest lighthouses were not, strictly, lighthouses at all. The famous lighthouse of Alexandria — the Pharos — is usually dated to the third century B.C., and it was a tower with a fire on top: not a light in the optical sense, but a very large flame that ships could see for miles. That is the crucial first step, and it's worth pausing on: for most of history, "lighting a coast" meant nothing more than making a bigger fire.

The first real optical advance came with the development of polished metal reflectors, which focused the fire into a beam. But the beam was still weak, because the source was a flame. The story changes completely in the early nineteenth century, with two inventions that are often mentioned together and deserve separating. The first is the Fresnel lens, developed by Augustin Fresnel in France: a lens built from a stack of concentric prisms that gathers light from a lamp and sends it out as a thin, powerful sheet. The second is the lamp itself — the switch from an open flame to an oil lamp, and later to a sealed, efficient burner. Neither invention alone transformed lighthouses; it was the combination that pushed the visible range from a few miles to, in the best cases, over twenty.

There is a useful engineering lesson in the design of those great coastal lighthouses. Most were built to be seen, not to see: the tower's height and the lens's position were chosen for the light's reach, and the keeper's quarters were an afterthought. That is why, in many lighthouses, the living space is cold and the windows face the wrong way. A famous example is the Eddystone lighthouse in British waters, whose third version, completed in 1759, survived a century of storms — and whose keepers complained, for decades, that the building was barely fit for human habitation.

The second theme is automation. Until the 1990s, most working lighthouses had a human keeper; today the great majority are automated, and only a handful of keepers remain in service anywhere in the world. What remains manual — and what a modern lighthouse still needs — is not a person at the lamp but a maintenance culture: the optics are now checked far less often than the electronics, and the failure mode of a modern lighthouse is software and power, not fog and flame.

To sum up for your assignment: a lighthouse is a story of three steps — fire, then optics, then automation — and a reminder that a safety device is only as good as the boring maintenance behind it. Thank you.`,
        questions: [
          { id: 'l431', type: 'sentence-completion', prompt: 'The lighthouse of Alexandria is usually dated to the ______ century B.C.', answer: 'third', explanation: '"The famous lighthouse of Alexandria — the Pharos — is usually dated to the third century B.C."' },
          { id: 'l432', type: 'multiple-choice', prompt: 'What was the Pharos, strictly speaking?', options: ['A lens-based light', 'A tower with a fire on top', 'A ship with a lamp', 'A signal mirror'], answer: 1, explanation: '"...it was a tower with a fire on top: not a light in the optical sense".' },
          { id: 'l433', type: 'sentence-completion', prompt: 'Polished metal reflectors were used to focus the fire into a ______.', answer: 'beam', explanation: '"Polished metal reflectors, which focused the fire into a beam."' },
          { id: 'l434', type: 'sentence-completion', prompt: 'The Fresnel lens is built from a stack of concentric ______.', answer: 'prisms', explanation: '"A lens built from a stack of concentric prisms that gathers light from a lamp".' },
          { id: 'l435', type: 'multiple-choice', prompt: 'According to the speaker, what transformed lighthouses?', options: ['The Fresnel lens alone', 'The lamp alone', 'The combination of lens and lamp', 'The height of the tower'], answer: 2, explanation: '"Neither invention alone transformed lighthouses; it was the combination".' },
          { id: 'l436', type: 'sentence-completion', prompt: 'In the best cases, the visible range was pushed to over ______ miles.', answer: '20', explanation: '"...pushed the visible range from a few miles to, in the best cases, over twenty."' },
          { id: 'l437', type: 'multiple-choice', prompt: 'Why were many lighthouse living quarters poor?', options: ['The keepers were unhappy', 'The towers were designed for the light\u2019s reach, not for comfort', 'The materials were of low quality', 'The keepers were not allowed windows'], answer: 1, explanation: '"Most were built to be seen, not to see... and the keeper\u2019s quarters were an afterthought."' },
          { id: 'l438', type: 'sentence-completion', prompt: 'The third Eddystone lighthouse, completed in ______, survived a century of storms.', answer: '1759', explanation: '"...whose third version, completed in 1759, survived a century of storms".' },
          { id: 'l439', type: 'multiple-choice', prompt: 'What is the main "failure mode" of a modern lighthouse?', options: ['Fog and flame', 'Storm damage', 'Software and power problems', 'Keeper error'], answer: 2, explanation: '"The failure mode of a modern lighthouse is software and power, not fog and flame."' },
          { id: 'l440', type: 'sentence-completion', prompt: 'The speaker says a lighthouse is a story of ______ main steps.', answer: 'three', explanation: '"A lighthouse is a story of three steps — fire, then optics, then automation."' }
        ]
      }
    ]
  };

  /* ================= READING · PRACTICE TEST 4 ================= */
  C.reading4 = {
    id: 'reading-04', title: 'Reading Practice Test 4', skill: 'Reading',
    difficulty: 'Upper-Intermediate', duration: 60,
    passages: [
      {
        id: 'r4p1', passageNumber: 1, title: 'Why Do We Forget Our Dreams?', difficulty: 'Upper-Intermediate',
        text: `Most adults recall a dream at least once a week, and most of us can tell you, without much reflection, that we forget the rest. The forgetting is not a flaw in the system; for a long time it was treated as proof that dreams themselves were unimportant — a nightly static, brain noise with no message. Modern research has turned that around: we now think of dreaming as a normal part of memory processing, and the question is no longer why we dream, but why the content disappears so quickly.

The first clue comes from where dreams are stored. During sleep, the hippocampus — the brain region that holds the day's new memories — is unusually quiet, while the regions that hold old, emotional memories are unusually active. One interpretation is that the brain uses sleep to move the day's raw material into long-term storage, and that dreams are partly the process of that transfer: the raw material being recombined, exaggerated, and filed. If that is right, a dream is not a memory of anything that happened; it is a trace of the filing itself. Filing has no story, which may be why the content that surfaces feels absurd on waking and meaningless by lunchtime.

The second clue is chemical. The neurotransmitter norepinephrine, which is part of the system that tags experiences as worth remembering, drops to near zero during REM sleep — the stage in which most vivid dreams occur. A brain without norepinephrine is a brain that is not writing anything down. The standard interpretation is therefore that dreams, in neurological terms, are experiences the brain has decided not to save. We can have them, feel them, and even be emotionally shaken by them, and still leave no trace behind — the same way a rehearsal leaves no performance.

There is a practical puzzle in this. Some people remember their dreams vividly, and some almost never do, and the difference is not, as is often assumed, how deeply they slept. It is largely a habit of attention. People who wake and lie still, holding the first image in mind, recall far more than people who roll over and reach for their phone. The first minutes of waking are a window in which the dream is still accessible; it closes fast, and the window closes even faster the more the new waking world intrudes. Several studies have found that simply writing down anything that comes to mind within a minute of waking — even a single object — improves dream recall over the following days, suggesting that the habit of attention changes what the brain decides is worth keeping.

The third line of work is the most uncomfortable, because it concerns what forgetting is for. If dreams are the brain's overnight reorganisation of emotional material, then forgetting the details while keeping the emotional tone may be the design, not a bug. The dream is processed, the feeling is filed, and the content — which is often a garbled mixture of unrelated fragments — is allowed to dissolve. Therapists who work with dreams have long argued in this direction: the meaning of a dream, they say, is rarely in its story. The emerging consensus in the laboratory is broadly similar: what survives the night is not the plot but the emotional residue, and the rapid fade of the plot is what keeps the residue usable.

None of this solves the practical mystery of the individual case — why a particular dream clings while its neighbour vanishes. But the overall picture has changed a great deal from "nightly static". Dreams look less like noise and more like a process with a purpose, and the forgetting looks less like a failure of memory than the last step of the job.`,
        questions: [
          { id: 'r401', type: 'multiple-choice', prompt: 'How did earlier research treat the forgetting of dreams?', options: ['As a sign of poor health', 'As proof that dreams were unimportant', 'As a normal part of ageing', 'As a problem only of deep sleep'], answer: 1, explanation: 'The forgetting "was treated as proof that dreams themselves were unimportant — a nightly static".' },
          { id: 'r402', type: 'sentence-completion', prompt: 'During sleep, the hippocampus is unusually ______.', answer: 'quiet', explanation: '"During sleep, the hippocampus... is unusually quiet".' },
          { id: 'r403', type: 'multiple-choice', prompt: 'If the "filing" interpretation is correct, a dream is best described as', options: ['a memory of a real event', 'a trace of the memory-transfer process', 'a replay of the day\u2019s events', 'a message from the unconscious'], answer: 1, explanation: '"A dream is not a memory of anything that happened; it is a trace of the filing itself."' },
          { id: 'r404', type: 'true-false-not-given', prompt: 'Norepinephrine levels rise during REM sleep.', answer: 'FALSE', explanation: 'The opposite: norepinephrine "drops to near zero during REM sleep".' },
          { id: 'r405', type: 'true-false-not-given', prompt: 'In neurological terms, dreams are experiences the brain has decided not to save.', answer: 'TRUE', explanation: 'Verbatim: "dreams, in neurological terms, are experiences the brain has decided not to save."' },
          { id: 'r406', type: 'true-false-not-given', prompt: 'People who sleep more deeply recall more dreams.', answer: 'FALSE', explanation: 'The difference "is not, as is often assumed, how deeply they slept" — it is a habit of attention.' },
          { id: 'r407', type: 'true-false-not-given', prompt: 'A specific drug that improves dream recall is named in the passage.', answer: 'NOT GIVEN', explanation: 'No drug is mentioned anywhere; the passage discusses attention habits, not pharmacology.' },
          { id: 'r408', type: 'sentence-completion', prompt: 'Holding the first image in mind after waking helps keep the ______ accessible.', answer: 'dream', explanation: 'People who keep holding the first image "recall far more" — the window stays open longer.' },
          { id: 'r409', type: 'multiple-choice', prompt: 'According to the studies cited, writing something down within a minute of waking', options: ['ends the window of recall', 'improves dream recall in later days', 'has no measurable effect', 'only works for vivid dreamers'], answer: 1, explanation: '"...improves dream recall over the following days, suggesting that the habit of attention changes what the brain decides is worth keeping."' },
          { id: 'r410', type: 'true-false-not-given', prompt: 'Therapists who work with dreams usually find the meaning in the dream\u2019s story.', answer: 'FALSE', explanation: 'The opposite: "the meaning of a dream, they say, is rarely in its story."' },
          { id: 'r411', type: 'sentence-completion', prompt: 'What survives the night, according to the emerging consensus, is the ______ residue.', answer: 'emotional', explanation: '"What survives the night is not the plot but the emotional residue".' },
          { id: 'r412', type: 'multiple-choice', prompt: 'The passage\u2019s overall argument is that dream forgetting', options: ['is a failure of memory', 'is the last step of a purposeful process', 'only affects some people', 'proves dreams are random noise'], answer: 1, explanation: 'The final line: "the forgetting looks less like a failure of memory than the last step of the job."' },
          { id: 'r413', type: 'sentence-completion', prompt: 'The author says the dream content that surfaces on waking often feels ______.', answer: 'absurd', explanation: '"...the content that surfaces feels absurd on waking and meaningless by lunchtime."' }
        ]
      },
      {
        id: 'r4p2', passageNumber: 2, title: 'The Silent Revolution: How Subtitles Changed Global Cinema', difficulty: 'Upper-Intermediate',
        text: `For most of cinema's history, a film was a local product. Hollywood reached the world, yes, but everywhere else, the dominant product was the local one: India had its own industry, France its own, and the British audience largely stayed home. The change began quietly, with two technologies that are now so ordinary they are invisible — the subtitle, and, later, the dub — and it reshaped not only what films cross borders, but how audiences relate to films that are not their own.

The subtitle came first, and it arrived as a compromise. In the early sound era, the standard solution for foreign markets was re-recording: new actors re-voiced the original film in the local language. The subtitle was the cheaper alternative, and for decades it was treated as a downgrade — a device for the less sophisticated audience. The hierarchy was simple: dubbing for the mass market, subtitles for the connoisseur. The economics reinforced the status: dubbing was a large upfront cost spread over a wide release, while subtitling was almost free.

Two things broke the hierarchy. The first was television. In the 1960s and 70s, a handful of European broadcasters began showing subtitled imports on the main channel, at prime time, and a whole generation of viewers in France, Germany and the Netherlands learned to read English while they watched. The skill became normal, and with it the sense that a foreign film was not a specialist product but an ordinary evening. The second change was the collapse of distribution costs. A subtitled release no longer needed a local dub to be viable, and the streaming era made the economics almost absurd: a catalogue of tens of thousands of titles can carry subtitles in dozens of languages for a cost that a single dubbing studio would laugh at.

The cultural effects have been uneven, and it is worth being precise about them. Subtitles widened access to foreign cinema almost everywhere they are used, but they did not make local industries irrelevant — in several of the largest subtitle-using markets, local films still take the majority of screen time, because the audience's attachment to the local language is a strong competitive advantage. What subtitles did is raise the floor: a smaller local film can now compete, not against the local giant, but against a global catalogue, and the choice available to any viewer on any night is the widest in the history of the medium.

There is a further, less discussed effect on the films themselves. Directors and studios in subtitle markets have long argued that subtitled audiences reward clarity of image and action, because the words are not available in the original sound — and there is some evidence in the award records to support it. The claim is stronger than the evidence, but the direction is plausible: when a market is trained to watch a foreign film closely, the films that win in it tend to be the ones that carry their meaning in the frame, not in the dialogue.

The story is not finished. Dubbing is making a comeback in several markets, not because of technology but because of a change in taste: a younger generation, raised on subtitled television, now treats dubbing as a comfort product, the way a printed edition is a comfort product for a reader who prefers translations. The medium has settled into a stable bilingual state — original sound with local text, or local sound with the original implied — and the "revolution" is best understood as a change in the default. What was once a compromise for the connoisseur is now the ordinary way the world watches the world's films.`,
        questions: [
          { id: 'r414', type: 'multiple-choice', prompt: 'In the early sound era, the standard solution for foreign markets was', options: ['subtitling the original', 're-recording the film in the local language', 'banning foreign films', 'showing silent versions'], answer: 1, explanation: '"The standard solution for foreign markets was re-recording: new actors re-voiced the original film in the local language."' },
          { id: 'r415', type: 'sentence-completion', prompt: 'For decades, subtitling was treated as a ______ for the less sophisticated audience.', answer: 'downgrade', explanation: '"...for decades it was treated as a downgrade — a device for the less sophisticated audience."' },
          { id: 'r416', type: 'multiple-choice', prompt: 'What reinforced the dubbing-versus-subtitles hierarchy?', options: ['The quality of the dubs', 'The economics: a large upfront cost for dubbing, almost none for subtitling', 'Government restrictions', 'The availability of actors'], answer: 1, explanation: '"The economics reinforced the status: dubbing was a large upfront cost... while subtitling was almost free."' },
          { id: 'r417', type: 'true-false-not-given', prompt: 'Dubbing was cheaper than subtitling in the early era.', answer: 'FALSE', explanation: 'The opposite: dubbing "was a large upfront cost", while subtitling "was almost free".' },
          { id: 'r418', type: 'true-false-not-given', prompt: 'European viewers in the 1960s and 70s partly learned to read a foreign language through subtitled television.', answer: 'TRUE', explanation: '"A whole generation of viewers in France, Germany and the Netherlands learned to read English while they watched."' },
          { id: 'r419', type: 'true-false-not-given', prompt: 'The passage gives the exact cost of subtitling a feature film today.', answer: 'NOT GIVEN', explanation: 'Costs are described relatively ("a cost that a single dubbing studio would laugh at") but no figure is given.' },
          { id: 'r420', type: 'sentence-completion', prompt: 'Streaming made it possible for a large catalogue to carry subtitles in ______ languages.', answer: 'dozens of', explanation: 'Verbatim: "can carry subtitles in dozens of languages for a cost that a single dubbing studio would laugh at."' },
          { id: 'r421', type: 'multiple-choice', prompt: 'What did subtitles NOT do, according to the passage?', options: ['Widen access to foreign cinema', 'Raise the competitive floor for smaller local films', 'Make local industries irrelevant', 'Change the default way audiences watch foreign films'], answer: 2, explanation: '"They did not make local industries irrelevant" — in several markets local films still take most of the screen time.' },
          { id: 'r422', type: 'true-false-not-given', prompt: 'In several of the largest subtitle-using markets, local films still take most of the screen time.', answer: 'TRUE', explanation: 'Verbatim: "in several of the largest subtitle-using markets, local films still take the majority of screen time".' },
          { id: 'r423', type: 'sentence-completion', prompt: 'Studios in subtitle markets argue that subtitled audiences reward clarity of ______ and action.', answer: 'image', explanation: 'Verbatim: "subtitled audiences reward clarity of image and action".' },
          { id: 'r424', type: 'multiple-choice', prompt: 'The passage says the "clarity of image" claim is', options: ['fully proved by award records', 'stronger than the evidence behind it', 'rejected by all studios', 'irrelevant to the argument'], answer: 1, explanation: '"The claim is stronger than the evidence, but the direction is plausible."' },
          { id: 'r425', type: 'true-false-not-given', prompt: 'The passage suggests dubbing is returning partly because younger viewers treat it as a comfort product.', answer: 'TRUE', explanation: '"A younger generation, raised on subtitled television, now treats dubbing as a comfort product".' },
          { id: 'r426', type: 'sentence-completion', prompt: 'The author says the subtitle "revolution" is best understood as a change in the ______.', answer: 'default', explanation: 'Verbatim: "the \u2018revolution\u2019 is best understood as a change in the default".' }
        ]
      },
      {
        id: 'r4p3', passageNumber: 3, title: 'Carbon Capture: Promising, Expensive, and Complicated', difficulty: 'Upper-Intermediate',
        text: `Carbon capture and storage — the process of catching carbon dioxide at the point where it is emitted, and burying it — is the technology that climate economists most need and least trust. It is needed because several industries, from cement to steel, emit carbon in ways that are hard to avoid by switching to electricity. It is distrusted because the few large plants that exist have cost far more than promised, and because the money spent on them so far is a small fraction of what would be required.

The technology is older than its reputation suggests. Capturing CO2 from a gas stream is a basic industrial operation; it has been done since the 1930s in the production of pure gases for food and medicine. The difficulty is not the capture in the abstract but the capture at the scale and cost of a power plant or a cement kiln, where the gas is dilute, the volumes are enormous, and the energy cost of separation is the difference between a business and a charity.

That energy cost is the core of the problem. The most common capture method, amine scrubbing, works by passing the flue gas through a chemical solution that absorbs the CO2, and then heating the solution to release it. The heating is the expensive part — in effect, the plant burns fuel to catch the carbon of other fuel. A modern plant captures well over a tonne of CO2 every hour, but each tonne costs, at current prices, something between sixty and a hundred dollars, before the cost of moving and storing the gas is added. For comparison, the marginal cost of preventing a tonne of CO2 by, say, replacing a gas heater with a heat pump is often lower, and the policy question is therefore not whether capture works — it does — but whether it is the cheapest tonne available.

The storage side is cheaper than the capture side, and less understood by the public. Most stored CO2 is not, in fact, kept in simple tanks: the largest single sink in the world is the geological formations of the North Sea, where CO2 has been injected since the 1990s. The risk that concerns engineers is not that a buried store will fail in a dramatic way, but that the monitoring and liability regime around a store is young, and that the legal ownership of a buried tonne — whose property is it, and for how long — is unsettled in most jurisdictions. These are unglamorous questions, but they are the ones that determine whether a store can be financed.

The newest chapter is direct air capture: machines that pull CO2 straight from ambient air, without an emission source to work from. The physics is unforgiving — the concentration of CO2 in air is about three hundred times lower than in a flue gas stream — and the plants that exist are small and expensive, in the thousands of dollars per tonne. Their real role today is not as a carbon-removal engine but as a signal: they show that the chemistry is possible, and they give investors a place to put the money that industrial capture, so far, has not earned.

The honest summary is a three-part one. Capture is real, and it will be required for a meaningful share of hard-to-abate emissions. It is not, at present, the cheapest way to cut those emissions, and no credible plan for reaching net zero relies on it being cheap. And the gap between the two facts — the gap between "required" and "competitive" — is a price, and someone will have to pay it, in taxes, in investment, or in the cost of the things we already buy. The technology is not a rescue. It is a bill.`,
        questions: [
          { id: 'r427', type: 'multiple-choice', prompt: 'Why do climate economists consider carbon capture necessary?', options: ['Because it is the cheapest option', 'Because some industries emit carbon in ways that are hard to avoid', 'Because it removes CO2 directly from the air', 'Because it is required by law in every country'], answer: 1, explanation: '"It is needed because several industries, from cement to steel, emit carbon in ways that are hard to avoid".' },
          { id: 'r428', type: 'sentence-completion', prompt: 'CO2 capture from gas streams has been done since the ______ in the production of pure gases.', answer: '1930s', explanation: '"It has been done since the 1930s in the production of pure gases for food and medicine."' },
          { id: 'r429', type: 'true-false-not-given', prompt: 'The main difficulty lies in capturing CO2 from a dilute gas at large scale.', answer: 'TRUE', explanation: '"The difficulty is... the capture at the scale and cost of a power plant or a cement kiln, where the gas is dilute, the volumes are enormous".' },
          { id: 'r430', type: 'sentence-completion', prompt: 'In amine scrubbing, the expensive part is ______ the solution to release the CO2.', answer: 'heating', explanation: '"The heating is the expensive part — in effect, the plant burns fuel to catch the carbon of other fuel."' },
          { id: 'r431', type: 'multiple-choice', prompt: 'At current prices, each captured tonne of CO2 costs', options: ['a few dollars', 'something between sixty and a hundred dollars', 'thousands of dollars', 'more than a million dollars'], answer: 1, explanation: '"Each tonne costs, at current prices, something between sixty and a hundred dollars" — the "thousands" figure applies to direct air capture, not plant capture.' },
          { id: 'r432', type: 'true-false-not-given', prompt: 'The largest single CO2 sink in the world is in the geological formations of the North Sea.', answer: 'TRUE', explanation: 'Verbatim: "the largest single sink in the world is the geological formations of the North Sea".' },
          { id: 'r433', type: 'true-false-not-given', prompt: 'Most of the world\u2019s stored CO2 is kept in onshore storage facilities.', answer: 'FALSE', explanation: 'The largest sink is the North Sea formations — offshore; the passage does not describe the rest as onshore.' },
          { id: 'r434', type: 'true-false-not-given', prompt: 'The legal ownership of buried CO2 is settled in most jurisdictions.', answer: 'FALSE', explanation: 'The opposite: ownership "is unsettled in most jurisdictions".' },
          { id: 'r435', type: 'true-false-not-given', prompt: 'The concentration of CO2 in ambient air is about three hundred times lower than in a flue gas stream.', answer: 'TRUE', explanation: 'Verbatim: "the concentration of CO2 in air is about three hundred times lower than in a flue gas stream."' },
          { id: 'r436', type: 'sentence-completion', prompt: 'Direct air capture machines today cost thousands of dollars per ______.', answer: 'tonne', explanation: '"The plants that exist are small and expensive, in the thousands of dollars per tonne."' },
          { id: 'r437', type: 'multiple-choice', prompt: 'According to the passage, what is the real role of direct air capture today?', options: ['A large-scale carbon-removal engine', 'A signal that the chemistry is possible', 'A method of storing carbon', 'A form of amine scrubbing'], answer: 1, explanation: '"Their real role today is not as a carbon-removal engine but as a signal: they show that the chemistry is possible".' },
          { id: 'r438', type: 'true-false-not-given', prompt: 'No credible net-zero plan relies on capture becoming cheap.', answer: 'TRUE', explanation: 'Verbatim: "no credible plan for reaching net zero relies on it being cheap."' },
          { id: 'r439', type: 'sentence-completion', prompt: 'The gap between "required" and "competitive" is described as a ______ that someone must pay.', answer: 'price', explanation: '"The gap between \u2018required\u2019 and \u2018competitive\u2019 — is a price, and someone will have to pay it".' },
          { id: 'r440', type: 'multiple-choice', prompt: 'The passage ends by comparing carbon capture to', options: ['a rescue', 'a bill', 'a charity', 'a compromise'], answer: 1, explanation: 'The final line: "The technology is not a rescue. It is a bill."' }
        ]
      }
    ]
  };

  /* ================= WRITING · PRACTICE TEST 4 ================= */
  C.writing4 = {
    id: 'writing-04', title: 'Writing Practice Test 4', skill: 'Writing',
    difficulty: 'Upper-Intermediate', format: 'Academic', duration: 60,
    tasks: [
      {
        id: 'w401', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
        prompt: 'The two maps below show a coastal town, Dune Bay, in 1995 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        chartData: `1995:
- A small harbour with fishing boats at the west of the bay
- A fish market on the harbour front
- A sand dune area with no buildings at the north
- A single road along the south coast leading to the railway station
- A car park opposite the station
- A few holiday cottages at the east

Present day:
- The harbour has been expanded and now hosts a marina for sailing boats
- The fish market has been replaced by a row of cafés
- The dune area has been developed into a residential quarter with a park
- A new sea wall has been built along the north beach
- The main road has been widened and a second road now crosses the dunes
- The car park has been enlarged
- The holiday cottages have been replaced by a large hotel complex

Suggested overview: Dune Bay has changed from a small fishing village into a seaside resort — the fishing facilities at the harbour have given way to leisure facilities, and the undeveloped dunes have been built on for housing and a hotel.`,
        explanation: 'A strong map answer opens with a clear overview of change (fishing village → resort), groups the changes (harbour, dunes, transport, accommodation) instead of listing feature by feature, uses accurate past-perfect and present-perfect language ("had been replaced", "has been expanded"), and avoids copying the list verbatim.'
      },
      {
        id: 'w402', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
        prompt: 'Some people believe that university education should be free for all students. Others believe that students should pay for their own education. To what extent do you agree or disagree?',
        explanation: 'A band 7+ essay takes a clear position early, develops it with one well-supported reason per paragraph, and still fairly presents the other side before returning to the position. "To what extent" questions reward nuance: a qualified answer (e.g. "mostly free, but with means-tested conditions") often outperforms an absolute one.'
      }
    ]
  };

  /* ================= SPEAKING · PRACTICE TEST 4 ================= */
  C.speaking4 = {
    id: 'speaking-04', title: 'Speaking Practice Test 4', skill: 'Speaking',
    difficulty: 'Upper-Intermediate', duration: 14,
    parts: [
      {
        id: 'sp4p1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4-5',
        questions: [
          'Tell me about the area where you live. What do you like most about it?',
          'Has your neighbourhood changed much in recent years?',
          'Do you prefer shopping in large stores or in small local shops?',
          'How often do you buy things online, and what do you usually buy?'
        ]
      },
      {
        id: 'sp4p2', partNumber: 2, title: 'Part 2 — Long turn (cue card)', minutes: '3-4',
        prepSeconds: 60, talkSeconds: 120,
        topic: 'Describe a piece of good advice you received.',
        bullets: [
          'what the advice was',
          'who gave it to you',
          'when you received it',
          'and explain why it was good advice.'
        ]
      },
      {
        id: 'sp4p3', partNumber: 3, title: 'Part 3 — Discussion', minutes: '4-5',
        questions: [
          'Do you think the best advice usually comes from older people? Why?',
          'Has the way people give advice to young people changed in recent years?',
          'Should teachers be allowed to give advice on personal matters, or only academic ones?',
          'In the future, will people rely more on machines or on other people for advice? Why?'
        ]
      }
    ]
  };

  /* ================= TEST META (add Test 4 to the selector) ================= */
  const existingTests = (C.testMeta && Array.isArray(C.testMeta.tests))
    ? C.testMeta.tests.filter(t => t.id !== 'test4')
    : [
        { id: 'test1', label: 'Practice Test 1', labelUz: 'Amaliyot testi 1' },
        { id: 'test2', label: 'Practice Test 2', labelUz: 'Amaliyot testi 2', premium: true },
        { id: 'test3', label: 'Practice Test 3', labelUz: 'Amaliyot testi 3', premium: true }
      ];
  C.testMeta = {
    version: 4,
    tests: [...existingTests, { id: 'test4', label: 'Practice Test 4', labelUz: 'Amaliyot testi 4', premium: true }]
  };

  if (window.IELTS_CONTENT) window.IELTS_CONTENT = C;
})();

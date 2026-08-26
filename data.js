/* Original, exam-realistic IELTS-format content. Not copied from any copyrighted source. */
window.IELTS_CONTENT = {
  listening: {
    id: 'listening-01', title: 'Listening Practice Test 1', skill: 'Listening', duration: 30,
    parts: [
      {
        id: 'lp1', partNumber: 1, title: 'Part 1 — Everyday conversation',
        instructions: 'Questions 1–10. You will hear this recording ONCE.',
        transcript: `Woman: Good morning, Riverside Leisure Centre, how can I help you?
Man: Hi, I'd like to ask about joining the gym. What membership options do you have?
Woman: Sure. We have a Standard membership at forty-two pounds a month, and a Premium one at sixty-eight pounds, which includes the pool and all fitness classes.
Man: I think Standard is fine for now. Do I need to book a slot to use the gym?
Woman: Not usually, but on weekday evenings between five and seven it does get busy, so booking is recommended then.
Man: Okay. And is there a joining fee?
Woman: There's a one-off fee of twenty-five pounds, but that's waived if you sign up before the end of this month.
Man: Great, I'll do that. Can I bring a guest sometimes?
Woman: Yes, two guest passes are included every month with Standard membership.
Man: Perfect. What documents do I need to bring?
Woman: Just a photo ID and proof of address, like a utility bill.
Man: Understood. One last thing — is there parking on site?
Woman: Yes, free parking for members in the north car park, spaces eighteen to forty.`,
        questions: [
          { id: 'l1', type: 'sentence-completion', prompt: 'Standard membership costs £______ a month.', answer: '42' },
          { id: 'l2', type: 'sentence-completion', prompt: 'Premium membership includes the pool and all ______.', answer: 'fitness classes' },
          { id: 'l3', type: 'sentence-completion', prompt: 'Booking is recommended on weekday evenings between 5 and ______.', answer: '7' },
          { id: 'l4', type: 'sentence-completion', prompt: 'The joining fee is £______.', answer: '25' },
          { id: 'l5', type: 'sentence-completion', prompt: 'The fee is waived if you sign up before the end of the ______.', answer: 'month' },
          { id: 'l6', type: 'sentence-completion', prompt: 'How many guest passes are included per month?', answer: '2' },
          { id: 'l7', type: 'sentence-completion', prompt: 'What ID must you bring, besides proof of address?', answer: 'photo ID' },
          { id: 'l8', type: 'sentence-completion', prompt: 'Proof of address example given:', answer: 'utility bill' },
          { id: 'l9', type: 'sentence-completion', prompt: 'Free parking is in the ______ car park.', answer: 'north' },
          { id: 'l10', type: 'sentence-completion', prompt: 'Parking spaces reserved for members are numbered 18 to ______.', answer: '40' }
        ]
      },
      {
        id: 'lp2', partNumber: 2, title: 'Part 2 — Monologue (public announcement)',
        instructions: 'Questions 11–20. You will hear this recording ONCE.',
        transcript: `Good afternoon, everyone, and welcome to the Millbrook Community Festival. Before we begin, a few important announcements. The main stage performances will start at two o'clock, not one o'clock as originally printed in the programme, so please adjust your plans accordingly. Food stalls are located along the eastern side of the park, near the old fountain, while craft stalls are set up on the western lawn. If you're travelling with children, there's a supervised play area beside the information tent, open until six in the evening. Lost property should be reported to the information tent as well. For anyone who parked in the overflow field, please note that vehicles must be removed by nine p.m., as the field will be locked overnight. Toilets are available at three locations: near the main entrance, behind the food stalls, and next to the play area. Finally, if it starts raining, the covered pavilion near the main stage can host up to two hundred people, so please move there calmly rather than crowding the smaller tents.`,
        questions: [
          { id: 'l11', type: 'sentence-completion', prompt: 'The main stage now starts at ______ o\'clock.', answer: '2' },
          { id: 'l12', type: 'sentence-completion', prompt: 'Food stalls are near the old ______.', answer: 'fountain' },
          { id: 'l13', type: 'sentence-completion', prompt: 'Craft stalls are on the ______ lawn.', answer: 'western' },
          { id: 'l14', type: 'sentence-completion', prompt: 'The play area is open until ______ in the evening.', answer: '6' },
          { id: 'l15', type: 'sentence-completion', prompt: 'Lost property should be reported to the ______.', answer: 'information tent' },
          { id: 'l16', type: 'sentence-completion', prompt: 'Cars in the overflow field must leave by ______ p.m.', answer: '9' },
          { id: 'l17', type: 'multiple-choice', prompt: 'How many toilet locations are mentioned?', options: ['Two', 'Three', 'Four', 'Five'], answer: 1 },
          { id: 'l18', type: 'multiple-choice', prompt: 'Where is one toilet location NOT mentioned?', options: ['Near main entrance', 'Behind food stalls', 'Next to play area', 'Near the fountain'], answer: 3 },
          { id: 'l19', type: 'sentence-completion', prompt: 'The covered pavilion can host up to ______ people.', answer: '200' },
          { id: 'l20', type: 'multiple-choice', prompt: 'What should people do if it rains?', options: ['Go home', 'Move calmly to the pavilion', 'Wait at the food stalls', 'Call the organisers'], answer: 1 }
        ]
      },
      {
        id: 'lp3', partNumber: 3, title: 'Part 3 — Academic discussion (two students + tutor)',
        instructions: 'Questions 21–30. You will hear this recording ONCE.',
        transcript: `Tutor: So, you've both been researching renewable energy adoption for your group project. Sarah, how's your section going?
Sarah: I've been looking at solar panel adoption rates in different countries. What surprised me was that it's not always about how sunny a country is.
Tutor: Interesting. What did you find instead?
Sarah: Government subsidies seem to matter more than climate. Countries with strong subsidy programmes had higher adoption, even ones with fairly cloudy weather.
Tom: That matches what I found with wind energy too. Policy support was the biggest factor, not wind speed alone.
Tutor: Did you find any disagreement in the research?
Tom: Yes, actually. Some economists argue subsidies distort the market long-term, while environmental researchers focus mainly on emissions reduction.
Sarah: I think our conclusion should acknowledge both sides rather than picking one.
Tutor: Good instinct. What about implementation challenges?
Tom: Grid infrastructure was a recurring issue — a lot of countries have good renewable potential but outdated grids that can't handle it.
Sarah: We should probably recommend infrastructure investment as part of our conclusion, not just subsidies.
Tutor: That sounds like a well-rounded conclusion. Make sure you cite specific case studies, not just general trends.`,
        questions: [
          { id: 'l21', type: 'multiple-choice', prompt: 'What surprised Sarah about solar adoption?', options: ['It only happens in sunny countries', 'Subsidies matter more than climate', 'No countries have adopted it', 'It is always expensive'], answer: 1 },
          { id: 'l22', type: 'multiple-choice', prompt: 'What did Tom find about wind energy?', options: ['Wind speed was the only factor', 'Policy support mattered most', 'It is not viable anywhere', 'It is cheaper than solar'], answer: 1 },
          { id: 'l23', type: 'multiple-choice', prompt: 'What do some economists argue?', options: ['Subsidies help long-term', 'Subsidies distort the market', 'Subsidies should increase', 'Subsidies are illegal'], answer: 1 },
          { id: 'l24', type: 'multiple-choice', prompt: 'What does Sarah think their conclusion should do?', options: ['Only support subsidies', 'Only support market forces', 'Acknowledge both perspectives', 'Ignore the debate'], answer: 2 },
          { id: 'l25', type: 'multiple-choice', prompt: 'What implementation issue does Tom mention?', options: ['Lack of sunlight', 'Outdated grid infrastructure', 'Lack of researchers', 'High wind speeds'], answer: 1 },
          { id: 'l26', type: 'sentence-completion', prompt: 'Sarah suggests recommending ______ investment alongside subsidies.', answer: 'infrastructure' },
          { id: 'l27', type: 'multiple-choice', prompt: 'What does the tutor advise about their conclusion?', options: ['Keep it short', 'Cite specific case studies', 'Avoid citing sources', 'Focus only on Sarah\'s section'], answer: 1 },
          { id: 'l28', type: 'multiple-choice', prompt: 'What is the overall tone of the discussion?', options: ['Argumentative and unresolved', 'Collaborative and balanced', 'Dismissive of evidence', 'Focused only on criticism'], answer: 1 },
          { id: 'l29', type: 'multiple-choice', prompt: 'What do Sarah and Tom\'s findings have in common?', options: ['Both found climate is most important', 'Both found policy/subsidy support matters most', 'Both found no clear factor', 'Both disagree with each other'], answer: 1 },
          { id: 'l30', type: 'multiple-choice', prompt: 'What research gap do environmental researchers focus on, according to Tom?', options: ['Market distortion', 'Emissions reduction', 'Grid infrastructure', 'Government spending'], answer: 1 }
        ]
      },
      {
        id: 'lp4', partNumber: 4, title: 'Part 4 — Academic lecture',
        instructions: 'Questions 31–40. You will hear this recording ONCE.',
        transcript: `Today I want to talk about the history of urban lighting. Before gas lighting was introduced in the early nineteenth century, most city streets after dark relied on oil lamps, which were dim, expensive to maintain, and required a small army of lamplighters working every evening. The introduction of gas lighting in the eighteen tens changed this dramatically. Streets became significantly brighter, and importantly, safer, which encouraged more evening commerce and social activity. However, gas lighting had its own drawbacks: it was a fire hazard, produced soot, and gas leaks occasionally caused explosions. By the late nineteenth century, electric arc lighting began to replace gas in major cities, offering a brighter, cleaner alternative, though early arc lights were harsh and produced an uncomfortable buzzing sound. The real turning point came with the incandescent bulb, which by the nineteen twenties had become the dominant form of street lighting across much of the industrialised world. Interestingly, some historians argue that widespread street lighting changed social behaviour more than any single invention of the era, because it extended public life well beyond sunset for the first time in human history.`,
        questions: [
          { id: 'l31', type: 'sentence-completion', prompt: 'Before gas lighting, streets relied on ______ lamps.', answer: 'oil' },
          { id: 'l32', type: 'sentence-completion', prompt: 'Oil lamps required a small army of ______.', answer: 'lamplighters' },
          { id: 'l33', type: 'sentence-completion', prompt: 'Gas lighting was introduced in the ______.', answer: '1810s' },
          { id: 'l34', type: 'multiple-choice', prompt: 'What effect did gas lighting have on cities?', options: ['Less evening activity', 'More evening commerce and safety', 'No noticeable change', 'Increased oil lamp use'], answer: 1 },
          { id: 'l35', type: 'multiple-choice', prompt: 'Which was NOT a drawback of gas lighting?', options: ['Fire hazard', 'Produced soot', 'Occasional explosions', 'Too expensive to install anywhere'], answer: 3 },
          { id: 'l36', type: 'sentence-completion', prompt: 'Electric arc lighting replaced gas in the late ______ century.', answer: 'nineteenth' },
          { id: 'l37', type: 'sentence-completion', prompt: 'Early arc lights produced an uncomfortable ______ sound.', answer: 'buzzing' },
          { id: 'l38', type: 'sentence-completion', prompt: 'The incandescent bulb became dominant by the ______.', answer: '1920s' },
          { id: 'l39', type: 'multiple-choice', prompt: 'What do some historians argue about street lighting?', options: ['It had little social impact', 'It changed social behaviour more than any other invention', 'It was less important than transport', 'It was only useful for safety'], answer: 1 },
          { id: 'l40', type: 'sentence-completion', prompt: 'Lighting extended public life well beyond ______.', answer: 'sunset' }
        ]
      }
    ]
  },
  reading: {
    id: 'reading-01', title: 'Reading Practice Test 1', skill: 'Reading', duration: 60, format: 'Academic',
    passages: [
      {
        id: 'rp1', passageNumber: 1, title: 'The Memory of Cities', difficulty: 'Easier',
        text: `Every city carries a layered record of its own past, written not in books but in brick, pavement, and the stubborn persistence of old street patterns. Urban historians have long argued that even when buildings are demolished, the routes people once walked tend to survive, quietly shaping the city that replaces them. A medieval footpath, for instance, may still determine the curve of a modern road centuries after the original town walls have vanished.

This phenomenon, sometimes called "urban memory," is not merely sentimental. Traffic engineers in several European cities have found that streets following old, organic paths are frequently more resistant to congestion than the wide grid roads imposed during twentieth-century redevelopment. One study of a mid-sized German city found that pedestrian footfall on streets tracing medieval routes was nearly forty percent higher than on nearby streets built during a 1960s planning scheme, despite both areas having similar populations and comparable numbers of shops.

Critics of this view caution against romanticising the past. They point out that many old street patterns were never designed with any coherent logic at all; they simply reflect where property boundaries, streams, or grazing paths happened to fall centuries ago. To attribute their present-day success purely to some inherited wisdom, these critics argue, risks ignoring more measurable factors such as building density, mixed land use, and the simple fact that older districts tend to have shorter, more walkable blocks.

Nonetheless, city planners increasingly treat historical street patterns as a resource rather than an obstacle. In Lyon, France, a redevelopment project deliberately reintroduced a pedestrian route that had been erased by a 1970s shopping centre, reconnecting two neighbourhoods that had been effectively cut off from one another for decades. Early data suggests that local business activity along the restored route has grown steadily since it reopened, though planners are careful to note that the surrounding public investment, including new lighting and seating, likely contributed as much as the route itself.

What both supporters and critics agree on is that cities are rarely blank slates. Even the most ambitious redevelopment project inherits something from what came before, whether planners intend it to or not.`,
        questions: [
          { id: 'r1', type: 'true-false-not-given', prompt: 'The German study found that footfall was identical on both types of street.', answer: 'FALSE' },
          { id: 'r2', type: 'true-false-not-given', prompt: 'All old street patterns were originally designed with a clear urban plan in mind.', answer: 'FALSE' },
          { id: 'r3', type: 'true-false-not-given', prompt: 'The Lyon project has been proven to be the sole cause of increased business activity.', answer: 'FALSE' },
          { id: 'r4', type: 'true-false-not-given', prompt: 'Critics believe measurable factors like building density explain street success better than inherited wisdom.', answer: 'TRUE' },
          { id: 'r5', type: 'true-false-not-given', prompt: 'The Lyon redevelopment project was completed before the 1970s shopping centre was built.', answer: 'FALSE' },
          { id: 'r6', type: 'sentence-completion', prompt: 'In Lyon, a route was reintroduced that had been erased by a ______ built in the 1970s.', answer: 'shopping centre' },
          { id: 'r7', type: 'sentence-completion', prompt: 'Older districts tend to have shorter, more ______ blocks.', answer: 'walkable' },
          { id: 'r8', type: 'multiple-choice', prompt: 'What is the main point of the final paragraph?', options: ['Critics have proven planners wrong', 'Redevelopment always fails without historical streets', 'Cities inevitably inherit something from their past', 'Only Lyon has preserved old routes'], answer: 2 },
          { id: 'r9', type: 'multiple-choice', prompt: 'What is the overall tone of the passage?', options: ['Strongly in favour of preserving all old streets', 'Dismissive of historical urban planning', 'Balanced, presenting both support and criticism', 'Focused only on financial outcomes'], answer: 2 },
          { id: 'r10', type: 'multiple-choice', prompt: 'According to the passage, what often survives even after old buildings are demolished?', options: ['Building materials', 'The routes people once walked', 'Property tax records', 'Town wall foundations'], answer: 1 },
          { id: 'r11', type: 'sentence-completion', prompt: 'Traffic engineers found old organic streets are more resistant to ______.', answer: 'congestion' },
          { id: 'r12', type: 'sentence-completion', prompt: 'The Lyon project reconnected two ______ that had been cut off for decades.', answer: 'neighbourhoods' },
          { id: 'r13', type: 'true-false-not-given', prompt: 'Planners in Lyon believe public investment alone caused the business growth, without help from the restored route.', answer: 'FALSE' }
        ]
      },
      {
        id: 'rp2', passageNumber: 2, title: 'Sleep and Memory Consolidation', difficulty: 'Medium',
        text: `For much of the twentieth century, sleep was regarded by many scientists as a passive state — a period in which the brain simply powered down. This view has been overturned in recent decades by a growing body of research suggesting that sleep plays an active and essential role in consolidating memories, particularly those formed during the preceding day.

The process is thought to unfold in distinct stages. During slow-wave sleep, the deepest stage of non-REM sleep, the hippocampus — a brain region central to forming new memories — appears to "replay" patterns of neural activity recorded during waking hours, but at a much faster speed. Researchers studying rodents have observed this replay directly, recording sequences of neuron firing during a maze task and then detecting strikingly similar, compressed sequences during subsequent sleep. This replay is believed to help transfer memories from the hippocampus, which stores information temporarily, to the neocortex, where memories can be integrated with existing knowledge for longer-term storage.

REM sleep, by contrast, appears to serve a different function. Some researchers propose that REM sleep is less about strengthening specific memories and more about integrating new information with older, related memories, potentially explaining why creative insights and unusual connections between ideas often seem to emerge after a night of sleep rather than during focused waking effort. A well-known study asked participants to solve number puzzles with a hidden shortcut; those who slept between two testing sessions were more than twice as likely to discover the shortcut compared to those who remained awake for an equivalent period.

Not all researchers agree on the precise mechanisms involved, and some caution that much of the evidence for memory replay comes from animal studies, which may not translate directly to the more complex memory systems of humans. Nevertheless, the broader conclusion — that sleep is not merely restorative but actively participates in learning — has gained wide acceptance and has begun to influence practical fields such as education, where some schools have experimented with adjusted start times intended to protect students' sleep, partly on the basis of this research.

Critics of these educational interventions argue that the link between later school start times and academic performance remains complicated by numerous confounding factors, including socioeconomic background and extracurricular commitments, and that policy should not outpace the underlying science.`,
        questions: [
          { id: 'r14', type: 'true-false-not-given', prompt: 'Sleep was once widely considered a passive state by scientists.', answer: 'TRUE' },
          { id: 'r15', type: 'true-false-not-given', prompt: 'The hippocampus stores memories permanently for a person\'s entire life.', answer: 'FALSE' },
          { id: 'r16', type: 'true-false-not-given', prompt: 'Neural replay during sleep has been directly observed in rodent studies.', answer: 'TRUE' },
          { id: 'r17', type: 'true-false-not-given', prompt: 'REM sleep is believed to mainly strengthen individual, specific memories.', answer: 'FALSE' },
          { id: 'r18', type: 'true-false-not-given', prompt: 'All researchers agree completely on the exact mechanisms behind sleep and memory.', answer: 'FALSE' },
          { id: 'r19', type: 'sentence-completion', prompt: 'During slow-wave sleep, the ______ appears to replay neural activity.', answer: 'hippocampus' },
          { id: 'r20', type: 'sentence-completion', prompt: 'Long-term memory storage is thought to occur in the ______.', answer: 'neocortex' },
          { id: 'r21', type: 'sentence-completion', prompt: 'Participants who slept were more than twice as likely to discover a hidden ______.', answer: 'shortcut' },
          { id: 'r22', type: 'multiple-choice', prompt: 'What is a limitation of the evidence mentioned in the passage?', options: ['It comes mostly from human trials', 'It comes mostly from animal studies', 'It has no scientific basis', 'It only concerns REM sleep'], answer: 1 },
          { id: 'r23', type: 'multiple-choice', prompt: 'Why do critics caution against later school start times as policy?', options: ['They believe sleep has no benefits', 'Confounding factors complicate the link to performance', 'Students prefer early starts', 'The research is fabricated'], answer: 1 },
          { id: 'r24', type: 'multiple-choice', prompt: 'What is the main purpose of the passage?', options: ['To argue schools must change start times immediately', 'To explain evolving scientific understanding of sleep\'s role in memory', 'To criticise all sleep research', 'To describe the history of hippocampus discovery'], answer: 1 },
          { id: 'r25', type: 'sentence-completion', prompt: 'REM sleep may help integrate new information with ______ memories.', answer: 'older, related' },
          { id: 'r26', type: 'multiple-choice', prompt: 'According to the passage, creative insights often emerge:', options: ['During focused waking effort only', 'After a night of sleep', 'Only in laboratory settings', 'Before sleep begins'], answer: 1 }
        ]
      },
      {
        id: 'rp3', passageNumber: 3, title: 'The Economics of Attention', difficulty: 'Harder',
        text: `In 1971, the economist and Nobel laureate Herbert Simon observed that "a wealth of information creates a poverty of attention," a remark that has proven strikingly prescient in the digital age. Simon's insight was that as the volume of available information grows, the scarce resource is no longer information itself but the human capacity to attend to it. This reframing has given rise to what is now sometimes called the attention economy, in which platforms compete not for consumers' money directly, but for the far more limited commodity of their sustained focus.

The mechanics of this competition are, in many respects, well understood. Recommendation algorithms are optimised to maximise engagement metrics such as time spent or click-through rate, and considerable evidence suggests that content triggering strong emotional responses — particularly outrage or anxiety — tends to perform disproportionately well on these metrics. This has led some researchers to argue that platform design, rather than any inherent human preference for negativity, substantially shapes what kind of content proliferates online.

However, this narrative, while broadly accurate, risks oversimplifying a more contested empirical picture. A 2019 meta-analysis examining dozens of studies on social media use and wellbeing found effect sizes that were, on average, quite small — smaller, the authors noted, than the association between wellbeing and simply wearing glasses. This has led some psychologists to caution against attributing societal-level anxieties too readily to any single technological cause, suggesting instead that effects vary considerably depending on how, not merely how much, a platform is used: passive scrolling appears more consistently associated with negative outcomes than active, socially connective use.

Economists studying the attention economy have also drawn attention to a structural asymmetry: while the costs of attention capture are diffuse and borne individually by users in the form of fragmented focus, the benefits accrue in a concentrated way to platform operators through advertising revenue. This asymmetry, some argue, mirrors classic negative externalities in environmental economics, where the cost of pollution is distributed across society while profits remain private — an analogy that has informed several recent regulatory proposals treating attention, in effect, as a kind of natural resource requiring protection.

Critics of the externality framing counter that attention, unlike a river or an atmosphere, is not a shared commons but an individual faculty, and that regulatory interventions premised on the environmental analogy may therefore rest on a category error, treating a psychological phenomenon as though it were a physical one. Whether this objection is decisive remains, at the time of writing, an open and actively debated question among economists and policymakers alike.`,
        questions: [
          { id: 'r27', type: 'multiple-choice', prompt: 'What did Herbert Simon argue in 1971?', options: ['Information itself is now scarce', 'Attention becomes scarce as information grows', 'Wealth causes information poverty', 'Digital platforms did not yet exist'], answer: 1 },
          { id: 'r28', type: 'true-false-not-given', prompt: 'Content triggering strong emotional responses tends to perform disproportionately well on engagement metrics.', answer: 'TRUE' },
          { id: 'r29', type: 'true-false-not-given', prompt: 'The 2019 meta-analysis found very large effect sizes linking social media use and wellbeing.', answer: 'FALSE' },
          { id: 'r30', type: 'true-false-not-given', prompt: 'Passive scrolling is more consistently linked to negative outcomes than active, socially connective use.', answer: 'TRUE' },
          { id: 'r31', type: 'true-false-not-given', prompt: 'All economists agree that the environmental externality analogy is correct.', answer: 'NOT GIVEN' },
          { id: 'r32', type: 'sentence-completion', prompt: 'The 2019 meta-analysis compared effect sizes to the association between wellbeing and wearing ______.', answer: 'glasses' },
          { id: 'r33', type: 'sentence-completion', prompt: 'Platform operators gain concentrated benefit through ______ revenue.', answer: 'advertising' },
          { id: 'r34', type: 'multiple-choice', prompt: 'What do critics of the "externality" framing argue?', options: ['Attention is a shared commons like a river', 'Attention is an individual faculty, not a shared resource', 'Regulation of attention is unnecessary entirely', 'Platforms should be banned'], answer: 1 },
          { id: 'r35', type: 'multiple-choice', prompt: 'What is the passage\'s overall stance on the attention economy debate?', options: ['Firmly resolved in favour of regulation', 'Firmly resolved against regulation', 'Presented as complex and still debated', 'Not addressed at all'], answer: 2 },
          { id: 'r36', type: 'sentence-completion', prompt: 'Simon\'s remark was that a wealth of information creates a poverty of ______.', answer: 'attention' },
          { id: 'r37', type: 'multiple-choice', prompt: 'According to some researchers, what substantially shapes what content proliferates online?', options: ['Inherent human preference for negativity alone', 'Platform design', 'Government regulation', 'Random chance'], answer: 1 },
          { id: 'r38', type: 'sentence-completion', prompt: 'The cost of attention capture is ______ and borne individually by users.', answer: 'diffuse' },
          { id: 'r39', type: 'multiple-choice', prompt: 'The word "prescient" in paragraph 1 most nearly means:', options: ['Outdated', 'Showing foresight about the future', 'Incorrect', 'Widely rejected'], answer: 1 },
          { id: 'r40', type: 'multiple-choice', prompt: 'What structural asymmetry do economists highlight?', options: ['Costs are concentrated, benefits diffuse', 'Costs are diffuse, benefits concentrated', 'Both costs and benefits are diffuse', 'Neither costs nor benefits exist'], answer: 1 }
        ]
      }
    ]
  },
  writing: {
    id: 'writing-01', title: 'Writing Practice Test 1', skill: 'Writing', format: 'Academic', duration: 60,
    tasks: [
      {
        id: 'w1', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
        prompt: 'The chart below shows the percentage of employees working from home at least one day per week in four countries between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        chartData: 'Country A: 8% (2015) → 12% (2019) → 41% (2021) → 33% (2025)\nCountry B: 15% (2015) → 18% (2019) → 47% (2021) → 39% (2025)\nCountry C: 5% (2015) → 9% (2019) → 22% (2021) → 19% (2025)\nCountry D: 20% (2015) → 24% (2019) → 52% (2021) → 44% (2025)\n\nAll four countries show a sharp rise around 2021, followed by a partial decline by 2025.'
      },
      {
        id: 'w2', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
        prompt: 'Some people believe that unpaid community service should be a compulsory part of high school education. To what extent do you agree or disagree?'
      }
    ]
  },
  speaking: {
    id: 'speaking-01', title: 'Speaking Practice Test 1', skill: 'Speaking', duration: 14,
    parts: [
      {
        id: 'sp1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4-5',
        questions: [
          'Let\'s talk about your hometown. What do you like most about it?',
          'Do you work or are you a student?',
          'What do you usually do in your free time?',
          'Do you prefer to plan your day in advance, or let things happen naturally?'
        ]
      },
      {
        id: 'sp2', partNumber: 2, title: 'Part 2 — Long turn (cue card)', minutes: '3-4', prepSeconds: 60, talkSeconds: 120,
        topic: 'Describe a skill you would like to learn.',
        bullets: ['what the skill is', 'why you want to learn it', 'how you would learn it', 'and explain how this skill could be useful to you in the future.']
      },
      {
        id: 'sp3', partNumber: 3, title: 'Part 3 — Discussion', minutes: '4-5',
        questions: [
          'Do you think schools should teach practical life skills? Why or why not?',
          'How has technology changed the way people learn new skills?',
          'Is it more important to specialise in one skill or have knowledge of many?'
        ]
      }
    ]
  }
};
/* Bandly AI — Premium content pack (Test 2, explanations, vocab, lessons, quiz).
 * All content is original and written for this app; not copied from any
 * copyrighted IELTS material. This file augments window.IELTS_CONTENT so the
 * core app keeps working while the premium features are added incrementally.
 */
(function () {
  const C = window.IELTS_CONTENT || {};

  /* ---------- Listening · Practice Test 2 ---------- */
  const listening2 = {
    id: 'listening-02', title: 'Listening Practice Test 2', skill: 'Listening', difficulty: 'Intermediate', duration: 30,
    parts: [
      {
        id: 'l2p1', partNumber: 1, title: 'Part 1 — Everyday conversation',
        instructions: 'Questions 1–10. You will hear this recording ONCE.',
        transcript: `Woman: Good morning, City bike rental, how can I help you?\nMan: Hi, I'd like to hire a bike for the weekend. What options do you have?\nWoman: We have a standard city bike at eleven pounds a day, and a hybrid bike at fourteen pounds a day which is better for longer rides.\nMan: I'll take the hybrid for both days. Do I need to reserve in advance?\nWoman: At the weekend it is busy, so I recommend booking by Thursday evening.\nMan: Fine. And is there a deposit?\nWoman: Yes, a card deposit of fifty pounds, which is returned when you bring the bike back undamaged.\nMan: Can I rent a helmet too?\nWoman: Helmets are included free with every hire, but we only have adult sizes.\nMan: Good to know. Do you open early at the weekend?\nWoman: Yes, from eight in the morning, but we close at six in the evening.\nMan: And where do I collect the bike?\nWoman: From the main station branch, just opposite the ticket office.` ,
        questions: [
          { id: 'l201', type: 'sentence-completion', prompt: 'The hybrid bike costs £______ a day.', answer: '14', explanation: 'The woman says the standard city bike is eleven pounds and the hybrid is fourteen pounds a day.' },
          { id: 'l202', type: 'sentence-completion', prompt: 'The man wants the bike for ______ days.', answer: '2', explanation: 'The man says "for both days", so he is hiring for two days.' },
          { id: 'l203', type: 'sentence-completion', prompt: 'On weekends you should book by Thursday ______.', answer: 'evening', explanation: 'The woman recommends booking by Thursday evening because weekends are busy.' },
          { id: 'l204', type: 'sentence-completion', prompt: 'The card deposit is £______.', answer: '50', explanation: 'The deposit is fifty pounds, returned if the bike is undamaged.' },
          { id: 'l205', type: 'sentence-completion', prompt: 'Helmets are ______ with every hire.', answer: 'included', explanation: 'Helmets are free and included, but only adult sizes are available.' },
          { id: 'l206', type: 'multiple-choice', prompt: 'What sizes of helmet are available?', options: ['Children only', 'Adult only', 'Both adult and child', 'No helmets'], answer: 1, explanation: 'The rental only has adult sizes.' },
          { id: 'l207', type: 'multiple-choice', prompt: 'On weekends the shop opens at:', options: ['6 am', '7 am', '8 am', '9 am'], answer: 2, explanation: 'Weekend opening time is eight in the morning.' },
          { id: 'l208', type: 'sentence-completion', prompt: 'The shop closes at ______ in the evening.', answer: '6', explanation: 'The shop closes at six in the evening.' },
          { id: 'l209', type: 'sentence-completion', prompt: 'The bike is collected at the main ______ branch.', answer: 'station', explanation: 'The collection point is the main station branch.' },
          { id: 'l210', type: 'multiple-choice', prompt: 'The station branch is opposite the ______.', options: ['Ticket office', 'Café', 'Bus stop', 'Park'], answer: 0, explanation: 'The branch is just opposite the ticket office.' }
        ]
      },
      {
        id: 'l2p2', partNumber: 2, title: 'Part 2 — Monologue (announcement)',
        instructions: 'Questions 11–20. You will hear this recording ONCE.',
        transcript: `Welcome to the Riverside archaeological open day. The site is open from ten until five, and admission is free. Please follow the red path if you want to see the Roman house first, or the blue path if you prefer to begin with the museum tent. Volunteers are giving fifteen-minute talks at the discovery hut every half hour; the last talk begins at four thirty. Children must be accompanied by an adult at all times, and pets are not allowed inside the fenced area. If you would like to take part in the hands-on pottery activity, collect a ticket from the information desk — places are limited to twenty people per session. Refreshments are available from the van near the car park, and there is a small shop selling postcards and guidebooks by the exit.` ,
        questions: [
          { id: 'l211', type: 'sentence-completion', prompt: 'The site is open from ten until ______.', answer: '5', explanation: 'The opening hours are ten until five (5 pm).' },
          { id: 'l212', type: 'multiple-choice', prompt: 'The red path leads to the:', options: ['Museum tent', 'Roman house', 'Car park', 'Information desk'], answer: 1, explanation: 'The red path takes you to the Roman house first.' },
          { id: 'l213', type: 'multiple-choice', prompt: 'The blue path goes to the:', options: ['Discovery hut', 'Pottery area', 'Museum tent', 'Exit'], answer: 2, explanation: 'The blue path leads first to the museum tent.' },
          { id: 'l214', type: 'sentence-completion', prompt: 'Talks last ______ minutes.', answer: '15', explanation: 'Volunteers give fifteen-minute talks.' },
          { id: 'l215', type: 'sentence-completion', prompt: 'The last talk of the day starts at ______.', answer: '4:30', explanation: 'The last talk begins at four thirty.' },
          { id: 'l216', type: 'sentence-completion', prompt: 'Children need to be with an ______.', answer: 'adult', explanation: 'Children must be accompanied by an adult.' },
          { id: 'l217', type: 'multiple-choice', prompt: 'Pets are:', options: ['Allowed everywhere', 'Allowed on the red path', 'Not allowed in the fenced area', 'Allowed only on leads'], answer: 2, explanation: 'Pets are not allowed inside the fenced area.' },
          { id: 'l218', type: 'sentence-completion', prompt: 'Pottery tickets are collected at the ______ desk.', answer: 'information', explanation: 'You collect a ticket from the information desk.' },
          { id: 'l219', type: 'sentence-completion', prompt: 'Pottery sessions are limited to ______ people.', answer: '20', explanation: 'Places are limited to twenty people per session.' },
          { id: 'l220', type: 'multiple-choice', prompt: 'Refreshments are available from a van near the:', options: ['Exit', 'Car park', 'Roman house', 'River'], answer: 1, explanation: 'Refreshments are served from a van near the car park.' }
        ]
      },
      {
        id: 'l2p3', partNumber: 3, title: 'Part 3 — Academic discussion',
        instructions: 'Questions 21–30. You will hear this recording ONCE.',
        transcript: `Tutor: Right, you've both been looking at urban green spaces for your project. Maya, what did you find?\nMaya: I focused on the health benefits. The strongest evidence is for mental wellbeing — people who visit parks regularly report lower stress, and even short visits of twenty minutes seem to help.\nTutor: And does the size of the park matter?\nMaya: Somewhat. Larger parks show stronger effects, but smaller pocket parks are easier for people to reach, so accessibility probably matters more than size.\nLeo: My section is about biodiversity. I found that native plants support far more insects than non-native ones, which makes sense as these insects have evolved with the plants.\nTutor: Are there any disagreements in the literature?\nLeo: Yes, about whether planting more trees always lowers air pollution. It helps in some situations, but in narrow streets tall trees can trap pollution near the ground.\nMaya: That's really useful — it shows we should recommend street design rather than just planting more.\nTutor: Good. Any implementation challenges?\nLeo: Funding is the biggest one, especially long-term maintenance. Councils often have money to build a park but not to look after it.\nTutor: Make sure your conclusion highlights maintenance as a real cost, not an afterthought.` ,
        questions: [
          { id: 'l221', type: 'multiple-choice', prompt: 'Maya says the strongest health evidence is for:', options: ['Physical fitness', 'Mental wellbeing', 'Sleep quality', 'Vision'], answer: 1, explanation: 'Maya says the strongest evidence is for mental wellbeing — lower stress.' },
          { id: 'l222', type: 'sentence-completion', prompt: 'Even short visits of ______ minutes seem to help.', answer: '20', explanation: 'Visits of twenty minutes show a benefit.' },
          { id: 'l223', type: 'multiple-choice', prompt: 'Maya thinks that for health benefits ______ matters more than size.', options: ['Cost', 'Accessibility', 'Location', 'Noise'], answer: 1, explanation: 'Small pocket parks are easier to reach, so accessibility matters more than size.' },
          { id: 'l224', type: 'multiple-choice', prompt: 'Leo found that native plants support more:', options: ['Birds', 'Insects', 'Mammals', 'Fish'], answer: 1, explanation: 'Native plants support far more insects.' },
          { id: 'l225', type: 'sentence-completion', prompt: 'Insects have ______ with native plants over time.', answer: 'evolved', explanation: 'Insects have evolved with native plants.' },
          { id: 'l226', type: 'multiple-choice', prompt: 'Leo says trees can trap pollution near the ground in:', options: ['Open fields', 'Narrow streets', 'Car parks', 'Highways'], answer: 1, explanation: 'In narrow streets tall trees can trap pollution near the ground.' },
          { id: 'l227', type: 'sentence-completion', prompt: 'Maya suggests recommending good ______ design.', answer: 'street', explanation: 'She recommends street design rather than simply planting more.' },
          { id: 'l228', type: 'multiple-choice', prompt: 'The biggest implementation challenge Leo identifies is:', options: ['Lack of land', 'Funding and maintenance', 'Public opposition', 'Lack of trees'], answer: 1, explanation: 'Funding is the biggest challenge, especially long-term maintenance.' },
          { id: 'l229', type: 'multiple-choice', prompt: 'Councils often have money to ______ but not to look after it.', options: ['buy land', 'build a park', 'pay staff', 'plant trees'], answer: 1, explanation: 'They often have money to build a park but not to maintain it.' },
          { id: 'l230', type: 'multiple-choice', prompt: 'The tutor advises that maintenance should be treated as:', options: ['An afterthought', 'A real cost', 'Optional', 'A minor detail'], answer: 1, explanation: 'The tutor says maintenance is a real cost, not an afterthought.' }
        ]
      },
      {
        id: 'l2p4', partNumber: 4, title: 'Part 4 — Academic lecture',
        instructions: 'Questions 31–40. You will hear this recording ONCE.',
        transcript: `Today we turn to the history of public libraries. In the nineteenth century, libraries were often private institutions, funded by subscriptions, which meant only people who could pay could use them. The idea that communities should fund free public libraries gained momentum during the 1850s, and the movement was driven by a belief that education, not charity, was the best way to improve society.\nThe first free municipal libraries were often housed in modest buildings, sometimes shared with museums or schools. Their collections grew slowly because book production was still relatively expensive. The invention of cheap paper and mechanised printing made books far more affordable, and by the early twentieth century many libraries had become impressive civic buildings whose architecture was designed to project progress and learning.\nLibraries also served a social role. They were among the few indoor public spaces where people of different backgrounds could gather without paying, and they provided a quiet, self-directed environment for study — especially important for people who could not afford a private room at home.\nToday, the role of libraries is again being redefined. The physical book is no longer the only reason to visit. Public libraries increasingly offer internet access, digital resources, job-training workshops and community events. Some researchers argue that the library's most enduring function is not storing books but providing an accessible, neutral public space in an era when many other public spaces are becoming private or commercial.` ,
        questions: [
          { id: 'l231', type: 'sentence-completion', prompt: 'In the nineteenth century libraries were often ______ institutions.', answer: 'private', explanation: 'They were often private, funded by subscriptions.' },
          { id: 'l232', type: 'multiple-choice', prompt: 'The movement for free public libraries was driven by a belief in:', options: ['Charity', 'Education', 'Commerce', 'Religion'], answer: 1, explanation: 'The speaker says the movement was driven by a belief that education improves society.' },
          { id: 'l233', type: 'sentence-completion', prompt: 'The first free municipal libraries were sometimes shared with museums or ______.', answer: 'schools', explanation: 'They were sometimes shared with museums or schools.' },
          { id: 'l234', type: 'multiple-choice', prompt: 'Collections grew slowly because:', options: ['Nobody read books', 'Books were expensive', 'Buildings were small', 'Libraries were closed'], answer: 1, explanation: 'Collections grew slowly because book production was expensive.' },
          { id: 'l235', type: 'sentence-completion', prompt: 'Cheap paper and ______ printing made books affordable.', answer: 'mechanised', explanation: 'Cheap paper and mechanised printing made books affordable.' },
          { id: 'l236', type: 'multiple-choice', prompt: 'By the early twentieth century many libraries became:', options: ['Small shops', 'Impressive civic buildings', 'Private clubs', 'Schools'], answer: 1, explanation: 'They became impressive civic buildings designed to project progress.' },
          { id: 'l237', type: 'multiple-choice', prompt: 'Libraries were special public spaces because people could gather there:', options: ['Only if they paid', 'Without paying', 'Only in winter', 'Only at night'], answer: 1, explanation: 'They were among the few indoor public spaces people could use without paying.' },
          { id: 'l238', type: 'sentence-completion', prompt: 'Libraries provided a quiet place for ______ study.', answer: 'self-directed', explanation: 'Libraries provided a self-directed environment for study.' },
          { id: 'l239', type: 'multiple-choice', prompt: 'Today libraries increasingly offer all of the following EXCEPT:', options: ['Internet access', 'Job-training workshops', 'Private reading rooms for members only', 'Community events'], answer: 2, explanation: 'Internet, workshops and events are all mentioned; private member-only rooms are not.' },
          { id: 'l240', type: 'multiple-choice', prompt: 'Some researchers argue the library still matters as a:', options: ['Book warehouse', 'Neutral public space', 'Commercial centre', 'Private club'], answer: 1, explanation: 'The most enduring function is being an accessible, neutral public space.' }
        ]
      }
    ]
  };

  /* ---------- Reading · Practice Test 2 ---------- */
  const reading2 = {
    id: 'reading-02', title: 'Reading Practice Test 2', skill: 'Reading', difficulty: 'Intermediate', duration: 60,
    passages: [
      {
        id: 'r2p1', passageNumber: 1, title: 'The Story of Coffee', difficulty: 'Medium',
        text: `Coffee is one of the world's most traded agricultural products, yet its history is often reduced to a simple legend about a goat herder. The story goes that an Ethiopian herder noticed his goats became unusually energetic after eating certain berries, leading to the discovery of coffee. While there is little evidence for this tale, archaeological and historical research shows that coffee was indeed first cultivated in the highlands of Ethiopia and later spread through the Arabian Peninsula.\n\nBy the fifteenth century coffee was widely consumed in Yemen, where the port of Mocha became an important trade centre. Coffeehouses appeared in cities such as Cairo and Istanbul and quickly became places for conversation, debate and business. In many ways these early coffeehouses performed a social role similar to that of the internet today: they allowed ideas to travel rapidly.\n\nEuropean merchants brought coffee to Europe in the early seventeenth century, where it was initially seen as a luxury item. Coffeehouses in London, Paris and Vienna grew very quickly, and some developed strong reputations for political debate and even for the exchange of scientific news. One notable example is the Royal Society in London, which is said to have grown out of discussions among natural philosophers in coffeehouses.\n\nDespite its success, coffee has always had critics. Some rulers tried to ban it because of its political and social influence, while others worried about its effects on health. Today, coffee is a global industry, but its cultivation still raises important questions about labour conditions and environmental sustainability.` ,
        questions: [
          { id: 'r201', type: 'multiple-choice', prompt: 'What does the writer say about the goat herder story?', options: ['It is a well-documented fact', 'It is probably not based on evidence', 'It happened in Yemen', 'It explains where coffee houses appeared'], answer: 1, explanation: 'The writer says there is little evidence for the tale.' },
          { id: 'r202', type: 'sentence-completion', prompt: 'Coffee was first cultivated in the highlands of ______.', answer: 'Ethiopia', explanation: 'Coffee was first cultivated in the Ethiopian highlands.' },
          { id: 'r203', type: 'multiple-choice', prompt: 'The port of Mocha became important because of:', options: ['Coffee trade', 'Ship building', 'Coffee houses', 'Textiles'], answer: 0, explanation: 'Mocha became an important coffee trade centre.' },
          { id: 'r204', type: 'true-false-not-given', prompt: 'Early coffeehouses were places where ideas could spread quickly.', answer: 'TRUE', explanation: 'The writer explicitly compares them to the internet because ideas travelled rapidly.' },
          { id: 'r205', type: 'true-false-not-given', prompt: 'Coffee was cheap when it first arrived in Europe.', answer: 'FALSE', explanation: 'It was initially seen as a luxury item, so it was expensive.' },
          { id: 'r206', type: 'multiple-choice', prompt: 'The writer says the Royal Society:', options: ['Was founded in a coffeehouse in Vienna', 'May have developed from coffeehouse discussions', 'Banned coffee drinking', 'Was a religious group'], answer: 1, explanation: 'The Royal Society is said to have grown out of coffeehouse discussions.' },
          { id: 'r207', type: 'sentence-completion', prompt: 'Some rulers tried to ______ coffee because of its influence.', answer: 'ban', explanation: 'Some rulers tried to ban coffee because of its social and political influence.' },
          { id: 'r208', type: 'true-false-not-given', prompt: 'Coffee cultivation today has no environmental concerns.', answer: 'FALSE', explanation: 'The final paragraph mentions environmental sustainability as a concern.' },
          { id: 'r209', type: 'multiple-choice', prompt: 'The last paragraph mainly discusses:', options: ['The taste of coffee', 'Modern challenges in the coffee industry', 'The history of coffeehouses', 'How to brew coffee'], answer: 1, explanation: 'It addresses labour conditions and environmental sustainability.' },
          { id: 'r210', type: 'sentence-completion', prompt: 'The word "cultivation" in the last paragraph means ______ production.', answer: 'coffee', explanation: 'Cultivation refers to growing/producing coffee.' },
          { id: 'r211', type: 'multiple-choice', prompt: 'What is the overall purpose of the passage?', options: ['To sell coffee', 'To describe the history and social impact of coffee', 'To argue that coffee is bad for health', 'To compare coffee and tea'], answer: 1, explanation: 'The passage traces coffee’s history and its social impact.' },
          { id: 'r212', type: 'sentence-completion', prompt: 'In Cairo, coffeehouses became places for conversation, ______ and business.', answer: 'debate', explanation: 'Coffeehouses became places for conversation, debate and business.' },
          { id: 'r213', type: 'multiple-choice', prompt: 'What does "they" in paragraph 3 refer to?', options: ['European merchants', 'Coffeehouses in London, Paris and Vienna', 'Coffee berries', 'Royal Society members'], answer: 1, explanation: '"They" refers to the coffeehouses mentioned earlier in the sentence.' }
        ]
      },
      {
        id: 'r2p2', passageNumber: 2, title: 'Sleep and Learning', difficulty: 'Medium',
        text: `Sleep is not simply a period of rest; it plays a critical role in learning and memory. Researchers distinguish between two main phases of sleep: rapid eye movement (REM) sleep and non-REM sleep. During non-REM sleep, the brain appears to replay and consolidate new information, moving it from short-term to long-term memory. REM sleep, on the other hand, is closely associated with the processing of emotional memories and with creative problem-solving.\n\nStudies of students consistently show that sleep deprivation impairs attention, working memory and the ability to retain facts. In one well-known experiment, participants who studied a list of words and then slept performed better on a recall test than those who stayed awake for the same period. The benefit of sleep was especially clear for the participants who had been given a sleep period soon after learning, rather than several hours later.\n\nThe quality of sleep matters as much as its quantity. Fragmented sleep, even when total hours are normal, reduces the amount of deep sleep the brain needs for consolidation. This is why common sleep disruptors such as late-night screen use and irregular schedules can have an outsized effect on academic performance.\n\nPractical advice for students is therefore relatively clear: keep a consistent sleep schedule, avoid caffeine in the afternoon, and try to study difficult material before going to bed, so that the brain has a chance to consolidate it during the night.` ,
        questions: [
          { id: 'r214', type: 'multiple-choice', prompt: 'According to the passage, non-REM sleep is mainly linked to:', options: ['Creative problem-solving', 'Consolidating new information', 'Dreaming', 'Physical rest'], answer: 1, explanation: 'Non-REM sleep replays and consolidates new information into long-term memory.' },
          { id: 'r215', type: 'multiple-choice', prompt: 'REM sleep is associated with:', options: ['Emotional memories and creativity', 'Only physical recovery', 'Deep sleep', 'Short-term memory'], answer: 0, explanation: 'REM sleep is linked to emotional memory processing and creative problem-solving.' },
          { id: 'r216', type: 'true-false-not-given', prompt: 'Participants who slept after studying always performed worse than those who stayed awake.', answer: 'FALSE', explanation: 'Those who slept performed better on the recall test.' },
          { id: 'r217', type: 'multiple-choice', prompt: 'The experiment showed the clearest benefit of sleep when participants slept:', options: ['Several hours after learning', 'Soon after learning', 'The next morning', 'Before studying'], answer: 1, explanation: 'The benefit was clearest when sleep came soon after learning.' },
          { id: 'r218', type: 'true-false-not-given', prompt: 'Total hours of sleep are the only factor that matters.', answer: 'FALSE', explanation: 'The writer says quality matters as much as quantity.' },
          { id: 'r219', type: 'multiple-choice', prompt: 'Fragmented sleep reduces the amount of:', options: ['REM sleep', 'Deep consolidation sleep', 'Dreaming', 'Daytime alertness only'], answer: 1, explanation: 'Fragmented sleep reduces deep sleep needed for consolidation.' },
          { id: 'r220', type: 'multiple-choice', prompt: 'Which of these is NOT mentioned as a sleep disruptor?', options: ['Late-night screen use', 'Irregular schedules', 'Caffeine in the afternoon', 'Daytime exercise'], answer: 3, explanation: 'Screen use, irregular schedules and caffeine are mentioned; daytime exercise is not mentioned as a disruptor.' },
          { id: 'r221', type: 'sentence-completion', prompt: 'It is better to study difficult material ______ going to bed.', answer: 'before', explanation: 'The advice is to study before bed so the brain consolidates the material at night.' },
          { id: 'r222', type: 'true-false-not-given', prompt: 'The writer gives practical advice to students.', answer: 'TRUE', explanation: 'The final paragraph gives clear practical advice.' },
          { id: 'r223', type: 'multiple-choice', prompt: 'The word "consolidate" is closest in meaning to:', options: ['Forget', 'Strengthen/retain', 'Mix up', 'Shorten'], answer: 1, explanation: 'Consolidate means to make the memory stronger, i.e. retain it.' },
          { id: 'r224', type: 'sentence-completion', prompt: 'Sleep helps move information from short-term to ______ memory.', answer: 'long-term', explanation: 'Consolidation moves information from short-term to long-term memory.' },
          { id: 'r225', type: 'multiple-choice', prompt: 'What is the main idea of the passage?', options: ['Sleep is only for physical rest', 'Sleep helps learning and memory', 'Students should never sleep', 'Coffee improves memory'], answer: 1, explanation: 'The central idea is that sleep plays a critical role in learning and memory.' },
          { id: 'r226', type: 'true-false-not-given', prompt: 'The experiment compared recall after sleep versus after staying awake.', answer: 'TRUE', explanation: 'The passage describes exactly that comparison.' }
        ]
      },
      {
        id: 'r2p3', passageNumber: 3, title: 'The Rise of Remote Work', difficulty: 'Harder',
        text: `Remote work has shifted from a niche arrangement to a mainstream practice in a remarkably short period. A combination of better communication technology, a changing workforce and, in many countries, the experience of the pandemic, has accelerated the trend. While remote work is often celebrated for its flexibility, researchers argue that its benefits are not evenly distributed.\n\nSupporters point to reduced commuting, greater autonomy and the ability to work from anywhere. For many employees, especially parents and people with disabilities, remote work removes barriers that traditional office work imposed. Employers, in turn, can reduce office costs and recruit from a broader geographic area.\n\nHowever, critics note important downsides. Remote workers may find it harder to separate work and home life, and they may miss the informal learning that happens in an office. There is also evidence that remote work can increase feelings of isolation, particularly for younger employees who are still establishing their professional networks.\n\nThe picture is further complicated by differences between industries. Knowledge-based roles, such as software development, marketing and design, are relatively easy to move online. By contrast, many service, healthcare and manufacturing roles require a physical presence, which means the benefits of remote work are essentially unavailable to a large portion of the workforce.\n\nMost researchers now agree that the future is likely to be hybrid rather than fully remote. The challenge for organisations is to design policies that give flexibility while preserving the social and mentoring benefits of in-person contact.` ,
        questions: [
          { id: 'r227', type: 'sentence-completion', prompt: 'Remote work has moved from a ______ arrangement to mainstream practice.', answer: 'niche', explanation: 'The passage describes the shift from a niche to mainstream practice.' },
          { id: 'r228', type: 'multiple-choice', prompt: 'Which is NOT mentioned as something that accelerated the trend?', options: ['Better communication technology', 'A changing workforce', 'The pandemic', 'Government pay rises'], answer: 3, explanation: 'Pay rises are not mentioned; the other three are listed.' },
          { id: 'r229', type: 'true-false-not-given', prompt: 'The benefits of remote work are the same for all workers.', answer: 'FALSE', explanation: 'The writer says the benefits are not evenly distributed.' },
          { id: 'r230', type: 'multiple-choice', prompt: 'Supporters mention all of the following benefits EXCEPT:', options: ['Reduced commuting', 'Greater autonomy', 'Working from anywhere', 'Higher salary'], answer: 3, explanation: 'Reduced commuting, autonomy and location freedom are mentioned; salary is not.' },
          { id: 'r231', type: 'true-false-not-given', prompt: 'Some people with disabilities find remote work removes barriers.', answer: 'TRUE', explanation: 'The passage states remote work removes barriers for some people, including those with disabilities.' },
          { id: 'r232', type: 'multiple-choice', prompt: 'Critics say remote workers may experience:', options: ['Better work-life separation', 'Isolation and lost informal learning', 'Higher commuting costs', 'More meetings'], answer: 1, explanation: 'A downside is difficulty separating work and home life, isolation and lost informal learning.' },
          { id: 'r233', type: 'multiple-choice', prompt: 'Which group is especially affected by isolation?', options: ['Older workers', 'Younger employees building networks', 'Managers', 'Customers'], answer: 1, explanation: 'Younger employees still establishing professional networks feel isolation more.' },
          { id: 'r234', type: 'true-false-not-given', prompt: 'All industries can adopt remote work easily.', answer: 'FALSE', explanation: 'Many service, healthcare and manufacturing roles require physical presence.' },
          { id: 'r235', type: 'sentence-completion', prompt: 'Knowledge-based roles such as software development are ______ to move online.', answer: 'easy', explanation: 'Knowledge-based roles are relatively easy to move online.' },
          { id: 'r236', type: 'multiple-choice', prompt: 'Most researchers predict a ______ future for work.', options: ['Fully remote', 'Hybrid', 'Fully office-based', 'No change'], answer: 1, explanation: 'Most agree the future is likely hybrid rather than fully remote.' },
          { id: 'r237', type: 'sentence-completion', prompt: 'Organisations should keep flexibility while preserving social and ______ benefits.', answer: 'mentoring', explanation: 'They should preserve the social and mentoring benefits of in-person contact.' },
          { id: 'r238', type: 'multiple-choice', prompt: 'The writer’s overall tone is:', options: ['Completely positive', 'Completely negative', 'Balanced and nuanced', 'Humorous'], answer: 2, explanation: 'The passage presents both benefits and drawbacks, giving a balanced view.' },
          { id: 'r239', type: 'multiple-choice', prompt: 'The word "autonomy" in paragraph 2 most nearly means:', options: ['Independence', 'Obedience', 'Salary', 'Teamwork'], answer: 0, explanation: 'Autonomy means independence/freedom to decide.' },
          { id: 'r240', type: 'sentence-completion', prompt: 'The main challenge is to give flexibility while keeping social and ______ contact.', answer: 'in-person', explanation: 'The challenge is preserving in-person social and mentoring contact.' }
        ]
      }
    ]
  };

  /* ---------- Writing · Practice Test 2 ---------- */
  const writing2 = {
    id: 'writing-02', title: 'Writing Practice Test 2', skill: 'Writing', difficulty: 'Intermediate', format: 'Academic', duration: 60,
    tasks: [
      {
        id: 'w201', taskNumber: 1, title: 'Task 1', minutes: 20, minWords: 150,
        prompt: 'The table below shows the average time spent on public transport each day by people in four cities between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        chartData: 'City A: 38 min (2015) → 42 min (2020) → 47 min (2025)\nCity B: 55 min (2015) → 48 min (2020) → 44 min (2025)\nCity C: 31 min (2015) → 35 min (2020) → 41 min (2025)\nCity D: 60 min (2015) → 58 min (2020) → 56 min (2025)\n\nCity B and City D spend noticeably more time commuting than City A and City C, though City B has fallen while City A and City C have risen over the period.',
        explanation: 'This task tests whether you can summarise a table: describe the overall trend, compare the highest and lowest values, and mention shifts over time.'
      },
      {
        id: 'w202', taskNumber: 2, title: 'Task 2', minutes: 40, minWords: 250,
        prompt: 'Some people argue that young people should take a gap year, working or travelling, before starting university. What are the advantages and disadvantages of this practice?',
        explanation: 'This is a balanced discussion question. A good answer presents clear advantages (maturity, real-world experience) and disadvantages (lost momentum, cost), then gives a reasoned opinion.'
      }
    ]
  };

  /* ---------- Speaking · Practice Test 2 ---------- */
  const speaking2 = {
    id: 'speaking-02', title: 'Speaking Practice Test 2', skill: 'Speaking', difficulty: 'Intermediate', duration: 14,
    parts: [
      {
        id: 's2p1', partNumber: 1, title: 'Part 1 — Introduction and interview', minutes: '4-5',
        questions: [
          'Let’s talk about transport. How do you usually travel to work or school?',
          'Do you prefer to walk, take public transport, or use a car? Why?',
          'Is traffic a problem where you live?',
          'Has your idea of a good journey changed over the years?'
        ]
      },
      {
        id: 's2p2', partNumber: 2, title: 'Part 2 — Long turn (cue card)', minutes: '3-4', prepSeconds: 60, talkSeconds: 120,
        topic: 'Describe a place you enjoy visiting in your free time.',
        bullets: ['where the place is', 'what you do there', 'who you usually go with', 'and explain why you enjoy visiting it.']
      },
      {
        id: 's2p3', partNumber: 3, title: 'Part 3 — Discussion', minutes: '4-5',
        questions: [
          'Why do you think some public places become popular with local people?',
          'Should cities spend more money on public parks and green spaces?',
          'How might the way people use public spaces change in the future?'
        ]
      }
    ]
  };

  /* ---------- Mini-lessons ---------- */
  const lessons = [
    {
      id: 'lesson-1', category: 'Writing', level: 'Foundation', minutes: 6,
      title: 'Task 1: Overview — the one paragraph examiners want',
      summary: 'How to write a clear overview that describes the main trend without listing every number.',
      bullets: [
        'Write the overview in one short paragraph after the introduction.',
        'Focus on the biggest change, not every figure.',
        'Use moves like “Overall, ...”, “Overall trend ...”, “In general, ...”',
        'Never give small, individual numbers in the overview.'
      ]
    },
    {
      id: 'lesson-2', category: 'Writing', level: 'Intermediate', minutes: 7,
      title: 'Task 2: Build a clear position in 5 sentences',
      summary: 'A repeatable paragraph structure that keeps your argument focused and easy to follow.',
      bullets: [
        'State your position in the first sentence.',
        'Give one clear reason in the next sentence.',
        'Develop the reason with an example.',
        'Link back to the question in the final sentence.'
      ]
    },
    {
      id: 'lesson-3', category: 'Reading', level: 'Foundation', minutes: 6,
      title: 'TRUE / FALSE / NOT GIVEN: spot the difference',
      summary: 'The key difference between FALSE and NOT GIVEN and how to avoid the most common trap.',
      bullets: [
        'TRUE = the text says the same thing.',
        'FALSE = the text says the opposite.',
        'NOT GIVEN = the text simply does not mention it.',
        'Do not use your own knowledge to choose NOT GIVEN.'
      ]
    },
    {
      id: 'lesson-4', category: 'Listening', level: 'Foundation', minutes: 6,
      title: 'Listening Part 1: answer with the exact words',
      summary: 'Why spelling and word limits matter, and how to copy answers accurately.',
      bullets: [
        'Read the question before the recording to identify the missing word type.',
        'Write exactly what you hear — do not paraphrase in Part 1.',
        'Check singular / plural and spelling.',
        'Keep answers within the word limit given.'
      ]
    },
    {
      id: 'lesson-5', category: 'Speaking', level: 'Intermediate', minutes: 6,
      title: 'Speaking Part 2: the 2-minute plan',
      summary: 'Use the 1-minute preparation time to structure a strong long turn.',
      bullets: [
        'Write four short headings linked to the bullet points.',
        'Plan one detail for each bullet, not the whole answer.',
        'Open with a clear topic sentence.',
        'Keep talking even if you make a small mistake.'
      ]
    },
    {
      id: 'lesson-6', category: 'Vocabulary', level: 'Intermediate', minutes: 5,
      title: 'Paraphrase in Writing: simple swaps that lift your band',
      summary: 'A few easy ways to rephrase the question without copying it.',
      bullets: [
        'Swap common words: “important” → “significant”, “many” → “a considerable number of”.',
        'Change word forms: “grow” → “growth”.',
        'Avoid copying the question word-for-word.',
        'Keep your paraphrase accurate — do not change the meaning.'
      ]
    }
  ];

  /* ---------- Vocabulary ---------- */
  const vocabulary = {
    travel: {
      id: 'vocab-travel', title: 'Travel & transport', level: 'Intermediate',
      words: [
        { word: 'commute', pos: 'verb', meaning: 'to travel regularly between home and work', example: 'I commute by train every day.', synonyms: ['travel', 'go to work'] },
        { word: 'congestion', pos: 'noun', meaning: 'traffic jams and heavy crowding', example: 'Road congestion is worse in the morning.', synonyms: ['traffic jam', 'crowding'] },
        { word: 'duration', pos: 'noun', meaning: 'the length of time something lasts', example: 'The journey duration is about an hour.', synonyms: ['length', 'time'] },
        { word: 'pedestrian', pos: 'noun', meaning: 'a person walking on the street', example: 'Pedestrians should use the crossing.', synonyms: ['walker'] },
        { word: 'efficient', pos: 'adjective', meaning: 'working well without wasting time or energy', example: 'The new metro is very efficient.', synonyms: ['effective', 'productive'] }
      ]
    },
    education: {
      id: 'vocab-education', title: 'Education & learning', level: 'Intermediate',
      words: [
        { word: 'curriculum', pos: 'noun', meaning: 'the set of subjects taught in a school', example: 'The curriculum includes science and art.', synonyms: ['syllabus', 'programme'] },
        { word: 'motivation', pos: 'noun', meaning: 'the desire to do something', example: 'Her motivation to study comes from clear goals.', synonyms: ['drive', 'desire'] },
        { word: 'assessment', pos: 'noun', meaning: 'the process of judging ability', example: 'The final assessment includes a written test.', synonyms: ['evaluation', 'test'] },
        { word: 'self-directed', pos: 'adjective', meaning: 'done by yourself without a teacher', example: 'Self-directed study requires discipline.', synonyms: ['independent'] },
        { word: 'retain', pos: 'verb', meaning: 'to keep information in your memory', example: 'Sleep helps you retain new vocabulary.', synonyms: ['remember', 'hold'] }
      ]
    },
    environment: {
      id: 'vocab-environment', title: 'City & environment', level: 'Intermediate',
      words: [
        { word: 'sustainability', pos: 'noun', meaning: 'using resources so they last into the future', example: 'Green spaces support urban sustainability.', synonyms: ['renewability'] },
        { word: 'biodiversity', pos: 'noun', meaning: 'the variety of living things in an area', example: 'Native plants improve biodiversity.', synonyms: ['variety'] },
        { word: 'infrastructure', pos: 'noun', meaning: 'basic systems such as transport, water, power', example: 'Good infrastructure keeps a city moving.', synonyms: ['facilities', 'systems'] },
        { word: 'accessible', pos: 'adjective', meaning: 'easy to reach or use', example: 'The park is accessible by bus.', synonyms: ['reachable', 'available'] },
        { word: 'maintenance', pos: 'noun', meaning: 'keeping something in good condition', example: 'Park maintenance needs long-term funding.', synonyms: ['upkeep', 'care'] }
      ]
    }
  };

  /* ---------- Quick quiz bank (built from content + tips) ---------- */
  const quiz = {
    id: 'quiz-premium', title: 'IELTS Rapid Quiz', questions: [
      { id: 'q1', prompt: 'Which of these is the correct way to start a Writing Task 1 overview?', options: ['Overall, the number rises sharply...', 'In conclusion, I think...', 'Firstly, it is true that...', 'The chart shows 12% in 2015.'], answer: 0, explanation: 'An overview usually begins with “Overall, ...” and describes the main trend.' },
      { id: 'q2', prompt: 'In TRUE / FALSE / NOT GIVEN, choose NOT GIVEN when:', options: ['The text says the opposite', 'The text does not mention it', 'You disagree with the statement', 'The text uses similar words'], answer: 1, explanation: 'NOT GIVEN is used when the text does not mention the information.' },
      { id: 'q3', prompt: 'Which word is a good synonym for “important”?', options: ['significant', 'quick', 'empty', 'quiet'], answer: 0, explanation: '“Significant” carries the same idea as “important” in academic writing.' },
      { id: 'q4', prompt: 'In Listening, you should write answers that you hear:', options: ['Exactly', 'In your own words', 'Shorter than the word limit', 'With extra adjectives'], answer: 0, explanation: 'In Listening you should write what you hear, not paraphrase.' },
      { id: 'q5', prompt: 'What helps the brain consolidate what you study?', options: ['Sleep', 'Caffeine', 'Late-night screens', 'Studying without breaks'], answer: 0, explanation: 'Sleep plays a key role in moving new information into long-term memory.' },
      { id: 'q6', prompt: 'A good Speaking Part 2 answer should:', options: ['Cover each bullet with a detail', 'Only talk about one point', 'Memorise a full script', 'Stop after 30 seconds'], answer: 0, explanation: 'Use the cue card bullets as headings and spend a little time on each.' },
      { id: 'q7', prompt: 'Which sentence is a good paraphrase of “more and more people work from home”?', options: ['The number of remote workers has increased considerably.', 'Work from home is a bad thing.', 'People never work at home.', 'Now everyone stays at home all day.'], answer: 0, explanation: 'It keeps the meaning while changing the wording.' },
      { id: 'q8', prompt: 'What does “commute” mean?', options: ['To travel regularly between home and work', 'To sleep', 'To study abroad', 'To write an essay'], answer: 0, explanation: 'A commute is a regular journey between home and work.' },
      { id: 'q9', prompt: 'Reading passage titles often help you:', options: ['Predict the topic', 'Skip the text', 'Guess every answer', 'Ignore questions'], answer: 0, explanation: 'The title gives you a clue to the topic, which helps you understand the text.' },
      { id: 'q10', prompt: 'Which is the best way to review your mistakes?', options: ['Read the correct answer and explain why', 'Only look at the band score', 'Delete the result', 'Ignore the question'], answer: 0, explanation: 'Understanding why an answer is correct turns mistakes into learning.' }
    ]
  };

  /* ---------- Extra explanations for Test 1 questions ---------- */
  const extraExplanations = {
    l1: 'The man asks about a Standard membership; the woman says it costs forty-two pounds a month.',
    l2: 'Premium membership includes the pool and all fitness classes.',
    l3: 'Booking is recommended on weekday evenings between five and seven.',
    l4: 'The joining fee is twenty-five pounds.',
    l5: 'The fee is waived if you sign up before the end of this month.',
    l6: 'Two guest passes are included every month.',
    l7: 'You need a photo ID and proof of address.',
    l8: 'A utility bill is given as an example of proof of address.',
    l9: 'Free parking is in the north car park.',
    l10: 'Parking spaces are numbered eighteen to forty.',
    l11: 'The main stage starts at two o’clock, not one o’clock.',
    l12: 'Food stalls are near the old fountain.',
    l13: 'Craft stalls are on the western lawn.',
    l14: 'The play area is open until six in the evening.',
    l15: 'Lost property should be reported to the information tent.',
    l16: 'Cars must be removed by nine p.m.',
    l17: 'Toilets are in three locations: main entrance, food stalls, play area.',
    l18: 'The fountain location is not listed among the toilets.',
    l19: 'The pavilion can host up to two hundred people.',
    l20: 'If it rains, people should move calmly to the pavilion.',
    r1: 'Glass can be recycled without a limit, but paper weakens after about seven cycles.',
    r2: 'Clear glass is the most valuable to recyclers.',
    r3: 'The content is accurate but low-value quality.',
    r4: 'The new process has been more widely adopted.',
    r5: 'It is much purer and therefore easier for some businesses to use.',
    r6: 'The text does not compare recycled glass with other materials.'
  };

  /* ---------- Tests metadata ---------- */
  const testMeta = {
    version: 2,
    tests: [
      { id: 'test1', label: 'Practice Test 1', labelUz: 'Amaliyot testi 1' },
      { id: 'test2', label: 'Practice Test 2', labelUz: 'Amaliyot testi 2', premium: true }
    ]
  };

  /* Attach everything to the global content object. */
  Object.assign(C, {
    listening2, reading2, writing2, speaking2,
    lessons, vocabulary, quiz, extraExplanations, testMeta
  });
  C._premium = true;
  window.IELTS_CONTENT = C;
})();

# IELTS Mock v2 — Bandly AI

IELTS imtihoniga tayyorlanish uchun to'liq mock test platformasi: **Listening, Reading, Writing, Speaking** — real IELTS formatida, vaqt hisoblagich, AI baholash, tushuntirishlar, dashboard, full mock, quiz, lug'at, mini-darslar, PWA va AI Coach bilan.

> **Premium (payments) hozircha yoqilgan emas** — Stripe/Payme keyinroq qo'shiladi. Hozirgi bosqich test uchun hamma funksiya ochiq.

## 🦉 Bandly — brend ramzi va sun'iy intellekt yo'lboshchi

**Bandly** — platformaning yagona vizual ramzi va o'quvchiga yo'l ko'rsatuvchi AI persona. U hamma joyda bir xil ko'rinadi, chunki barcha chiqishlar bitta asset to'plamidan render qilinadi:

| Joy | Nima qiladi |
| --- | --- |
| Logo (header, mobil menyu, footer) + favicon + PWA ikonkasi | brend yuzi |
| Bosh sahifa hero | salomlashuv pufakchasi bilan kutib oladi |
| Har bir sahifadagi suzuvchi hamroh | shu sahifaga mos maslahat beradi, AI Coach'ga olib boradi |
| Bo'lim boshlanishidagi brief modal | aynan shu bo'lim qoidasini tushuntiradi |
| AI Coach chat | har bir AI javobi yonida — gapirayotgan u |
| Bo'sh holatlar (results, mistakes, band trend) | o'lik tugun emas, keyingi qadam ko'rsatadi |
| Kirish / ro'yxatdan o'tish va "bo'lim tugadi" | kutib oladi va natijani tahlil qiladi |

Bandly'ni **Settings → Bandly companion** orqali o'chirish mumkin (faqat suzuvchi hamroh o'chadi, logo qoladi). Har bir maslahat `×` bilan yopiladi va qayta ko'rsatilmaydi.

Assetlar: `assets/mascot.png` (to'liq, shaffof fon), `assets/mascot-head.png` (avatar), `assets/favicon.png`, `assets/og-mascot.png` (ulashish rasmi), `icons/mascot-{180,192,512}.png` (PWA).

## 🛠 Admin panel

To'liq admin panel (`#/admin`): statistika, foydalanuvchilar boshqaruvi (rol/o'chirish), mock testlar CRUD va natijalar jadvali. IELTS-format konstruktorida Listening (4 part + Supabase MP3), Reading (3 passage + paragraph/headings), Writing (2 task + Task 1 image upload), Speaking (3 part + cue-card timers) uchun alohida Visual/JSON rejimlari bor. Supabase `profiles.role` + RLS va `ielts-media` Storage siyosatlari asosida; oddiy foydalanuvchi avtomatik `#/dashboard` ga yo'naltiriladi.

O'rnatish va to'liq yo'riqnoma: [ADMIN.md](ADMIN.md) — SQL migratsiya, birinchi admin, xavfsizlik modeli, kontent shakli.

## ✨ 1-Click AI Mock Generator (admin)

`#/admin` → **Mock tests** → **✨ AI orqali yangi Mock yaratish (1-Click IELTS Generator)** — bir tugma bilan
to'liq IELTS mock test: Listening (4 part, 40 savol, MP3), Reading (3 passage, 40 savol), Writing (Task 1 grafik +
Task 2 insho), Speaking (Part 1–3 + cue card).

- **48 mavzuli ombor** (`lib/topicPool.js`) + har safar boshqacha savol turi kombinatsiyasi, `temperature: 0.85`
- **Audio:** Edge TTS (bepul, MP3) → Groq TTS (WAV) fallback, Supabase Storage `ielts-media` bucket'iga yoziladi
- **Writing Task 1:** `chartSpec` canvas'da chiziladi va PNG sifatida yuklanadi
- Natija to'g'ridan-to'g'ri `mock_tests` + `mock_test_meta` ga yoziladi va darhol tahrirlashga ochiladi
- `GROQ_API_KEY` bo'lmasa admin aniq xabar ko'radi: *"Iltimos, avval GROQ_API_KEY sozlang"*

To'liq yo'riqnoma: [ADMIN.md](ADMIN.md) → “4.5 AI Generator”.

## 🛡️ IELTS guardrails va 7 kunlik AI kesh

- **Qat'iy chegara:** barcha AI chaqiruvlariga *"IELTS Murabbiyi"* System Instruction biriktirilgan — dasturlash, siyosat, erkin suhbat yoki umumiy savollar boshqa javobsiz, faqat rad etish jumlasi bilan qaytariladi. Coach sahifasida savol tarmoq chizig'idan **oldin** brauzerda tekshiriladi.
- **7 kunlik kesh (`public.ai_cache`):** bir xil savol 7 kun ichida qayta berilsa Groq chaqirilmaydi — javob bazadan olinadi. Muddati o'tgan qator `upsert` bilan yangilanadi. Keshni faqat server ishlatadi (RLS yoqilgan, policy yo'q).
- 1-Click Generator ataylab keshlanmaydi — har bir mock test boshqacha bo'ladi.

Tafsilotlar: [SUPABASE.md](SUPABASE.md) → “AI kesh (7 kunlik TTL) va IELTS guardrails” va [ADMIN.md](ADMIN.md) → “4.6 AI chegarasi (guardrails) va 7 kunlik kesh”.

## 🧭 Interaktiv Roadmap, mini-o‘yinlar va Daily Streak

`#/roadmap` — Duolingo uslubidagi ketma-ket o‘quv yo‘li: **40 ta mavzu, 200 ta quiz savoli va 120 ta mini-o‘yin**. Har bir mavzuda **O‘rganish → O‘ynash → Test** tablari, qisqa konspekt va nusxalashga tayyor AI-tutor prompti bor.

| Bosqich | Mavzular | Asosiy yo‘nalishlar |
| --- | --- | --- |
| A1 → A2 | 10 | Asosiy zamonlar, kundalik lug‘at, savollar, predloglar, listening asoslari |
| A2 → B1 | 10 | Artikllar, bog‘lovchilar, present perfect, modallar, pre-intermediate vocabulary |
| B1 → B2 | 10 | Academic Word List, passive voice, paraphrasing, cohesion, IELTS reading/listening |
| B2 → C1 | 10 | Inversion, C1 idioms/collocations, hedging, murakkab gaplar va IELTS Task 2 |

Har bir mavzuning uchta o‘yini:
- **Word Match** — aralashtirilgan 10 ta kartochka / 5 ta so‘z–ma’no jufti; to‘g‘ri juft yashil yonib yo‘qoladi, noto‘g‘risi silkinadi. Mukofot: **+10 coins**.
- **Speed Vocabulary** — **60 soniya**, har savolda 3 variant, `1`–`3` klaviatura tugmalari, tez javob va ketma-ket to‘g‘ri javob uchun combo bonus. Muvaffaqiyatli natija: **+5–15 coins**.
- **Sentence Scramble** — bosiladigan so‘z bloklaridan 3 ta darajaga mos gap tuzish; tanlangan blokni qaytarish mumkin. To‘liq to‘g‘ri natija: **+15 coins**.

**Progress:** birinchi mavzu ochiq. 5 savolli mastery quiz’da **80%+** natija keyingi mavzuni ochadi; bosqichlar orasida ham tartib saqlanadi. O‘yinlar mashq va streak uchun, lekin mastery quiz’ni chetlab o‘tmaydi. Oldingi 12 mavzuning ID’lari, progressi va tangalari saqlanadi; avval tugatilgan mavzularni qayta ko‘rish mumkin.

**Streak:** kamida bitta tekshirilgan quiz yoki o‘yin tugatish bir **UTC** kunida faqat bir marta streak’ni oshiradi. Shunchaki login qilish hisoblanmaydi. Bir kun o‘tkazib yuborilsa streak `0`, qayta mashq qilinganda `1` bo‘ladi. 🔥 va coin balansi profil yonida, mobil header’da ham doim ko‘rinadi; Roadmap’da haftalik streak paneli bor.

**Rewards:** har bir topic/o‘yin uchun UTC kuniga bir marta; o‘sha sessiyani qayta yuborish ikkinchi credit bermaydi. Mastery quiz mukofoti alohida, bir martalik **10/20/35/50 coins**. Mock Listening/Reading bandlari ham **30/60/100** tier’lari bilan wallet va `#/leaderboard` ga qo‘shiladi. Miqdor, tezlik, combo va javoblar Supabase’da hisoblanadi — client coin miqdorini tanlay olmaydi. Bu mashq uchun virtual ballar, proctored imtihon yoki pul emas.

Glassmorphism, dark/light tema, EN/UZ/RU interfeys, keyboard/focus qo‘llovi, reduced-motion va Web Audio API pop/ding ovozlari (mute bilan) mavjud. Mehmon birinchi mavzuning o‘yinlarini sinab ko‘ra oladi, ammo real coin/streak/progress saqlanmaydi va yangi mavzu ochilmaydi.

**O‘rnatish:** avvalgi migratsiyalardan keyin `supabase/migrations/202610060003_interactive_learning.sql` ni qo‘llang. Faylda 40 ta tayyor seed, `topics.game_data`, streak ustunlari, RLS va grader/reward RPC’lari bor. To‘liq tartib: [SUPABASE.md](SUPABASE.md) → “Interaktiv Roadmap, tangalar va leaderboard”. Kodni deploy qilishning o‘zi hosted bazaga migratsiya qo‘llamaydi.

Kontentning yagona manbasi — `scripts/roadmap-seed.js`:

```bash
npm run seed:roadmap        # SQL seed va public katalogni birga yangilash
npm run seed:roadmap:check  # 40 mavzu / 200 savol / 120 o‘yin va kalitlarni tekshirish
```

Public katalog `lib/roadmapContent.js` mehmon mashqi uchun ishlatiladi; private quiz kalitlari va generator production public build’ga chiqarilmaydi. Kelajakda kontent o‘zgarsa, mavjud hosted baza uchun yangi migration ham tayyorlang — eski migration’ni tahrirlash `db push` orqali uni qayta qo‘llamaydi.

## ✨ Imkoniyatlar

### Test va baholash
- **Listening** — 4 qism, 40 savol, 30 daqiqa; **2 ta to'liq test** (Test 1 va Test 2)
- **Reading** — 3 passage, 40 savol; **2 ta to'liq test**
- **Writing** — Task 1 va Task 2 **alohida** AI bilan baholanadi (overall = T1×⅓ + T2×⅔)
- **Speaking** — 3 qism, ovozni tanib olish (Web Speech API) + qo'lda yozish
- **Explanations** — har bir Listening/Reading savoli uchun qisqa tushuntirish
- **Mistake notebook** — har bir xato javob saqlanadi (sizning javobingiz vs to'g'ri javob)

### Premium/talim
- **Roadmap + gamification** — 40 mavzu / 4 bosqich, 120 mini-o‘yin, mastery quiz’lar, qulflangan ketma-ket progress, Daily Streak, coins va global leaderboard.
- **Dashboard** — overall band, band trend (SVG grafik), haftalik faollik, shaxsiy 6 kunlik reja
- **Full mock** — Listening → Reading → Writing → Speaking bitta sessiyada, combined result
- **Mini lessons** — Writing/Reading/Listening/Speaking/Vocabulary uchun 6 ta qisqa dars
- **Vocabulary** — 3 topic (travel, education, environment), mastery % bilan
- **Quiz** — tezkor IELTS viktorina, javob va tushuntirish bilan; server-side `/api/quiz` AI endpoint
- **i18n** — English, O'zbek, Russian (nav settings orqali)
- **PWA** — `manifest.webmanifest` + `sw.js` (offline cache, install qilish mumkin)
- **Auth / Database** — Supabase Email/password + ixtiyoriy Google OAuth; `mock_results` natijalari va RLS. Demo login olib tashlangan; Supabase sozlanmasa kirish va mock testlar bloklanadi.
- **AI Coach** — natijalarga moslashgan suhbatdosh

## 🚀 O'rnatish va ishga tushirish (lokal)

```bash
git clone <repo-url>
cd IELTS-mock-v2

# API kalitini sozlang (majburiy emas — local fallback bor)
npm ci
cp .env.example .env
# .env ga SUPABASE_URL, SUPABASE_ANON_KEY va ixtiyoriy GROQ_API_KEY kiriting

npm run preview
# → http://localhost:3000
```

Yoki Vercel CLI bilan: `npm run dev`. Node.js 22+ kerak.

**Supabase sozlash:** SQL jadval/RLS, Auth, environment va deploy bo'yicha to'liq yo'riqnoma: [SUPABASE.md](SUPABASE.md). SQL faylni Supabase'da qo'llamasdan cloud saqlash ishlamaydi.

**Muhim:** AI baholash, AI Coach, quiz va 1-Click generator uchun `GROQ_API_KEY` kerak. `/api/quiz` esa kalit yo'q bo'lsa ham local savol bankidan ishlaydi.

## 🧪 Testlar

```bash
npm test
npm run seed:roadmap:check
npm run build
```

Nimalar tekshiriladi:
- `tests/api.test.js` — grade/coach API (rate-limit, validation, AI mock)
- `tests/boot.test.js` — script.js yuklanishi va barcha route render
- `tests/premium.test.js` — Test 2 kontenti, explanations, services (dashboard/quiz), i18n
- `tests/quiz.test.js` — `/api/quiz` endpoint
- `tests/mascot.test.js` — Bandly: logo, hero, coach, bo'sh holatlar, suzuvchi hamroh, assetlar va tarjimalar
- `tests/admin.test.js` — admin: guard/redirect, nav ko'rinishi, RLS va SQL invariantlari, muharrir validatsiyasi, XSS
- `tests/generator.test.js` — AI generator: mavzu ombori, endpoint (har bir skill, kalit xabari, audio), TTS, i18n, wiring
- `tests/generatorClient.test.js` — generator modal oqimi: generatsiya → media upload → Supabase saqlash → xulosa
- `tests/aiGuardrails.test.js` — IELTS guardrails (rad etish) va 7 kunlik TTL kesh (PGlite bilan)
- `tests/roadmap.test.js` — eski gamification migration’i, quiz threshold, duplicate coin rewards, mock reward tiers va leaderboard maxfiyligi
- `tests/learning.test.js` — 40 ta seed, uchta o‘yin, global unlock, UTC streak, server timer/combo, RLS, idempotency, kontent o‘zgarishi, account switch, guest va real SDK HTTP fixture’lari

Ixtiyoriy **haqiqiy brauzer** testlari (alohida terminalda preview server ishlasin):

```bash
npx playwright install --with-deps chromium
npm run preview
# boshqa terminal:
npm run test:learning:browser
# bitta oqimni tekshirish:
npm run test:learning:browser -- --guest
npm run test:learning:browser -- --account
```

`tests/learning.browser.test.js` desktop / 390px / 320px, uchta guest o‘yin, klaviatura, Uzbek/light tema, real SDK login, coin/streak yangilanishi, quiz unlock va leaderboard’ni tekshiradi. Account oqimi **PGlite’dagi haqiqiy SQL/RLS + intercepted HTTP** ishlatadi; jonli Supabase’ga ulanmaydi. `PLAYWRIGHT_BASE_URL` boshqa preview manzilini, `PLAYWRIGHT_EXECUTABLE_PATH` mavjud Chromium binary’sini, `PLAYWRIGHT_CHROMIUM_ARGS` JSON argumentlar ro‘yxatini tanlaydi. `LEARNING_SCREENSHOT_DIR` berilsa screenshot’lar yoziladi; cache/ignored papkani tanlang va binary/screenshot’larni Git’ga qo‘shmang.

## ☁️ Deploy (Vercel)

1. Reponi GitHub'ga push qiling
2. [vercel.com](https://vercel.com) → **New Project** → reponi tanlang
3. Environment Variables: `GROQ_API_KEY` (AI baholash, AI Coach, Quiz va 1-Click AI Mock Generator uchun), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (7 kunlik AI kesh uchun). Ixtiyoriy: `GROQ_MODEL` (standart `llama-3.3-70b-versatile` — Groq uni free/developer kalitlar uchun 2026-08-16 da yopgan, `lib/aiClient.js` avtomatik `openai/gpt-oss-120b` ga o'tadi; modelni shu yerda qat'iy belgilash mumkin) va `GROQ_TTS_VOICE` (Listening audio uchun Orpheus ovozi)
4. **Deploy** — `vercel.json` SPA routingni boshqaradi

## 🧩 Loyiha tuzilishi

```
api/
  grade.js       → AI examiner (writing/speaking)
  coach.js       → AI Coach suhbatdoshi
  quiz.js        → AI-generated quiz (local fallback bilan)
  generate-mock.js → 1-Click AI mock generator endpoint
  .env.example
lib/
  aiGuardrails.js → qat'iy IELTS System Instruction + mavzudan tashqari so'rovni rad etish
  aiCache.js      → 7 kunlik TTL kesh (public.ai_cache)
  topicPool.js    → AI mock generator uchun 48 IELTS mavzusi + savol turi aralashtirish
  learningPath.js → UTC streak, unlock, shuffle, scoring va SVG helpers
  roadmapContent.js → generated public 40-mavzuli katalog (quiz kalitlarisiz)
  aiClient.js     → yagona AI moduli: Groq (OpenAI formati), chat + JSON + TTS
  edgeTts.js      → Edge TTS (MP3) + Groq TTS (WAV) fallback
scripts/roadmap-seed.js → 40 mavzu va private kalitlar uchun seed generator
miniGames.js     → Word Match / Speed Vocabulary / Sentence Scramble controller
learning.css     → Roadmap va o‘yinlar glass UI, mobile, light/dark, reduced-motion
mockGenerator.js → admin UI: 1-Click AI generator modal
data.js          → Test 1 kontenti
content2.js      → Test 2, explanations, lessons, vocabulary, quiz (premium pack)
i18n.js          → en/uz/ru tarjimasi
index.html       → SEO meta, manifest, JSON-LD
script.js        → frontend router, dashboard, quiz, full mock, auth
services.js      → band konversiya, explanations, dashboard/quiz helpers
styles.css       → premium UI (dark/light, responsive)
manifest.webmanifest + sw.js  → PWA
assets/          → Bandly maskot assetlari (mascot, mascot-head, favicon, og-mascot)
icons/           → PWA ikonkalari (mascot-180/192/512, icon.svg)
admin.js         → Admin panel: mantiqiy qatlam, view, test muharriri (vizual + JSON)
supabase/migrations/  → SQL: mock_results, admin/RBAC, media Storage, 40-mavzuli Roadmap/games/streak/coins/leaderboard, ai_cache va RLS
```

## ⚠️ Eslatma

Bu platforma mashq uchun mo'ljallangan — band natijalari **taxminiydir** va IELTS, British Council, IDP yoki Cambridge bilan aloqador emas.

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
- **Audio:** Edge TTS (bepul, MP3) → Gemini TTS (WAV) fallback, Supabase Storage `ielts-media` bucket'iga yoziladi
- **Writing Task 1:** `chartSpec` canvas'da chiziladi va PNG sifatida yuklanadi
- Natija to'g'ridan-to'g'ri `mock_tests` + `mock_test_meta` ga yoziladi va darhol tahrirlashga ochiladi
- `GEMINI_API_KEY` bo'lmasa admin aniq xabar ko'radi: *"Iltimos, avval GEMINI_API_KEY sozlang"*

To'liq yo'riqnoma: [ADMIN.md](ADMIN.md) → “4.5 AI Generator”.

## 🧭 Self-study Roadmap + gamification

`#/roadmap` sahifasida A1→A2 dan B2→C1 gacha to‘rt bosqich, har birida uchta tayyor ingliz tili/IELTS mavzusi, qisqa konspekt, ChatGPT/Claude promptini nusxalash va serverda baholanadigan 5 savolli quiz mavjud. 80%+ natija mavzuni tugatadi va daraja mukofotini bir martagina beradi (10/20/35/50 coins). Mock Listening/Reading bandlari ham 30/60/100 coins tier'lari bilan wallet'ga qo‘shiladi. Header'da coin balansi, `#/leaderboard` da rank, avatar, A1–C1 daraja badge'lari va top-3 medallari ko‘rinadi.

Rewards Supabase RPC va idempotent ledger orqali beriladi; brauzer coin miqdorini o‘zi tanlay olmaydi. O‘rnatish tartibi, RLS va leaderboard maxfiylik tafsilotlari: [SUPABASE.md](SUPABASE.md) → “Roadmap, tangalar va leaderboard”.

## ✨ Imkoniyatlar

### Test va baholash
- **Listening** — 4 qism, 40 savol, 30 daqiqa; **2 ta to'liq test** (Test 1 va Test 2)
- **Reading** — 3 passage, 40 savol; **2 ta to'liq test**
- **Writing** — Task 1 va Task 2 **alohida** AI bilan baholanadi (overall = T1×⅓ + T2×⅔)
- **Speaking** — 3 qism, ovozni tanib olish (Web Speech API) + qo'lda yozish
- **Explanations** — har bir Listening/Reading savoli uchun qisqa tushuntirish
- **Mistake notebook** — har bir xato javob saqlanadi (sizning javobingiz vs to'g'ri javob)

### Premium/talim
- **Roadmap + gamification** — A1–C1 bosqichlari, mavzu konspektlari va AI promptlari, serverda baholanadigan quizlar, tangalar hamda global leaderboard.
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
# .env ga SUPABASE_URL, SUPABASE_ANON_KEY va ixtiyoriy GEMINI_API_KEY kiriting

npm run preview
# → http://localhost:3000
```

Yoki Vercel CLI bilan: `npm run dev`. Node.js 22+ kerak.

**Supabase sozlash:** SQL jadval/RLS, Auth, environment va deploy bo'yicha to'liq yo'riqnoma: [SUPABASE.md](SUPABASE.md). SQL faylni Supabase'da qo'llamasdan cloud saqlash ishlamaydi.

**Muhim:** AI baholash va AI Coach uchun `GEMINI_API_KEY` kerak. Kubernetes/`/api/quiz` esa kalit yo'q bo'lsa ham local savol bankidan ishlaydi.

## 🧪 Testlar

```bash
npm test
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
- `tests/roadmap.test.js` — Roadmap SQL/RLS, quiz threshold, duplicate coin rewards, mock reward tiers va leaderboard maxfiyligi

## ☁️ Deploy (Vercel)

1. Reponi GitHub'ga push qiling
2. [vercel.com](https://vercel.com) → **New Project** → reponi tanlang
3. Environment Variables: `GEMINI_API_KEY` (AI baholash, AI Coach va 1-Click AI Mock Generator uchun)
4. **Deploy** — `vercel.json` SPA routingni boshqaradi

## 🧩 Loyiha tuzilishi

```
api/
  grade.js       → AI examiner (writing/speaking)
  coach.js       → AI Coach suhbatdoshi
  quiz.js        → AI-generated quiz (local fallback bilan)
  .env.example
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
supabase/migrations/  → SQL: mock_results, admin/RBAC, media Storage, Roadmap/coins/leaderboard va RLS
```

## ⚠️ Eslatma

Bu platforma mashq uchun mo'ljallangan — band natijalari **taxminiydir** va IELTS, British Council, IDP yoki Cambridge bilan aloqador emas.

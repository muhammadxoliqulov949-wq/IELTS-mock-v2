# IELTS Mock v2 — Bandly AI

IELTS imtihoniga tayyorlanish uchun to'liq mock test platformasi: **Listening, Reading, Writing, Speaking** — real IELTS formatida, vaqt hisoblagich, AI baholash, tushuntirishlar, dashboard, full mock, quiz, lug'at, mini-darslar, PWA va AI Coach bilan.

> **Premium (payments) hozircha yoqilgan emas** — Stripe/Payme keyinroq qo'shiladi. Hozirgi bosqich test uchun hamma funksiya ochiq.

## ✨ Imkoniyatlar

### Test va baholash
- **Listening** — 4 qism, 40 savol, 30 daqiqa; **2 ta to'liq test** (Test 1 va Test 2)
- **Reading** — 3 passage, 40 savol; **2 ta to'liq test**
- **Writing** — Task 1 va Task 2 **alohida** AI bilan baholanadi (overall = T1×⅓ + T2×⅔)
- **Speaking** — 3 qism, ovozni tanib olish (Web Speech API) + qo'lda yozish
- **Explanations** — har bir Listening/Reading savoli uchun qisqa tushuntirish
- **Mistake notebook** — har bir xato javob saqlanadi (sizning javobingiz vs to'g'ri javob)

### Premium/talim
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

## ☁️ Deploy (Vercel)

1. Reponi GitHub'ga push qiling
2. [vercel.com](https://vercel.com) → **New Project** → reponi tanlang
3. Environment Variables: `GEMINI_API_KEY`
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
icons/icon.svg   → PWA icon
```

## ⚠️ Eslatma

Bu platforma mashq uchun mo'ljallangan — band natijalari **taxminiydir** va IELTS, British Council, IDP yoki Cambridge bilan aloqador emas.

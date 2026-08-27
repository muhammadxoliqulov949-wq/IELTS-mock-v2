# IELTS Mock v2 — Bandly AI

IELTS imtihoniga tayyorlanish uchun to'liq mock test platformasi: **Listening, Reading, Writing, Speaking** — real IELTS formatida, vaqt hisoblagich bilan, AI yordamida baholash va AI Coach bilan.

## ✨ Imkoniyatlar

- **Listening** — 4 qism, 40 savol, 30 daqiqa (yozib olingan matn bitta o'ynaydi)
- **Reading** — 3 passage, 40 savol (TRUE/FALSE/NOT GIVEN, multiple-choice, completion)
- **Writing** — Task 1 va Task 2 **alohida** AI bilan baholanadi (official band descriptors asosida, umumiy ball = T1×⅓ + T2×⅔)
- **Speaking** — 3 qism, ovozni tanib olish (Web Speech API) + qo'lda yozish rejimi
- **Mistake notebook** — har bir xato savol saqlanadi: sizning javobingiz vs to'g'ri javob
- **Results** — barcha urinishlar tarixi, har bir savol bo'yicha review, AI feedback
- **AI Coach** — foydalanuvchi profiliga (band, zaif ko'nikma, xatolar) moslashgan suhbatdosh

## 🚀 O'rnatish va ishga tushirish (lokal)

```bash
# 1. Reponi klonlang va kiring
git clone <repo-url>
cd IELTS-mock-v2

# 2. API kalitini sozlang
cp api/.env.example api/.env
# api/.env faylini ochib, GEMINI_API_KEY ni yozing
# (bepul kalit: https://aistudio.google.com/apikey)

# 3. Vercel CLI o'rnating (agar yo'q bo'lsa)
npm i -g vercel

# 4. Lokal server (API funksiyalar bilan birga)
npm run dev
# → http://localhost:3000
```

**Muhim:** AI baholash (Writing/Speaking) va AI Coach ishlashi uchun `GEMINI_API_KEY` kerak. Faqat statik sahifani ko'rish uchun `npm run preview` (API ishlamaydi) dan foydalanish mumkin.

## ☁️ Vercel'ga deploy qilish

1. Reponi GitHub'ga push qiling
2. [vercel.com](https://vercel.com) → **New Project** → reponi tanlang
3. **Environment Variables** bo'limiga qo'shing:
   - `GEMINI_API_KEY` = sizning kalitingiz
4. **Deploy** — hammasi avtomatik (`vercel.json` SPA routingni sohlaydi)

Yoki CLI bilan: `npm run deploy`

## 🧩 Loyiha tuzilishi

```
api/
  grade.js      → AI examiner (writing/speaking baholash, rate-limit bilan)
  coach.js      → AI Coach suhbatdoshi
  .env.example  → API kalit namunasi
index.html      → SEO meta, favicon, JSON-LD bilan
styles.css      → dizayn (dark glassmorphism, responsive)
script.js       → barcha frontend logika (router, timer, savollar, AI chaqiruvlar)
data.js         → IELTS test mazmuni (asl, mualliflik kontenti)
services.js     → band konversiya + javob tekshirish (yumshoq/fuzzy matching)
vercel.json     → deploy konfiguratsiyasi
```

## ⚠️ Eslatma

Bu platforma mashq uchun mo'ljallangan — band natijalari **taxminiydir** va IELTS, British Council, IDP yoki Cambridge bilan aloqador emas.

# IELTS Mock v2 — Sayt auditi va baholash

> **Yangilanish (2026-08-28):** premium polish o'tishi bajarildi — nav qayta loyihalandi
> (5 asosiy link + "More" dropdown + user menyu), foni-timer / Speaking Part 2 (60s→120s) /
> lesson modal / Vercel `/api` rewrite / to'liq i18n qoplami tuzatildi. Tafsilotlar:
> `PREMIUM.md` → "2026-08-28 — Premium polish pass".

**Sana:** 2026-08-27
**Usul:** kodni to'liq o'qib chiqish (index.html, styles.css, script.js, data.js, services.js, api/grade.js) + lokal serverni ishga tushirib, API'larga so'rov yuborib tekshirish + Node'da funksiyalarni sinash.

---

## ✅ 2026-08-27 — Tuzatishlar (to'liq bajarildi)

Quyidagi kritik kamchiliklar tuzatildi (testlar bilan tasdiqlandi, `npm test`):

| # | Muammo | Holat |
|---|---|---|
| 1 | AI Coach endpoint yo'q (`/api/coach` → 501) | ✅ `api/coach.js` yozildi (Gemini, profil + suhbat tarixi bilan) |
| 2 | Deploy tayyorgarligi yo'q | ✅ `package.json`, `vercel.json`, `README.md`, `api/.env.example` qo'shildi |
| 3 | Writing Task 1/2 bitta band bilan baholanardi | ✅ Endi har bir task alohida baholanadi, umumiy = T1×⅓ + T2×⅔ |
| 4 | AI feedback saqlanmasdi | ✅ `store.feedback` — yangi **Results** sahifasida saqlanadi va ko'rsatiladi |
| 5 | Speaking Part 2 transkript takrorlanishi | ✅ `interimResults:false` + isFinal filter, re-record tugmasi, 2 daqiqa avtoto'xtatish |
| 6 | Speaking'da savollar AI'ga yuborilmasdi | ✅ Endi `parts[{title, qa:[{q,a}]}]` formati bilan yuboriladi |
| 7 | Matn javoblar juda qattiq tekshirilardi | ✅ Yumshoq matching: "a utility bill"≈"utility bill", "£42"≈"42", "photo-id"≈"photo ID" |
| 8 | Timer refresh'da yo'qolardi | ✅ Deadline `localStorage`'da saqlanadi |
| 9 | Xatolar daftarida takrorlar | ✅ `sig` asosida deduplikatsiya |
| 10 | Submit'dan keyin natija sahifasi yo'q | ✅ `/results` — band, correct/total, feedback, trend o'qlari |
| 11 | API xavfsizligi yo'q | ✅ Rate-limit (15/daq), so'rov uzunlik limitlari |
| 12 | SEO yo'q | ✅ OG teglar, canonical, JSON-LD, favicon, sitemap tayyor |
| 13 | Footer yo'q | ✅ Disclaimer, aloqa linklari |
| 14 | Login faqat kosmetik | ⏳ Saqlanmoqda (server tekshiruvi hali yo'q) |
| 15 | Testlar yo'q | ✅ `tests/api.test.js` + `tests/boot.test.js` — `npm test` |

**Baho yangilandi: 7.0 → 8.5 / 10**

---

## Dastlabki baho (tuzatishlardan oldin): **7.0 / 10**

Juda yaxshi ishlangan MVP (ishchi prototip) — dizayni professional darajada, IELTS strukturasiga sodiq. Lekin **production darajasiga chiqish uchun muhim funksional bo'shliqlar bor** (asosan AI tomonida va deploy tayyorgarligida).

### Baholar jadvali

| Mezon | Ball | Izoh |
|---|---|---|
| Dizayn va UI/UX | **8.5/10** | Zamonaviy dark glassmorphism, animatsiyalar, to'liq responsive |
| IELTS mazmuni va struktura | **8.0/10** | 40 listening + 40 reading savol, 2 writing task, 3 speaking qism — haqiqiy formatga yaqin |
| Funksionallik | **5.5/10** | Asosiy oqimlar ishlaydi, lekin bir nechta singan/nugsonli joylar bor |
| Kod sifati va arxitektura | **6.0/10** | Soddalik yaxshi, lekin hammasi bitta faylda, testlar yo'q, xatolarga chidamlilik past |
| AI integratsiyasi | **4.5/10** | AI Coach umuman ishlamaydi (endpoint yo'q), writing/speaking baholash bir nuqtada uziladi |
| Professional tayyorgarlik (deploy, SEO, hujjatlar, xavfsizlik) | **4.0/10** | README, package.json, deploy konfig, favicon, SEO yo'q |

---

## ✅ Kuchli tomonlari

1. **Dizayn** — dark tema, glassmorphism panellar, floating orb animatsiyalar, silliq page transition. Rangi va tipografiyasi (Space Grotesk + DM Sans) professional. `prefers-reduced-motion` qo'llab-quvvatlangan — e'tiborli detal.
2. **Responsive** — 900px/720px/480px breakpointlar, hamburger menyu, mobil'da o'qish panellari bir ustunga tushadi.
3. **IELTS mazmuni haqiqiy** — savollar band konversiya jadvaliga mos (40/40→9, 30/40→7, 23/40→6 — tekshirildi, to'g'ri). Listening uchun "recording bir marta o'ynaydi" qoidasi, reading'da TRUE/FALSE/NOT GIVEN, writing'da word count hisoblagich bor.
4. **Xato daftari (Mistakes)** — noto'g'ri javoblar "sizning javobingiz vs to'g'ri javob" ko'rinishida saqlanadi. Bu o'quvchi uchun eng qimmatli funksiya.
5. **Timer** — har bo'limda real vaqt hisoblanadi, tugagach avtomatik submit qiladi.
6. **Google login** — ishlaydigan OAuth login bor (faqat kosmetik, lekin maydon tayyor).
7. **Tezlik** — framework'siz vanilla JS, kichik hajm (≈85KB), tez yuklanadi.
8. **XSS'dan himoya** — `esc()` funksiyasi barcha foydalanuvchi kiritadigan matnlarni tozalaydi (yaxshi odat).

---

## ❌ Kamchiliklari

### Kritik (birinchilar shularni tuzatish kerak)

1. **AI Coach butunlay ishlamaydi** — `script.js` satr 528 da `/api/coach`'ga so'rov yuboriladi, lekin `api/` papkasida faqat `grade.js` bor. Server 501 qaytaradi. Sayt reklama qiladigan asosiy funksiyalardan biri (bosh sahifa: "talk to an AI coach that builds your next study step") singan.
2. **Deploy konfiguratsiyasi yo'q** — `package.json`, `vercel.json`, `README`, `.env.example` yo'q. API kaliti (`GEMINI_API_KEY`) bo'lmasa, writing/speaking baholash ishlamaydi va foydalanuvchi "Server is missing GEMINI_API_KEY" qo'pol xatosini ko'radi. Loyihani boshqa odam olib, qanday deploy qilishni bilmaydi.
3. **Writing baholash metodologiyasi noto'g'ri** — Task 1 va Task 2 **bitta** AI so'rovga birlashtirilib, **bitta** umumiy band beriladi. Haqiqiy IELTS'da har bir task alohida band oladi (umumiy = T1×1/3 + T2×2/3). Bu o'quvchiga noto'g'ri baho beradi.
4. **AI feedback saqlanmaydi** — baholash natijasi (strengths, improvements, criteria) faqat ekranda ko'rinadi. Sahifani yangilasa yoki boshqa bo'limga o'tsa — yo'qoladi. Xuddi shu javobni qayta submit qilsa — qaytadan AI'ga pul/so'rov ketadi.

### Funksional nugsonlar

5. **Speaking transkripti buziladi (Part 2)** — `interimResults = true` bilan har `onresult` hodisasida **barcha** oldingi natijalar qayta qo'shiladi → matn takrorlanaveradi (garbled bo'ladi). Part 2 yozuvini muddatidan oldin to'xtatib bo'lmaydi (120 soniya kutish shart), retry ham yo'q.
6. **Listening uchun haqiqiy audio yo'q** — brauzerning `speechSynthesis` (TTS) ovozi ishlatiladi. Bu robotik ovoz, IELTS'ga o'xshamaydi; ba'zi brauzerlarda ishlamaydi. Professional IELTS sayti uchun yozib olingan (yoki yaxshi TTS bilan yaratilgan) MP3 kerak.
7. **Timer xotirasi yo'q** — deadline JS holatda (`listeningState.deadline`), lekin sahifa yangilansa (refresh) — yo'qoladi. Testni to'xtatib keyin davom ettirib bo'lmaydi.
8. **Xatolar daftarida takrorlar** — bo'limni qayta topshirsa, bir xil xatolar daftarga **yana** qo'shiladi (deduplikatsiya yo'q). Natijalar sahifasi yo'q: submit'dan so'ng to'g'ridan-to'g'ri /mistakes'ga tashlanadi, "qaysi savolda nechta to'g'ri, umumiy band qanday hisoblandi" ko'rinmaydi.
9. **Matn javoblari juda qattiq tekshiriladi** — `"photo ID"` vs `"a photo ID"` yoki `"utility bill"` vs `"a utility bill"` — noto'g'ri deb hisoblanadi. IELTS'da variantlarga yo'l qo'yiladi (aliases qo'llab-quvvatlash kerak).
10. **Speaking transkript qismi uzilib qolishi mumkin** — Part 1/3 savollar uchun savol matni AI'ga berilmaydi, faqat bitta umumiy prompt "IELTS Speaking Parts 1-3". Natijada AI savollarni bilmaydi, bahosi kam ma'lumotga asoslanadi.

### Professional darajadagi kamchiliklar

11. **SEO deyarli yo'q** — Open Graph teg'lari, favicon, canonical, structured data (JSON-LD) yo'q. Sayt Google'da topilmaydi, ijtimoiy tarmoqlarda bo'lishilganda ko'rinishsiz link chiqadi. SPA bo'lgani uchun kontent qidiruv tizimlariga ko'rinmaydi.
12. **Footer yo'q** — mualliflik huquqi, aloqa, "disclaimer" (IELTS bilan aloqador emas), maxfiylik siyosati yo'q. Yuridik xavf.
13. **README/tests yo'q** — bitta ham test (unit yoki e2e) yo'q. Scoring logikasi (`bandFromRaw`, `isCorrect`) testlanmagan.
14. **Google login faqat kosmetik** — token miqdorida o'qiladi (server tekshiruvi yo'q), progress localStorage'da — brauzerni tozalasa hammasi yo'qoladi, login hech narsa saqlamaydi.
15. **Xatolarga chidamlilik past** — AI so'rovda timeout, retry, rate-limit yo'q. Foydalanuvchi kiritishi mumkin bo'lgan cheksiz matn limiti yo'q (AI xarajatini nazorat qilish uchun).
16. **Accessibility** — bir nechta `aria` bor, lekin fokus boshqaruvi, skip-link, timer uchun `aria-live`, tugmalar uchun `aria-label` yetishmaydi.
17. **i18n yo'q** — faqat ingliz tilida. (IELTS uchun ingliz tili to'g'ri, lekin foydalanuvchi interfeysi o'zbek tilida ham bo'lishi mumkin.)

---

## ➕ Qo'shish kerak bo'lgan narsalar (ustuvorlik bilan)

### Birinchi navbat (MVP'ni ishga yaroqli qilish)
- [ ] `api/coach.js` — AI Coach endpoint'ini yozish (Gemini, profildan band/zaif tomon/xatolarni qo'shib)
- [ ] `package.json` + `vercel.json` + `README.md` (o'rnatish, deploy, `.env` ko'rsatmasi) + `api/.env.example`
- [ ] Writing'ni Task 1 va Task 2 **alohida** baholash (ikkala band + umumiy)
- [ ] AI natijalarni `store`'ga saqlash va "Natijalar" sahifasi: band, correct/total, har bir savol bo'yicha review
- [ ] Speaking Part 2 transkript xatosini tuzatish + retry/stop tugmasi
- [ ] API kaliti yo'qligida chiroyli xabar + foydalanuvchiga mos fallback

### Ikkinchi navbat (sifatni oshirish)
- [ ] Listening uchun haqiqiy audio (MP3 fayllar yoki yaxshi TTS; `speechSynthesis` — vaqtinchalik yechim)
- [ ] Matn javoblar uchun yumshoq tekshirish (aliases, kichik xatolar, "a/the" old qo'shimchalar)
- [ ] Savollar uchun izohlar (explanation) — "nima uchun shu javob to'g'ri"
- [ ] Test turlari: "Practice Test 2, 3..." (hozir faqat bitta test bor)
- [ ] Xatolar daftari: sana bo'yicha guruhlash, o'chirish, filtr, "xatolardan quiz" rejimi
- [ ] Tarix va trend: band grafigi, kuchli/zaif ko'nikmalar dinamikasi
- [ ] Writing'da minimal so'z tekshiruvi (150/250) — yetmaganida submit bloklash

### Polishing (professional ko'rinish)
- [ ] SEO: favicon, OG teglar, JSON-LD, sitemap, meta
- [ ] Footer: disklaimer, maxfiylik siyosati, aloqa
- [ ] Google login'ni real qilish (server tekshiruvi, foydalanuvchi profili) yoki olib tashlash
- [ ] Timer'ni sessionStorage'da saqlash (refresh'da davom etish)
- [ ] AI endpoint'larga rate-limit + uzunlik limiti + retry/timeout
- [ ] Unit testlar (scoring) + asosiy oqimlar uchun e2e (Playwright)
- [ ] Accessibility to'plami: skip-link, fokus ring, `aria-live` timerlar uchun
- [ ] PWA (offline, installable) va i18n (uz/en) — o'zbek auditoriyasi uchun juda foydali

---

## Xulosa

Sayt **dizayn jihatidan 8.5/10** — ko'p yirik kompaniyalarnikidan qolishmaydi. **Mazmun jihatidan ham kuchli** — IELTS formatiga sodiq, savollar haqiqiy darajada. Lekin **funksional tugallanmagan**: eng ko'p reklama qilingan funksiya (AI Coach) ishlamaydi, deploy tayyorgarligi yo'q, AI baholash metodologiyasi soddalashtirilgan, natijalar saqlanmaydi.

Qisqasi: **juda yaxshi va istiqbolli MVP — 7/10.** Yuqoridagi "birinchi navbat" ro'yxatidagi 6 ta narsani tuzatsangiz, sayt 8.5/10 darajasiga chiqadi; ikkinchi navbatni ham bajarsangiz — chinakam professional mahsulot (9/10) bo'ladi.

*Hisobot fayli: `AUDIT.md`*

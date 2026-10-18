# Vercel Timeout & AI Request Lifecycle — Operational Runbook

Hujjat maqsadi: production'da timeout, 429, 5xx, provider failover va
streaming xatolarini bir-biridan ajratish, xavfsiz diagnostika qilish va
timeout o'zgartirishdan oldingi tekshiruv ketma-ketligini berish.

**Dalil bazasi (2026-10-16 holati):** `vercel.json`, `lib/aiClient.js`,
`api/coach.js`, `api/grade.js`, `api/quiz.js`, `api/generate-mock.js`,
`api/delete-account.js`, `lib/rateLimit.js`, `lib/aiCache.js`,
`mockGenerator.js` (browser client), `tests/timeoutConfig.test.js`.
Dashboard qadamlari umumiy Vercel hujjatlariga tayangan; aniq UI nomlari
Vercel yangilanishlari bilan o'zgarishi mumkin — tasdiqlanmagan funksiya
"mavjud" deb da'vo qilinmagan.

---

## 1. Amaldagi konfiguratsiya (koddan)

| Qatlam | Qiymat | Manba |
|---|---|---|
| Function hard cap (barcha `api/*.js`) | `maxDuration: 60` s | `vercel.json → functions["api/*.js"]` |
| AI non-stream per-attempt timeout | `REQUEST_TIMEOUT_MS = 50 000` | `lib/aiClient.js` (03.10'dan keyin) |
| AI stream per-attempt timeout | `STREAM_TIMEOUT_MS = 50 000` | `lib/aiClient.js` |
| Failover kechikishi | `FAILOVER_DELAY_MS = 50` ms | `lib/aiClient.js` |
| 429 retry siyosati | `maxRetries: 3`, `2s → 4s → 8s` + jitter ≤1s, `maxDelayMs: 10s` | `lib/aiClient.js → retryPolicy` |
| Provider pooli | `GROQ_API_KEY`, `GROQ_API_KEY_1…N` (round-robin) + ixtiyoriy `DEEPSEEK_API_KEY`; Groq 404/model-unavailable'da xuddi shu key'da fallback model | `lib/aiClient.js → orderedPool/runPass` |
| Bizning persistent rate limit | har handler boshida `limiter.check(req)` → JSON 429 | `api/*.js` + `lib/rateLimit.js` (Task 03.6) |
| Browser generator retry | `mockGenerator.js — backoffMs(...)` maks. ~120 s browser-kutish (har so'rov alohida, funksiya 60 s bilan chegaralangan) | `mockGenerator.js:507` |
| SSE lifecycle (coach) | `connected → chunk* → done` / `error` event; mid-stream uzilishda `"[Connection interrupted]"` qo'shiladi | `api/coach.js` |

**Muhim hati-harakatlar (tekshirilgan):**
- Per-attempt timeout (50 s) + handler headroom (10 s) ≤ function cap (60 s).
  60 s dan oshgan urinish bu konfiguratsiyada HECH QACHON muvaffaqiyatli
  bo'la olmaydi — 03.10'dan oldin bu holat mapped xato o'rniga platform kill
  berardi; hozir timeout mapped `GROQ_REQUEST_FAILED` / `STREAM_REQUEST_FAILED`
  (retryable) bo'ladi va failover imkoniyati ochiladi.
- Hech qanday handler `req.on('close')` tinglamaydi → **browser uzilsa ham
  server so'rovi tugaguncha davom etadi** (funksiya vaqtini hisobga oling).
- Server kodi prompt, foydalanuvchi matni yoki credential'larni loglamaydi;
  yagona diagnostika — `lib/aiClient.js` dagi 5 ta `console.warn` (provider/
  model nomlari, HTTP status, ≤800 belgilik provider xato matni).

## 2. Vercel dashboard'da loglarni topish

1. Vercel dashboard → loyiha → **Deployments** → kerakli deployment.
2. **Functions** (yoki deployment sahifasidagi function ro'yxati) bo'limidan
   tegishli funksiyani tanlang (masalan, `api/coach.js`).
3. **Logs / Invocations** ko'rinishida runtime loglari: bizning
   `[aiClient]` bilan boshlangan warn satrlar (429 kutilmalar, failover),
   runtime error'lar va har bir chaqiruvning **duration** maydoni.
4. Jonli kuzatuv uchun loyiha darajasidagi **Logs** (real-time) ko'rinishi
   ham mavjud; filtrlovchi qidiruvda `[aiClient]` yoki function nomi yozing.

> Eslatma: aniq menu nomlari Vercel UI'siga bog'liq va vaqt o'tishi bilan
> o'zgaradi. Agar topilmasa — "Observability/Logs" bo'limlarini izlang.

## 3. Simptom → sabah ajratish jadvali

| Simptom (client'da ko'rinadigan) | Ehtimoliy sabab | Qanday tasdiqlash |
|---|---|---|
| JSON: `429 "Too many requests — please wait a moment..."` | **BIZNING** rate limiter (AI emas) — IP+bucket asosida | `lib/rateLimit.js`; Supabase `rate_limit_hits` jadvali; xodimga Vercel loglarida `[aiClient]` satr YO'Q |
| Xato sarlavhasi, lekin JSON body: `"...request failed..."` / `"...API error (5xx/429)..."` status 502/429/5xx | Provider/transport muammosi | Loglarda `[aiClient] ... failed: ...` yoki `rate limited (429) — waiting ...` satrlari |
| SSE: `error` event `{"message": "..."}` | Stream boshlanishidan OLDIN xato (cache/provayder/guard) | `api/coach.js` error branch; tegishli `[aiClient]` satri |
| SSE: chunk'lar bor, so'ng `"[Connection interrupted]"` | Mid-stream uzilish (provider yopdi yoki 50 s timeout) | duration ≈ 50 s + `[aiClient] ... stream failed` satri |
| **JSON body umuman yo'q**, platform "timeout" ko'rinishi, duration ≈ **60 s** | **Funksiya hard-kill** (maxDuration) — bizning kod mapped xato qaytarishga ulgurmagan | Function logda xatolar yo'q yoki kesilgan; duration ~60 s; bizning JSON formatlarimizdan hech biri ko'rinmaydi |
| JSON 500: `"No AI provider key is configured..."` | Env o'zgaruvchi yo'q / noto'g'ri deployment | Hujjatda kimchi emas — Vercel → Settings → Environment Variables (qiymatlarni ko'rsatmang!) |
| Coach sekin, lekin 429 log'lar takroriy | Provider 429: retry waits (2s→4s→8s, ≤10s/urinish) | `[aiClient] rate limited (429) — waiting N.Ns` satrlari |

## 4. Har bir holat uchun tekshirish ketma-ketligi

### 4.1 Takroriy platform timeout (duration ≈ 60 s)
1. Qaysi handler: function nomini logda ko'ring.
2. `[aiClient]` satrlari bor-yo'qligi: bo'lsa — qaysi provider/model,
   qaysi status; yo'q bo'lsa — handler kodining AI'dan oldingi qismini
   tekshiring (Supabase RPC sekinligi ham 60 s ni yeyishi mumkin).
3. Tezlik ta'siri: so'nggi 24-48 soat davomida shu handler uchun duration
   taqsimoti (p95/p99) — o'sish trendi bor-yo'g'i.
4. Prompt hajmini oshiruvchi so'nggi deploy bormi (masalan, uzun transcript
   yoki katta mock generatsiyasi)?

### 4.2 429 (bizning limiter)
- Bizning limit: per-IP, per-bucket (`grade`, `coach`, `quiz`, `generate-mock`,
  `delete-account`). Sharh: bu foydalanuvchi xatosi EMAS — himoya. Javob:
  foydalanuvchiga kutishni takliflash; texnik tomonda shubhali IP fonini
  Supabase `rate_limit_hits` jadvalidan tekshirish.

### 4.3 Provider 5xx / failover sikklari
- `[aiClient] "(provider) failed: ..."` + keyingi `failing over to next provider...`
  satrlari ketma-ketligi — birinchi provider'da muammo, ikkinchisi qutqargan.
  Statistikani oling: qaysi provider qancha marta fallback bo'lgan.

### 4.4 Streaming xatolari
- Stream boshlanmagan `error` event vs mid-stream `[Connection interrupted]`
  — yuqoridagi jadvaldan farqlang; mid-stream holatida qisman javob
  foydalanuvchida saqlanadi (by design, `api/coach.js`).

### 4.5 Env/ konfiguratsiya xatolari
- 500 `"No AI provider key..."` — KV bor-yo'g'ini dashboard'dan tekshiring;
  qiymatlarni HECH QAYERGA ko'chirmang.

## 5. Nimalarni ulashish mumkin / yashirish kerak

**Xavfsiz (log screenshot yoki matn):** timestamp, request/function nomlari,
HTTP status, duration, `[aiClient]` satrlari (provider/model nomlari),
bizning JSON xato matnlari.

**Yashirish majburiy:** API kalitlari (GROQ_API_KEY*, DEEPSEEK_API_KEY,
SUPABASE_*), Authorization header'lar, foydalanuvchi promptlari/javoblari,
email'lar, IP manzillar, Supabase loyiha URL'idagi service-key qismlari.

## 6. Timeout o'zgartirishdan OLDINGI checklist (majburiy)

1. **Plan limitini tasdiqlang** — Vercel dashboard/billing'dagi joriy plan
   ruxsat bergan `maxDuration` maksimumini bilmasdan HECH NARSA oshirmang.
2. `vercel.json → functions` konfiguratsiyasini ko'ring (per-route override
   bormi — hozir yo'q, faqat `api/*.js`).
3. `lib/aiClient.js`: `REQUEST_TIMEOUT_MS`, `STREAM_TIMEOUT_MS`,
   `retryPolicy` (waits ≤ ~17 s jami) jami budget'ini hisoblang.
4. Invariant: `per-attempt timeout + 10s handler headroom ≤ maxDuration_ms`.
   `tests/timeoutConfig.test.js` aynan shu invariantni pinlaydi — qiymatlarni
   o'zgartirsangiz, testni ham yangilang.
5. Streaming UX: ko'tarilgan cap mid-stream javoblarni uzatadimi, yoki
   "partial + note" hozirgi hati-harakatmi?
6. Billing: funksiya browser uzilgandan keyin ham davom etadi
   (`req.on('close')` yo'q) — uzunroq timeout = ko'proq GB-soat.

## 7. Rollback / verification checklist

- [ ] Konfig/kod o'zgarishini revert qiling (masalan, `git revert` bir
      keyingi maintainer qiladi — hujjat commit talab qilmaydi).
- [ ] `tests/timeoutConfig.test.js` yashil (invariant + wiring pin'lar).
- [ ] `npm test` to'liq zanjir yashil.
- [ ] `npm run build` yashil; redeploy.
- [ ] Kichraygan yoki o'zgargan qiymatdan keyin bitta real AI chaqiruv
      (masalan, `/api/quiz` POST) 200 qaytarishini tekshiring — **prod sirlarini
      ko'rsatmasdan**, faqat status/durations yozib oling.
- [ ] Loglarda `[aiClient]` satr yo'qligi yoki normal pattern'ini tasdiqlang.

## 8. Hozircha hujjatda TASDIQLANMAGAN/tekshirilmagan narsalar

- Vercel plan'ning aynan qanday `maxDuration` maksimumi bormi — owner
  dashboard'dan tekshirishi kerak (bu hujjat hech qanday taxmin qilmaydi).
- Prod loglarda PII oqizishi — lokal statik tahlil toza (prompt/log yo'q);
  lekin 3rd-party provider (Groq/DeepSeek) o'z infra loglari bizdan tashqari.
- Vercel built-in alerting (log drains, mon otrs) sozlamalari loyiha
  sozlariga bog'liq; konkret integratsiya bu hujjatda da'vo qilinmagan.

# Admin Panel

To'liq ishlaydigan admin panel: **Vanilla JS** (mavjud `#/…` hash-router ichida), **Supabase Auth + PostgreSQL**, dark/glass dizayn.

```
#/admin   →   Overview · Users · Mock tests · Submissions
```

---

## 1. O'rnatish (3 qadam)

### 1.1 SQL migratsiyasini ishga tushiring

[Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** da migratsiyalarni quyidagi tartibda alohida-alohida ishga tushiring:

1. `supabase/migrations/202610040001_mock_results.sql` — natijalar jadvali (agar hali qo‘llanmagan bo‘lsa)
2. `supabase/migrations/202610050001_admin.sql` — admin/RBAC va test JSON jadvallari
3. `supabase/migrations/202610050002_media_storage.sql` — IELTS audio/rasmlari uchun Supabase Storage bucket va RLS

`202610050002_media_storage.sql` fayli `public.is_admin()` funksiyasiga tayanadi, shuning uchun admin migratsiyasidan **keyin** bajariladi. Bucket public o‘qishga ruxsat beradi, lekin yozish/o‘chirishni faqat `public.is_admin()` tekshiradi.

Migratsiya quyidagilarni yaratadi:

| Obyekt | Vazifasi |
| --- | --- |
| `public.profiles` | Har bir auth user uchun bitta qator: email, ism, avatar, `role` (`user` / `admin`) |
| `public.is_admin()` | `SECURITY DEFINER` — RLS rekursiyasisiz admin tekshiruvi |
| `public.admin_stats()` | Overview kartalari uchun bitta so'rovda statistika |
| `public.admin_set_role()` | Rol o'zgartirish (server tomonida tekshiruv bilan) |
| `public.admin_delete_user()` | Foydalanuvchi + barcha natijalarini o'chirish |
| `public.mock_tests` | Admin yozgan test kontenti (har bir `test_id` × `skill` uchun bir qator) |
| `public.mock_test_meta` | Test nomi, qiyinligi, nashr holati, tartibi |
| trigger `on_auth_user_created` | Yangi ro'yxatdan o'tganlarga avtomatik profil |
| `storage` bucket `ielts-media` | Listening MP3, Writing Task 1 vizuallari va map rasmlari; public o‘qish + admin-only yozish RLS |

### 1.2 Birinchi adminni belgilang

Migratsiya oxiridagi bu qatorni o'zingizni emailingizga o'zgartiring (hozir `muhammadxoliqulov949@gmail.com` yozilgan):

```sql
update public.profiles
   set role = 'admin', updated_at = now()
 where lower(email) = lower('muhammadxoliqulov949@gmail.com');
```

Agar bu akkaunt hali ro'yxatdan o'tmagan bo'lsa, `profiles` da qatori bo'lmaydi —
**avval shu email bilan kiring**, keyin yuqoridagi qatorni qayta ishga tushiring.

Tekshirish:

```sql
select id, email, role from public.profiles order by role, created_at;
```

### 1.3 Kirish

Google orqali kiring → headerda **⚙ Admin Panel** tugmasi paydo bo'ladi.

---

## 2. Xavfsizlik modeli

```
Brauzer (client)                     Postgres (RLS)
─────────────────                    ──────────────────────────────
role === 'admin'  ──so'rov──►        har bir admin policy
  faqat UI ko'rsatish uchun          public.is_admin() orqali
                                     qayta tekshiriladi
```

- **Client hech qachon ruxsat bermaydi.** `admin.js` dagi rol faqat nimani ko'rsatishni hal qiladi.
  Console'dan qo'lda yozilgan so'rov ham xuddi shu RLS javobini oladi.
- **`is_admin()` `SECURITY DEFINER`.** U `postgres` nomidan ishlaydi va `profiles` RLS'ini chetlab o'tadi —
  shu sababli "admin policy `profiles`ni o'qiydi, `profiles` policy esa `is_admin()`ni chaqiradi"
  degan cheksiz rekursiya bo'lmaydi.
- **Rol o'zgartirish faqat RPC orqali.** `admin_set_role()` serverda tekshiradi:
  o'zingizni adminlikdan tushira olmaysiz, tizimda kamida bitta admin qolishi shart.
- **`auth.users` client'dan o'qilmaydi.** Foydalanuvchilar ro'yxati `public.profiles` dan keladi.

---

## 3. Bo'limlar

### Overview
Jami foydalanuvchilar, topshirilgan testlar, o'rtacha band, adminlar soni, nashr qilingan
shaxsiy testlar + so'nggi 8 ta natija.

### Users
Qidiruv, jadval (avatar, ism, email, rol, testlar soni, sana) va amallar:
- **Make admin / Remove admin** — tasdiqlash oynasi bilan
- **Delete** — akkaunt va uning barcha natijalarini o'chiradi (qaytarib bo'lmaydi)
- O'z qatoringizda faqat `you` ko'rsatiladi — o'zingizni o'chira olmaysiz

### Mock tests
- **Built-in tests** — `data.js` / `content2-4.js` ichidagi test1–test4 (faqat ko'rish)
- **Your tests** — admin yaratgan testlar. Har biri 4 ta bo'lim (Listening/Reading/Writing/Speaking)
  uchun alohida kontent blokiga ega.
- **New test** → nomi, identifikator (`test5`, `test6`…), qiyinlik, nashr holati
- **✨ AI orqali yangi Mock (1-Click IELTS Generator)** → to'liq tayyor testni bir tugma bilan yaratish (4-bo'limga qarang)
- Har bir bo'lim uchun alohida muharrir; har biri alohida nashr qilinadi
- Test o'chirilganda uning 4 ta bo'limi ham o'chadi

### Submissions
Barcha foydalanuvchilarning natijalari: foydalanuvchi, test, L/R/W/S bandlari, umumiy ball, sana.
Qidiruv va natijani o'chirish (akkaunt saqlanadi).

---

## 4. IELTS imtihon muharriri: vizual + JSON

Yangi test uchun har bir **skill** alohida qatorda (`test_id × skill`) saqlanadi. Yangi skill muharriri yangi, toza JSON state’dan boshlanadi — avvalgi testning savollari aralashmaydi. Har skill uchun **Vizual konstruktor** va **To‘liq JSON** rejimlari bitta payload bilan sinxron ishlaydi.

### IELTS bo‘yicha qat’iy tuzilma

| Skill | Qotirilgan bo‘limlar | Muharrirdagi maydonlar |
|---|---:|---|
| Listening | 4 Part | Har Part uchun ko‘rsatma, transcript, MP3 upload (Supabase Storage → avtomatik public URL), savollar |
| Reading | 3 Passage | Sarlavha, qiyinlik, akademik matn; matnni A/B/C… xatboshilarga ajratish; savollar |
| Writing | 2 Task | Task 1 — kamida 150 so‘z, 20 daqiqa va grafik/diagramma/xarita/jadval rasmi; Task 2 — kamida 250 so‘z, 40 daqiqa va baholash mezonlari |
| Speaking | 3 Part | Part 1 — 3–4 mavzu va qisqa savollar; Part 2 — cue card + 3–4 bullet + aniq 60s/120s taymer; Part 3 — Part 2 bilan bog‘langan chuqur savollar |

Listening/Reading savol turlari vizual konstruktorda skill bo‘yicha ajratilgan:
- Listening: Form / Note / Table / Sentence Completion (word limit), yakka yoki ko‘p javobli Multiple Choice, Matching, Map/Plan Labelling.
- Reading: True/False/Not Given, Yes/No/Not Given, Matching Headings, Summary/Sentence Completion, yakka yoki ko‘p javobli Multiple Choice, Matching.
- Har savolda `prompt`, `answer` va `explanation` majburiy. Tanlov savollarida variantlar va indeks (A/B… yoki 0/1…) tekshiriladi. Matching/heading javoblari ham indeks/harf bilan belgilanadi.
- Map/Plan Labelling savolida rasm talab qilinadi. Reading paragraph label’lari saqlashda avtomatik A, B, C… bo‘ladi.

### Media yuklash

Admin visual builder ichida MP3 yoki rasm tanlaydi. Fayl client’dan Supabase Storage `ielts-media` bucket’iga to‘g‘ridan-to‘g‘ri yuklanadi; `audioUrl` / `imageUrl` public URL bilan avtomatik to‘ldiriladi. Manual public URL maydoni ham bor. O‘quvchiga MP3 Listening’da bir marta ijro qilinadi; Writing Task 1 rasm sifatida ko‘rsatiladi. Eski `transcript` va `chartData` maydonlari saqlanadi — avvalgi testlar speech-synthesis va matnli vizual bilan ishlashda davom etadi.

Supabase Storage RLS’dagi `ielts-media: admins upload/update/delete` siyosatlari haqiqiy ruxsat manbai; UI’dagi rol tekshiruvi faqat interfeys uchun. Public read barcha o‘quvchilarga nashr qilingan media’ni ko‘rishga ruxsat beradi. Bucket limiti 50 MB; MP3 va PNG/JPG/WebP qabul qilinadi.

### 4.5 AI Generator — bir tugma bilan to'liq mock test

`#/admin` → **Mock tests** → **✨ AI orqali yangi Mock (1-Click IELTS Generator)**.

Modal oynada quyidagilar bor:

| Maydon | Izoh |
| --- | --- |
| **Test raqami/nomi** | Avtomatik to'ldiriladi — keyingi bo'sh raqam (`Practice Test 6`). Test id `test6` ko'rinishida yaratiladi |
| **Qiyinlik darajasi** | `Standard IELTS` yoki `Hard` (uzunroq gaplar, zichroq leksika, nozik distraktorlar) |
| **Ixtiyoriy mavzu yo'nalishi** | Bo'sh qoldirilsa — quyidagi ombordan tanlanadi; to'ldirilsa — butun test shu mavzuda |
| **Generatsiya qilish** | `Listening → Reading → Writing → Speaking` progress bilan ishlaydi |
| **Nashr qilish** | Belgilangan bo'lsa test `is_published = true` bilan yoziladi (o'quvchilarga ko'rinadi); belgilanmasa — qoralama |

**Takrorlanishning oldini olish (Dynamic Topic & Diversity Pool).**
`lib/topicPool.js` ichida **48 ta rasmiy IELTS yo'nalishi** ombori bor (Space exploration, Marine biology,
Cognitive psychology, Urban architecture, Ancient history, Artificial Intelligence, Agricultural innovations va h.k.).
Har bir generatsiyada:

- har bir bo'lim uchun `Math.random()` bilan **alohida tasodifiy mavzu** tanlanadi;
- savol turlari (T/F/NG, Headings, Multiple Choice, Summary fill-in, Table completion…) har safar
  **boshqacha kombinatsiyada** aralashtiriladi (Listening: 4×10, Reading: 13+14+13 = 40 savol);
- Groq so'rovi `temperature: 0.85` bilan yuboriladi — natija har safar boshqacha.

**Format 100% IELTS bo'yicha:** Listening (4 part, 40 savol, 4 to'liq transcript), Reading (3 akademik passage,
40 savol — javob kaliti va tushuntirish bilan), Writing (Task 1 grafik/jadval + Task 2 insho), Speaking
(Part 1–3, shu jumladan Part 2 Cue Card).

**Audio (MP3).** Har bir Listening transcript Microsoft'ning bepul **Edge TTS** xizmati orqali MP3 ga
aylantiriladi (`lib/edgeTts.js`, API kalit kerak emas). Agar Edge javob bermasa, tizim avtomatik
**Groq TTS** ga o'tadi (WAV). Audio to'g'ridan-to'g'ri Supabase Storage `ielts-media` bucket'iga,
adminning o'z tokeni bilan yuklanadi va havola `audioUrl` maydoniga tushadi — boshqa brauzer upload
yo'li ham ishlaydi (RLS baribir admin'ni tekshiradi). Audio yaratilmasa, transcript saqlanib qoladi va
admin MP3 ni qo'lda yuklashi mumkin.

**Writing Task 1 diagrammasi.** Model `chartSpec` (tur, nom, o'lchov, label'lar, seriyalar) qaytaradi;
modal uni brauzerda canvas'da chizib PNG ga aylantiradi va `images/` ga yuklaydi. Rastr ishlamasa,
`chartData` matn shaklida saqlanadi.

**Saqlash.** To'rt bo'lim ham tayyor bo'lgach, ma'lumotlar mavjud sxema bo'yicha yoziladi:
`mock_tests` (har bir `test_id × skill` uchun bitta qator) va `mock_test_meta` (nomi, qiyinligi, nashr holati).
Yozish odatgi admin Supabase chaqiruvlari orqali boradi — PostgreSQL RLS yagona haqiqiy ruxsat manbai.

**Yaratilgandan keyingi natija.** Modal xulosada savollar soni, MP3 soni va diagramma holatini ko'rsatadi,
har bir bo'limni **darhol ko'rish/tahrirlash** uchun tugmalar beradi (odatgi muharrir ochiladi).
Formadagi **“Nashr qilish”** katakchasi (odatda belgilangan) testni o'quvchilarga ko'rinadimi yoki
qoralama sifatida saqlanadini boshqaradi; qo'lda tuzilgan yangi testdan farqi — bir tugma bilan
yaratilgan test darhol muharrirga uzatiladi. Agar test id allaqachon mavjud bo'lsa, modal
ogohlantiradi: generatsiya natijasi mavjud bo'limlarning ustiga yoziladi.

Butun AI **`lib/aiClient.js`** — yagona modul orqali ishlaydi (Groq, OpenAI formati: `https://api.groq.com/openai/v1`, standart model `llama-3.3-70b-versatile`, har bir chaqiruvda `max_tokens: 4096`). Model id bir joyda saqlanadi: Groq modelni yopsa (masalan, `llama-3.3-70b-versatile` free/developer kalitlar uchun 2026-08-16 dan yopilgan), modul `openai/gpt-oss-120b` ga avtomatik o'tadi va ishlagan modelni eslab qoladi. Modelni qat'iy belgilash uchun `GROQ_MODEL` muhit o'zgaruvchisini o'rnating — kodni tahrirlash shart emas.

**`GROQ_API_KEY` kiritilmagan bo'lsa** endpoint aniq xabar qaytaradi:
*"Iltimos, avval GROQ_API_KEY sozlang — AI funksiyalari ishlashi uchun Groq API kaliti kerak."*
Va qayerdan olish ko'rsatiladi (https://console.groq.com/keys → Vercel → Settings → Environment Variables).

So'ng sahifani yangilang — yangi test test tanlash oynasida paydo bo'ladi.

### 4.6 AI chegarasi (guardrails) va 7 kunlik kesh

Generator va boshqa AI xizmatlar (Coach, Writing/Speaking baholash, Quiz) **faqat IELTS va ingliz tili** doirasida ishlaydi.

**Guardrails (`lib/aiGuardrails.js`).** Har bir AI chaqiruviga qat'iy **System Instruction** biriktiriladi — model o'zini faqat *"IELTS Murabbiyi"* sifatida tutadi. IELTS/ingliz tiliga aloqasi bo'lmagan so'rov (dasturlash, siyosat, erkin suhbat, umumiy savollar) boshqa hech qanday javobsiz, faqat quyidagi aniq jumla bilan rad etiladi:

> Kechirasiz, men faquq IELTS va inglng tiliga doir savollarga yordak bera olaman.

Bu qatlam to'rttala endpointda ham bor: `api/generate-mock.js`, `api/coach.js`, `api/grade.js`, `api/quiz.js`. Coach sahifasida savol **tarmoq chizig'idan oldin** brauzerda tekshiriladi (`script.js`), shuning uchun mavzudan tashqari xabar serverga ham bormaydi. Guardrails brauzer uchun `public/lib/aiGuardrails.js` ga ko'chiriladi va `sw.js` precache ro'yxatiga kiritilgan.

**7 kunlik kesh (`lib/aiCache.js` + `public.ai_cache`).** Bir xil savol 7 kun ichida qayta berilsa, Groq umuman chaqirilmaydi — javob ma'lumot bazasidan olinadi:

| Bosqich | Nima sodir bo'ladi |
| --- | --- |
| 1 | Savol tozalib (`cleanPrompt`) `sha256` ga aylanadi → `prompt_hash` |
| 2 | `select` qilinadi. Agar `now() - created_at < interval '7 days'` — keshdagi javob qaytadi, **Groq chaqirilmaydi** |
| 3 | Muddati o'tgan bo'lsa Groq'ga so'rov ketadi va javob `Prefer: resolution=merge-duplicates` bilan qatorga upsert qilinadi — eski qator yangilanadi, 7 kunlik muddat qaytadan boshlanadi |

Kesh kaliti bo'lim va parametrlarga bog'liq: `coach:<savol>|<band>|<weakest>`, `grade:writing:<savol>`, `grade:speaking:<savol>`, `quiz:<mavzu>:<savollar soni>`. Coach javobi oddiy matn, baholash/quiz javoblari esa obyekt sifatida saqlanadi — ikkisi ham qo'llanadi.

**Xavfsizlik.** `ai_cache` jadvalida RLS yoqilgan va **hech qanday policy yo'q**, `anon`/`authenticated` rollardan huquqlar olib tashlangan. Ya'ni keshni faqat server (`SUPABASE_SERVICE_ROLE_KEY`) ishlatadi — brauzer keshga yozolmaydi. Migratsiya: `supabase/migrations/202610060002_ai_cache.sql`, tafsilotlar `SUPABASE.md` → "AI kesh (7 kunlik TTL) va IELTS guardrails".

**Generator keshdan mustasno.** `api/generate-mock.js` ataylab keshlanmaydi — har bir mock test boshqacha bo'lishi kerak.

---

### JSON shakli va eski testlar bilan moslik

JSON rejimi skill’ning **to‘liq payload**ini qabul qiladi; mavjud runner kutadigan `id`, `skill`, `duration`, `parts` / `passages` / `tasks`, `questions`, `prompt`, `answer`, `options`, `transcript`, `chartData` maydonlari saqlanadi. Yangi maydonlar (`audioUrl`, `audioPath`, `paragraphs`, `imageUrl`, `wordLimit`, `topics`, `linkedTopic`, `criteria`) shu strukturaga qo‘shimcha. `test1`–`test4` kontenti tahrir qilinmaydi va avvalgi shaklida ishlayveradi. Custom kontent `test5`, `test6`… kalitlari bilan bog‘liq.

Quyidagi JSON faqat bitta Listening Part misoli; to‘liq kontentda `parts` massivida 4 ta Part bo‘lishi shart.

```json
{
  "id": "listening-custom", "title": "Practice Test 5 — Listening", "skill": "Listening", "duration": 30,
  "parts": [
    {
      "id": "lp1", "partNumber": 1, "title": "Part 1", "instructions": "Questions 1–10.",
      "audioUrl": "https://PROJECT.supabase.co/storage/v1/object/public/ielts-media/audio/test5-part1.mp3",
      "audioPath": "audio/test5-part1.mp3", "transcript": "…",
      "questions": [{
        "id": "l1", "type": "form-completion", "prompt": "Membership costs £______.",
        "wordLimit": "NO MORE THAN TWO WORDS", "answer": "42", "explanation": "The speaker gives the monthly fee as £42."
      }]
    }
  ]
}
```

`id` / `partNumber` / `passageNumber` / `taskNumber` va savol ID’lari saqlashda normalizatsiya qilinadi. JSON saqlanganda ham 4/3/2/3 qat’iy sonlari, majburiy javob/tushuntirish va IELTS format qoidalari validatsiyadan o‘tadi.

---

## 5. Yaratilgan test o'quvchilarga qanday yetib boradi

1. Admin meta va to‘rtta skill bo‘limining har birini nashr qiladi (`is_published = true`); qisman tayyor test o‘quvchilarga ko‘rsatilmaydi.
2. Ilova yuklanishida `loadDynamicTests()` barcha 4 skill tayyor bo‘lgan testlarni oladi
3. Ular `IELTS_CONTENT` ichiga `listening5`, `reading5`, … kabi **aynan mavjud `testN`
   kalitlari** bilan yoziladi
4. `getSkillContent()` va `testMeta` allaqachon shu sxemani tushunadi → yangi test
   test tanlash oynasida paydo bo'ladi

Nashrdan olinsa, keyingi sahifa yangilanishida yo'qoladi.

---

## 6. Muammolarni hal qilish

| Belgisi | Sababi | Yechim |
| --- | --- | --- |
| Admin panelda "The admin tables are missing" | Admin migratsiyasi ishga tushirilmagan | `202610050001_admin.sql` ni SQL Editor’da bajaring |
| Media upload xatosi / storage object RLS | Storage migratsiyasi yo‘q yoki bucket siyosati qo‘llanmagan | Admin migratsiyasidan keyin `202610050002_media_storage.sql` ni ishga tushiring |
| ⚙ Admin tugmasi ko'rinmayapti | `profiles.role` hali `user` | 1.2-bo'limdagi `update` ni ishga tushiring, sahifani yangilang |
| Kirganda dashboard'ga tashlab yuboradi | Rol `admin` emas yoki profil yuklanmagan | `select * from profiles where email = '…';` bilan tekshiring |
| Jadvallar bo'sh, lekin xato yo'q | RLS hammasini filtrlayapti | `role` ustunini tekshiring; `select public.is_admin();` `true` qaytarishi kerak |
| Test tanlash oynasida yangi test yo'q | Test yoki uning bo'limi nashr qilinmagan | Ham meta, ham kerakli bo'limlar `Published` bo'lishi kerak |
| "Iltimos, avval GROQ_API_KEY sozlang" | Serverda Groq kaliti yo'q | Vercel → Settings → Environment Variables → `GROQ_API_KEY` qo'shing va qayta deploy qiling (bepul kalit: https://console.groq.com/keys) |
| `Groq API error (404): … model_decommissioned` | Groq modelni butunlay yopgan (free kalitlar uchun `llama-3.3-70b-versatile` 2026-08-16 dan ishlamaydi) | `lib/aiClient.js` avtomatik `openai/gpt-oss-120b` ga o'tadi — log'da shuni ko'rasiz. Boshqa model kerak bo'lsa `GROQ_MODEL` ni Vercel → Environment Variables ga qo'shib qayta deploy qiling. Ro'yxat: https://console.groq.com/docs/deprecations |
| Listening bo'limida audio yo'q | Edge TTS va Groq TTS javob bermadi | `audioUrl` bo'sh — muharrirga kirib MP3 ni qo'lda yuklang; transcript saqlangan |
| AI generator tugmasi ishlamaydi | `mockGenerator.js` / `lib/topicPool.js` yuklanmagan | `index.html` skriptlari va `sw.js` precache ro'yxatini tekshiring |
| AI IELTS'dan tashqari savolga javob berdi | So'rov guardrails'dan o'tib ketdi | `public/lib/aiGuardrails.js` yuklangani va `api/*` da `withGuardrails` borligini tekshiring; brauzer keshi'ni tozalang |
| AI har safar bir xil javobni berayapti | Kesh ishlayapti (bu normal) | 7 kunlik kesh — boshqa javob kerak bo'lsa savolni biroz boshqacha yozing yoki `ai_cache` qatorini o'chiring |
| Kesh ishlamayapti (har safar Groq chaqiriladi) | `SUPABASE_SERVICE_ROLE_KEY` yoki `202610060002_ai_cache.sql` migratsiyasi yo'q | Migratsiyani qo'llang; server log'ida kesh o'qish/yozish xatosini tekshiring — kesh yozilmasa ham AI javob beraveradi |

---

## 7. Fayllar

```
supabase/migrations/202610050001_admin.sql   admin jadvallari, RPC, RLS, trigger
supabase/migrations/202610050002_media_storage.sql  ielts-media bucket + admin-only upload RLS
supabaseClient.js                            admin API + Supabase Storage media upload
admin.js                                     panel mantiqiy qatlami + IELTS konstruktor + JSON muharriri
mockGenerator.js                             admin UI: 1-Click AI generator modal (progress, saqlash, tahrirlash)
lib/topicPool.js                             48 mavzu + savol turi aralashtirish (brauzer va Node uchun UMD)
lib/aiClient.js                              yagona AI moduli: Groq (OpenAI formati) chat, JSON va TTS
lib/edgeTts.js                               Edge TTS (MP3) + Groq TTS (WAV) fallback
api/generate-mock.js                         POST /api/generate-mock — bo'lim va audio generatsiyasi
tests/generator.test.js                      pool, endpoint, TTS, i18n, wiring testlari
tests/generatorClient.test.js                modal oqimi: generatsiya → upload → saqlash → xulosa
lib/aiGuardrails.js                         qat'iy System Instruction + mavzudan tashqari so'rovni rad etish
lib/aiCache.js                              7 kunlik TTL kesh (sha256 kalit, upsert, xotira nusxasi)
supabase/migrations/202610060002_ai_cache.sql  public.ai_cache — AI javoblari keshi (RLS, policy yo'q)
tests/aiGuardrails.test.js                  guardrails + 7 kunlik kesh testlari (PGlite bilan)
script.js                                    #/admin route, learner runner, audio/image rendering
styles.css                                   admin builder + media + exam content stillari
tests/admin.test.js                          guard/RLS, media migratsiyasi, format, validatsiya, XSS testlari
```

# Supabase integratsiyasi

## Nimalar ulandi?

- `@supabase/supabase-js` npm kutubxonasi, alohida `supabaseClient.js`.
- `.env` → serverdagi `process.env` → `/api/config` → browser Supabase client.
- Email/parol bilan **Supabase Auth**, ixtiyoriy Google OAuth.
- `mock_results` jadvali, foydalanuvchi egaligini tekshiruvchi **RLS**.
- Listening/Reading/Writing/Speaking yakunlanganda va timer tugaganda avtomatik saqlash.
- **Results** oynasida Supabase natijalari, yangilash/qayta urinish tugmasi.
- Yangi qurilmada akkauntga kirganda bulutdagi natijalar local keshga yuklanadi; dashboard va testning yakunlangan holati ham tiklanadi.
- Tarmoq/SQL xatosida local mock natijalar yo'qolmaydi. Saqlanmagan versiyalar qayta kirganda, internet qaytganda yoki **Yangilash / Qayta urinish** bilan yuboriladi.
- 40-mavzuli Roadmap, 120 mini-o‘yin, ketma-ket unlock, UTC Daily Streak, serverda beriladigan coins va global leaderboard.

> Integratsiya kodi tayyor, ammo Supabase loyihasi avtomatik yaratilmaydi. Demo login butunlay olib tashlangan. Quyidagi sozlashsiz sayt ochiladi, lekin **login/ro‘yxatdan o‘tish va mock testni boshlash bloklanadi**. Mock savollari `data.js`, `content2.js`, `content3.js`, `content4.js` fayllarida qoladi. Roadmap kontenti Supabase `topics` jadvalidan olinadi; guest preview uchun quiz kalitlarisiz public katalog bor. Mehmon birinchi mavzuning mini-o‘yinlarini real rewards/progress’siz sinab ko‘ra oladi.

## 1. Kutubxonalarni o'rnatish

Node.js **22 yoki yangiroq** kerak:

```bash
npm ci
cp .env.example .env
```

Root `.env` fayliga Supabase Dashboard → Project Settings → API dagi qiymatlarni kiriting:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
GEMINI_API_KEY=YOUR_OPTIONAL_GEMINI_KEY
```

`SUPABASE_ANON_KEY` uchun eski `anon` JWT yoki yangi `sb_publishable_...` kalit mos keladi. Bu **ommaviy client kaliti**; himoya kalitni yashirish bilan emas, Auth + RLS orqali ta'minlanadi. **`service_role`, `sb_secret_...`, database paroli yoki Gemini kalitini browserga bermang.** `/api/config` faqat ikkita Supabase public sozlamani chiqaradi va maxfiy Supabase kalitlarini rad etadi.

`.env` Git'dan chiqarilgan va preview server uni HTTP orqali bermaydi. Kalitlarni chatga yuborish shart emas; server/hosting environment sozlamalariga kiriting.

## 2. Jadval va RLS yaratish

Supabase Dashboard → **SQL Editor** da quyidagi faylning butun matnini bir marta bajaring:

```
supabase/migrations/202610040001_mock_results.sql
```

Yoki loyihaga Supabase CLI ulangan bo'lsa, odatdagi migration jarayoningiz (`supabase db push`) orqali qo'llang. SQL yangi `mock_results` jadvali uchun yozilgan. Shu nomli boshqa sxemali jadval avvaldan mavjud bo'lsa, avval sxemasini moslashtiring; fayl mavjud boshqa sxemani avtomatik o'zgartirmaydi.

### Jadval ustunlari

| Ustun | Mazmuni |
|---|---|
| `id` | UUID |
| `user_id` | Tasdiqlangan Supabase Auth foydalanuvchisi |
| `name` | Foydalanuvchining ko'rsatiladigan ismi |
| `test_id` | `test1`–`test4`; admin migratsiyasidan keyin `test5`–`test99` |
| `scores` | Har bir bo'lim uchun sana, raw/total ball, timeout va mavjud AI feedback |
| `listening`, `reading`, `writing`, `speaking` | 0–9 oralig'idagi yarim qadamli band; baholanmagan bo'lim `NULL` |
| `overall_band` | To'rt band o'rtachasini 0.5 ga yaxlitlaydigan **generated column** |
| `created_at`, `updated_at` | Yaratilgan va yangilangan sana |

Har foydalanuvchi/test uchun **bitta satr** saqlanadi — mavjud saytning bir marta topshirish qoidasi bilan mos. Birinchi bo'lim tugashi bilan satr yaratiladi, keyingi bo'limlar atomik ravishda o'sha satrga qo'shiladi. To'rtta band mavjud bo'lmaguncha `overall_band = NULL`. Misol: `(7 + 6.5 + 6 + 7.5) / 4 = 6.75 → 7.0`.

`save_mock_section` RPC takroriy so'rovlarda yangi satr yaratmaydi, boshqa bo'limlarni o'chirmaydi va eski sanali natija bilan yangi natijani bosib yubormaydi. Gamification migratsiyasi `mock_results` jadvalidan to‘g‘ridan-to‘g‘ri INSERT/UPDATE huquqini olib, RPC'ni `SECURITY DEFINER` qiladi; u har chaqiriqda `auth.uid()` bilan `p_owner` mosligini tekshiradi, qolgan RLS select/admin-delete qoidalari saqlanadi. Client faqat tekshirilgan RPC orqali o‘z natijasini yozadi.

### Admin testlar, Storage media va Roadmap gamification

`202610040001_mock_results.sql` qo‘llangandan keyin quyidagilarni shu tartibda ishga tushiring:

1. `supabase/migrations/202610050001_admin.sql` — admin profillar/RLS, test JSON jadvallari.
2. `supabase/migrations/202610050002_media_storage.sql` — `ielts-media` bucket va Storage object policies.
3. `supabase/migrations/202610060001_roadmap_gamification.sql` — dastlabki 12 mavzu, `profiles.coins`, quiz kalitlari, progress, immutable coin ledger va leaderboard.
4. `supabase/migrations/202610060002_ai_cache.sql` — AI javoblari uchun **7 kunlik** kesh (`public.ai_cache`).
5. `supabase/migrations/202610060003_interactive_learning.sql` — 40 mavzu / 200 quiz savoli / 120 mini-o‘yin, `game_data`, streak, sequential unlock va server game grader’lari.

**Avvalgi migratsiyalar bazangizda allaqachon qo‘llangan bo‘lsa, faqat yangi `202610060003_interactive_learning.sql` ni bajaring.** U eski 12 mavzuning ID’larini saqlaydi, har bosqichga 7 tadan yangi mavzu qo‘shadi; mavjud progress, balans va ledger o‘chirilmaydi. SQL faylda seed ham bor, alohida JSON import shart emas. Bu repo o‘zgarishlari hosted Supabase’ga avtomatik qo‘llanmaydi.

Admin panel MP3, xarita/reja va Writing Task 1 rasmlarini brauzerdan Supabase Storage’ga yuboradi. Bucket public read (learner `<audio>`/`<img>` uchun), lekin insert/update/delete faqat authenticated `public.is_admin()` orqali ruxsat etiladi. Maksimal fayl 50 MB; ruxsat etilgan media MIME turi bucket’da cheklangan. **Service-role kaliti talab qilinmaydi va browserga berilmaydi.** `ADMIN.md` da UI, kontent JSON shakli va xatolarni hal qilish bo‘yicha yo‘riqnoma bor.

### Interaktiv Roadmap, tangalar va leaderboard

#### Katalog va ochilish tartibi

- `#/roadmap` da **A1→A2, A2→B1, B1→B2, B2→C1** bosqichlarining har birida **10 tadan** tayyor mavzu bor. Konspekt, AI-tutor prompti, 5 savolli quiz va uchta mini-o‘yin har bir mavzuga ulangan.
- Yangi foydalanuvchiga faqat birinchi mavzu ochiq. `submit_topic_quiz` **80%+** natijani serverda tekshiradi va keyingi mavzuni ochadi; barcha oldingi mavzular tugatilmaguncha keyingi bosqich ham qulflangan. Mini-o‘yin yakuni mastery quiz o‘rnini bosmaydi.
- Eski versiyada tugatilgan mavzular qayta ko‘rish uchun ochiq qoladi; yangi mavzular bo‘yicha progress bar yangidan hisoblanadi. Ochiq yo‘l bo‘yicha davom etish uchun yangi qo‘shilgan oldingi mavzularni ham tugating.
- `topics.questions` faqat savol va variantlarni saqlaydi. `topic_answer_keys` va `topic_game_keys` client rollariga yopiq. `topics.game_data` o‘yin uchun public so‘zlar, ma’nolar, variantlar va scramble materiallarini saqlaydi; server scoring kalitlari alohida.

#### Qo‘shilgan schema

| Jadval / ustun | Vazifasi |
| --- | --- |
| `profiles.current_streak integer NOT NULL DEFAULT 0` | Joriy ketma-ket mashq kunlari |
| `profiles.last_active_date date` | Oxirgi tekshirilgan faollikning UTC sanasi |
| `topics.game_data jsonb NOT NULL DEFAULT '{}'` | Uchta mini-o‘yin kontenti |
| `learning_activity` | Har user/UTC kuniga bitta verified activity marker |
| `user_game_progress` | User/topic/game bo‘yicha eng yaxshi foiz, completion, attempts, oxirgi o‘yin/reward sanasi |
| `topic_game_keys` | Private speed javoblari va scramble tartiblari |
| `topic_game_sessions` | Private, user’ga bog‘langan session, server deadline, savollar oqimi, points/combo va idempotent result |

Progress/activity/ledger’ni foydalanuvchi faqat o‘ziniki bo‘lsa o‘qiy oladi; yozish/o‘chirish client’ga berilmagan. `profiles.coins`, `current_streak`, `last_active_date` to‘g‘ridan-to‘g‘ri o‘zgartirilmaydi. Ism/avatar tahrirlash huquqi qoladi.

#### RPC va o‘yin mukofotlari

| RPC | Client yuboradigan ma’lumot |
| --- | --- |
| `is_topic_unlocked(p_topic_id text)` | Mavzu ID; owner `auth.uid()` orqali olinadi |
| `submit_topic_quiz(p_topic_id text, p_answers jsonb)` | Quiz javoblari; score/reward yuborilmaydi |
| `start_topic_game(p_topic_id text, p_game_type text)` | `word_match`, `speed_vocabulary` yoki `sentence_scramble` |
| `answer_speed_question(p_session_id uuid, p_question_index integer, p_choice integer)` | Faqat server bergan savol indeksi va 0–2 variant indeksi |
| `submit_topic_game(p_session_id uuid, p_answers jsonb)` | Match/scramble indekslari; speed score server session’dan olinadi |
| `update_daily_streak()` | Argumentsiz; mavjud verified faollikni o‘qiydi va eskirgan streak’ni normallashtiradi |
| `get_leaderboard(p_limit integer)` | Eng ko‘p 100 public rank; email/UUID chiqarilmaydi |

- **Word Match:** 5 juft / 10 kartochka. Har bir indeks aynan bir marta ishlatilishi, barcha juftlar to‘g‘ri bo‘lishi kerak; **+10 coins**.
- **Sentence Scramble:** 3 ta gap. Har bir gapdagi barcha so‘z indekslari aynan bir marta ishlatiladi; takroriy bir xil so‘zlar ham qo‘llanadi. Uchala gap to‘g‘ri bo‘lsa **+15 coins**.
- **Speed Vocabulary:** serverda **60 soniyalik deadline**, random savollar oqimi va har savolda 3 variant. To‘g‘ri javob `100` points, 4 soniya ichida qo‘shimcha `50`, combo bonusi esa `25 × min(combo − 1, 4)`. Noto‘g‘ri javob combo’ni uzadi. Kamida **5 ta to‘g‘ri javob va 60% accuracy** kerak; reward `5 + min(10, floor(points / 400))`, ya’ni **5–15 coins**. Client’ning elapsed/points/combo/coin qiymatlari ishonch manbai emas.
- Har bir user/topic/game uchun **UTC kuniga bitta** coin reward. Yangi same-day replay mashq uchun davom etadi, ammo reward `0`. Ertasi kuni yangi round yana reward olishi mumkin.
- O‘sha session/answer qayta yuborilsa idempotent: qo‘shimcha points, attempts, coin yoki yangi kunning activity’sini yaratmaydi. Qarama-qarshi yoki noto‘g‘ri tartibli speed replay rad etiladi. Match/scramble session’i 30 daqiqadan keyin tugaydi; speed javoblari 60 soniyadan keyin qabul qilinmaydi.
- Session private kontent + key hash’iga bog‘langan. Hatto faqat private kalit yangilansa ham davom etayotgan round qayta grading qilinmaydi — yangi round boshlash so‘raladi. Rewards profil lock’i va unique ledger bilan bir tranzaksiyada yoziladi.
- Mavzu quiz mukofoti **bir martalik**: A1–A2 `10`, A2–B1 `20`, B1–B2 `35`, B2–C1 `50`. Listening/Reading mock bandlari: 5.5–6.5 `30`, 7.0–8.0 `60`, 8.5–9.0 `100` coins.
- `add_user_coins(p_source, p_reference)` client’dan miqdor olmaydi. Game credit’ni bu RPC orqali to‘g‘ridan-to‘g‘ri olish mumkin emas; faqat game grader ledger yozadi.

#### Daily Streak: login emas, tugatilgan mashq

Kun chegarasi **00:00 UTC**, foydalanuvchi qurilmasining mahalliy yarim tuni emas:

1. To‘liq topshirilgan quiz yoki yakunlangan o‘yin verified daily activity yaratadi. O‘yin/quiz pass chegarasiga yetmagan haqiqiy urinish ham faollik; umuman javobsiz speed round hisoblanmaydi.
2. Oxirgi mashq kecha bo‘lsa `current_streak + 1`, undan eski bo‘lsa `1`. Bugun yana tugatish sanani/streak’ni oshirmaydi.
3. Login, profile refresh, `update_daily_streak()` yoki leaderboard ko‘rish o‘zidan-o‘zi faollik bermaydi. Bir to‘liq UTC kuni mashqsiz o‘tsa, ko‘rsatiladigan streak `0`; refresh RPC profildagi eskirgan qiymatni ham `0` qiladi.
4. Yangi, baholangan mock bo‘limi ham faollik bo‘ladi (past band bo‘lsa ham). Tarixiy sync va hali AI bahosi chiqmagan Writing/Speaking faollikni sun’iy oshirmaydi.
5. Header wallet/🔥 va leaderboard effective streak’ni ko‘rsatadi. Focus/visibility/UTC kun almashishida profil yangilanadi; offline holatda ham frontend eski sanani hisoblab yolg‘on streak ko‘rsatmaydi.

`record_learning_activity`, `learning_today`, private quiz grader va mock trigger funksiyalarini client chaqira olmaydi. Faqat verified grader/trigger activity yozadi. Guest mashqlar real coins/streak/progress bermaydi.

Coin’lar virtual gamification ballari, pul emas. RLS va server grading reward hisobini himoya qiladi, ammo bu proctoring emas: mashq materiali ochiq, mock bandlari esa mavjud client-side scoring modelidan keladi. Rasmiy/stakes reyting uchun server-side mock test sessiyasi va javob tekshiruvi alohida kerak.

#### Seed’ni saqlash va yangilash

Yagona manba: `scripts/roadmap-seed.js`. `npm run seed:roadmap` shu migration’dagi belgilangan seed blokini va `lib/roadmapContent.js` ni birgalikda generatsiya qiladi. `npm run seed:roadmap:check` va build **40/200/120** sonlarini, private javob kalitlarini hamda SQL/public katalog bir xilligini tekshiradi. Generator, SQL va private quiz kalitlari public build/preview asset allowlist’ga kirmaydi.

Migration qo‘llangandan **keyingi** yangi kontent o‘zgarishlarini yangi SQL migration orqali deploy qiling; Supabase CLI allaqachon qo‘llangan faylni qayta bajarmaydi. Migration’ni SQL Editor’da qayta qo‘llash progress/ledger’ni o‘chirmaydi, lekin o‘zgargan kontent faol session’larni invalid qiladi.

### AI kesh (7 kunlik TTL) va IELTS guardrails

`202610060002_ai_cache.sql` quyidagilarni yaratadi:

| Ustun | Tur | Izoh |
| --- | --- | --- |
| `id` | `uuid` primary key | `gen_random_uuid()` bilan avtomatik |
| `prompt_hash` | `text` | Foydalanuvchi savolining tozalangan matnining sha256 xeshi — **unique index** (upsert kaliti) |
| `response_json` | `jsonb` | AI'ning aynan o'sha javobi (Coach'da oddiy matn ham bo'lishi mumkin) |
| `created_at` | `timestamptz default now()` | Yozilgan vaqti — 7 kundan eski qatorlar eskirgan deb hisoblanadi |

Ishlash tartibi (`lib/aiCache.js`):

1. Savol tozalib `sha256` ga aylanadi → `prompt_hash`.
2. `select` qilinadi. Agar `now() - created_at < interval '7 days'` bo'lsa, **Gemini chaqirilmaydi** va keshdagi javob qaytariladi.
3. Aks holda Gemini'ga so'rov yuboriladi va javob `Prefer: resolution=merge-duplicates` bilan qatorga **upsert** qilinadi — eski qator yangulanadi (va uning 7 kunlik muddati qaytadan boshlanadi).

Xavfsizlik: jadvalda **hech qanday policy yo'q**, RLS yoqilgan. Ya'ni brauzerdan keluvchi `anon`/`authenticated` rollari keshni o'qiyolishi ham yozishi ham mumkin emas — faqat server (`SUPABASE_SERVICE_ROLE_KEY`, RLS'ni chetlab o'tadi) ishlatadi. Bu keshga zararli javob yozib qo'yishning oldini oladi.

Guardrails (`lib/aiGuardrails.js`): har bir Gemini chaqiruviga **System Instruction** ilova qilinadi — model o'zini faqat *"IELTS Murabbiyi"* sifatida tutadi va IELTS/ingliz tilidan boshqa mavzuda (dasturlash, siyosat, erkin suhbat, umumiy savollar) quyidagi jumla bilan rad etadi:

> Kechirasiz, men faquq IELTS va inglng tiliga doir savollarga yordak bera olaman.

Boshqa savollar `api/grade.js`, `api/coach.js`, `api/quiz.js` va `api/generate-mock.js` da bir xil ishlaydi; Coach sahifasida savol **tarmoq chizig'idan oldin** brauzerda tekshiriladi.

SQL funksiyalarni ishlatish uchun Supabase project'ga migratsiyalarni qo‘llab, sayt environment'iga `SUPABASE_URL` va `SUPABASE_ANON_KEY` kiriting. Roadmap progress va wallet kirgan foydalanuvchi bo‘yicha saqlanadi.

## 3. Supabase Auth sozlash

1. Authentication → Providers → **Email** yoqilgan bo'lsin.
2. Authentication → URL Configuration da **Site URL** ni haqiqiy sayt manziliga sozlang.
3. **Redirect URLs** ro'yxatiga ishlatadigan saytlaringiz root manzilini **ikkala ko'rinishda** qo'shing (`/` bilan va `/` siz — Google OAuth `window.location.origin` ga, email tasdiqlash `origin + '/'` ga qaytaradi):
   - lokal ish uchun `http://localhost:3000` va `http://localhost:3000/`;
   - Arena uchun LIVE PREVIEW'dagi haqiqiy HTTPS origin va origin + `/`;
   - production domeningiz va domen + `/`.
4. **Authentication → Providers → Email → Confirm Email** ni yoqing. Yangi foydalanuvchi uchun sayt **“Pochtangizga tasdiqlash xati yuborildi, pochtangizni tekshiring”** xabarini ko'rsatadi; foydalanuvchi emaildagi havolani tasdiqlab, keyin login qiladi. Confirm Email o'chirilgan loyihada Supabase darhol sessiya qaytarishi mumkin: sayt bunday holda xat yuborilganini yolg'on da'vo qilmaydi, akkaunt yaratilganini ko'rsatadi. Production uchun Supabase SMTP/rate limit sozlamalarini ham tekshiring.
5. Google login kerak bo'lsa, Supabase **Google provider** ni yoqing, uning OAuth callback manzilini Google Console'ga va sayt originini Supabase redirect ro'yxatiga kiriting. Endi Supabase yoqilgan rejimda eski kosmetik Google token login ishlatilmaydi.
6. **"Google bilan davom etish"** bosilganda sayt `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` chaqiriladi: brauzer Supabase authorize manziliga (PKCE `code_challenge` bilan) o'tadi, Google'da tasdiqlanadi va sayt originiga `?code=...` bilan qaytadi. Qaytish sahifasida SDK bu kodni sessiyaga almashtiradi (`detectSessionInUrl`), foydalanuvchi `auth: 'supabase'` bilan tizimga kiradi va kabinetiga (`/dashboard`) yo'naltiriladi. Google'da rad etilishi (yoki provayder o'chiq) bilan qaytgan `?error=...` login sahifasida doimiy xabar ko'rinishida chiqadi; bir martalik `?code=`/`?error=` parametrlari ishlanganidan keyin manzildan tozalanadi, shunda sahifani yangilash yoki linkni ulashish eskigan kodni qayta ishlatmaydi.

**Eski demo akkauntlar Supabase akkaunti emas.** Ular avtomatik ro'yxatdan o'tkazilmaydi va tasdiqlanmagan demo natijalar bazaga avtomatik ko'chirilmaydi. Supabase orqali yangi akkaunt oching. Local kesh Supabase user UUID bo'yicha alohida saqlanadi, demo email keshidan aralashtirilmaydi. Eski `ielts-v2-user` profil kaliti endi autentifikatsiya hisoblanmaydi va o'chiriladi. Reload paytida SDK sessiyasi `getUser()` bilan tekshiriladi; natija yozishdan oldin ham serverdan haqiqiy user ID olinadi.

Login xatolari Supabase qaytargan matn bilan formadagi doimiy xabar blokida ko'rsatiladi. Noto'g'ri parol va mavjud bo'lmagan email uchun Supabase xavfsizlik sababli bir xil `Invalid login credentials` xabarini qaytarishi mumkin. Parollar ilovaning local profiliga saqlanmaydi. **Logout** headerdagi foydalanuvchi menyusi, mobil menyu va Settings oynasida mavjud; u `supabase.auth.signOut({ scope: 'local' })` orqali joriy qurilmadagi sessiyani tugatadi.

## 4. Ishga tushirish va deploy

```bash
npm run preview
# prepreview Supabase browser bundle'ni yaratadi; server .env ni o'qiydi.
```

`.env` o'zgarganda serverni qayta ishga tushiring. Ishlayotgan session/browserni ham yangilang.

Vercel'da:

- Environment Variables ga `SUPABASE_URL`, `SUPABASE_ANON_KEY`, kerak bo'lsa `GEMINI_API_KEY` qo'shing.
- Yangi deployment qiling. `vercel.json` `npm run build` va `public` output papkasini sozlaydi.
- Build faqat public fayllarni `public/` ga nusxalaydi. API'lar root `api/` ichidagi Vercel functions bo'lib qoladi; environment kalitlari statik bundle'ga tikilmaydi.

`supabase.bundle.js` va `public/` generated fayllar — Git'ga kiritilmaydi, `npm run build` bilan qayta yaratiladi. Saytni `file://` yoki oddiy statik server bilan ochish yetarli emas: `/api/config` ishlashi kerak.

## 5. Tekshirish

```bash
npm test
npm run build
npm run test:auth
npm run test:roadmap
npm run test:learning
npm run seed:roadmap:check
```

`tests/supabase.test.js` public config xavfsizligini, PostgreSQL-compatible PGlite ichida mock-results migration/RLS/umumiy band hisobini, offline retry, dublikatlar va account switch holatlarini tekshiradi. `tests/roadmap.test.js` gamification migratsiyasini PGlite'da ishga tushirib, seed savollari, yopiq javob kalitlari, 80% yakunlash chegarasi, coin tier/idempotency va leaderboard maxfiyligini tekshiradi. `tests/auth.test.js` haqiqiy Supabase SDK bilan mock HTTP orqali signup, noto‘g‘ri login, logout va user ID tekshiruvlarini bajaradi. `tests/learning.test.js` yangi migration’ni PGlite’da bajaradi: 40 ta mavzuning barcha javoblari, RLS/grants, qulflangan mavzu, 3 ta grader, server timer/combo, key-only session invalidation, idempotency, UTC/missed-day streak, eski progressni saqlash va client/SDK lifecycle’larini tekshiradi. Barcha testlar **jonli Supabase loyihasiga ulanmaydi**.

Real-browser suite ixtiyoriy (Playwright Chromium kerak; preview boshqa terminalda ishlasin):

```bash
npx playwright install --with-deps chromium
npm run preview
# boshqa terminal:
npm run test:learning:browser
```

Guest va account oqimlari alohida brauzerda ishlaydi. Account oqimida haqiqiy Supabase SDK **test-only HTTP fixture + PGlite SQL/RLS** ga ulanadi: login streak’ni oshirmasligi, game +10 / streak 3→4, quiz +10 / streak o‘zgarmasligi, keyingi topic unlock, leaderboard, session reload va 320px header tekshiriladi. Guest oqimi barcha 40 node, uchta o‘yin, 60s timer/combo/keyboard, Uzbek/light va mobil overflow’ni tekshiradi. Bu hosted Supabase deployment yoki haqiqiy PostgreSQL parallel-load stress testi o‘rnini bosmaydi. Runner parametr va screenshot sozlamalari [README.md](README.md) da.

Loyihangiz sozlangandan keyin qo'lda tekshiring:

1. Yangi akkaunt ochish → emailni tasdiqlash → login.
2. Listening'ni yakunlash → SQL Table Editor'da `mock_results` satri, `listening` va `scores` borligini tekshirish.
3. Qolgan bo'limlarni yakunlash → o'sha satr yangilanishi va `overall_band` hisoblanishi.
4. **Results** ni yangilash → duplicate satr paydo bo'lmasligi.
5. Boshqa brauzer/qurilmada shu akkaunt bilan login → oldingi natijalar chiqishi.
6. Ikkinchi akkaunt → birinchi akkaunt natijalari ko'rinmasligi.
7. Internetni uzib natija saqlash → local natija qolishi; qayta ulab Retry → bulutga yozilishi.
8. `#/roadmap` → 5 savolli mavzu testida 3/5 natija completion/coin bermasligi, 4/5 natija progress va tegishli tanga berishini tekshirish.
9. Xuddi shu tugatilgan mavzuni qayta topshirish → progress qolishi, lekin ikkinchi marta coin berilmasligi.
10. Listening yoki Reading mock bandi 6.0, 7.5, 8.5 bo‘lgan uchta account/test holati → mos ravishda 30, 60, 100 tanga; refresh/retry'da takroriy credit bo‘lmasligi.
11. `#/leaderboard` → uchta eng yuqori foydalanuvchida oltin/kumush/bronza, joriy foydalanuvchi ajralib turishi va hech qayerda email ko‘rinmasligini tekshirish.
12. Yangi user’da 40 mavzu / bosqichiga 10: faqat birinchisi ochiq; 4/5 quiz’dan keyin ikkinchisi ochilishi, birinchi bosqichning 10/10 natijasidan keyin A2→B1 boshlanishini tekshirish.
13. Uchala o‘yinni tugatish → server coins, game progress, profil yonidagi wallet va leaderboard bir xil balans ko‘rsatishi. Same-day replay va save retry qo‘shimcha reward bermasligi.
14. Login’dan keyin streak o‘zgarmasligi; birinchi yakunlangan mashq oshirishi, ikkinchisi oshirmasligi. Keyingi UTC kuni mashq, bir kun tashlab qaytish va boshqa qurilmadagi profile refresh’ni tekshirish.
15. Telefon/light tema, kartochka noto‘g‘ri/to‘g‘ri animatsiyasi, speed keyboard/timer, scramble token removal, mute, Escape/Tab va reduced-motion’ni tekshirish. Browser console orqali locked-topic RPC yoki to‘g‘ridan-to‘g‘ri coin/streak UPDATE rad etilishi.

## Chegaralar

- AI baholash uchun Gemini kaliti alohida kerak. AI bahosi chiqmagan bo'lim `NULL`, sun'iy ravishda `0` emas.
- Sinxronlanmagan natijalar brauzer xotirasida bo'ladi; yuborilguncha browser ma'lumotlarini tozalamang.
- Test savollari, davom etayotgan javob draftlari, barcha settings/quiz/vocabulary progress va AI Coach chatlari ushbu `mock_results` jadvaliga ko'chirilmagan.
- Ballar mashq uchun client tomonidan yuboriladi. RLS foydalanuvchilar maxfiyligini himoyalaydi, lekin o'z ballini browser orqali o'zgartirishni cheklovchi proctoring emas. Rasmiy sertifikat/reyting uchun server-side grading va test-session validatsiyasi alohida kerak.
- Keyin retake qo'shilsa, `unique(user_id, test_id)` o'rniga alohida `attempt_id` bilan tarix sxemasi kerak bo'ladi.

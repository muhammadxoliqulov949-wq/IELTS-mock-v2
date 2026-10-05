# Supabase integratsiyasi

## Nimalar ulandi?

- `@supabase/supabase-js` npm kutubxonasi, alohida `supabaseClient.js`.
- `.env` → serverdagi `process.env` → `/api/config` → browser Supabase client.
- Email/parol bilan **Supabase Auth**, ixtiyoriy Google OAuth.
- `mock_results` jadvali, foydalanuvchi egaligini tekshiruvchi **RLS**.
- Listening/Reading/Writing/Speaking yakunlanganda va timer tugaganda avtomatik saqlash.
- **Results** oynasida Supabase natijalari, yangilash/qayta urinish tugmasi.
- Yangi qurilmada akkauntga kirganda bulutdagi natijalar local keshga yuklanadi; dashboard va testning yakunlangan holati ham tiklanadi.
- Tarmoq/SQL xatosida local natijalar yo'qolmaydi. Saqlanmagan versiyalar qayta kirganda, internet qaytganda yoki **Yangilash / Qayta urinish** bilan yuboriladi.

> Integratsiya kodi tayyor, ammo Supabase loyihasi avtomatik yaratilmaydi. Demo login butunlay olib tashlangan. Quyidagi sozlashsiz sayt ochiladi, lekin **login/ro‘yxatdan o‘tish va mock testni boshlash bloklanadi**. Test savollari avvalgidek `data.js`, `content2.js`, `content3.js`, `content4.js` fayllarida; bu ish faqat akkaunt va natijalarni ulaydi.

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
3. `supabase/migrations/202610060001_roadmap_gamification.sql` — `profiles.coins`, 12 ta seed mavzu (har birida 5 savol), maxfiy javob kalitlari, foydalanuvchi progressi, tanga ledger'i va leaderboard RPC'lari.

Admin panel MP3, xarita/reja va Writing Task 1 rasmlarini brauzerdan Supabase Storage’ga yuboradi. Bucket public read (learner `<audio>`/`<img>` uchun), lekin insert/update/delete faqat authenticated `public.is_admin()` orqali ruxsat etiladi. Maksimal fayl 50 MB; ruxsat etilgan media MIME turi bucket’da cheklangan. **Service-role kaliti talab qilinmaydi va browserga berilmaydi.** `ADMIN.md` da UI, kontent JSON shakli va xatolarni hal qilish bo‘yicha yo‘riqnoma bor.

### Roadmap, tangalar va leaderboard

- `#/roadmap` da A1→A2, A2→B1, B1→B2, B2→C1 bosqichlari va har birida uchta namunaviy mavzu bor. Har bir mavzu qisqa konspekt, ChatGPT/Claude uchun nusxalashga tayyor prompt va 5 savolli viktorinani ko‘rsatadi.
- `topics.questions` faqat savol va variantlarni saqlaydi. Javob kalitlari `topic_answer_keys` jadvalida; authenticated client bu jadvalni o‘qiy olmaydi. `submit_topic_quiz` javoblarni serverda tekshiradi, eng yaxshi foizni saqlaydi va 80%+ natijada mavzuni yakunlaydi.
- `public.add_user_coins(p_source, p_reference)` **miqdorni client'dan qabul qilmaydi**: roadmap mukofotini mavzu jadvalidan, mock mukofotini joriy foydalanuvchining saqlangan Listening/Reading band'idan hisoblaydi. `coin_transactions` unikalligi bir mavzu yoki test bo‘limiga qayta tanga berilishining oldini oladi.
- Mavzu mukofotlari: A1–A2 = 10, A2–B1 = 20, B1–B2 = 35, B2–C1 = 50 tanga. Har bir Listening/Reading mock bandi uchun: 5.5–6.5 = 30, 7.0–8.0 = 60, 8.5–9.0 = 100 tanga.
- `get_leaderboard` faqat display name, avatar, jami tanga, daraja belgisi va rank'ni beradi; email'lar oshkor qilinmaydi. Profil tangalarini client to‘g‘ridan-to‘g‘ri o‘zgartira olmaydi.
- Coin mukofotlari virtual gamification ballari, pul yoki to‘lov vositasi emas. Mock bandlari mashq uchun bo‘lib, mavjud client-side scoring modelida proctoring qilinmaydi; rasmiy/stakes reyting uchun server-side test sessiyasi va javob tekshiruvi alohida kerak.

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
```

`tests/supabase.test.js` public config xavfsizligini, PostgreSQL-compatible PGlite ichida mock-results migration/RLS/umumiy band hisobini, offline retry, dublikatlar va account switch holatlarini tekshiradi. `tests/roadmap.test.js` gamification migratsiyasini PGlite'da ishga tushirib, seed savollari, yopiq javob kalitlari, 80% yakunlash chegarasi, coin tier/idempotency va leaderboard maxfiyligini tekshiradi. `tests/auth.test.js` haqiqiy Supabase SDK bilan mock HTTP orqali signup, noto‘g‘ri login, logout va user ID tekshiruvlarini bajaradi. Barcha testlar **jonli Supabase loyihasiga ulanmaydi**.

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

## Chegaralar

- AI baholash uchun Gemini kaliti alohida kerak. AI bahosi chiqmagan bo'lim `NULL`, sun'iy ravishda `0` emas.
- Sinxronlanmagan natijalar brauzer xotirasida bo'ladi; yuborilguncha browser ma'lumotlarini tozalamang.
- Test savollari, davom etayotgan javob draftlari, barcha settings/quiz/vocabulary progress va AI Coach chatlari ushbu `mock_results` jadvaliga ko'chirilmagan.
- Ballar mashq uchun client tomonidan yuboriladi. RLS foydalanuvchilar maxfiyligini himoyalaydi, lekin o'z ballini browser orqali o'zgartirishni cheklovchi proctoring emas. Rasmiy sertifikat/reyting uchun server-side grading va test-session validatsiyasi alohida kerak.
- Keyin retake qo'shilsa, `unique(user_id, test_id)` o'rniga alohida `attempt_id` bilan tarix sxemasi kerak bo'ladi.

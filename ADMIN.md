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

---

## 7. Fayllar

```
supabase/migrations/202610050001_admin.sql   admin jadvallari, RPC, RLS, trigger
supabase/migrations/202610050002_media_storage.sql  ielts-media bucket + admin-only upload RLS
supabaseClient.js                            admin API + Supabase Storage media upload
admin.js                                     panel mantiqiy qatlami + IELTS konstruktor + JSON muharriri
script.js                                    #/admin route, learner runner, audio/image rendering
styles.css                                   admin builder + media + exam content stillari
tests/admin.test.js                          guard/RLS, media migratsiyasi, format, validatsiya, XSS testlari
```

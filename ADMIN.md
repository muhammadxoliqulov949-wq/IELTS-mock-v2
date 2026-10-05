# Admin Panel

To'liq ishlaydigan admin panel: **Vanilla JS** (mavjud `#/…` hash-router ichida), **Supabase Auth + PostgreSQL**, dark/glass dizayn.

```
#/admin   →   Overview · Users · Mock tests · Submissions
```

---

## 1. O'rnatish (3 qadam)

### 1.1 SQL migratsiyasini ishga tushiring

[Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** → yangi query →
`supabase/migrations/202610050001_admin.sql` ichidagini to'liq nusxalab, **Run**.

> Avval `202610040001_mock_results.sql` qo'llangan bo'lishi kerak.

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

## 4. Test muharriri: vizual + JSON

Muharrir ikki rejimda ishlaydi va ikkalasi bir xil ma'lumot ustida:

**Visual builder** — maydonma-maydon forma:
- Listening: `parts` → har birida sarlavha, ko'rsatma, transcript, savollar ro'yxati
- Reading: `passages` → sarlavha, qiyinlik, matn, savollar
- Writing: `tasks` → sarlavha, daqiqa, minimum so'z, prompt, grafik ma'lumoti
- Speaking: `parts` → sarlavha, daqiqa, savollar (har biri alohida qatorda), cue card mavzusi/bandlari

Savol turlari: `sentence-completion`, `multiple-choice` (variantlar `|` bilan), `true-false-not-given`.

**JSON** — butun testni joylash (paste) yoki qo'lda tahrirlash uchun.
Rejimlar orasida o'tishda ma'lumot avtomatik sinxronlanadi.

Saqlashdan oldin validatsiya: har bir savolda prompt va javob bo'lishi shart,
`multiple-choice` da kamida bitta variant bo'lishi kerak.

### Kontent shakli (mos kelishi shart)

```jsonc
{
  "id": "listening-custom", "title": "...", "skill": "Listening", "duration": 30,
  "parts": [{
    "id": "lp1", "partNumber": 1, "title": "Part 1",
    "instructions": "...", "transcript": "...",
    "questions": [
      { "id": "l1", "type": "sentence-completion", "prompt": "...", "answer": "42" },
      { "id": "l2", "type": "multiple-choice", "prompt": "...", "answer": 1,
        "options": ["A", "B", "C"], "explanation": "..." }
    ]
  }]
}
```

`id` va `partNumber` / `passageNumber` / `taskNumber` larni saqlashda server avtomatik
qayta nomerlaydi — ularni qo'lda to'g'rilash shart emas.

---

## 5. Yaratilgan test o'quvchilarga qanday yetib boradi

1. Admin testni nashr qiladi (`is_published = true`)
2. Ilova yuklanishida `loadDynamicTests()` nashr qilingan testlarni oladi
3. Ular `IELTS_CONTENT` ichiga `listening5`, `reading5`, … kabi **aynan mavjud `testN`
   kalitlari** bilan yoziladi
4. `getSkillContent()` va `testMeta` allaqachon shu sxemani tushunadi → yangi test
   test tanlash oynasida paydo bo'ladi

Nashrdan olinsa, keyingi sahifa yangilanishida yo'qoladi.

---

## 6. Muammolarni hal qilish

| Belgisi | Sababi | Yechim |
| --- | --- | --- |
| Admin panelda "The admin tables are missing" | Migratsiya ishga tushirilmagan | SQL Editor'da migratsiyani ishga tushiring |
| ⚙ Admin tugmasi ko'rinmayapti | `profiles.role` hali `user` | 1.2-bo'limdagi `update` ni ishga tushiring, sahifani yangilang |
| Kirganda dashboard'ga tashlab yuboradi | Rol `admin` emas yoki profil yuklanmagan | `select * from profiles where email = '…';` bilan tekshiring |
| Jadvallar bo'sh, lekin xato yo'q | RLS hammasini filtrlayapti | `role` ustunini tekshiring; `select public.is_admin();` `true` qaytarishi kerak |
| Test tanlash oynasida yangi test yo'q | Test yoki uning bo'limi nashr qilinmagan | Ham meta, ham kerakli bo'limlar `Published` bo'lishi kerak |

---

## 7. Fayllar

```
supabase/migrations/202610050001_admin.sql   jadvallar, RPC, RLS, trigger
supabaseClient.js                            admin API (adminStats, adminSetRole, …)
admin.js                                     panel mantiqiy qatlami + view + muharrir
script.js                                    #/admin route, guard, nav, kontent yuklovchi
styles.css                                   panel stillari (mavjud dark/glass tilida)
tests/admin.test.js                          57 ta tekshiruv: guard, RLS, validatsiya, XSS
```

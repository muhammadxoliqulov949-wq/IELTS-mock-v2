# Premium upgrade — implemented & next steps

Status: **B (payments) intentionally NOT implemented yet.** Everything else from the
premium plan has been added and is tested.

## What was added

| Area | What |
|---|---|
| Content depth | Test 2 (Listening 40 questions, Reading 40 questions, Writing T1+T2, Speaking 3 parts) |
| Explanations | Every Listening/Reading question in Test 2 has a written explanation; Test 1 has curated extras |
| Dashboard | Overall band, band trend SVG, weekly activity, study minutes, personalized 6-day plan |
| Full mock | Combined Listening→Reading→Writing→Speaking flow + combined band |
| i18n | English / Uzbek / Russian with language switcher in nav & settings |
| Quiz | Client-side quick quiz + server-side `/api/quiz` (Gemini with local fallback) |
| Vocabulary | 3 topic sets (travel, education, environment) with mastery % |
| Mini lessons | 6 category-based lessons (Writing, Reading, Listening, Speaking, Vocabulary) |
| PWA | `manifest.webmanifest`, `sw.js` (cache + offline fallback), app icon |
| Auth | Email/password demo auth (stored locally) + existing Google sign-in |
| SEO/marketing | Landing plans section, robots.txt, sitemap.xml, updated meta/OG |
| AI endpoints | `/api/quiz` added alongside existing `/api/grade`, `/api/coach` |
| Tests | `premium.test.js`, `quiz.test.js`; boot test now covers all new routes |
| Refactor | i18n + content + services split into modules (`i18n.js`, `content2.js`) |

## Verified

```bash
npm test
# ALL API TESTS DONE
# script.js BOOTED OK / ALL ROUTES RENDER OK
# PREMIUM CONTENT OK ✓
# QUIZ API OK ✓
```

Locally: `npm run preview` → http://localhost:3000

## Next (later, after testing)

1. **B – Payments**: Stripe or Payme/Click; free vs premium unlock rules.
2. Real auth backend (Supabase/Firebase) replacing the local demo auth.
3. Production DB for attempts/profiles (PostgreSQL, e.g. Neon/Supabase) instead of localStorage.
4. More Test 3+ content and full question/explanations coverage.
5. Analytics + error monitoring (PostHog/Sentry).

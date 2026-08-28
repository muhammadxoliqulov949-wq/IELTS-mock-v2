# Premium upgrade — implemented & next steps

Status: **B (payments) intentionally NOT implemented yet.** Everything else from the
premium plan has been added and is tested.

---

## ✅ 2026-08-28 — Premium polish pass (nav redesign + bug fixes)

### Nav (top bar) — rebuilt
| Before | After |
|---|---|
| 10 links + 4 buttons in one pill → overflow in uz/ru | **5 primary links** (Dashboard · Mock · Full Mock · Results · AI Coach) + **"More ▾" dropdown** (Mistakes, Lessons, Vocabulary, Quiz, Settings) |
| 721–860px: links hidden, no hamburger → no navigation | Links collapse into the hamburger at **one** breakpoint (900px) — no dead zone |
| Light theme: invisible/dark hardcoded nav backgrounds | Theme tokens `--nav-bg` / `--nav-scrolled` / `--dropdown-bg` per theme |
| `confirm("Sign out?")` on chip click | **User dropdown** (name, email, Dashboard, Settings, Sign out) |
| No `aria-current`, no focus ring | `aria-current="page"`, visible `:focus-visible` ring, `aria-expanded` on menus |
| Mobile menu without auth/theme/lang | Full mobile menu: all 10 links + theme + language + sign-in/out |
| Floating pill, no light-theme variant | Full-width sticky header with blur + scroll shadow |

### Bugs fixed
1. **Background timer** — leaving a test page no longer auto-submits it elsewhere;
   the interval is cleared on every render, and a deadline that expired while the
   user was away submits immediately on return. Final 5 minutes pulse (`.timer-danger`).
2. **Speaking Part 2 only recorded ~60s** — Chrome cuts `continuous` recognition
   after ~60s; it is now restarted (up to 5×) and transcripts are committed across
   restarts, so the full 120s is captured.
3. **Lessons "Read" did nothing** — now opens a real **lesson modal**
   (category, level, minutes, all bullets, practice CTA; closes via ×/backdrop/Escape).
4. **Vercel prod risk** — SPA fallback rewrite now excludes `/api`
   (`/((?!api/).*) → /index.html`) so functions are never shadowed.
5. **Half-translated UI** — home (hero, steps, features, plans, CTA), footer,
   dashboard, results, mistakes, coach and exam chrome are fully localized
   (en/uz/ru, 158 keys per language, parity tested).
6. `user.picture` is now escaped (micro-XSS), `theme-color` meta follows the theme,
   hero progress counts **unique** sections, MCQ answers select **in place**
   (no full re-render, scroll/focus preserved), Test 2 badge says "Free now"
   (consistent with the free premium plan).

### Premium polish
- Hero: animated **SVG band ring** + per-skill rows + stats strip; gradient CTA.
- Sections fade in on scroll (IntersectionObserver, respects `prefers-reduced-motion`).
- Consistent 38px icon buttons, pill hover states, structured 3-column footer with year + disclaimer.
- PWA cache bumped to `bandly-v3` so clients pick up the new assets.

### Tests
`npm test` now also runs `tests/nav.test.js` (nav structure, dropdowns, user menu,
XSS escape, footer/i18n, lesson modal, EN logged-out CTA). All suites green.

### Premium principles applied (keep these in every future UI change)
1. **Navigation hierarchy** — max 5–6 equal-weight links; everything else in
   "More" or the user menu. A premium site never shows 10 flat links.
2. **One design system** — colors, radii, shadows, spacing, chrome backgrounds
   live in CSS tokens (`:root` + per-theme overrides). No hardcoded chrome colors.
3. **Motion with intent** — 150–300ms, ease-out; only where it conveys state
   (hover, reveal, timer urgency); always `prefers-reduced-motion` aware.
4. **Accessibility = trust** — `focus-visible`, `aria-current`, `aria-expanded`,
   semantic landmarks, contrast ≥ 4.5:1. The "premium feel" is made of these
   micro-details.
5. **Honest messaging** — "Free now" instead of a star that implies a lock;
   "coming soon" only for things that will actually ship. Trust is worth more
   than a fake premium tier.
6. **Defensive rendering** — all user-controlled values (names, pictures, AI text)
   go through `esc()`; timers/listeners are cleaned up per render, document-level
   listeners are bound once.
7. **Test the chrome** — nav/auth/footer structure is covered by unit tests,
   not just the exam logic.

---

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

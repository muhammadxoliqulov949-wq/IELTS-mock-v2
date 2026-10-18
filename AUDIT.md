# IELTS Mock v2 — Complete Project Audit

**Date:** 2026-10-11
**Scope:** Full re-audit of the entire repository — source code, API layer, database migrations, tests, build/deploy pipeline, security, performance, i18n and documentation.
**Method:** line-by-line review of all 30,000+ LOC · `npm test` (22 suites) · `npm audit` · `npm run build` · live smoke tests against `node server.js` (static serving, path-traversal, rate limiting, API error paths) · static analysis (`node --check` on every JS file, secret scan, i18n parity check, payload measurement).

> **Language note:** this report is written in English. Earlier audits (2026-08-27/28, see *History* below) were written in Uzbek; git history preserves them.

---

## 1. Executive summary

**Overall rating: 9.0 / 10** — production-grade learning platform.

Since the last audit (8.5/10, 2026-08-28) the project has grown from a well-polished MVP into a full product: Supabase auth + RLS backend, admin panel with CRUD and a 1-Click AI mock generator, a Duolingo-style gamified roadmap (40 lessons / 200 quiz questions / 120 mini-games), server-validated coin/streak rewards, a leaderboard, streaming AI Coach with guardrails and a 7-day cache, an adaptive drills layer, a delete-account endpoint with JWT verification, and 22 test suites covering all of it.

Every critical and second-tier item from the previous audits has been addressed. The remaining findings are about **scale and polish**, not correctness: eager loading of heavy modules, per-instance in-memory rate limiting, a browser test that is excluded from the default chain, and a few small deployment caveats. **Nothing found blocks production use.**

| Area | Score | Comment |
|---|---|---|
| Features & IELTS fidelity | **9.0** | 4 full mock tests, full-mock flow, explanations, true/false/not-given, Word Match/Speed Vocab/Scramble, band conversion verified |
| AI quality & safety | **9.0** | Multi-provider failover (Groq multi-key → DeepSeek), SSE streaming, strict IELTS guardrails, 7-day DB cache, retry/backoff honoring `Retry-After` |
| Security | **9.0** | RLS everywhere, service-role key server-only, JWT-verified deletion, `/api/config` refuses non-public keys, rate limits, input length caps, DOMPurify, `esc()` everywhere, traversal blocked |
| Code quality & tests | **8.5** | 22 suites green (~317 assertion groups), pglite-backed SQL tests; only the Playwright browser test sits outside the default chain |
| Performance | **7.5** | ~383 KB gz first load; every module (incl. 310 KB roadmap catalog, 82 KB admin) is loaded eagerly for every visitor — lazy-loading is the main win left |
| Deploy & ops | **8.5** | Vercel config, build pipeline, env docs, seed/check scripts; `maxDuration: 60` is a Hobby-plan risk for the generator |
| Documentation | **9.5** | README, ADMIN, SUPABASE, PREMIUM docs are detailed, accurate and tested against the code |

---

## 2. Verified — what I actually ran

| Check | Result |
|---|---|
| `node --check` on all 54 JS files (31 application files: root/api/lib/scripts/server.js; 23 test files) | ✅ 0 syntax errors in all 54 |
| `npm test` (22 suites, chained with `&&`) | ✅ All pass — API, boot, premium, quiz, nav, flow, test3/4, supabase, roadmap, auth, delete-account, mascot, admin, generator, generator-client, guardrails, ai-client, markdown, streaming, adaptive drills, learning |
| `npm audit` | ✅ **0 vulnerabilities** |
| `npm run build` (esbuild bundles + `public/`) | ✅ Builds; also validates 40 lessons / 200 questions / 120 games |
| `npm run seed:roadmap:check` (via build) | ✅ Roadmap catalog consistent |
| Secret scan (`service_role`, `sb_secret`, JWT, `sk-`, `gsk_`) | ✅ No leaked secrets — matches were validation code/docs only |
| i18n parity | ✅ **828/828/828** keys in en/uz/ru, zero missing |
| Live server smoke test | ✅ All assets 200; private files 404 |
| Path traversal (`%2e%2e`, `..%2f`, `/icons/../../`) | ✅ All 404 |
| Rate limiting | ✅ `/api/grade` returns 429 after 15 req/min from one IP |
| Wrong HTTP method | ✅ 405 on `GET /api/grade` |
| Missing AI key | ✅ Friendly 500 setup message (no stack trace, no crash) |
| Missing Supabase key (delete-account) | ✅ Friendly 503 |
| Quiz without AI key | ✅ Graceful local-bank fallback (`source: "local"`) |

### Verification provenance and limits

The table above mixes two evidence levels. **Reproduced in final verification
(2026-10-11):** the full `npm test` run, `npm run build`, roadmap seed check,
all syntax checks and `npm audit` (see Appendix for exit codes). **Not
reproduced:** the live-server smoke tests (rate-limit 429s, traversal 404s,
405s, key-missing fallbacks) were executed against `node server.js` during the
first pass of this audit; their behaviors are also confirmed directly in source
(`server.js` allow-list, the five in-file limiters, `api/config.js` key guard),
but the live HTTP run itself is supported only by the earlier execution log.

**Not verified at all (out of environment reach):** live end-to-end integration
against a real Supabase project, Groq/DeepSeek APIs, Edge TTS delivery and a
production Vercel deployment — no external credentials were used. Database and
auth behavior is verified through unit suites (node, pglite and mocked
clients), not against a live backend. The 9.0 score therefore reflects
code/test-level quality; production behavior on live services remains to be
confirmed at first deploy.

---

## 3. Architecture review

```
Browser (vanilla JS SPA)                Vercel serverless            Supabase
├─ index.html  ──► script.js (router)   ├─ api/grade.js    (writing/speaking/sentence_transform)
├─ styles.css / learning.css            ├─ api/coach.js    (JSON + SSE streaming)
├─ data.js … content4.js (4 tests)      ├─ api/quiz.js     (AI + local fallback)
├─ i18n.js (en/uz/ru, 828 keys)         ├─ api/config.js   (public env only, key-guarded)
├─ admin.js + mockGenerator.js          ├─ api/generate-mock.js (1-Click IELTS generator)
├─ lib/roadmapContent.js (40 lessons)   └─ api/delete-account.js    (JWT-verified)
├─ lib/adaptiveDrills.js                     lib/aiClient.js  (multi-key router, failover, backoff)
├─ supabase.bundle.js (esbuild)              lib/aiGuardrails.js (IELTS-only boundary)
├─ markdown.bundle.js (marked+DOMPurify)     lib/aiCache.js   (7-day TTL in public.ai_cache)
├─ sw.js (PWA)                               lib/edgeTts.js   (MP3 via Edge TTS)
└─ miniGames.js                              scripts/roadmap-seed.js (single source of truth)
                                             server.js (local preview mirrors all routes)
```

**Sound decisions worth keeping:**

- **Defense in depth on AI cost/safety:** guardrail check *before* any model call, result cache at 7-day TTL, per-minute rate limits, strict input caps (3 KB coach messages, 6 KB writing responses, 40 KB speaking transcripts), refusal re-check after the model answers.
- **The service-role key never reaches the browser** — `/api/config` actively rejects `sb_secret_`/non-anon keys; delete-account identifies the caller **only** via `auth.getUser(token)`, never via a request-body user id.
- **Gamification is server-authoritative:** coin amounts, speed/combo bonuses and streaks are computed in SQL RPC under RLS — the client cannot mint coins. Tests verify replay/idempotency and locked-lesson bypass attempts.
- **Migrations are replay-safe** and the content seed has a machine-check (`seed:roadmap:check`) wired into `npm run build`.
- **Graceful degradation everywhere:** no AI key → clear setup message + local quiz bank; no Supabase → guest mode; no `audioUrl` → `speechSynthesis` fallback with a translated label; markdown rendering sanitizer falls open only if DOMPurify itself is missing (tested).

---

## 4. Findings and recommendations (by priority)

### P1 — worth doing before/with the next release

**F1. Initial payload is heavier than it needs to be (Performance, medium)**
`index.html` eagerly loads all 17 script tags for every visitor, including the 310 KB `lib/roadmapContent.js` catalog, 82 KB `admin.js` and 38 KB `mockGenerator.js`. Measured eager text payload (index.html + CSS + 17 scripts): **~1.3 MB raw / ~294 KB gzipped without the two generated bundles**, or **~1.5 MB raw / ~383 KB gzipped when `supabase.bundle.js` + `markdown.bundle.js` are included** (plus images). On a mid-range phone over 3G the landing page pays for the admin panel.
→ **Fix:** split by route — load `roadmapContent.js`, `adaptiveDrills.js`, `miniGames.js` only on `#/roadmap`/`#/drills`; `admin.js` + `mockGenerator.js` only on `#/admin` after the role check. A dynamic `import()`/`script` injection per route keeps the zero-bundler architecture. Target: landing ≤ 180 KB gz.

**F2. Rate limiting is per-instance in-memory (Security robustness, medium)**
Each of the 5 API files carries its own copy of the same `ipHits` Map limiter. On Vercel this resets on every cold start and is not shared across instances, so it stops only the most naive abuse; the real usage controls today are cache + guardrails (which is fine while keys are free-tier).
The limiter is duplicated in **five** API files — `grade.js` (15/min), `coach.js` (20/min), `quiz.js` (20/min), `delete-account.js` (5/min), `generate-mock.js` (120/min).
→ **Fix:** extract `lib/rateLimit.js` (removes all 5 duplicated copies), and if signups grow, move to a durable counter (Supabase table or Vercel KV) keyed by IP+route. Also note the limiter trusts `x-forwarded-for` blindly — acceptable on Vercel, but document it.

**F3. Playwright browser test is outside `npm test` (Testing, medium)**
`tests/learning.browser.test.js` runs only via `npm run test:learning:browser` and needs browser binaries (`npx playwright install`). In this sandbox Node-only suites pass, but the browser suite can silently rot.
→ **Fix:** run it in CI (GitHub Action with `playwright install --with-deps chromium`), or make the script self-check for browsers and print how to install them.

### P2 — quality improvements

**F4. Legacy listening audio is browser TTS (Content quality, low–medium)**
Tests 1–4 in `data.js`/`content*.js` speak through `speechSynthesis` (robotic, inconsistent across browsers — a finding from the 2026-08-27 audit). AI-generated tests already get real MP3s via Edge TTS → Supabase Storage, and the player prefers `audioUrl`.
→ **Fix:** backfill MP3s for the 4 packaged tests with the same Edge-TTS pipeline (one-off script), keep `speechSynthesis` purely as offline fallback.

**F5. `vercel.json` `maxDuration: 60` vs the 1-Click generator (Deploy, low–medium)**
`api/generate-mock.js` makes many sequential model calls plus TTS plus uploads. It fits 60 s on a warm run, but a slow upstream can push it over on the Hobby plan (60 s ceiling).
→ **Fix:** either upgrade to Pro (300 s), or emit SSE progress + resume so a timeout doesn't lose a half-built mock. At minimum surface a clear "generation took too long — retry" error (client already handles 429/502 distinctly).

**F6. Service worker cache-key nuance (PWA, low)**
`sw.js` pre-caches plain paths (`/styles.css`) while `index.html` requests fingerprinted URLs (`/styles.css?v=13`). The network-first strategy self-heals after the first online visit, but the pre-cache entries and the `?v=` entries are stored as separate keys — duplicated storage (~2×) and a theoretical first-offline-visit miss.
→ **Fix:** use `caches.match(req, { ignoreSearch: true })` in the offline fallback, or drop the `?v=` query now that the SW versions caches via `bandly-v*` names.

**F7. Route-prefix matching in `server.js` (Cosmetic, low)**
`/api/grade.js`, `/api/gradeFoo` all route to the grade handler (returns 405/400, never leaks the file). Harmless, but exact-match routing (`url.pathname === '/api/grade'`) would be tidier and avoid surprising matches if a future route is a prefix of another (`/api/generate-mock` vs a hypothetical `/api/generate`).

### P3 — nice to have

- **F8.** The off-topic guardrail runs *after* the AI-key check in `api/grade.js` — without a key, off-topic requests see the config error instead of the IELTS refusal. Move the mode+guardrail validation before `isConfigured()` for consistency.
- **F9.** Analytics/monitoring are still absent (already listed in PREMIUM.md): Sentry + a tiny event table would catch real-world failures the Node tests can't.
- **F10.** Accessibility is good (skip-link, `aria-live` toast, `aria-current`, focus-visible, reduced-motion) but an automated axe-core pass in CI would lock it in.
- **F11.** Payments (Status B) intentionally remain off — re-confirm the "Free now" copy stays honest when Stripe/Payme lands.
- **F12.** `console.log('PWA service worker registered')` in `script.js` — harmless; demote to `console.debug`.

### Non-findings (checked, no action needed)

- No leaked secrets; `.env` patterns fully ignored; `public/` and bundles ignored.
- SQL injection — all DB access via Supabase SDK/RLS; migrations contain no string-interpolated user input.
- XSS — `esc()` on all user-controlled values (incl. `user.picture`, image URLs); DOMPurify sanitizes AI markdown; markdown test strips scripts/iframes/`javascript:` links.
- CORS — API is same-origin serverless; no wildcard `Access-Control-Allow-Origin` found.
- Band-score conversion table re-verified against content (40→9.0 … 23→6.0).
- Old criticals stay fixed: `/api/coach` exists and streams; writing tasks graded separately (T1×⅓ + T2×⅔); feedback persisted; Speaking Part-2 restart logic present; mistake-notebook dedup present.

---

## 5. History and file lineage

**File lineage disclosure (2026-10-11):** this report **replaced** the pre-existing
`AUDIT.md` (the August 2026 audit) during Task 01 — the original file was
overwritten in the working tree. Following review, the original August audit has
been **preserved separately, byte-for-byte, as `AUDIT-2026-08.md`** (recovered
from `git show HEAD:AUDIT.md`, git blob `6c71ccf`). Its content is unchanged —
do not edit it; update only this file going forward.

| Date | Rating | Notes |
|---|---|---|
| 2026-08-27 | 7.0 → 8.5 | *(now archived in `AUDIT-2026-08.md`)* AI Coach endpoint written, deploy config added, per-task writing grading, results page, lenient answer matching, timer persistence, SEO/footer, first tests. |
| 2026-08-28 | 8.5 | *(same archived file)* Premium polish pass: 5-link nav + dropdowns, background-timer fix, Speaking 120 s capture, lesson modal, Vercel `/api` rewrite guard, full i18n chrome. |
| Since | — | Supabase auth+RLS, admin panel, 1-Click generator, gamified 40-lesson roadmap with server-validated coins/streaks, leaderboard, streaming coach, guardrails + cache, delete-account, adaptive drills, 22 test suites. |
| **2026-10-11** | **9.0** | This audit. All 22 suites green, 0 vulnerabilities, live smoke tests pass. Remaining work = payload splitting, durable rate limits, CI browser tests, legacy MP3 backfill. |

## 6. Appendix: verification commands and results

Initial pass (2026-10-11, first run): `npm install`, `npm test` (exit 0, 22/22),
`npm audit` (0 vulns), `npm run build` (exit 0), live curl smoke tests on :3000,
`node --check` on every JS file, secret scan (clean).

Final verification re-run (same day, after `npm ci` — lockfile restore only):

| Command | Exit code | Result |
|---|---|---|
| `npm ci` | 0 | dependencies restored from lockfile; no package changes |
| `npm test` (22 suites) | **0** | all 22 suites pass |
| `npm run build` | **0** | bundles + `public/` (22 entries) generated; catalog validated |
| `node scripts/roadmap-seed.js --check` | **0** | 40 lessons / 200 quiz questions / 120 mini-games |
| `node --check` × all JS files | **0** | 0 failures across all 54 source files (31 app + 23 tests) — the 2 regenerated esbuild bundles also pass (56 with bundles) |
| `npm audit --package-lock-only` | **0** | `found 0 vulnerabilities` |
| `tests/learning.browser.test.js` (Playwright) | **not run** | browser binaries not installed in this environment; no install attempted — remains unverified here |
| Live-server curl smoke tests | **not re-run** | verified in the initial pass only; behaviors confirmed in source (see "Verification provenance") |

---

*Report generated by a full hands-on audit of `muhammadxoliqulov949-wq/IELTS-mock-v2` (branch `arena/1ccbb180-ielts-mock-v2`, base commit `4cc2237`); corrected and re-verified after independent review on the same date.*

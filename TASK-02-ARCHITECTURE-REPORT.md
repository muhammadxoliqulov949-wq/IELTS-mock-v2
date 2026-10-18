# TASK 02 — Architecture and Stability Audit (investigation only)

**Date:** 2026-10-11 · **Baseline:** `AUDIT.md` (October audit, rating 9.0) + `AUDIT-2026-08.md` (preserved original) · **Branch:** `arena/1ccbb180-ielts-mock-v2` @ `4cc2237`
**Method:** read-only source analysis of every API handler, shared lib, client module, build script and test suite; targeted grep evidence with file/line references; no code, config, dependency or data changes made; no fixes implemented in this task.

---

## 1. Architecture map

### 1.1 Entry points

| Entry | Role | Loads |
|---|---|---|
| `index.html` (92 lines) | Browser shell; 17 eager `<script src>` tags, 2 CSS files | content (`data.js`, `content2–4.js`) → `i18n.js` → `services.js` → bundles → `lib/learningPath.js`, `lib/roadmapContent.js`, `lib/adaptiveDrills.js`, `miniGames.js`, `script.js` → `lib/topicPool.js`, `lib/aiGuardrails.js` → `admin.js`, `mockGenerator.js` |
| `server.js` (165 lines) | Local preview server; mirrors Vercel routing | `api/*.js` handlers + `scripts/build.js` (`staticFiles` allow-list) |
| `api/grade.js` (290) | Writing/Speaking/sentence-transform grading | `lib/aiClient`, `lib/aiGuardrails`, `lib/aiCache` |
| `api/coach.js` (237) | AI Coach — JSON + SSE streaming | same 3 libs |
| `api/quiz.js` (103) | Quick quiz, AI + local fallback bank | same 3 libs |
| `api/generate-mock.js` (973) | 1-Click mock generator (section chunks + audio) | `lib/aiClient`, `lib/aiGuardrails`, `lib/edgeTts`, `lib/topicPool`; Supabase Storage REST |
| `api/delete-account.js` (158) | JWT-verified permanent deletion | `@supabase/supabase-js` |
| `api/config.js` (24) | Public env broker (Supabase URL+anon only) | none |
| `scripts/build.js` (37) | esbuild bundles + `public/` copy + seed validation | `scripts/roadmap-seed.js`, esbuild |
| `scripts/roadmap-seed.js` (~400) | Single source of truth for roadmap content; regenerates migration SQL + `lib/roadmapContent.js` | node stdlib only |
| `sw.js` (66) | PWA precache + network-first fetch | — |

### 1.2 Shared libraries

| Module | Consumers | Notes |
|---|---|---|
| `lib/aiClient.js` (781) | grade, coach, quiz, generate-mock | Multi-key Groq router → DeepSeek fallback; 120 s `AbortSignal.timeout` per request (lines 41-42, 313, 406); 429 retry policy with backoff + `Retry-After` honouring; streaming with delta frames. **Solid — no defect found.** |
| `lib/aiGuardrails.js` (179) | same + client bundle | Off-topic refusal, prompt cleaning, `withGuardrails` system wrapper |
| `lib/aiCache.js` (214) | grade, coach, quiz | 7-day TTL (Supabase `ai_cache`, service-role only) + 200-entry in-memory mirror; fail-open everywhere |
| `lib/edgeTts.js` (490) | generate-mock | Microsoft Edge TTS → MP3 buffer; no model key |
| `lib/topicPool.js` (214) | generate-mock + browser (`mockGenerator.js`) | 48-topic pool, deterministic plan builder (`buildPlan`) |
| `services.js` (249) | browser | `bandFromRaw` conversion, tolerant answer matching (`normalizeAnswer`, `toIndexList`, `withinWordLimit`, `isCorrect`) — heavily test-covered |
| `supabaseClient.js` (662) → `supabase.bundle.js` | browser | Auth (email+OTP, Google OAuth), profile cache with race guards, coin/streak RPC wrappers, mock-results sync |
| `lib/markdown.js` (67) → `markdown.bundle.js` | coach chat | marked + DOMPurify renderer, sanitisation tested |
| `lib/roadmapContent.js` (10 985 lines, **generated**) | browser | Public catalog; quiz keys stripped from public build |
| `lib/adaptiveDrills.js` (393) · `miniGames.js` (335) · `lib/learningPath.js` (81) · `lib/mockResults.js` (32) | browser | drills, games, day-plan, result persistence helpers |

### 1.3 Client core (`script.js`, 3 731 lines, 172 top-level functions)

- **Globals (lines 1-13):** `app`, `toast`, `CONTENT`, `SERVICES`, `I18N` (with inline stub fallback if `i18n.js` failed), `CLOUD` (nullable), `LEARNING`, `ADAPTIVE` (nullable), per-user `STORAGE` key namespacing via `storageKey()`.
- **State:** `store` (localStorage per user), `roadmapState`, `drillState`, module-level `timerInterval` / `drillTimer` / `sp2Timers[]` / `cloudSyncTimer` — all cleared before reassignment (lines 1136-1157, 1391, 2627-2915, 3557).
- **Boot:** single `hashchange → render` binding (line 3663); document listeners behind `docListenersBound` guard (line 1913); `registerPWA()` with `.catch()` (3647-3653); day-rollover refresh via focus/visibility/60 s interval (3718-3730); admin seam via `window.IELTS_ADMIN_HOOKS` (3657-3659).
- **API routes:** `/api/grade`, `/api/coach`, `/api/quiz`, `/api/generate-mock`, `/api/delete-account`, `/api/config` (all POST JSON or GET, Vercel functions, `maxDuration: 60`).

### 1.4 Provisioning chain (important dependency)

```
scripts/roadmap-seed.js ── generates (WRITE) ──► lib/roadmapContent.js          (tracked!)
                                              └─► supabase/migrations/202610060003_interactive_learning.sql (tracked!)
npm run build ──► esbuild ──► supabase.bundle.js + markdown.bundle.js ──► public/ (22 files) ──► Vercel outputDirectory
```

Seed generation is deterministic (no `Math.random`/`Date` in the seed script), which is why the working tree stays clean after builds today — verified: `git status` shows only the audit-file changes after a full build.

---

## 2. Findings

Severity scale: **P0** = breaks/exposes now, **P1** = should fix before wider release, **P2** = quality/stability improvement, **P3** = optional polish. Each item: evidence → risk → minimal fix → regression risk → tests.

---

### P1-1 · `/api/generate-mock` spends AI/TTS quota with **no server-side authorization** — *confirmed defect*

**Evidence:** `api/generate-mock.js:780` (handler start) — mode dispatch happens after only `rateLimited()` (limit 120/min/IP, line 17-86); the **section** path calls `generateChunk`/`generateSkill` (lines 884-917) and the **audio** path calls `tts.synthesize` (lines 794-800) with **no token check**. `accessTokenFrom()`/Storage upload (lines 745-776) uses the admin's token only for the Storage write, and a rejection there *still returns the audio bytes to anyone* (lines 815-828 "fall back to returning the bytes"). Client confirms the gap: `mockGenerator.js:557,618` POST section requests with only `Content-Type` — no `Authorization` header (token is fetched only for audio uploads, line 624). Docs promise admin-only use (ADMIN.md §4.5).
**Risk:** any internet caller can burn Groq free-tier quota and Edge TTS traffic at up to 120 req/min/IP; contradicts the admin-only feature promise. Guardrails/cache limit the *kind* of content, not the *cost*.
**Minimal fix:** mirror the `api/delete-account.js:118-135` pattern — require `Authorization: Bearer`, verify via `auth.getUser(token)`, then check `profiles.role === 'admin'` (one extra read) before any generation; 401/403 otherwise. Attach the header in `mockGenerator.js` section calls. Decide a documented fail-open/fail-closed policy for local preview when Supabase is unconfigured (recommended: refuse with a clear message — generation without a configured backend is useless anyway).
**Regression risk:** `tests/generator.test.js` invokes the handler directly with unauthenticated `req(...)` stubs (lines 346, 351, 359, 410, 494) — these must gain token stubs and the handler's Supabase call must be mockable (same approach as `tests/deleteAccount.test.js`). `mockGenerator.js` client calling changes are covered by `tests/generatorClient.test.js` + `tests/admin.test.js`.
**Tests required:** updated generator suite (401/403 paths + happy path with mocked admin), generatorClient suite, full `npm test`.

### P1-2 · Eager payload — 17 scripts for every visitor — *confirmed, safe opportunity (originally AUDIT.md F1)*

**Evidence:** `index.html:71-87`; `lib/roadmapContent.js` 309 683 B, `admin.js` 81 986 B, `mockGenerator.js` 38 057 B; measured eager text ≈ 1.3 MB raw / 294 KB gz (without bundles).
**Risk:** slower first paint/parse on mobile; admin-only code shipped to everyone (attack surface visibility, not a leak). This is a performance opportunity, **not a defect** — no unmeasured gains are claimed.
**Minimal fix (staged, smallest first):** (a) dynamically inject `admin.js` + `mockGenerator.js` at the `#/admin` route after the role check — the seam already exists (`window.IELTS_ADMIN_HOOKS`, late-bound usage); (b) optionally lazy-load `roadmapContent.js`+`miniGames.js`+`adaptiveDrills.js` for `#/roadmap`/`#/drills`; (c) keep everything else eager initially. No bundler change needed.
**Regression risk:** script-load order assumptions (services/globals), SW precache coverage for newly dynamic files, `boot.test.js` route assertions, `admin.test.js` and `learning.test.js` expectations. SW must cache lazily-loaded files on first fetch (its network-first strategy already does).
**Tests required:** boot, nav, admin, learning, flow suites + manual preview click-through; PWA offline smoke for lazily-loaded files.

### P1-3 · Rate limiter duplicated in 5 files, per-instance only — *confirmed task-01 finding, fix is safe*

**Evidence:** `ipHits`+`clientIp`+`rateLimited` copies in `api/grade.js:17-34`, `api/coach.js:17-34`, `api/quiz.js:17-33`, `api/delete-account.js:56-73`, `api/generate-mock.js:70-88` (each with identical `x-forwarded-for` trust).
**Risk:** maintenance drift (limits/config differ per copy); on Vercel the limit resets per cold start — documented behavior, not a bug.
**Minimal fix:** extract `lib/rateLimit.js` exporting `{ clientIp, makeLimiter({windowMs, max}) }`; replace the 5 copies. No behavior change intended (same numbers per endpoint).
**Regression risk:** limits change accidentally during extraction → rate-limit behaviors are pinned by `tests/api.test.js`, `tests/deleteAccount.test.js`, `tests/quiz.test.js` and generator/streaming suites (distinct-IP patterns like `'10.0.0.x'` in `tests/generator.test.js:410,494`).
**Tests required:** api, quiz, deleteAccount, generator, streaming suites; full `npm test`.

### P1-4 · Playwright browser suite outside `npm test`; no CI at all — *confirmed*

**Evidence:** `package.json` `test` chain = 22 commands, excludes `tests/learning.browser.test.js`; zero workflow files (no `.github/` verified); browser binaries absent locally.
**Risk:** DOM-real regressions in learning pages can land unnoticed; no automated gate on PRs.
**Minimal fix:** add a single CI workflow running `npm ci && npm test`; add the browser suite as a separate job with `npx playwright install --with-deps chromium`. No source change.
**Regression risk:** flaky browser timing in CI → keep as separate, initially non-blocking job.
**Tests required:** the suites themselves; verify log output in CI.

---

### P2-1 · Build writes two **tracked** files every run — *confirmed, deterministic today*

**Evidence:** `scripts/build.js:9` calls `roadmap-seed.generate(true)`; `scripts/roadmap-seed.js:384-397` does `fs.writeFileSync` to `lib/roadmapContent.js` **and** `supabase/migrations/202610060003_interactive_learning.sql` on every build.
**Risk:** if any nondeterminism ever enters the seed (dates, randomised content, locale-dependent sorts), every `npm run build`/Vercel deploy silently produces artifacts that differ from the committed tree — invisible drift between repo and production.
**Minimal fix:** add a post-build verification: run `node scripts/roadmap-seed.js --check` (exists, exit-0 verified) plus, in CI, `git diff --exit-code -- lib/roadmapContent.js supabase/migrations/` after build to fail on drift. No behavior change.
**Tests required:** build + seed check commands; none new.

### P2-2 · API response shapes are inconsistent — *confirmed, low risk; Do NOT normalise without cause*

**Evidence:** `api/quiz.js:99` returns `res.json({ ok:true, source, questions })` (relies on the shim's default 200); `api/grade.js` errors as `{ error }` without `ok`; `api/coach.js` streams SSE or `{ reply }`; `api/delete-account.js` uses `{ ok:true, deleted, cleared, warnings }`; `api/generate-mock.js` adds bilingual `error`/`message`/`hint`/`code`.
**Risk:** client-side error handling branches per endpoint; new endpoints copy whichever shape is nearest.
**Minimal fix:** **documentation only** — write the contract of each endpoint into the README/API comment blocks. Only standardise shapes when touching an endpoint for another reason, and keep backwards-compatible fields (tests pin current shapes).
**Tests required:** api, quiz, deleteAccount, generator suites (they assert exact shapes today).

### P2-3 · Service Worker precache vs `?v=` fingerprint mismatch — *confirmed (AUDIT.md F6)*

**Evidence:** `sw.js:3-32` precaches plain paths; `index.html` requests `styles.css?v=13`, `script.js?v=14`, etc. Cache keys differ → duplicated storage; offline match relies on prior online visits.
**Minimal fix:** `caches.match(req, { ignoreSearch: true })` in the offline fallback + keep precache list as is.
**Tests required:** none exist for SW behaviour — add a lightweight node test reading `sw.js` to assert `ignoreSearch` usage + precache/path parity with `index.html` tags (same textual style as `tests/mascot.test.js`).

### P2-4 · Toast timer stacking — *minor confirmed defect (cosmetic)*

**Evidence:** `script.js:274` — `notify()` schedules a new `setTimeout(…, 2400)` per call without clearing the previous one; rapid notifications let an older timeout hide the newest toast early.
**Minimal fix:** module-level `toastTimer`, `clearTimeout` before scheduling. One line of state.
**Regression risk:** none beyond toast timing; no test asserts timers currently.
**Tests required:** existing nav/boot suites (they touch `notify` paths).

### P2-5 · Vercel 60 s cap (`vercel.json:22`) vs generator — *mostly mitigated already; verify rather than assume*

**Evidence:** `vercel.json` `maxDuration: 60` applies to all `api/*.js`. The generator was re-architected since task-01's note: the admin modal requests **one section chunk per HTTP call** (`api/generate-mock.js:28-44` comment, chunk path lines 884-899) with a 4 096-token budget per call; audio is a separate call. Per-request durations therefore fit 60 s on a warm run.
**Risk:** a cold Edge-TTS or slow Groq chunk can still approach the ceiling on Hobby.
**Minimal fix:** none immediate; monitor after the P1-1 auth fix. If needed, per-route `maxDuration` config or Pro plan.
**Tests required:** generator tests already exercise per-chunk calls; add a timing assertion only if flakiness appears in production.

### P3-1 · `console.log` in production path — `script.js:3649` → `console.debug`. Optional, zero risk.

### P3-2 · Tolerant-JSON parsing duplicated three ways — `api/grade.js:43-59`, `api/generate-mock.js:98-110`, inline in `api/quiz.js:57-58` → optional `lib/parseJson.js` with a tiny unit test; do together with P1-2 limiter extraction to keep review small.

---

## 3. Verified strengths (do not refactor)

These were inspected for this audit and are **sound** — touching them adds regression risk without benefit:

1. **`lib/aiClient.js`** — timeouts (120 s, `AbortSignal.timeout`), 429 retry/backoff with `Retry-After`, multi-key failover, streaming frame discipline; extensively pinned by `tests/aiClient.test.js` + `tests/streaming.test.js`.
2. **Profile-cache race guards** — `supabaseClient.js:131-157` uses owner/revision/task-identity guards; out-of-order wallet responses handled (learning tests).
3. **Document-listener single-binding** — `docListenersBound` guard (`script.js:1913`); `hashchange` bound once (3663); per-render timer cleanup (1136-1157).
4. **Graceful degradation seams** — `I18N` inline stub (`script.js:5`), nullable `CLOUD`/`LEARNING`/`ADAPTIVE` (7-9), `audioUrl?` → `speechSynthesis` fallback (1189-1206), quiz local bank, aiCache fail-open.
5. **Seed determinism** — build leaves the tree clean (verified this session via git diff after full build).
6. **`render()` focus-preservation** (3396-3414) — handles the frequent re-render sources (focus/visibility/60 s day-rollover interval) without stealing focus mid-game. **Fragile zone:** any change here needs learning + mascot + nav suites green.
7. **Test isolation** — per-process isolation (`node file && node file`), distinct test IPs for limiter paths, mocked fetch/Supabase; no shared db state between suites (pglite is per-suite).

---

## 4. Regression-risk map (which suites guard which area)

| Future change | Must-pass suites |
|---|---|
| `api/generate-mock.js` auth + client headers (P1-1) | generator, generatorClient, admin, aiGuardrails, streaming (shared aiClient), full `npm test` |
| Route-based lazy loading (P1-2) | boot, nav, admin, learning, flow, mascot + PWA smoke (manual) |
| `lib/rateLimit.js` extraction (P1-3) | api, quiz, deleteAccount, generator, streaming |
| CI workflow (P1-4) | all (in CI) + browser job |
| Build/seed guard (P2-1) | build + `seed:roadmap:check` + learning, roadmap |
| SW fix (P2-3) | boot (wiring text), new SW unit test, manual offline |
| Toast timer (P2-4) | nav, boot, mascot |
| `lib/parseJson.js` (P3-2) | api, quiz, generator, aiGuardrails |
| Anything in `script.js:3396-3414` (render/focus) | learning, mascot, nav, flow, boot |
| Answer-matching/scoring (`services.js`) | premium, flow, test3, test4, admin |

**Baseline commands to re-run after any change:** `npm test` · `npm run build` · `node scripts/roadmap-seed.js --check` · `npm audit --package-lock-only` · `node --check` on every changed file · (when available) `npm run test:learning:browser`. All exit 0 as of this report (browser suite excluded — see §6).

---

## 5. Proposed implementation sequence (for Task 03 approval — **not started**)

Small, independently verifiable subtasks, ordered by risk-adjusted value:

| # | Subtask | Addresses | Type | Verification gate |
|---|---|---|---|---|
| 2.1 | Require admin JWT on `/api/generate-mock` (section+audio) + attach header in `mockGenerator.js` + update generator/client tests | P1-1 | **fix — confirmed problem** | generator, generatorClient, admin suites |
| 2.2 | Extract `lib/rateLimit.js`; adopt in 5 endpoints (identical limits) | P1-3 | fix — confirmed problem (maintenance/security robustness) | api, quiz, deleteAccount, streaming, generator |
| 2.3 | Add CI workflow (`npm ci`, `npm test`; browser job non-blocking) | P1-4 | optional but recommended | CI run log |
| 2.4 | Lazy-load `admin.js`+`mockGenerator.js` on `#/admin` only | P1-2 (part a) | optional improvement | boot, nav, admin + preview click-through |
| 2.5 | Post-build drift guard (`--check` + CI `git diff --exit-code`) | P2-1 | optional improvement | CI run log |
| 2.6 | SW `ignoreSearch` fallback + small SW unit test | P2-3 | fix — minor confirmed defect | boot + new test |
| 2.7 | Toast `clearTimeout` guard | P2-4 | fix — minor confirmed defect | nav, boot |
| 2.8 | API shape documentation (no code change) | P2-2 | optional documentation | review only |
| 2.9 | `lib/parseJson.js` extraction | P3-2 | optional | api, quiz, generator |
| 2.10 | `console.log`→`console.debug` (PWA line) | P3-1 | optional | boot |

Subtasks 2.1-2.2 address **confirmed problems**; 2.6-2.7 are minor confirmed defects; the rest are explicitly **optional improvements**. Only 2.1 changes an API contract (by design, with tests updated).

---

## 6. Areas that cannot be verified in this environment

1. Live Supabase project (RLS policies, RPCs, Storage rules) — unit-tested only via pglite/mocks.
2. Live Groq/DeepSeek/Edge-TTS behaviour and production rate limits.
3. Vercel multi-instance behaviour of the in-memory limiters; real cold-start timings.
4. Playwright browser suite — binaries absent (`~/.cache/ms-playwright` missing); not installed per task rules.
5. Real-browser Service Worker cache behaviour (source analysis only).
6. Band-score accuracy of AI grading against certified examiners (prompt-design quality, untestable here).

---

## Summary

One **P1 confirmed defect**: the 1-Click generator endpoint performs unauthenticated AI/TTS spend (needs the delete-account-style admin JWT check; bounded regression surface — its own test file). Three further P1 items are **safe improvements**: extract the 5× duplicated rate limiter, lazy-load the admin bundle (existing seam), and add CI. P2/P3 items are minor, isolated, and test-covered. No rewrites proposed; no module is unhealthy enough to justify one. Seven load-bearing areas (AI client, auth race guards, listener discipline, degradation seams, seed determinism, render focus handling, test isolation) are verified sound and should be left alone.

---

### Task closure record

- **Git status at delivery:** `M AUDIT.md` · `?? AUDIT-2026-08.md` · `?? TASK-02-ARCHITECTURE-REPORT.md` (this file). No source/config/dependency/migration/deployment file modified.
- **Files changed in Task 02:** only this report was created. Both audit baselines preserved (`AUDIT-2026-08.md` re-verified byte-identical to `git show HEAD:AUDIT.md` at investigation start).
- **Decision:** `TASK 02 INVESTIGATION COMPLETE` — awaiting approval before any implementation (Subtasks 2.1+).

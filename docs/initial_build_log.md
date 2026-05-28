# Initial Build Log

Date: 2026-05-28

## Repository Handoff

- GitHub: https://github.com/LovRanRan/applyos
- Branch: `main`
- Initial MVP commit: `812f7ed` (`Initial ApplyOS full-stack MVP`)
- Deployment status: Railway deployment intentionally paused after repo push.
- API key status: no real key committed; `.env.example` and `.env.local.example` use placeholders only.
- Local browser verification screenshot: `/private/tmp/applyos-browser-verified.png`

## Railway Deployment Notes

- Deploy this repository as two Railway services, not one root service.
- Backend service root directory: `backend`.
- Frontend service root directory: `frontend`.
- Both service Dockerfiles use Railway's `$PORT` with local fallbacks.
- If Railway builds from the repository root, the build will fail because the repo root intentionally does not contain a single full-stack Dockerfile.

## Railway Deployment Result

Date: 2026-05-29

- Backend service: https://applyos-production-1e77.up.railway.app
- Frontend service: https://steadfast-compassion-production-efdc.up.railway.app
- Backend root directory: `/backend`
- Frontend root directory: `/frontend`
- Backend CORS origin: `https://steadfast-compassion-production-efdc.up.railway.app`
- Health check: `GET /health` returned `{"status":"ok"}`.
- CORS preflight: `OPTIONS /auth/register` from the frontend origin returned `200`.
- API smoke test: register -> create job -> analyze returned `source=openai_augmented`, confirming the Railway `OPENAI_API_KEY` path works.

## Frontend API Proxy Fix

Date: 2026-05-29

- Problem: the browser bundle still contained `http://localhost:8000`, because `NEXT_PUBLIC_API_BASE_URL` is a build-time value in Next.js.
- Fix: frontend API calls now target same-origin `/api/backend/...`.
- Runtime forwarding: Next route handler `app/api/backend/[...path]/route.ts` forwards requests to `BACKEND_API_BASE_URL`, with `NEXT_PUBLIC_API_BASE_URL` kept only as a compatibility fallback.
- Railway frontend variable after this fix: `BACKEND_API_BASE_URL=https://applyos-production-1e77.up.railway.app`.

## V1.1 Workflow Gap Fix

Date: 2026-05-29

- Added resume text asset upload through `POST /resumes`; frontend supports `.txt` / `.md` files and pasted resume bullets.
- Added daily curated role suggestions through `GET /daily/suggestions`.
- Added one-click tracker intake through `POST /daily/suggestions/{suggestion_id}/add`.
- Kept the safety boundary: suggestions are curated starter data, not live scraping or auto-apply automation.
- Verification: `uv run ruff check .`, `uv run mypy app tests`, `uv run pytest`, `npm run typecheck`, and `npm run build`.

## V2 Interaction Redesign

Date: 2026-05-29

- Rebuilt the frontend into a command-center layout: daily matches, JD workbench, profile inputs, resume vault, tech-stack analytics, today actions, referral contact, and tracker records.
- Daily matches now include real JD links, explicit match scores, matched skill tags, missing/risk tags, recommended resume version, and visible Add / Added button state.
- Added profile/resume-aware matching service shared by daily suggestions and analytics.
- Added `GET /analytics/tech-stack` to count repeated technologies across saved jobs and power the frontend bar chart.
- One-click Add now creates a pre-scored job, updates tracker metrics, refreshes daily match state, and immediately updates tech-stack analytics.
- Browser smoke test: register -> refresh daily matches -> Add Anthropic role -> Total jobs/Ready metrics update -> Add button becomes Added -> tech-stack chart appears.
- Verification: `uv run ruff check .`, `uv run mypy app tests`, `uv run pytest`, `npm run typecheck`, and `npm run build`.

## V2 Railway Deploy Verification

Date: 2026-05-29

- Commit pushed: `040a6d9` (`Build ApplyOS V2 dashboard`).
- Frontend V2 cache-busted page check: `https://applyos.up.railway.app/?v=040a6d9` renders `ApplyOS V2`.
- Backend proxy check: `GET /api/backend/analytics/tech-stack` returns authenticated-route `401` without a token, confirming the new analytics route is deployed.
- Online smoke test through the deployed frontend proxy: register -> save profile -> get 4 daily suggestions -> first suggestion score `98` -> one-click add Anthropic role -> analytics returns top terms `AWS`, `Backend APIs`, `Evals`, `LLM Agents`.
- Note: the bare `/` route may remain edge-cached briefly; use hard refresh or a cache-busted URL immediately after deployment.

## V2 Tabbed Workspace Fix

Date: 2026-05-29

- Problem: V2 command center still packed daily matches, workbench, profile, resume, analytics, referral, and tracker into one crowded screen.
- Fix: introduced a top-level tab workspace: `Daily Matches`, `JD Workbench`, `Profile & Resume`, `Analytics`, and `Outreach & Tracker`.
- The metrics bar and status notice stay global; detailed panels only render inside the active tab.
- Browser smoke test: register -> confirm tabs render -> switch JD Workbench / Profile & Resume / Analytics and verify unrelated panels are not visible.
- Verification: `npm run build`; `npm run typecheck`.

## V2 Agent Interaction Upgrade

Date: 2026-05-29

- Added a dedicated `Agent Brief` tab so ApplyOS can summarize current priorities, observations, recommended actions, and recent agent activity instead of only returning a score.
- Added `Ask ApplyOS`, a job-aware chat surface for fit, referral timing, resume gaps, and next actions.
- Added `Resume Gap Agent`, which compares selected JD terms against saved resume/profile evidence and suggests truthful edits only.
- `Save + Analyze` now creates the job and immediately generates the decision package.
- Profile save now has loading/success feedback and then locks into a read-only profile card; the user must click `Edit Profile` before changing matching inputs.
- All primary actions now have visible busy/success states: login, register, refresh, save profile, upload resume, save job, analyze, resume gap, save contact, and draft message.
- Browser smoke test: login -> Agent Brief loads -> Profile save locks read-only view -> Daily Match Add opens workbench -> Resume Gap runs -> Ask ApplyOS returns referral next actions.
- Verification: `uv run ruff check .`, `uv run mypy app tests`, `uv run pytest`, `npm run build`, and `npm run typecheck`.

## Scope

Built the first ApplyOS full-stack MVP and stopped before Railway deployment.

## Implemented

- Backend FastAPI app with auth, profile, jobs, contacts, applications, outreach, dashboard, and agent endpoints.
- SQLite persistence through SQLAlchemy.
- Per-user protected routes using bearer tokens.
- Deterministic Application Decision Agent fallback.
- Optional OpenAI augmentation path guarded by placeholder `OPENAI_API_KEY`.
- Next.js frontend with login/register, JD intake, selected-job analysis, decision package, daily actions, referral contact form, outreach draft generation, and summary tables.
- V1.1 additions: resume upload, daily role push, and one-click add to tracker.
- V2 additions: command-center UI, profile-aware daily match scoring, explicit Add feedback, JD links, and tech-stack analytics.
- Root setup docs, backend/frontend env examples, Dockerfiles, and Docker Compose draft.

## Agent Boundary

The MVP prepares decisions and drafts only. It does not auto-submit applications, auto-send messages, or auto-answer visa/work authorization questions.

## Verification

Backend:

- `uv run ruff check .`
- `uv run mypy app tests`
- `uv run pytest`

Frontend:

- `npm run typecheck`
- `npm run build`
- Browser smoke tests:
  - `next start`: register -> save job -> analyze -> save contact -> generate draft.
  - V2 local app: register -> refresh daily matches -> Add suggested role -> metrics and tech-stack chart refresh.

Observed local dev limitation:

- `npm run dev` hit Next/Watchpack `EMFILE` watcher limits in this large Codex workspace and returned 404 in dev mode.
- Production `npm run build` + `npm run start` served the app correctly and passed the browser workflow.

## Known Follow-Ups

- Replace SQLite with Postgres before production Railway use.
- Add Alembic migrations before schema changes become frequent.
- Add real OpenAI structured output once the user provides a real key.
- Add application-detail page and editable decision packages.
- Add saved daily job discovery sources.
- Add Railway services and environment variables in the next session.
- Recheck the current Next/PostCSS npm audit warning before production deploy.

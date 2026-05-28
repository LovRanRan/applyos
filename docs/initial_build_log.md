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

## Scope

Built the first ApplyOS full-stack MVP and stopped before Railway deployment.

## Implemented

- Backend FastAPI app with auth, profile, jobs, contacts, applications, outreach, dashboard, and agent endpoints.
- SQLite persistence through SQLAlchemy.
- Per-user protected routes using bearer tokens.
- Deterministic Application Decision Agent fallback.
- Optional OpenAI augmentation path guarded by placeholder `OPENAI_API_KEY`.
- Next.js frontend with login/register, JD intake, selected-job analysis, decision package, daily actions, referral contact form, outreach draft generation, and summary tables.
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
- Browser smoke test on `next start`: register -> save job -> analyze -> save contact -> generate draft.

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

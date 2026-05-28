# ApplyOS

ApplyOS is a login-based AI job-search CRM and Application Decision Agent for international new grad candidates.

It does not automate spam. It automates judgment: JD parsing, fit scoring, resume-version recommendation, referral/contact planning, outreach drafting for manual review, application tracking, and follow-up reminders.

## Current MVP

- FastAPI backend with SQLite persistence.
- HMAC-signed bearer auth and per-user data isolation.
- Profile, jobs, contacts, applications, outreach messages, dashboard, and agent endpoints.
- Deterministic fallback decision agent that works without an API key.
- Optional OpenAI augmentation when `OPENAI_API_KEY` is replaced with a real key.
- Next.js frontend for daily job decisions, JD intake, decision packages, referral contacts, outreach drafts, and action queues.

## Safety Boundary

ApplyOS does not:

- log into LinkedIn;
- send LinkedIn/email messages automatically;
- submit applications automatically;
- answer visa, sponsorship, education, or experience questions automatically;
- bypass platform restrictions;
- fabricate candidate claims.

The product prepares a reviewed decision package. Haichuan manually sends and submits.

## Local Setup

Backend:

```bash
cd backend
uv sync --group dev
cp .env.example .env.local
uv run uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install --cache /private/tmp/applyos-npm-cache
cp .env.local.example .env.local
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

`npm run dev` is available for ordinary local development, but this Codex workspace hit
Next/Watchpack `EMFILE` watcher limits because the project sits under a large parent
directory. The production build/start path above is the verified local path for this
initial commit.

## Environment

Backend placeholder:

```bash
OPENAI_API_KEY=replace-with-your-openai-api-key
```

The placeholder is intentional. With the placeholder, the backend uses deterministic fallback scoring. Replace it locally or in Railway when you want live OpenAI augmentation.

## Verification

Backend:

```bash
cd backend
uv run ruff check .
uv run mypy app tests
uv run pytest
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

Browser smoke test covered: register -> save job -> analyze -> save contact -> generate draft.

## Railway Later

Railway deployment uses two services from this monorepo. Railway looks for a `Dockerfile` at the root of each service's source directory, so each service must set its own root directory.

Backend service:

```text
Service root directory: backend
Dockerfile path: Dockerfile
```

Backend variables:

```env
OPENAI_API_KEY=replace-with-your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
APP_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app
```

Frontend service:

```text
Service root directory: frontend
Dockerfile path: Dockerfile
```

Frontend variables:

```env
BACKEND_API_BASE_URL=https://your-backend-domain.up.railway.app
```

The frontend calls its own `/api/backend/...` proxy route, and that server-side route forwards requests to `BACKEND_API_BASE_URL`. This avoids baking public API URLs into the browser bundle during `next build`.

Both Dockerfiles bind to `0.0.0.0` and use Railway's `$PORT`, with local fallbacks for development.

Before production deployment, recheck the current Next/PostCSS npm audit warning and upgrade once a patched compatible Next release is available.

# ApplyOS Backend

FastAPI backend for ApplyOS. It stores job-search data in SQLite by default and exposes agent endpoints for JD parsing, fit scoring, resume selection, outreach drafting, and daily actions.

## Local Setup

```bash
uv sync --group dev
cp .env.example .env.local
uv run uvicorn app.main:app --reload --port 8000
```

`OPENAI_API_KEY` can stay as the placeholder during local development. The app falls back to deterministic scoring and drafting when no real key is configured.

## Verification

```bash
uv run ruff check .
uv run mypy app tests
uv run pytest
```

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.models import DailyJobSuggestion, JobCreate, JobRead
from app.services.crud import create_job
from app.services.serializers import job_to_read

router = APIRouter(prefix="/daily", tags=["daily"])

SUGGESTIONS = [
    DailyJobSuggestion(
        id="anthropic-fde-ng",
        company="Anthropic",
        title="Forward Deployed AI Engineer, New Grad",
        location="San Francisco / New York / Remote US",
        job_url="https://www.anthropic.com/careers",
        suggested_resume="AI Agent Engineer resume",
        score_hint="High: agent workflows, evals, retrieval, customer-facing engineering",
        reason="Best fit for Wayfinder + MCP toolkit + agent evaluation story.",
        jd_text=(
            "Early-career Forward Deployed AI Engineer building reliable LLM-powered "
            "workflows with tool calling, retrieval, evals, Python APIs, TypeScript, SQL, "
            "cloud deployment, and backend services. Work authorization reviewed case by case."
        ),
    ),
    DailyJobSuggestion(
        id="databricks-swe-ng",
        company="Databricks",
        title="Software Engineer, New Grad - Backend Platform",
        location="United States",
        job_url="https://www.databricks.com/company/careers",
        suggested_resume="Backend SDE resume",
        score_hint="High: Python, distributed systems, SQL, cloud platform",
        reason="Good backend/platform match and strong brand signal for data infrastructure.",
        jd_text=(
            "New grad software engineer role focused on Python, backend APIs, distributed "
            "systems, SQL, reliability, cloud infrastructure, and developer experience. "
            "Early career candidates are encouraged to apply."
        ),
    ),
    DailyJobSuggestion(
        id="cursor-ai-infra",
        company="Cursor",
        title="AI Infrastructure Engineer",
        location="New York / San Francisco",
        job_url="https://www.cursor.com/careers",
        suggested_resume="AI Agent Engineer resume",
        score_hint="Medium-high: developer tools, LLM infrastructure, codebase workflows",
        reason="Strong thematic connection to codebase onboarding and agentic developer tools.",
        jd_text=(
            "Build AI developer tools and infrastructure for coding agents. Work across "
            "LLM APIs, retrieval, code understanding, evals, TypeScript, Python services, "
            "observability, and production backend systems."
        ),
    ),
]


@router.get("/suggestions", response_model=list[DailyJobSuggestion])
def list_suggestions(_: User = Depends(current_user)) -> list[DailyJobSuggestion]:
    return SUGGESTIONS


@router.post(
    "/suggestions/{suggestion_id}/add",
    response_model=JobRead,
    status_code=status.HTTP_201_CREATED,
)
def add_suggestion(
    suggestion_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    suggestion = next((item for item in SUGGESTIONS if item.id == suggestion_id), None)
    if suggestion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")
    job = create_job(
        db,
        user,
        JobCreate(
            company=suggestion.company,
            title=suggestion.title,
            location=suggestion.location,
            job_url=suggestion.job_url,
            source="daily suggestion",
            jd_text=suggestion.jd_text,
            notes=f"{suggestion.reason} Suggested resume: {suggestion.suggested_resume}.",
        ),
    )
    return job_to_read(job)

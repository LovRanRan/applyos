from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Job, Profile, ResumeAsset, User
from app.db.session import get_db
from app.schemas.models import DailyJobSuggestion, JobCreate, JobRead
from app.services.crud import create_job
from app.services.matching import extract_terms, pick_resume_version, score_against_context
from app.services.serializers import from_json, job_to_read, to_json

router = APIRouter(prefix="/daily", tags=["daily"])


@dataclass(frozen=True)
class SuggestionSeed:
    id: str
    company: str
    title: str
    location: str
    job_url: str
    reason: str
    jd_text: str


SUGGESTIONS = [
    SuggestionSeed(
        id="anthropic-fde-ng",
        company="Anthropic",
        title="Forward Deployed AI Engineer, New Grad",
        location="San Francisco / New York / Remote US",
        job_url="https://www.anthropic.com/careers",
        reason="Agent workflow + eval + customer-facing engineering match.",
        jd_text=(
            "Early-career Forward Deployed AI Engineer building reliable LLM-powered "
            "workflows with tool calling, retrieval, evals, Python APIs, TypeScript, SQL, "
            "cloud deployment, and backend services. Work authorization reviewed case by case."
        ),
    ),
    SuggestionSeed(
        id="databricks-swe-ng",
        company="Databricks",
        title="Software Engineer, New Grad - Backend Platform",
        location="United States",
        job_url="https://www.databricks.com/company/careers",
        reason="Backend platform role with data infrastructure brand signal.",
        jd_text=(
            "New grad software engineer role focused on Python, backend APIs, distributed "
            "systems, SQL, reliability, cloud infrastructure, and developer experience. "
            "Early career candidates are encouraged to apply."
        ),
    ),
    SuggestionSeed(
        id="cursor-ai-infra",
        company="Cursor",
        title="AI Infrastructure Engineer",
        location="New York / San Francisco",
        job_url="https://www.cursor.com/careers",
        reason="Codebase onboarding and AI developer tooling connection.",
        jd_text=(
            "Build AI developer tools and infrastructure for coding agents. Work across "
            "LLM APIs, retrieval, code understanding, evals, TypeScript, Python services, "
            "observability, and production backend systems."
        ),
    ),
    SuggestionSeed(
        id="langchain-agent-platform",
        company="LangChain",
        title="Software Engineer, Agent Platform",
        location="New York / Remote US",
        job_url="https://www.langchain.com/careers",
        reason="Direct fit for agent orchestration, evals, and production LLM apps.",
        jd_text=(
            "Build production agent platform features with Python, TypeScript, LangGraph, "
            "tool calling, observability, evaluations, backend APIs, and cloud deployment."
        ),
    ),
]

DEFAULT_CONTEXT = (
    "AI Agent Engineer Backend SDE Applied AI Engineer Python FastAPI TypeScript RAG "
    "LLM Agents MCP AWS SQL Wayfinder MCP Codebase Intelligence Toolkit Agent-Eval-Harness "
    "USC MS Analytics Dec 2026 F-1 OPT STEM OPT H-1B friendly employers"
)
DEFAULT_RESUME_VERSIONS = [
    "AI Agent Engineer resume",
    "Backend SDE resume",
    "Data / ML / RAG resume",
]
DEFAULT_CORE_PROJECTS = [
    "Wayfinder",
    "MCP Codebase Intelligence Toolkit",
    "Agent-Eval-Harness",
]


def _profile_context(db: Session, user: User) -> tuple[str, list[str], list[str]]:
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    resumes = (
        db.query(ResumeAsset)
        .filter(ResumeAsset.user_id == user.id)
        .order_by(ResumeAsset.updated_at.desc())
        .limit(3)
        .all()
    )
    if profile is None:
        resume_context = " ".join(resume.content for resume in resumes)
        return (
            f"{DEFAULT_CONTEXT} {resume_context}",
            DEFAULT_RESUME_VERSIONS,
            DEFAULT_CORE_PROJECTS,
        )

    target_roles: list[str] = from_json(profile.target_roles, [])
    preferred_locations: list[str] = from_json(profile.preferred_locations, [])
    resume_versions: list[str] = from_json(profile.resume_versions, [])
    core_projects: list[str] = from_json(profile.core_projects, [])
    skills: list[str] = from_json(profile.skills, [])
    text_parts = [
        " ".join(target_roles),
        " ".join(preferred_locations),
        " ".join(core_projects),
        " ".join(skills),
        profile.visa_status or "",
        profile.graduation_date or "",
        profile.notes or "",
        " ".join(resume.content for resume in resumes),
    ]
    return " ".join(text_parts), resume_versions, core_projects


def _already_added(db: Session, user: User, seed: SuggestionSeed) -> bool:
    return (
        db.query(Job)
        .filter(
            Job.user_id == user.id,
            Job.company == seed.company,
            Job.title == seed.title,
        )
        .one_or_none()
        is not None
    )


def _to_suggestion(
    seed: SuggestionSeed,
    context_text: str,
    resume_versions: list[str],
    db: Session,
    user: User,
) -> DailyJobSuggestion:
    match = score_against_context(seed.jd_text, context_text)
    suggested_resume = pick_resume_version(seed.jd_text, resume_versions)
    query_terms = " ".join((match.matched_terms or extract_terms(seed.jd_text))[:3])
    referral_query = f"site:linkedin.com/in {seed.company} USC NYU {query_terms} engineer"
    reason = seed.reason
    if match.matched_terms:
        reason = f"{reason} Matches your profile on {', '.join(match.matched_terms[:4])}."
    return DailyJobSuggestion(
        id=seed.id,
        company=seed.company,
        title=seed.title,
        location=seed.location,
        job_url=seed.job_url,
        jd_text=seed.jd_text,
        reason=reason,
        suggested_resume=suggested_resume,
        score_hint=match.score_hint,
        match_score=match.match_score,
        matched_terms=match.matched_terms,
        missing_terms=match.missing_terms,
        referral_query=referral_query,
        already_added=_already_added(db, user, seed),
    )


@router.get("/suggestions", response_model=list[DailyJobSuggestion])
def list_suggestions(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[DailyJobSuggestion]:
    context_text, resume_versions, _ = _profile_context(db, user)
    suggestions = [
        _to_suggestion(seed, context_text, resume_versions, db, user) for seed in SUGGESTIONS
    ]
    return sorted(suggestions, key=lambda item: item.match_score, reverse=True)


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
    seed = next((item for item in SUGGESTIONS if item.id == suggestion_id), None)
    if seed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found")

    existing = (
        db.query(Job)
        .filter(Job.user_id == user.id, Job.company == seed.company, Job.title == seed.title)
        .one_or_none()
    )
    if existing is not None:
        return job_to_read(existing)

    context_text, resume_versions, core_projects = _profile_context(db, user)
    suggestion = _to_suggestion(seed, context_text, resume_versions, db, user)
    required_terms = extract_terms(seed.jd_text)
    top_projects = core_projects[:3] or [
        "Wayfinder",
        "MCP Codebase Intelligence Toolkit",
        "Agent-Eval-Harness",
    ]
    job = create_job(
        db,
        user,
        JobCreate(
            company=seed.company,
            title=seed.title,
            location=seed.location,
            job_url=seed.job_url,
            source="daily suggestion",
            jd_text=seed.jd_text,
            notes=(
                f"{suggestion.reason} Suggested resume: {suggestion.suggested_resume}. "
                "External application still requires manual review."
            ),
        ),
    )
    job.role_category = "AI Agent / Backend"
    job.visa_signal = "Manual sponsor check required"
    job.required_skills = to_json(required_terms)
    job.preferred_skills = to_json(suggestion.matched_terms)
    job.risk_flags = to_json([f"Verify gap: {term}" for term in suggestion.missing_terms])
    job.apply_readiness = suggestion.match_score
    job.match_score = round(suggestion.match_score / 10, 1)
    job.decision = "Apply + seek referral now" if suggestion.match_score >= 82 else "Track + review"
    job.recommended_resume = suggestion.suggested_resume
    job.top_projects = to_json(top_projects)
    job.referral_search_query = suggestion.referral_query
    job.next_action = "Open JD link, verify sponsor/location, then send referral request."
    job.status = "Ready to apply" if suggestion.match_score >= 82 else "Saved for review"
    db.commit()
    db.refresh(job)
    return job_to_read(job)

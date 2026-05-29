from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
        id="anthropic-forward-deployed-engineer",
        company="Anthropic",
        title="Forward Deployed Engineer",
        location="Boston / New York / Seattle / San Francisco",
        job_url="https://www.anthropic.com/careers/jobs/4985877008",
        reason="Agent workflow + eval + customer-facing engineering match on an exact role page.",
        jd_text=(
            "Forward Deployed Engineer building production applications with Claude models. "
            "Responsibilities include customer discovery, MCP servers, sub-agents, agent skills, "
            "deployment patterns, LLM evaluation frameworks, Python, TypeScript, "
            "enterprise systems, "
            "travel, and production reliability. Visa sponsorship may be reviewed case by case."
        ),
    ),
    SuggestionSeed(
        id="anthropic-product-engineer-applied-ai",
        company="Anthropic",
        title="Product Engineer, Applied AI, Digital Natives Business",
        location="San Francisco / New York / Seattle",
        job_url="https://www.anthropic.com/careers/jobs/5057647008",
        reason="Claude API architecture and eval advisory work fits agent product engineering.",
        jd_text=(
            "Technical Product Engineer focused on Digital Native Businesses adopting the "
            "Claude API. "
            "Advise customer engineering teams on architecture, production LLM "
            "implementation patterns, "
            "evaluation frameworks, Python or TypeScript applications, backend APIs, "
            "and safe deployment."
        ),
    ),
    SuggestionSeed(
        id="cursor-agent-evaluation-quality",
        company="Cursor",
        title="Software Engineer, Agent Evaluation and Quality",
        location="San Francisco / New York",
        job_url="https://cursor.com/careers/software-engineer-agent-evaluation-and-quality",
        reason="Direct fit for agent eval infrastructure and codebase-agent product signals.",
        jd_text=(
            "Build measurement, evaluation, and feedback-loop infrastructure for "
            "Cursor's core agent. "
            "Work across product, data, engineering, quality signals, agent behavior "
            "analysis, pipelines, "
            "experimentation, ranking, search quality, backend systems, Python, "
            "TypeScript, and observability."
        ),
    ),
    SuggestionSeed(
        id="cursor-agent-harness",
        company="Cursor",
        title="Software Engineer, Agent Harness",
        location="San Francisco / New York",
        job_url="https://cursor.com/careers/software-engineer-agent-harness",
        reason="Agent orchestration, tools, guardrails, and model behavior tuning match Wayfinder.",
        jd_text=(
            "Build the core agent behavior and capabilities that power Cursor products. "
            "Work on agent orchestration, tools, guardrails, model behavior tuning, platform APIs, "
            "tool use, autonomous coding agents, reliability, Python, TypeScript, "
            "and backend systems."
        ),
    ),
    SuggestionSeed(
        id="cursor-forward-deployed-engineer",
        company="Cursor",
        title="Forward Deployed Engineer",
        location="San Francisco / New York / Remote",
        job_url="https://cursor.com/careers/forward-deployed-engineer",
        reason="Customer workflow automation with evals, tracing, and codebase systems.",
        jd_text=(
            "Forward Deployed Engineers embed with customer engineering teams to ship "
            "production-grade "
            "Cursor workflows. Build large-scale refactors, migrations, PR review loops, "
            "incident-to-fix "
            "pipelines, monitoring, evals, metrics, debugging model behavior, Python, "
            "TypeScript, and backend systems."
        ),
    ),
    SuggestionSeed(
        id="cursor-core-services",
        company="Cursor",
        title="Software Engineer, Core Services",
        location="San Francisco / New York",
        job_url="https://cursor.com/careers/software-engineer-core-services",
        reason="Backend systems behind agent workflows and developer product surfaces.",
        jd_text=(
            "Own critical shared services between Cursor product surfaces and infrastructure: "
            "auth, webhooks, "
            "backend systems that power agent workflows, API reliability, distributed systems, "
            "observability, "
            "TypeScript, Python, service architecture, and production support."
        ),
    ),
    SuggestionSeed(
        id="openai-applied-evals",
        company="OpenAI",
        title="Software Engineer, Applied Evals",
        location="San Francisco",
        job_url="https://jobs.ashbyhq.com/openai/99121e6d-a542-4881-968f-4cd89d9f583c",
        reason="Best match for agent-eval harness work and production judgment automation.",
        jd_text=(
            "Design and build evals and harnesses for real-world quality of advanced AI systems. "
            "Own multi-turn and tool-using systems, agent harnesses, reliable pipelines, "
            "backend workflows, "
            "user-facing interfaces, evaluation signals, prompting, scaffolding, and "
            "production feedback loops."
        ),
    ),
    SuggestionSeed(
        id="openai-api-sdk",
        company="OpenAI",
        title="Software Engineer, API SDK",
        location="San Francisco / New York / Seattle",
        job_url="https://jobs.ashbyhq.com/openai/77fbf383-bb97-4006-9b2d-e5de2d6f79d3/",
        reason="Developer platform and API design overlap with MCP tooling and backend SDK work.",
        jd_text=(
            "Build official SDKs that power the OpenAI API. Work on developer experience, "
            "API clients, "
            "TypeScript, Python, reliability, documentation, testing, backend platform "
            "integration, and scalable "
            "developer tooling for production AI applications."
        ),
    ),
    SuggestionSeed(
        id="openai-codex-app",
        company="OpenAI",
        title="Software Engineer, Codex App",
        location="San Francisco / London / Seattle",
        job_url="https://jobs.ashbyhq.com/openai/60e52bb7-3418-447c-8767-a6bb8e7dedd8",
        reason="Codebase onboarding, local agent workflows, and developer tool product fit.",
        jd_text=(
            "Build product experiences for the Codex desktop app and IDE extension. "
            "Work across UI, "
            "Node and TypeScript backend layers, IPC, process orchestration, Rust services, "
            "developer tools, "
            "CLIs, IDE integrations, observability, reliability, and product workflows."
        ),
    ),
    SuggestionSeed(
        id="langchain-developer-productivity",
        company="LangChain",
        title="Developer Productivity",
        location="San Francisco / New York",
        job_url="https://jobs.ashbyhq.com/langchain/e725293d-c27b-4a79-959d-19f5618f2f8e",
        reason="LangGraph/LangSmith infra, testing, CI, and eval quality match agent tooling.",
        jd_text=(
            "Software Engineer on Infrastructure owning developer productivity across "
            "LangGraph Cloud, "
            "Platform, and LangSmith. Work on Kubernetes, Terraform, Helm, APIs, UI, "
            "CI/CD, GitHub Actions, "
            "pytest, prompt regression testing, evaluation suites, observability, "
            "performance, SQL, and backend systems."
        ),
    ),
    SuggestionSeed(
        id="langchain-gtm-engineer",
        company="LangChain",
        title="GTM Engineer",
        location="San Francisco",
        job_url="https://jobs.ashbyhq.com/langchain/32c6fe13-76e0-49a2-849d-991014416987",
        reason="Production LLM agent systems, customer workflows, and LangGraph dogfooding.",
        jd_text=(
            "Build AI-native customer success and onboarding systems with LangChain and LangGraph. "
            "Architect customer agents, drive case deflection, build onboarding workflows, "
            "use retrieval, RAG, "
            "agentic loops, Python, TypeScript, backend APIs, full-stack applications, "
            "and production LLM systems."
        ),
    ),
    SuggestionSeed(
        id="vellum-ai-product-engineer",
        company="Vellum",
        title="AI Product Engineer",
        location="New York City",
        job_url="https://jobs.ashbyhq.com/Vellum/475c0ddb-40c3-4d89-88c1-5f1f2c239d25",
        reason="Agent product engineering role with strong applied AI builder signal.",
        jd_text=(
            "Build a platform where users generate reliable working agents. Work on AI "
            "product engineering, "
            "agent workflows, production AI applications, full-stack product development, "
            "TypeScript, Python, "
            "backend systems, evaluation, reliability, and customer-facing product quality."
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
    refresh: int = Query(0, ge=0),
    limit: int = Query(4, ge=1, le=6),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[DailyJobSuggestion]:
    context_text, resume_versions, _ = _profile_context(db, user)
    suggestions = [
        _to_suggestion(seed, context_text, resume_versions, db, user) for seed in SUGGESTIONS
    ]
    available = [
        suggestion
        for suggestion in sorted(suggestions, key=lambda item: item.match_score, reverse=True)
        if not suggestion.already_added
    ]
    if not available:
        return []
    start = (refresh * limit) % len(available)
    rotated = available[start:] + available[:start]
    return rotated[:limit]


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
    job.next_action = (
        "Open exact JD, verify sponsor/location, apply manually, then mark Applied in ApplyOS."
    )
    job.status = "Ready to apply" if suggestion.match_score >= 82 else "Saved for review"
    db.commit()
    db.refresh(job)
    return job_to_read(job)

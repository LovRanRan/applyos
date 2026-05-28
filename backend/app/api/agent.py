from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.decision_agent import interview_prep, maybe_openai_decision
from app.core.security import current_user
from app.db.models import Job, Profile, ResumeAsset, User
from app.db.session import get_db
from app.schemas.models import (
    AgentAnalysis,
    AgentAskRequest,
    AgentAskResponse,
    AgentBrief,
    AgentBriefItem,
    InterviewPrepPacket,
    InterviewPrepRequest,
    ParseJDRequest,
    ResumeGapResponse,
)
from app.services.crud import require_user_job
from app.services.matching import extract_terms, pick_resume_version
from app.services.serializers import from_json

router = APIRouter(prefix="/agent", tags=["agent"])


def _profile_parts(db: Session, user: User) -> tuple[list[str], list[str], list[str], str]:
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    if profile is None:
        return [], [], [], ""
    skills: list[str] = from_json(profile.skills, [])
    projects: list[str] = from_json(profile.core_projects, [])
    resume_versions: list[str] = from_json(profile.resume_versions, [])
    context = " ".join(
        [
            " ".join(skills),
            " ".join(projects),
            " ".join(from_json(profile.target_roles, [])),
            profile.notes or "",
        ]
    )
    return skills, projects, resume_versions, context


def _resume_context(db: Session, user: User) -> str:
    resumes = (
        db.query(ResumeAsset)
        .filter(ResumeAsset.user_id == user.id)
        .order_by(ResumeAsset.updated_at.desc())
        .limit(3)
        .all()
    )
    return " ".join(resume.content for resume in resumes)


def _job_label(job: Job) -> str:
    return f"{job.company} - {job.title}"


@router.post("/parse-jd", response_model=AgentAnalysis)
async def parse_jd(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.post("/score-fit", response_model=AgentAnalysis)
async def score_fit(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.post("/select-resume", response_model=AgentAnalysis)
async def select_resume(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.get("/brief", response_model=AgentBrief)
def agent_brief(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> AgentBrief:
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.updated_at.desc()).all()
    ready_jobs = [
        job for job in jobs if job.apply_readiness is not None and job.apply_readiness >= 82
    ]
    unscored_jobs = [job for job in jobs if job.apply_readiness is None]
    outreach_ready = [job for job in ready_jobs if job.referral_search_query]
    top_job = max(ready_jobs, key=lambda job: job.apply_readiness or 0, default=None)

    priorities: list[AgentBriefItem] = []
    if top_job is not None:
        priorities.append(
            AgentBriefItem(
                title=f"Review {_job_label(top_job)}",
                detail=top_job.next_action
                or "Open the JD, verify sponsor/location, then prepare referral outreach.",
                severity="high",
            )
        )
    if unscored_jobs:
        priorities.append(
            AgentBriefItem(
                title=f"Analyze {len(unscored_jobs)} unscored job(s)",
                detail="These jobs are saved but do not have a decision package yet.",
                severity="medium",
            )
        )
    if not jobs:
        priorities.append(
            AgentBriefItem(
                title="Add one role to start the workflow",
                detail="Use Daily Matches or paste a JD in the Workbench.",
                severity="medium",
            )
        )
    elif not priorities:
        priorities.append(
            AgentBriefItem(
                title="Upgrade the strongest saved role",
                detail="Run Resume Gap, verify risk flags, and decide whether referral is needed.",
                severity="medium",
            )
        )

    observations = [
        f"{len(jobs)} saved job(s), {len(ready_jobs)} ready-to-apply role(s).",
        f"{len(outreach_ready)} role(s) already have referral search queries.",
    ]
    recommended_actions = [
        "Open the highest-fit JD and manually verify sponsor/location.",
        "Run Resume Gap before editing any resume bullets.",
        "Draft referral message only after choosing the contact.",
    ]
    activity = [
        "Scanned saved jobs for readiness and missing decision packages.",
        "Separated manual external actions from internal preparation.",
    ]
    headline = (
        f"Top priority: {_job_label(top_job)}"
        if top_job is not None
        else "Start by adding or analyzing one role."
    )
    return AgentBrief(
        headline=headline,
        priorities=priorities,
        observations=observations,
        recommended_actions=recommended_actions,
        activity=activity,
    )


@router.post("/ask", response_model=AgentAskResponse)
def ask_agent(
    payload: AgentAskRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> AgentAskResponse:
    job = require_user_job(db, user, payload.selected_job_id) if payload.selected_job_id else None
    question = payload.question.lower()
    referenced_jobs = [_job_label(job)] if job is not None else []

    if job is None:
        answer = (
            "I need a selected job for a precise answer. Start from the strongest saved role, "
            "or add a daily match, then ask again."
        )
        next_actions = ["Select a job", "Run analysis", "Ask about resume fit or referral timing"]
    elif "resume" in question or "gap" in question or "简历" in question:
        job_terms = set(extract_terms(" ".join([job.title, job.jd_text or ""])))
        resume_terms = set(extract_terms(_resume_context(db, user)))
        missing = sorted(job_terms - resume_terms)
        fallback_resume = "the closest AI Agent resume"
        answer = (
            f"For {_job_label(job)}, use {job.recommended_resume or fallback_resume}. "
            f"The resume appears to miss: {', '.join(missing[:5]) or 'no obvious core terms'}."
        )
        next_actions = [
            "Run Resume Gap",
            "Add missing keywords only if they are truthful",
            "Keep external application manual",
        ]
    elif "referral" in question or "内推" in question or "contact" in question:
        fallback_query = "site:linkedin.com/in company alumni engineer"
        answer = (
            f"For {_job_label(job)}, referral-first is better if readiness is above 82. "
            f"Use this search query: {job.referral_search_query or fallback_query}."
        )
        next_actions = ["Find 3 alumni/engineers", "Save the strongest contact", "Generate draft"]
    else:
        readiness = f"{job.apply_readiness}/100" if job.apply_readiness is not None else "unscored"
        answer = (
            f"{_job_label(job)} is currently {readiness}. "
            f"Decision: {job.decision or 'run analysis first'}. "
            f"Next action: {job.next_action or 'generate a decision package'}."
        )
        next_actions = [
            "Review risk flags",
            "Check sponsor/location manually",
            "Prepare referral draft",
        ]

    return AgentAskResponse(
        answer=answer,
        next_actions=next_actions,
        referenced_jobs=referenced_jobs,
        activity=["Read current job context", "Mapped question to decision workflow"],
    )


@router.get("/resume-gap/{job_id}", response_model=ResumeGapResponse)
def resume_gap(
    job_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ResumeGapResponse:
    job = require_user_job(db, user, job_id)
    _, projects, resume_versions, profile_context = _profile_parts(db, user)
    resume_context = _resume_context(db, user)
    job_text = " ".join([job.title, job.role_category or "", job.jd_text or ""])
    profile_terms = set(extract_terms(resume_context + profile_context))
    covered = sorted(set(extract_terms(job_text)) & profile_terms)
    missing = sorted(set(extract_terms(job_text)) - set(covered))
    resume_version = job.recommended_resume or pick_resume_version(job_text, resume_versions)
    suggested_edits = [
        f"Add truthful evidence for {term} if it exists in Wayfinder or related projects."
        for term in missing[:5]
    ]
    if not suggested_edits:
        suggested_edits = ["Current resume evidence covers the main technical terms for this JD."]
    return ResumeGapResponse(
        job_id=job.id,
        resume_version=resume_version,
        covered_terms=covered[:8],
        missing_terms=missing[:6],
        suggested_edits=suggested_edits,
        project_emphasis=(job.top_projects and from_json(job.top_projects, [])) or projects[:3],
        activity=[
            "Compared JD terms against saved resume/profile evidence",
            "Kept edits as suggestions only",
        ],
    )


@router.post("/interview-prep", response_model=InterviewPrepPacket)
def interview_prep_endpoint(payload: InterviewPrepRequest) -> InterviewPrepPacket:
    return interview_prep(payload.company, payload.role, payload.stage)

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.agents.decision_agent import maybe_openai_decision
from app.core.security import current_user
from app.db.models import Job, User
from app.db.session import get_db
from app.schemas.models import AgentAnalysis, JobCreate, JobRead, JobUpdate, ParseJDRequest
from app.services.crud import create_job, require_user_job, update_job
from app.services.serializers import job_to_read, to_json

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobRead])
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[JobRead]:
    jobs = db.query(Job).filter(Job.user_id == user.id).order_by(Job.updated_at.desc()).all()
    return [job_to_read(job) for job in jobs]


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def post_job(
    payload: JobCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    return job_to_read(create_job(db, user, payload))


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> JobRead:
    return job_to_read(require_user_job(db, user, job_id))


@router.put("/{job_id}", response_model=JobRead)
def put_job(
    job_id: int,
    payload: JobUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> JobRead:
    return job_to_read(update_job(db, require_user_job(db, user, job_id), payload))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    job = require_user_job(db, user, job_id)
    db.delete(job)
    db.commit()


@router.post("/{job_id}/analyze", response_model=AgentAnalysis)
async def analyze_job(
    job_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> AgentAnalysis:
    job = require_user_job(db, user, job_id)
    analysis = await maybe_openai_decision(
        ParseJDRequest(
            company=job.company,
            title=job.title,
            jd_text=job.jd_text or "",
            location=job.location,
        )
    )
    job.role_category = analysis.role_category
    job.seniority_level = analysis.seniority_level
    job.visa_signal = analysis.visa_signal
    job.required_skills = to_json(analysis.required_skills)
    job.preferred_skills = to_json(analysis.preferred_skills)
    job.risk_flags = to_json(analysis.risk_flags)
    job.assumptions = to_json(analysis.assumptions)
    job.role_fit = analysis.role_fit
    job.skill_match = analysis.skill_match
    job.project_relevance = analysis.project_relevance
    job.visa_sponsor = analysis.visa_sponsor
    job.new_grad_friendliness = analysis.new_grad_friendliness
    job.location_fit = analysis.location_fit
    job.apply_readiness = analysis.apply_readiness
    job.match_score = analysis.match_score
    job.decision = analysis.decision
    job.recommended_resume = analysis.recommended_resume
    job.top_projects = to_json(analysis.top_projects)
    job.referral_search_query = analysis.referral_search_query
    job.next_action = analysis.next_action
    job.status = "Ready to apply" if analysis.apply_readiness >= 70 else "Analyzing"
    db.commit()
    return analysis

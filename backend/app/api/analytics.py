from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Job, User
from app.db.session import get_db
from app.schemas.models import TechStackAnalytics, TechStackCount
from app.services.matching import count_terms_across_jobs
from app.services.serializers import from_json

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/tech-stack", response_model=TechStackAnalytics)
def tech_stack(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> TechStackAnalytics:
    jobs = db.query(Job).filter(Job.user_id == user.id).all()
    job_texts = []
    for job in jobs:
        skills: list[str] = from_json(job.required_skills, []) + from_json(
            job.preferred_skills, []
        )
        job_texts.append(
            " ".join(
                [
                    job.title,
                    job.role_category or "",
                    job.jd_text or "",
                    " ".join(skills),
                ]
            )
        )

    terms = [
        TechStackCount(
            term=row.term,
            job_count=row.job_count,
            mention_count=row.mention_count,
        )
        for row in count_terms_across_jobs(job_texts)
    ]
    return TechStackAnalytics(
        total_jobs=len(jobs),
        terms=terms,
        top_terms=[term.term for term in terms[:5]],
    )

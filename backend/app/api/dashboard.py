from collections import Counter
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import current_user
from app.db.models import Job, OutreachMessage, User
from app.db.session import get_db
from app.schemas.models import DashboardSummary, TodayAction

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)) -> DashboardSummary:
    jobs = db.query(Job).filter(Job.user_id == user.id).all()
    messages = db.query(OutreachMessage).filter(OutreachMessage.user_id == user.id).all()
    today = date.today()
    return DashboardSummary(
        total_jobs=len(jobs),
        high_readiness_jobs=sum(1 for job in jobs if (job.apply_readiness or 0) >= 85),
        ready_to_apply=sum(1 for job in jobs if job.status == "Ready to apply"),
        outreach_drafts=len([message for message in messages if message.status == "draft"]),
        followups_due=sum(
            1 for job in jobs if job.follow_up_date is not None and job.follow_up_date <= today
        ),
        applications_by_status=dict(Counter(job.status for job in jobs)),
        role_categories=dict(Counter(job.role_category or "Unclassified" for job in jobs)),
    )


@router.get("/today-actions", response_model=list[TodayAction])
def today_actions(
    user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[TodayAction]:
    jobs = db.query(Job).filter(Job.user_id == user.id).all()
    actions: list[TodayAction] = []
    for job in sorted(jobs, key=lambda item: item.apply_readiness or 0, reverse=True)[:8]:
        if job.next_action:
            actions.append(
                TodayAction(
                    priority="P0" if (job.apply_readiness or 0) >= 85 else "P1",
                    action_type="Apply decision",
                    company=job.company,
                    title=job.title,
                    action=job.next_action,
                    due_date=job.follow_up_date or datetime.now(UTC).date(),
                )
            )
    if not actions:
        actions.append(
            TodayAction(
                priority="P0",
                action_type="Intake",
                action="Paste 10-15 target JDs, run analysis, and generate referral queries.",
                due_date=datetime.now(UTC).date(),
            )
        )
    return actions

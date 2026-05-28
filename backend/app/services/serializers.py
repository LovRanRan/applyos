import json
from datetime import date
from typing import Any, cast

from app.db.models import Application, Contact, Job, OutreachMessage, Profile
from app.schemas.models import (
    ApplicationRead,
    ContactRead,
    JobRead,
    OutreachMessageRead,
    ProfileRead,
)


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def from_json[T](value: str | None, default: T) -> T:
    if not value:
        return default
    try:
        return cast(T, json.loads(value))
    except json.JSONDecodeError:
        return default


def parse_date(value: date | str | None) -> date | None:
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(value)


def profile_to_read(profile: Profile) -> ProfileRead:
    return ProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        target_roles=from_json(profile.target_roles, []),
        visa_status=profile.visa_status,
        graduation_date=profile.graduation_date,
        preferred_locations=from_json(profile.preferred_locations, []),
        resume_versions=from_json(profile.resume_versions, []),
        core_projects=from_json(profile.core_projects, []),
        skills=from_json(profile.skills, []),
        notes=profile.notes,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def job_to_read(job: Job) -> JobRead:
    return JobRead(
        id=job.id,
        user_id=job.user_id,
        company=job.company,
        title=job.title,
        location=job.location,
        job_url=job.job_url,
        source=job.source,
        jd_text=job.jd_text,
        role_category=job.role_category,
        seniority_level=job.seniority_level,
        visa_signal=job.visa_signal,
        required_skills=from_json(job.required_skills, []),
        preferred_skills=from_json(job.preferred_skills, []),
        risk_flags=from_json(job.risk_flags, []),
        assumptions=from_json(job.assumptions, []),
        role_fit=job.role_fit,
        skill_match=job.skill_match,
        project_relevance=job.project_relevance,
        visa_sponsor=job.visa_sponsor,
        new_grad_friendliness=job.new_grad_friendliness,
        location_fit=job.location_fit,
        apply_readiness=job.apply_readiness,
        match_score=job.match_score,
        decision=job.decision,
        recommended_resume=job.recommended_resume,
        top_projects=from_json(job.top_projects, []),
        referral_search_query=job.referral_search_query,
        status=job.status,
        next_action=job.next_action,
        follow_up_date=parse_date(job.follow_up_date),
        notes=job.notes,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def contact_to_read(contact: Contact) -> ContactRead:
    return ContactRead.model_validate(contact)


def application_to_read(application: Application) -> ApplicationRead:
    return ApplicationRead.model_validate(application)


def outreach_to_read(message: OutreachMessage) -> OutreachMessageRead:
    return OutreachMessageRead.model_validate(message)

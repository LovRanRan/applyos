from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Application, Contact, Job, OutreachMessage, Profile, User
from app.schemas.models import (
    ApplicationCreate,
    ApplicationUpdate,
    ContactCreate,
    ContactUpdate,
    JobCreate,
    JobUpdate,
    OutreachMessageCreate,
    OutreachMessageUpdate,
    ProfileUpsert,
)
from app.services.serializers import to_json


def require_user_job(db: Session, user: User, job_id: int) -> Job:
    job = db.get(Job, job_id)
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def require_user_contact(db: Session, user: User, contact_id: int) -> Contact:
    contact = db.get(Contact, contact_id)
    if contact is None or contact.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


def upsert_profile(db: Session, user: User, payload: ProfileUpsert) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
    values = payload.model_dump()
    values["target_roles"] = to_json(values["target_roles"])
    values["preferred_locations"] = to_json(values["preferred_locations"])
    values["resume_versions"] = to_json(values["resume_versions"])
    values["core_projects"] = to_json(values["core_projects"])
    values["skills"] = to_json(values["skills"])
    if profile is None:
        profile = Profile(user_id=user.id, **values)
        db.add(profile)
    else:
        for key, value in values.items():
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


def create_job(db: Session, user: User, payload: JobCreate) -> Job:
    job = Job(user_id=user.id, **payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_job(db: Session, job: Job, payload: JobUpdate) -> Job:
    values = payload.model_dump(exclude_unset=True)
    for key in ["required_skills", "preferred_skills", "risk_flags", "assumptions", "top_projects"]:
        if key in values:
            values[key] = to_json(values[key])
    for key, value in values.items():
        setattr(job, key, value)
    if job.apply_readiness is None:
        score_parts = [
            job.role_fit,
            job.skill_match,
            job.project_relevance,
            job.visa_sponsor,
            job.new_grad_friendliness,
            job.location_fit,
        ]
        if all(value is not None for value in score_parts):
            job.apply_readiness = sum(float(value) for value in score_parts if value is not None)
            job.match_score = round(job.apply_readiness / 10, 1)
    db.commit()
    db.refresh(job)
    return job


def create_contact(db: Session, user: User, payload: ContactCreate) -> Contact:
    contact = Contact(user_id=user.id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def update_contact(db: Session, contact: Contact, payload: ContactUpdate) -> Contact:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


def create_application(db: Session, user: User, payload: ApplicationCreate) -> Application:
    require_user_job(db, user, payload.job_id)
    if payload.referral_contact_id is not None:
        require_user_contact(db, user, payload.referral_contact_id)
    application = Application(user_id=user.id, **payload.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def update_application(
    db: Session, application: Application, payload: ApplicationUpdate
) -> Application:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(application, key, value)
    db.commit()
    db.refresh(application)
    return application


def create_outreach(db: Session, user: User, payload: OutreachMessageCreate) -> OutreachMessage:
    if payload.job_id is not None:
        require_user_job(db, user, payload.job_id)
    if payload.contact_id is not None:
        require_user_contact(db, user, payload.contact_id)
    message = OutreachMessage(user_id=user.id, **payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def update_outreach(
    db: Session, message: OutreachMessage, payload: OutreachMessageUpdate
) -> OutreachMessage:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(message, key, value)
    db.commit()
    db.refresh(message)
    return message

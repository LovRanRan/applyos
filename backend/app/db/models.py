from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    profile: Mapped["Profile | None"] = relationship(back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    target_roles: Mapped[str] = mapped_column(Text, default="[]")
    visa_status: Mapped[str | None] = mapped_column(String(120))
    graduation_date: Mapped[str | None] = mapped_column(String(60))
    preferred_locations: Mapped[str] = mapped_column(Text, default="[]")
    resume_versions: Mapped[str] = mapped_column(Text, default="[]")
    core_projects: Mapped[str] = mapped_column(Text, default="[]")
    skills: Mapped[str] = mapped_column(Text, default="[]")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped[User] = relationship(back_populates="profile")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    job_url: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(120))
    jd_text: Mapped[str | None] = mapped_column(Text)
    role_category: Mapped[str | None] = mapped_column(String(120))
    seniority_level: Mapped[str | None] = mapped_column(String(120))
    visa_signal: Mapped[str | None] = mapped_column(String(120))
    required_skills: Mapped[str] = mapped_column(Text, default="[]")
    preferred_skills: Mapped[str] = mapped_column(Text, default="[]")
    risk_flags: Mapped[str] = mapped_column(Text, default="[]")
    assumptions: Mapped[str] = mapped_column(Text, default="[]")
    role_fit: Mapped[float | None] = mapped_column(Float)
    skill_match: Mapped[float | None] = mapped_column(Float)
    project_relevance: Mapped[float | None] = mapped_column(Float)
    visa_sponsor: Mapped[float | None] = mapped_column(Float)
    new_grad_friendliness: Mapped[float | None] = mapped_column(Float)
    location_fit: Mapped[float | None] = mapped_column(Float)
    apply_readiness: Mapped[float | None] = mapped_column(Float)
    match_score: Mapped[float | None] = mapped_column(Float)
    decision: Mapped[str | None] = mapped_column(String(160))
    recommended_resume: Mapped[str | None] = mapped_column(String(160))
    top_projects: Mapped[str] = mapped_column(Text, default="[]")
    referral_search_query: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(80), default="Saved")
    next_action: Mapped[str | None] = mapped_column(Text)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(255))
    linkedin_url: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    relationship: Mapped[str | None] = mapped_column(String(120))
    source: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(120), default="identified")
    next_action: Mapped[str | None] = mapped_column(Text)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    resume_version: Mapped[str | None] = mapped_column(String(160))
    referral_contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id"))
    status: Mapped[str] = mapped_column(String(120), default="saved")
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_action_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_action: Mapped[str | None] = mapped_column(Text)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("contacts.id"))
    job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id"))
    message_type: Mapped[str] = mapped_column(String(120), default="referral request")
    draft_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(120), default="draft")
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

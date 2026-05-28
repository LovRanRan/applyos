from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileBase(BaseModel):
    target_roles: list[str] = Field(default_factory=list)
    visa_status: str | None = "F-1 student; needs OPT/STEM OPT/H-1B-friendly employers"
    graduation_date: str | None = "Dec 2026"
    preferred_locations: list[str] = Field(default_factory=lambda: ["United States", "Remote"])
    resume_versions: list[str] = Field(
        default_factory=lambda: [
            "AI Agent Engineer resume",
            "Backend SDE resume",
            "Data / ML / RAG resume",
        ]
    )
    core_projects: list[str] = Field(
        default_factory=lambda: [
            "Wayfinder",
            "MCP Codebase Intelligence Toolkit",
            "Agent-Eval-Harness",
            "Production RAG Research Assistant",
            "Backend & AWS Event-Driven Knowledge Platform",
        ]
    )
    skills: list[str] = Field(default_factory=list)
    notes: str | None = None


class ProfileUpsert(ProfileBase):
    pass


class ProfileRead(ProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeAssetCreate(BaseModel):
    name: str
    content: str = Field(min_length=20)
    source: str = "upload"


class ResumeAssetRead(ResumeAssetCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobCreate(BaseModel):
    company: str
    title: str
    location: str | None = None
    job_url: str | None = None
    source: str | None = None
    jd_text: str | None = None
    notes: str | None = None


class JobUpdate(BaseModel):
    company: str | None = None
    title: str | None = None
    location: str | None = None
    job_url: str | None = None
    source: str | None = None
    jd_text: str | None = None
    role_category: str | None = None
    seniority_level: str | None = None
    visa_signal: str | None = None
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    risk_flags: list[str] | None = None
    assumptions: list[str] | None = None
    role_fit: float | None = None
    skill_match: float | None = None
    project_relevance: float | None = None
    visa_sponsor: float | None = None
    new_grad_friendliness: float | None = None
    location_fit: float | None = None
    decision: str | None = None
    recommended_resume: str | None = None
    top_projects: list[str] | None = None
    referral_search_query: str | None = None
    status: str | None = None
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None


class JobRead(BaseModel):
    id: int
    user_id: int
    company: str
    title: str
    location: str | None = None
    job_url: str | None = None
    source: str | None = None
    jd_text: str | None = None
    role_category: str | None = None
    seniority_level: str | None = None
    visa_signal: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    role_fit: float | None = None
    skill_match: float | None = None
    project_relevance: float | None = None
    visa_sponsor: float | None = None
    new_grad_friendliness: float | None = None
    location_fit: float | None = None
    apply_readiness: float | None = None
    match_score: float | None = None
    decision: str | None = None
    recommended_resume: str | None = None
    top_projects: list[str] = Field(default_factory=list)
    referral_search_query: str | None = None
    status: str
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContactCreate(BaseModel):
    name: str
    company: str | None = None
    title: str | None = None
    linkedin_url: str | None = None
    email: EmailStr | None = None
    relationship: str | None = None
    source: str | None = None
    status: str = "identified"
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    company: str | None = None
    title: str | None = None
    linkedin_url: str | None = None
    email: EmailStr | None = None
    relationship: str | None = None
    source: str | None = None
    status: str | None = None
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None


class ContactRead(ContactCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    job_id: int
    resume_version: str | None = None
    referral_contact_id: int | None = None
    status: str = "saved"
    applied_at: datetime | None = None
    last_action_date: datetime | None = None
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None


class ApplicationUpdate(BaseModel):
    resume_version: str | None = None
    referral_contact_id: int | None = None
    status: str | None = None
    applied_at: datetime | None = None
    last_action_date: datetime | None = None
    next_action: str | None = None
    follow_up_date: date | None = None
    notes: str | None = None


class ApplicationRead(ApplicationCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutreachGenerateRequest(BaseModel):
    job_id: int | None = None
    contact_id: int | None = None
    message_type: str = "referral request"
    context: str | None = None


class OutreachMessageCreate(BaseModel):
    contact_id: int | None = None
    job_id: int | None = None
    message_type: str = "referral request"
    draft_text: str
    status: str = "draft"
    follow_up_date: date | None = None


class OutreachMessageUpdate(BaseModel):
    draft_text: str | None = None
    status: str | None = None
    follow_up_date: date | None = None


class OutreachMessageRead(OutreachMessageCreate):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParseJDRequest(BaseModel):
    company: str
    title: str
    jd_text: str
    location: str | None = None


class AgentAnalysis(BaseModel):
    role_category: str
    required_skills: list[str]
    preferred_skills: list[str]
    seniority_level: str
    visa_signal: str
    location_type: str
    risk_flags: list[str]
    assumptions: list[str]
    role_fit: float
    skill_match: float
    project_relevance: float
    visa_sponsor: float
    new_grad_friendliness: float
    location_fit: float
    apply_readiness: float
    match_score: float
    decision: str
    recommended_resume: str
    top_projects: list[str]
    referral_search_query: str
    next_action: str
    rationale: list[str]
    source: str = "deterministic_fallback"


class AgentBriefItem(BaseModel):
    title: str
    detail: str
    severity: str = "info"


class AgentBrief(BaseModel):
    headline: str
    priorities: list[AgentBriefItem]
    observations: list[str]
    recommended_actions: list[str]
    activity: list[str]


class AgentAskRequest(BaseModel):
    question: str = Field(min_length=3)
    selected_job_id: int | None = None


class AgentAskResponse(BaseModel):
    answer: str
    next_actions: list[str]
    referenced_jobs: list[str] = Field(default_factory=list)
    activity: list[str] = Field(default_factory=list)


class ResumeGapResponse(BaseModel):
    job_id: int
    resume_version: str
    covered_terms: list[str]
    missing_terms: list[str]
    suggested_edits: list[str]
    project_emphasis: list[str]
    activity: list[str]


class DashboardSummary(BaseModel):
    total_jobs: int
    high_readiness_jobs: int
    ready_to_apply: int
    outreach_drafts: int
    followups_due: int
    applications_by_status: dict[str, int]
    role_categories: dict[str, int]


class TodayAction(BaseModel):
    priority: str
    action_type: str
    company: str | None = None
    title: str | None = None
    action: str
    due_date: date | None = None


class DailyJobSuggestion(BaseModel):
    id: str
    company: str
    title: str
    location: str
    job_url: str
    jd_text: str
    reason: str
    suggested_resume: str
    score_hint: str
    match_score: float
    matched_terms: list[str] = Field(default_factory=list)
    missing_terms: list[str] = Field(default_factory=list)
    referral_query: str
    already_added: bool = False


class TechStackCount(BaseModel):
    term: str
    job_count: int
    mention_count: int


class TechStackAnalytics(BaseModel):
    total_jobs: int
    terms: list[TechStackCount]
    top_terms: list[str]


class InterviewPrepRequest(BaseModel):
    company: str
    role: str
    stage: str = "phone screen"
    job_context: str | None = None


class InterviewPrepPacket(BaseModel):
    likely_format: list[str]
    coding_topics: list[str]
    system_design_angle: list[str]
    project_stories: list[str]
    behavioral_stories: list[str]
    questions_to_ask: list[str]


JsonDict = dict[str, Any]

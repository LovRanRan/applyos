from fastapi import APIRouter

from app.agents.decision_agent import interview_prep, maybe_openai_decision
from app.schemas.models import (
    AgentAnalysis,
    InterviewPrepPacket,
    InterviewPrepRequest,
    ParseJDRequest,
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/parse-jd", response_model=AgentAnalysis)
async def parse_jd(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.post("/score-fit", response_model=AgentAnalysis)
async def score_fit(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.post("/select-resume", response_model=AgentAnalysis)
async def select_resume(payload: ParseJDRequest) -> AgentAnalysis:
    return await maybe_openai_decision(payload)


@router.post("/interview-prep", response_model=InterviewPrepPacket)
def interview_prep_endpoint(payload: InterviewPrepRequest) -> InterviewPrepPacket:
    return interview_prep(payload.company, payload.role, payload.stage)

from collections.abc import Sequence

import httpx

from app.core.config import get_settings
from app.schemas.models import AgentAnalysis, InterviewPrepPacket, ParseJDRequest

AI_AGENT_TERMS = {
    "agent",
    "llm",
    "langchain",
    "langgraph",
    "rag",
    "retrieval",
    "openai",
    "anthropic",
    "mcp",
    "tool calling",
    "prompt",
    "evaluation",
    "eval",
}
BACKEND_TERMS = {
    "api",
    "fastapi",
    "backend",
    "distributed",
    "database",
    "postgres",
    "sql",
    "redis",
    "aws",
    "kubernetes",
    "docker",
    "microservice",
    "reliability",
}
DATA_TERMS = {"data", "ml", "analytics", "experiment", "model", "pipeline", "warehouse"}
SENIOR_TERMS = {"senior", "staff", "principal", "lead", "manager", "5+ years", "7+ years"}
NEW_GRAD_TERMS = {
    "new grad",
    "university grad",
    "early career",
    "entry level",
    "0-2 years",
    "graduate",
}
SPONSOR_POSITIVE = {"sponsor", "h-1b", "h1b", "opt", "stem opt", "international"}
SPONSOR_NEGATIVE = {
    "must be us citizen",
    "no sponsorship",
    "without sponsorship",
    "security clearance",
}


def _find_terms(text: str, terms: set[str]) -> list[str]:
    found = []
    lowered = text.lower()
    for term in sorted(terms):
        if term in lowered:
            found.append(term)
    return found


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _category(text: str) -> str:
    ai_hits = len(_find_terms(text, AI_AGENT_TERMS))
    backend_hits = len(_find_terms(text, BACKEND_TERMS))
    data_hits = len(_find_terms(text, DATA_TERMS))
    if ai_hits >= max(2, backend_hits, data_hits):
        if "rag" in text.lower() or "retrieval" in text.lower():
            return "RAG / Retrieval"
        return "AI Agent"
    if backend_hits >= max(2, data_hits):
        if "infrastructure" in text.lower():
            return "AI Infrastructure"
        if "developer" in text.lower() and "tool" in text.lower():
            return "Developer Tools"
        return "Backend SDE"
    if data_hits >= 2:
        return "Data / ML"
    return "General SDE"


def _resume_for_category(category: str) -> str:
    if category in {"AI Agent", "Applied AI", "RAG / Retrieval"}:
        return "AI Agent Engineer resume"
    if category in {"Backend SDE", "AI Infrastructure", "Developer Tools", "General SDE"}:
        return "Backend SDE resume"
    return "Data / ML / RAG resume"


def _projects_for_category(category: str) -> list[str]:
    if category in {"AI Agent", "Applied AI", "RAG / Retrieval", "Developer Tools"}:
        return [
            "Wayfinder",
            "MCP Codebase Intelligence Toolkit",
            "Agent-Eval-Harness",
        ]
    if category in {"Backend SDE", "AI Infrastructure", "General SDE"}:
        return [
            "Backend & AWS Event-Driven Knowledge Platform",
            "Wayfinder",
            "MCP Codebase Intelligence Toolkit",
        ]
    return [
        "Production RAG Research Assistant",
        "Agent-Eval-Harness",
        "Backend & AWS Event-Driven Knowledge Platform",
    ]


def _visa_signal(text: str) -> tuple[str, float, list[str]]:
    lowered = text.lower()
    risk_flags: list[str] = []
    if any(term in lowered for term in SPONSOR_NEGATIVE):
        risk_flags.append("Visa risk: JD suggests no sponsorship or citizenship constraint.")
        return "likely not sponsor", 2.0, risk_flags
    if any(term in lowered for term in SPONSOR_POSITIVE):
        return "possible sponsor", 11.0, risk_flags
    return "unclear", 8.0, ["Visa/sponsor signal is unclear; verify before applying."]


def analyze_job(payload: ParseJDRequest) -> AgentAnalysis:
    text = f"{payload.company} {payload.title} {payload.location or ''} {payload.jd_text}"
    lowered = text.lower()
    ai_terms = _find_terms(text, AI_AGENT_TERMS)
    backend_terms = _find_terms(text, BACKEND_TERMS)
    data_terms = _find_terms(text, DATA_TERMS)
    category = _category(text)
    visa_signal, visa_score, risk_flags = _visa_signal(text)

    required_skills = sorted(set(ai_terms + backend_terms + data_terms))[:12]
    preferred_skills = []
    if "python" in lowered:
        required_skills.append("python")
    if "typescript" in lowered or "react" in lowered or "next.js" in lowered:
        preferred_skills.append("typescript/react")
    if "sql" in lowered or "postgres" in lowered:
        required_skills.append("sql")

    seniority = "new grad / early career" if _find_terms(text, NEW_GRAD_TERMS) else "unspecified"
    if _find_terms(text, SENIOR_TERMS):
        seniority = "senior-leaning"
        risk_flags.append("Seniority risk: JD contains senior/staff/lead language.")

    role_fit = _clamp(10 + len(ai_terms) * 2.5 + len(backend_terms) * 1.3 + len(data_terms), 4, 25)
    skill_match = _clamp(9 + len(required_skills) * 1.8, 5, 25)
    project_relevance = _clamp(
        8
        + (6 if category in {"AI Agent", "Developer Tools", "RAG / Retrieval"} else 2)
        + min(len(ai_terms), 4),
        5,
        20,
    )
    new_grad_friendliness = 8.5 if seniority == "new grad / early career" else 4.0
    if seniority == "senior-leaning":
        new_grad_friendliness = 1.5
    location_fit = (
        4.5 if "united states" in lowered or "remote" in lowered or payload.location else 3.0
    )

    apply_readiness = round(
        role_fit
        + skill_match
        + project_relevance
        + visa_score
        + new_grad_friendliness
        + location_fit,
        1,
    )
    match_score = round(apply_readiness / 10, 1)
    decision = _decision(apply_readiness)
    recommended_resume = _resume_for_category(category)
    top_projects = _projects_for_category(category)
    referral_search_query = (
        f"site:linkedin.com/in USC {payload.company} {category} engineer "
        f"{' '.join(required_skills[:3])}".strip()
    )
    next_action = _next_action(apply_readiness, visa_signal)
    rationale = _rationale(category, ai_terms, backend_terms, data_terms, visa_signal, risk_flags)

    return AgentAnalysis(
        role_category=category,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        seniority_level=seniority,
        visa_signal=visa_signal,
        location_type="remote/hybrid/on-site unclear" if not payload.location else payload.location,
        risk_flags=risk_flags,
        assumptions=[
            "Heuristic fallback analysis; manually verify JD and company sponsor history."
        ],
        role_fit=round(role_fit, 1),
        skill_match=round(skill_match, 1),
        project_relevance=round(project_relevance, 1),
        visa_sponsor=round(visa_score, 1),
        new_grad_friendliness=round(new_grad_friendliness, 1),
        location_fit=round(location_fit, 1),
        apply_readiness=apply_readiness,
        match_score=match_score,
        decision=decision,
        recommended_resume=recommended_resume,
        top_projects=top_projects,
        referral_search_query=referral_search_query,
        next_action=next_action,
        rationale=rationale,
    )


def _decision(readiness: float) -> str:
    if readiness >= 85:
        return "Apply + seek referral now"
    if readiness >= 70:
        return "Apply; referral first if possible"
    if readiness >= 55:
        return "Watchlist / strategic only"
    return "Skip"


def _next_action(readiness: float, visa_signal: str) -> str:
    if "not sponsor" in visa_signal:
        return "Verify sponsorship before spending time on referral or application."
    if readiness >= 85:
        return "Find 3 USC/NYU alumni, draft referral request, then apply within 48 hours."
    if readiness >= 70:
        return "Find one targeted contact and prepare application manually."
    if readiness >= 55:
        return "Save to watchlist; revisit if referral path appears."
    return "Skip unless a strong relationship changes the calculus."


def _rationale(
    category: str,
    ai_terms: Sequence[str],
    backend_terms: Sequence[str],
    data_terms: Sequence[str],
    visa_signal: str,
    risk_flags: Sequence[str],
) -> list[str]:
    reasons = [f"Role classified as {category} from JD keywords."]
    if ai_terms:
        reasons.append(f"AI/agent terms found: {', '.join(ai_terms[:6])}.")
    if backend_terms:
        reasons.append(f"Backend/platform terms found: {', '.join(backend_terms[:6])}.")
    if data_terms:
        reasons.append(f"Data/ML terms found: {', '.join(data_terms[:6])}.")
    reasons.append(f"Visa signal: {visa_signal}.")
    if risk_flags:
        reasons.extend(risk_flags)
    return reasons


def generate_outreach_message(
    company: str | None,
    role: str | None,
    contact_name: str | None,
    contact_title: str | None,
    message_type: str,
    context: str | None = None,
) -> str:
    name = contact_name or "Name"
    company_text = company or "the company"
    role_text = role or "the role"
    title_text = contact_title or "your team"
    context_sentence = f" I noticed {context.strip()}." if context else ""

    if "recruiter" in message_type.lower():
        return (
            f"Hi {name}, I am Haichuan, a USC MS Analytics candidate graduating in Dec 2026. "
            f"I am interested in {role_text} at {company_text} because it aligns with my AI agent "
            "and backend systems work, especially Wayfinder and the MCP Codebase Intelligence "
            "Toolkit. "
            "Could you point me to the best process for new grad candidates?"
        )

    if "follow" in message_type.lower():
        return (
            f"Hi {name}, just following up on my note about {role_text} at {company_text}. "
            "No pressure if now is busy; I appreciate any pointer you can share."
        )

    return (
        f"Hi {name}, I am Haichuan, a USC MS Analytics student graduating in Dec 2026. "
        f"I am applying for {role_text} at {company_text} and saw your work around {title_text}."
        f"{context_sentence} My recent work focuses on AI agent infrastructure: Wayfinder, "
        "a verified multi-agent codebase onboarding copilot, plus MCP tools for repo mapping, "
        "AST exploration, "
        "and test execution. Would you be open to a quick referral or a 10-minute chat? "
        "I can send my resume and the job link."
    )


def interview_prep(company: str, role: str, stage: str) -> InterviewPrepPacket:
    return InterviewPrepPacket(
        likely_format=[
            f"{stage}: recruiter screen or engineering conversation depending on company process.",
            "Expect resume deep dive, role fit, project explanation, and work authorization "
            "clarity.",
        ],
        coding_topics=[
            "Arrays/strings and hash maps",
            "Graph traversal or BFS/DFS",
            "API/backend data modeling",
            "Debugging with clear tradeoff communication",
        ],
        system_design_angle=[
            f"Frame ApplyOS/Wayfinder as practical agent systems relevant to {company}.",
            "Discuss human-in-the-loop boundaries and reliability checks.",
        ],
        project_stories=[
            "Wayfinder: verified multi-agent codebase onboarding copilot",
            "MCP Codebase Intelligence Toolkit: deterministic tools feeding agent decisions",
            "Backend & AWS Event-Driven Knowledge Platform: production backend fundamentals",
        ],
        behavioral_stories=[
            "Owning a scope correction when a project risked becoming too broad",
            "Debugging and documenting a reliability issue with clear follow-up",
        ],
        questions_to_ask=[
            f"What does success look like for a new grad in {role}?",
            "How does the team evaluate AI-assisted engineering workflows?",
            "What kinds of projects would a new hire own in the first six months?",
        ],
    )


async def maybe_openai_decision(payload: ParseJDRequest) -> AgentAnalysis:
    """Reserved for live model use; fallback remains authoritative without a configured key."""
    settings = get_settings()
    fallback = analyze_job(payload)
    if not settings.has_real_openai_key:
        return fallback

    # Keep the initial app robust: if the live call fails, preserve deterministic output.
    prompt = (
        "Analyze this job for an F-1 new grad AI Agent Engineer candidate. "
        "Return concise advice. Do not fabricate visa facts.\n\n"
        f"Company: {payload.company}\n"
        f"Role: {payload.title}\n"
        f"Location: {payload.location}\n"
        f"JD:\n{payload.jd_text}"
    )
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "input": prompt,
                    "max_output_tokens": 600,
                },
            )
            response.raise_for_status()
            data = response.json()
            output_text = _extract_response_text(data)
    except Exception:
        return fallback

    fallback.rationale.append(f"OpenAI note: {output_text[:500]}")
    fallback.source = "openai_augmented"
    return fallback


def _extract_response_text(data: dict[str, object]) -> str:
    output = data.get("output")
    if not isinstance(output, list):
        return ""
    chunks: list[str] = []
    for item in output:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                chunks.append(part["text"])
    return "\n".join(chunks).strip()

from app.agents.decision_agent import analyze_job, generate_outreach_message
from app.schemas.models import ParseJDRequest


def test_analyze_job_scores_agent_role() -> None:
    result = analyze_job(
        ParseJDRequest(
            company="Anthropic",
            title="Applied AI Engineer",
            location="San Francisco, CA",
            jd_text=(
                "Build LLM agent workflows with tool calling, retrieval, evals, APIs, "
                "and Python backend systems. Early career candidates welcome."
            ),
        )
    )

    assert result.role_category in {"AI Agent", "RAG / Retrieval"}
    assert result.apply_readiness >= 70
    assert result.recommended_resume == "AI Agent Engineer resume"
    assert "Wayfinder" in result.top_projects
    assert "site:linkedin.com/in USC Anthropic" in result.referral_search_query


def test_outreach_message_is_manual_review_draft() -> None:
    draft = generate_outreach_message(
        company="Databricks",
        role="Software Engineer, New Grad",
        contact_name="Alice",
        contact_title="backend platform",
        message_type="referral request",
    )

    assert "Hi Alice" in draft
    assert "Wayfinder" in draft
    assert "Would you be open" in draft
    assert "I can send my resume" in draft

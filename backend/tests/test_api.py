from fastapi.testclient import TestClient


def test_protected_job_flow(client: TestClient, auth_headers: dict[str, str]) -> None:
    unauthorized = client.get("/jobs")
    assert unauthorized.status_code == 401

    created = client.post(
        "/jobs",
        headers=auth_headers,
        json={
            "company": "Databricks",
            "title": "Software Engineer, New Grad",
            "location": "United States",
            "job_url": "https://example.com/jobs/1",
            "jd_text": "Python backend APIs, distributed systems, SQL, new grad welcome.",
        },
    )
    assert created.status_code == 201
    job_id = created.json()["id"]

    analysis = client.post(f"/jobs/{job_id}/analyze", headers=auth_headers)
    assert analysis.status_code == 200
    assert analysis.json()["apply_readiness"] > 0

    jobs = client.get("/jobs", headers=auth_headers)
    assert jobs.status_code == 200
    assert jobs.json()[0]["recommended_resume"] is not None

    contact = client.post(
        "/contacts",
        headers=auth_headers,
        json={"name": "Alice", "company": "Databricks", "title": "backend engineer"},
    )
    assert contact.status_code == 201
    contact_id = contact.json()["id"]

    message = client.post(
        "/outreach/generate",
        headers=auth_headers,
        json={"job_id": job_id, "contact_id": contact_id, "message_type": "referral request"},
    )
    assert message.status_code == 201
    assert "Databricks" in message.json()["draft_text"]

    dashboard = client.get("/dashboard/summary", headers=auth_headers)
    assert dashboard.status_code == 200
    assert dashboard.json()["total_jobs"] == 1


def test_resume_upload_and_daily_suggestion_add(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    resume = client.post(
        "/resumes",
        headers=auth_headers,
        json={
            "name": "ai-agent-resume.md",
            "source": "test upload",
            "content": "Wayfinder, MCP tools, RAG systems, backend APIs, and evaluation harnesses.",
        },
    )
    assert resume.status_code == 201
    assert resume.json()["name"] == "ai-agent-resume.md"

    resumes = client.get("/resumes", headers=auth_headers)
    assert resumes.status_code == 200
    assert len(resumes.json()) == 1

    suggestions = client.get("/daily/suggestions", headers=auth_headers)
    assert suggestions.status_code == 200
    suggestion_id = suggestions.json()[0]["id"]

    added = client.post(f"/daily/suggestions/{suggestion_id}/add", headers=auth_headers)
    assert added.status_code == 201
    assert added.json()["source"] == "daily suggestion"

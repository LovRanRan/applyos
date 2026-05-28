import re
from collections import Counter
from dataclasses import dataclass

TECH_TERMS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Python", ("python", "fastapi", "pydantic")),
    ("TypeScript", ("typescript", "next.js", "nextjs", "react")),
    ("Backend APIs", ("backend", "api", "apis", "microservice", "service")),
    ("SQL", ("sql", "postgres", "postgresql", "mysql", "database")),
    ("AWS", ("aws", "lambda", "sqs", "dynamodb", "ecs", "cloud")),
    ("Docker", ("docker", "container", "containers")),
    ("Kubernetes", ("kubernetes", "k8s")),
    ("LLM Agents", ("agent", "agents", "tool calling", "agentic")),
    ("RAG", ("rag", "retrieval", "vector search", "embedding", "embeddings")),
    ("Evals", ("eval", "evals", "evaluation", "benchmark")),
    ("MCP", ("mcp", "model context protocol")),
    ("Observability", ("observability", "logging", "monitoring", "tracing")),
    ("Data Pipelines", ("pipeline", "etl", "streaming", "batch")),
    ("Distributed Systems", ("distributed", "reliability", "scalability", "platform")),
    ("ML", ("machine learning", "ml", "model", "models")),
)


@dataclass(frozen=True)
class MatchResult:
    match_score: float
    matched_terms: list[str]
    missing_terms: list[str]
    score_hint: str


@dataclass(frozen=True)
class TermCount:
    term: str
    job_count: int
    mention_count: int


def normalize_text(*parts: object) -> str:
    return " ".join(str(part or "") for part in parts).lower()


def term_mentions(text: str) -> dict[str, int]:
    lowered = text.lower()
    mentions: dict[str, int] = {}
    for term, aliases in TECH_TERMS:
        count = 0
        for alias in aliases:
            pattern = re.escape(alias.lower())
            count += len(re.findall(pattern, lowered))
        if count:
            mentions[term] = count
    return mentions


def extract_terms(text: str) -> list[str]:
    return sorted(term_mentions(text).keys())


def score_against_context(job_text: str, context_text: str) -> MatchResult:
    job_terms = extract_terms(job_text)
    context_terms = set(extract_terms(context_text))
    matched = [term for term in job_terms if term in context_terms]
    missing = [term for term in job_terms if term not in context_terms]

    base = 64
    score = base + len(matched) * 5 - min(len(missing), 5) * 2
    if "LLM Agents" in matched or "Backend APIs" in matched:
        score += 5
    if "RAG" in matched or "MCP" in matched:
        score += 3
    if not context_text.strip():
        score = min(score, 72)
    score = max(45, min(98, score))

    if score >= 88:
        hint = "High: strong resume/profile overlap"
    elif score >= 78:
        hint = "Medium-high: good fit with a few gaps to verify"
    elif score >= 68:
        hint = "Medium: worth tracking, needs manual review"
    else:
        hint = "Low-medium: keep only if strategic"

    return MatchResult(
        match_score=round(float(score), 1),
        matched_terms=matched[:8],
        missing_terms=missing[:5],
        score_hint=hint,
    )


def count_terms_across_jobs(job_texts: list[str]) -> list[TermCount]:
    job_counter: Counter[str] = Counter()
    mention_counter: Counter[str] = Counter()
    for text in job_texts:
        mentions = term_mentions(text)
        for term, count in mentions.items():
            job_counter[term] += 1
            mention_counter[term] += count

    rows = [
        TermCount(term=term, job_count=job_counter[term], mention_count=mention_counter[term])
        for term in job_counter
    ]
    return sorted(rows, key=lambda row: (-row.job_count, row.term))


def pick_resume_version(job_text: str, resume_versions: list[str]) -> str:
    lowered = job_text.lower()
    candidates = resume_versions or [
        "AI Agent Engineer resume",
        "Backend SDE resume",
        "Data / ML / RAG resume",
    ]
    if any(term in lowered for term in ["agent", "llm", "rag", "retrieval", "mcp"]):
        return next((item for item in candidates if "agent" in item.lower()), candidates[0])
    if any(term in lowered for term in ["backend", "distributed", "platform", "api"]):
        return next((item for item in candidates if "backend" in item.lower()), candidates[0])
    if any(term in lowered for term in ["data", "ml", "machine learning", "sql"]):
        return next(
            (item for item in candidates if "data" in item.lower() or "ml" in item.lower()),
            candidates[0],
        )
    return candidates[0]

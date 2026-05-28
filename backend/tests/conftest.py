import os
from collections.abc import Generator
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi.testclient import TestClient

temp_dir = TemporaryDirectory()
db_file = Path(temp_dir.name) / "applyos-test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"
os.environ["APP_SECRET"] = "test-secret"
os.environ["OPENAI_API_KEY"] = "replace-with-your-openai-api-key"

from app.db.session import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def token(client: TestClient) -> str:
    response = client.post(
        "/auth/register",
        json={"email": "haichuan@example.com", "password": "password123", "name": "Haichuan"},
    )
    assert response.status_code == 201
    return str(response.json()["access_token"])


@pytest.fixture()
def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}

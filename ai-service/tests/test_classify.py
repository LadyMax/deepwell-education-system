"""Contract tests for /health and /classify (rule path, no external API calls)."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

# Import after conftest set env
from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_ok(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_classify_missing_token_401(client: TestClient) -> None:
    r = client.post("/classify", json={"content": "hello"})
    assert r.status_code == 401


def test_classify_wrong_token_401(client: TestClient) -> None:
    r = client.post(
        "/classify",
        json={"content": "hello"},
        headers={"X-Internal-Token": "wrong"},
    )
    assert r.status_code == 401


def test_classify_rule_path_shape_and_priority(client: TestClient) -> None:
    token = os.environ["INTERNAL_TOKEN"]
    r = client.post(
        "/classify",
        json={
            "subject": "Login help",
            "content": "I forgot my password and need access today",
            "senderRole": "student",
            "source": "web_portal",
        },
        headers={"X-Internal-Token": token},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["category"] == "technical_support"
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["modelVersion"] == "rule_v1"
    assert data["priority"] in ("normal", "high", "urgent")
    assert data["summary"]
    assert "classifiedAtUtc" in data
    assert data["suggestedReplyDraft"] is None or isinstance(data["suggestedReplyDraft"], str)
    assert isinstance(data.get("extracted"), (dict, type(None)))


def test_classify_course_inquiry_keywords(client: TestClient) -> None:
    token = os.environ["INTERNAL_TOKEN"]
    r = client.post(
        "/classify",
        json={"content": "What is the schedule for the beginner Spanish class?"},
        headers={"X-Internal-Token": token},
    )
    assert r.status_code == 200
    assert r.json()["category"] == "course_inquiry"


def test_classify_accepts_camel_case_request(client: TestClient) -> None:
    token = os.environ["INTERNAL_TOKEN"]
    r = client.post(
        "/classify",
        json={
            "messageId": "00000000-0000-0000-0000-000000000001",
            "subject": "Hi",
            "content": "General hello",
            "senderRole": "student",
        },
        headers={"X-Internal-Token": token},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["category"] in (
        "course_inquiry",
        "technical_support",
        "complaint",
        "feedback",
        "general_question",
    )

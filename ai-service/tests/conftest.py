"""Test env: fixed token, no OpenAI key so /classify always uses rule fallback."""

from __future__ import annotations

import os

# Conftest loads before test modules import `main`; block .env from turning on a real model.
os.environ.setdefault("INTERNAL_TOKEN", "pytest-internal-token")
os.environ["OPENAI_API_KEY"] = ""

"""Load `.env` from this package directory and expose settings."""

from pathlib import Path
import os

from dotenv import load_dotenv

_root = Path(__file__).resolve().parent
load_dotenv(_root / ".env")

OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
APP_MODEL_VERSION = os.getenv("APP_MODEL_VERSION", "langchain-v1")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "dev-internal-token")

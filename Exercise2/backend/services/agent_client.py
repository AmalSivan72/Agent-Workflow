from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)
GEMINI_MODEL = "gemini-3.5-flash-lite"


@lru_cache(maxsize=1)
def get_gemini_client() -> genai.Client:
    """Return a cached Gemini client configured from backend/.env or the environment."""
    load_dotenv(ENV_FILE)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Set GEMINI_API_KEY in backend/.env or the environment before running the agent.")
    return genai.Client(api_key=api_key)


def _generate_with_gemini(prompt: str) -> str:
    response = get_gemini_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "input": {"type": "STRING"},
                    "thinking": {"type": "STRING"},
                    "output": {"type": "STRING"},
                },
                "required": ["input", "thinking", "output"],
                "propertyOrdering": ["input", "thinking", "output"],
            },
        ),
    )
    return getattr(response, "text", "") or ""


def generate_json(prompt: str) -> str:
    """Generate an agent trace using the provider selected by ``LLM_PROVIDER``."""
    load_dotenv(ENV_FILE)
    provider = os.getenv("LLM_PROVIDER", "gemini").strip().lower()
    if provider == "gemini":
        return _generate_with_gemini(prompt)
    if provider == "azure":
        from .azure_client import generate_json as generate_with_azure

        return generate_with_azure(prompt)
    raise ValueError(
        f"Unsupported LLM_PROVIDER {provider!r}. Choose 'gemini' or 'azure'."
    )

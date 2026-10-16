from __future__ import annotations

from functools import lru_cache

AZURE_PROJECT_ENDPOINT = "https://bfs-to-dev-foundry.services.ai.azure.com/api/projects/bfs-loop-engineering"
AZURE_MODEL = "Kimi-K2.7-Code"


@lru_cache(maxsize=1)
def get_azure_openai_client():
    """Create a cached Azure AI Foundry OpenAI-compatible client on first use."""
    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential

    project_client = AIProjectClient(
        endpoint=AZURE_PROJECT_ENDPOINT,
        credential=DefaultAzureCredential(),
    )
    return project_client.get_openai_client()


def generate_json(prompt: str) -> str:
    """Generate a JSON agent trace from the configured Azure AI Foundry deployment."""
    response = get_azure_openai_client().chat.completions.create(
        model=AZURE_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""
# Agent workflow backend

Run the API from the `LoopingExercises` project root:

```powershell
uvicorn Exercise2.backend.main:app --host 0.0.0.0 --port 8000
```

Set `LLM_PROVIDER` in this backend's `.env` to `gemini` or `azure` (defaults to `gemini`) to choose the model provider used by all workflow agents. Restart the backend after changing the setting.

- **Gemini:** Set `GEMINI_API_KEY`. The model name is configured in `services/agent_client.py`.
- **Azure AI Foundry:** The project endpoint and deployment name are configured in `services/azure_client.py`. Authentication uses `DefaultAzureCredential`, such as an active Azure CLI login or a configured managed identity.

Generated workflow files are stored in `backend/generated/agent_runs/`.

The backend owns its Gemini client, workflow agents, and tools. It does not import client or tool implementations from the other exercises.

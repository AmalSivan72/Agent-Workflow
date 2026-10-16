# Agent workflow backend

Run the API from the `LoopingExercises` project root:

```powershell
uvicorn Exercise2.backend.main:app --host 0.0.0.0 --port 8000
```

The Gemini client reads `GEMINI_API_KEY` and the optional `GEMINI_MODEL` from the process environment or this backend's `.env` file. Generated workflow files are stored in `backend/generated/agent_runs/`.

The backend owns its Gemini client, workflow agents, and tools. It does not import client or tool implementations from the other exercises.

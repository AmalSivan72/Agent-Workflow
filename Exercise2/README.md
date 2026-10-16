# Agent Workflow Visualizer

This application contains a FastAPI backend and a React + TypeScript frontend. The backend runs the agent workflow and exposes its workflow definition and streaming execution events; the frontend renders and inspects those events with XYFlow.

## Prerequisites

- Python 3.12
- Node.js and npm
- A Gemini API key for running agent workflows

## Install

Run the backend setup from the repository root (the directory containing `Exercise2`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r Exercise2\backend\requirements.txt
```

Install the frontend packages:

```powershell
Set-Location Exercise2\frontend
npm ci
```

## Configure Gemini

Create `Exercise2\backend\.env` and add your Gemini API key:

```dotenv
GEMINI_API_KEY=your-gemini-api-key
```

The backend also accepts `GEMINI_API_KEY` as a process environment variable. `GEMINI_MODEL` is optional; if omitted, the backend uses `gemini-3.5-flash-lite`.

Keep API keys private. Do not add them to frontend code or commit them to source control.

## Run the application

Start the backend from the repository root in one terminal:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn Exercise2.backend.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, start the frontend:

```powershell
Set-Location Exercise2\frontend
npm run dev
```

Open the local URL printed by Vite (by default, <http://localhost:5173>). Keep both terminals running while using the application. The frontend connects to the backend at `http://127.0.0.1:8000`.

The backend health endpoint is <http://127.0.0.1:8000/health>. The workflow definition is available at <http://127.0.0.1:8000/api/workflow/definition>. Agent runs require a valid Gemini API key.

## Generated files

Each run writes generated test and implementation files under `Exercise2\backend\generated\agent_runs\`.

## Development checks

Run the frontend production build and linter:

```powershell
Set-Location Exercise2\frontend
npm run build
npm run lint
```

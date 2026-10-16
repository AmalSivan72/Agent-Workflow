from __future__ import annotations

import json
import sys
from collections.abc import Callable, Iterator
from pathlib import Path
from queue import Empty, Queue
from threading import Thread
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

if __package__:
    from .models import AgentRequest, AgentTrace, WorkflowState
    from .services.agent_client import generate_json
    from Exercise2.backend.workflow.workflow import build_agent_loop, build_agent_payload as _build_agent_payload
    from Exercise2.backend.workflow.definition import get_workflow_definition
    from Exercise2.backend.workflow.workflow_config import MAX_TEST_ATTEMPTS, RUNS_DIR
else:
    backend_parent = Path(__file__).resolve().parents[2]
    if str(backend_parent) not in sys.path:
        sys.path.insert(0, str(backend_parent))
    from Exercise2.backend.models import AgentRequest, AgentTrace, WorkflowState
    from Exercise2.backend.services.agent_client import generate_json
    from Exercise2.backend.workflow.workflow import (
        build_agent_loop,
        build_agent_payload as _build_agent_payload,
    )
    from Exercise2.backend.workflow.definition import get_workflow_definition
    from Exercise2.backend.workflow.workflow_config import MAX_TEST_ATTEMPTS, RUNS_DIR

__all__ = [
    "AgentRequest",
    "AgentTrace",
    "MAX_TEST_ATTEMPTS",
    "RUNS_DIR",
    "WorkflowState",
    "app",
    "build_agent_loop",
    "build_agent_payload",
    "generate_json",
    "health_check",
    "preflight_run_agent",
    "run_agent",
    "run_agent_stream",
    "workflow_definition",
]

app = FastAPI(title="TDD Agent Visualization API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/api/run-agent")
def preflight_run_agent() -> dict[str, str]:
    return {"status": "ok"}


def build_agent_payload(
    spec: str,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    run_directory: Path | None = None,
) -> dict[str, Any]:
    return _build_agent_payload(
        spec,
        on_event=on_event,
        run_directory=run_directory or RUNS_DIR / uuid4().hex,
        agent_generator=generate_json,
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/workflow/definition")
def workflow_definition() -> dict[str, Any]:
    return get_workflow_definition()


@app.post("/api/run-agent")
def run_agent(request: AgentRequest) -> dict[str, Any]:
    specification = request.specification.strip()
    if not specification:
        raise HTTPException(status_code=400, detail="Specification content is required.")
    return build_agent_payload(specification)


@app.post("/api/run-agent/stream")
def run_agent_stream(request: AgentRequest) -> StreamingResponse:
    specification = request.specification.strip()
    if not specification:
        raise HTTPException(status_code=400, detail="Specification content is required.")

    events: Queue[dict[str, Any] | None] = Queue()

    def run_workflow() -> None:
        try:
            result = build_agent_payload(specification, on_event=events.put)
            events.put({"type": "complete", "result": result})
        except Exception as exc:
            events.put({"type": "error", "message": str(exc)})
        finally:
            events.put(None)

    def stream_events() -> Iterator[str]:
        Thread(target=run_workflow, daemon=True).start()
        while True:
            try:
                event = events.get(timeout=15)
            except Empty:
                yield ": keep-alive\n\n"
                continue
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        stream_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

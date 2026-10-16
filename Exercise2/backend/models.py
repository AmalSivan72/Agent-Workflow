from __future__ import annotations

from typing import Any, TypedDict

from pydantic import BaseModel


class AgentTrace(TypedDict):
    input: str
    thinking: str
    output: str


class WorkflowState(TypedDict):
    spec: str
    run_dir: str
    last_node: str
    test_case_generator: AgentTrace
    code_generator: AgentTrace
    reviewer: AgentTrace
    test_code: str
    implementation_code: str
    iteration: int
    test_result: dict[str, Any]
    tool_calls: list[dict[str, Any]]
    final_result: str


class AgentRequest(BaseModel):
    specification: str

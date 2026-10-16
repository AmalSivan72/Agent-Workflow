from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any
from uuid import uuid4

from langgraph.graph import END, StateGraph

from Exercise2.backend.agents.code_generator import code_generator
from Exercise2.backend.agents.reviewer import reviewer
from Exercise2.backend.agents.shared import AgentGenerator
from Exercise2.backend.agents.case_generator import test_case_generator
from Exercise2.backend.models import WorkflowState
from Exercise2.backend.services.agent_client import generate_json as default_agent_generator
from Exercise2.backend.workflow.workflow_config import MAX_TEST_ATTEMPTS, RUNS_DIR


def route_after_review(state: WorkflowState) -> str:
    if state["test_result"].get("passed"):
        return "finish"
    if state["iteration"] < MAX_TEST_ATTEMPTS:
        return "retry"
    return "finish"


def finish(state: WorkflowState) -> dict[str, Any]:
    test_result = state["test_result"]
    if test_result.get("passed"):
        final_result = (
            f"All {len(test_result.get('passed_tests', []))} generated tests passed "
            f"on attempt {state['iteration']} of {MAX_TEST_ATTEMPTS}."
        )
    else:
        failures = ", ".join(test_result.get("failed_tests", [])) or "see pytest output"
        final_result = (
            f"Generated tests still fail after {state['iteration']} of {MAX_TEST_ATTEMPTS} "
            f"attempts. Failing tests: {failures}."
        )
    return {"final_result": final_result}


def build_agent_loop(
    on_event: Callable[[dict[str, Any]], None] | None = None,
    agent_generator: AgentGenerator = default_agent_generator,
):
    builder = StateGraph(WorkflowState)

    def instrument(
        node_name: str,
        node_function: Callable[[WorkflowState], dict[str, Any]],
    ) -> Callable[[WorkflowState], dict[str, Any]]:
        def run(state: WorkflowState) -> dict[str, Any]:
            if on_event:
                on_event({"type": "node_start", "node": node_name, "from": state.get("last_node", "")})
            update = node_function(state)
            if on_event:
                on_event({"type": "node_complete", "node": node_name, "trace": update.get(node_name)})
            return {**update, "last_node": node_name}

        return run

    builder.add_node(
        "test_case_generator",
        instrument(
            "test_case_generator",
            lambda state: test_case_generator(state, on_event, agent_generator),
        ),
    )
    builder.add_node(
        "code_generator",
        instrument(
            "code_generator",
            lambda state: code_generator(state, on_event, agent_generator),
        ),
    )
    builder.add_node(
        "reviewer",
        instrument(
            "reviewer",
            lambda state: reviewer(state, on_event, agent_generator),
        ),
    )
    builder.add_node("finish", finish)
    builder.set_entry_point("test_case_generator")
    builder.add_edge("test_case_generator", "code_generator")
    builder.add_edge("code_generator", "reviewer")
    builder.add_conditional_edges(
        "reviewer",
        route_after_review,
        {"retry": "code_generator", "finish": "finish"},
    )
    builder.add_edge("finish", END)
    return builder.compile()


def build_agent_payload(
    spec: str,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    run_directory: Path | None = None,
    agent_generator: AgentGenerator = default_agent_generator,
) -> dict[str, Any]:
    run_dir = run_directory or RUNS_DIR / uuid4().hex
    run_dir.mkdir(parents=True, exist_ok=True)
    graph = build_agent_loop(on_event=on_event, agent_generator=agent_generator)
    result = graph.invoke({
        "spec": spec,
        "run_dir": str(run_dir),
        "last_node": "",
        "test_case_generator": {"input": "", "thinking": "", "output": ""},
        "code_generator": {"input": "", "thinking": "", "output": ""},
        "reviewer": {"input": "", "thinking": "", "output": ""},
        "test_code": "",
        "implementation_code": "",
        "iteration": 0,
        "test_result": {"passed": False, "stdout": "", "stderr": "", "failed_tests": [], "passed_tests": []},
        "tool_calls": [],
        "final_result": "",
    })

    return {
        "project": "TDD agent visualization",
        "spec": spec,
        "status": "completed" if result["test_result"].get("passed") else "failed",
        "workflow": [
            "test_case_generator",
            "write_test_cases",
            "code_generator",
            "write_implementation",
            "reviewer",
            "run_pytest",
            "retry_or_finish",
            "finish",
        ],
        "iteration": result["iteration"],
        "max_iterations": MAX_TEST_ATTEMPTS,
        "test_result": result["test_result"],
        "tool_calls": result["tool_calls"],
        "artifacts": {
            "test_file": str(run_dir / "test_implementation.py"),
            "implementation_file": str(run_dir / "implementation.py"),
        },
        "agents": [
            {
                "name": "Test Case Generator",
                "role": "Generates all specification-based acceptance tests",
                "trace": result["test_case_generator"],
            },
            {
                "name": "Code Generator",
                "role": "Implements the specification and fixes real test failures",
                "trace": result["code_generator"],
            },
            {
                "name": "Reviewer",
                "role": "Runs generated tests and decides pass, retry, or iteration limit",
                "trace": result["reviewer"],
            },
        ],
        "final_result": result.get("final_result", "Workflow completed."),
    }

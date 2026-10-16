"""Test-generation agent node."""

from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..models import WorkflowState
from ..tools.file_tools import write_file
from .shared import AgentGenerator, call_agent, invoke_tool, strip_code_fence


def test_case_generator(
    state: WorkflowState,
    on_event: Callable[[dict[str, Any]], None] | None,
    generate_json: AgentGenerator,
) -> dict[str, Any]:
    context = f"""User specification:
{state['spec']}

Generate a complete pytest acceptance suite for the specification. Cover all stated valid cases, meaningful boundaries, and invalid cases that the specification requires. Do not invent extra requirements or write an implementation. Output only executable Python test code. The tests must import the function or class under test from a module named implementation. Do not use placeholder assertions or skip tests."""
    trace = call_agent(
        "Test Case Generator",
        "test design agent that derives a complete acceptance suite from a user specification",
        context,
        generate_json,
    )
    test_code = strip_code_fence(trace["output"])
    if not test_code:
        raise ValueError("Test Case Generator returned empty test code.")

    _, tool_call = invoke_tool(
        node="write_test_cases",
        owner="test_case_generator",
        tool=write_file,
        tool_input={
            "content": test_code,
            "file_path": str(Path(state["run_dir"]) / "test_implementation.py"),
        },
        on_event=on_event,
    )
    return {
        "test_case_generator": trace,
        "test_code": test_code,
        "tool_calls": [*state["tool_calls"], tool_call],
    }

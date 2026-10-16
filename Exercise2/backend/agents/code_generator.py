from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..models import WorkflowState
from ..tools.file_tools import write_file
from Exercise2.backend.workflow.workflow_config import MAX_TEST_ATTEMPTS
from .shared import AgentGenerator, call_agent, invoke_tool, strip_code_fence, tool_text


def code_generator(
    state: WorkflowState,
    on_event: Callable[[dict[str, Any]], None] | None,
    generate_json: AgentGenerator,
) -> dict[str, Any]:
    iteration = state["iteration"]
    repair_context = ""
    if iteration:
        repair_context = f"""
Previous implementation:
{state['implementation_code']}

Pytest result from attempt {iteration}:
{tool_text(state['test_result'])}

Fix the implementation to satisfy the failing tests. Keep the existing tests unchanged. This is implementation attempt {iteration + 1} of {MAX_TEST_ATTEMPTS}."""
    context = f"""User specification:
{state['spec']}

Acceptance tests generated from that specification:
{state['test_code']}
{repair_context}

Output only the complete executable Python module source for implementation.py. Implement the contract directly; do not include tests or markdown fences."""
    trace = call_agent(
        "Code Generator",
        "implementation agent that implements the user specification and repairs code from real pytest failures",
        context,
        generate_json,
    )
    implementation_code = strip_code_fence(trace["output"])
    if not implementation_code:
        raise ValueError("Code Generator returned empty implementation code.")

    _, tool_call = invoke_tool(
        node="write_implementation",
        owner="code_generator",
        tool=write_file,
        tool_input={
            "content": implementation_code,
            "file_path": str(Path(state["run_dir"]) / "implementation.py"),
        },
        on_event=on_event,
    )
    return {
        "code_generator": trace,
        "implementation_code": implementation_code,
        "tool_calls": [*state["tool_calls"], tool_call],
    }

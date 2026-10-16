from collections.abc import Callable
from typing import Any

from ..models import WorkflowState
from ..tools.pytest_runner import run_pytest
from .shared import AgentGenerator, call_agent, invoke_tool, tool_text


def reviewer(
    state: WorkflowState,
    on_event: Callable[[dict[str, Any]], None] | None,
    generate_json: AgentGenerator,
) -> dict[str, Any]:
    test_result, tool_call = invoke_tool(
        node="run_pytest",
        owner="reviewer",
        tool=run_pytest,
        tool_input={"generated_dir": state["run_dir"]},
        on_event=on_event,
    )
    iteration = state["iteration"] + 1
    context = f"""User specification:
{state['spec']}

Generated acceptance tests:
{state['test_code']}

Implementation under review:
{state['implementation_code']}

Actual pytest run, attempt {iteration}:
{tool_text(test_result)}

Review the actual test result. Report passed and failed test cases and the concrete failures. Do not claim tests passed unless the pytest result says passed=true. The workflow retries only when tests fail and attempts remain."""
    trace = call_agent(
        "Reviewer",
        "test reviewer that evaluates the actual pytest tool result and reports whether the implementation passes",
        context,
        generate_json,
    )
    return {
        "reviewer": trace,
        "iteration": iteration,
        "test_result": test_result,
        "tool_calls": [*state["tool_calls"], tool_call],
    }

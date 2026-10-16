from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..models import WorkflowState
from ..tools.file_tools import write_file
from Exercise2.backend.workflow.workflow_config import MAX_TEST_ATTEMPTS
from .shared import AgentGenerator, call_agent, invoke_tool, strip_code_fence, tool_text

INITIAL_GENERATION_INSTRUCTIONS = """MANDATORY TDD DEMO REQUIREMENT: The initial implementation MUST fail at least one, and no more than two, of the supplied pytest assertions. Do not produce a fully passing implementation on this first attempt.

Read the acceptance tests and select one or two concrete assertions. Deliberately implement the specific behavior checked by those assertions incorrectly (for example, make a narrowly scoped boundary, rounding, comparison, or arithmetic mistake) so those assertions will fail when pytest executes. Make the wrong behavior observable as a normal assertion mismatch with an incorrect return value, not as a syntax/import error or a crash. Implement the public API correctly and keep the rest of the behavior correct so pytest can collect and run the entire suite and the failure is suitable for the Code Fixer to diagnose.

Before returning, mentally evaluate your chosen defect against the selected assertion(s): verify that the actual result from your first-draft code differs from the expected value in the test. If the tests would all pass, revise the implementation until one or two assertions will fail. Do not modify, skip, weaken, or rewrite any tests. The following Code Fixer attempt will receive the actual pytest output and must remove this intentional defect while preserving all specified behavior. Return the complete, syntactically valid implementation module source only; do not include tests, explanations, or markdown fences."""

REPAIR_INSTRUCTIONS = """You are now the Code Fixer. Treat the actual pytest output below as the primary diagnostic evidence. Read every failed test ID, assertion/traceback, expected value, and observed value; connect each failure to the specification and the current implementation, then fix the underlying cause with the smallest correct change.

Preserve the tested public API and all correct behavior. Do not modify, skip, weaken, or special-case the tests; do not merely make the reported example pass if that breaks boundaries or other requirements. Recheck the full supplied test suite mentally, including previously passing tests and relevant edge cases. Return the complete corrected implementation.py source only. This is the final repair attempt."""


def code_generator(
    state: WorkflowState,
    on_event: Callable[[dict[str, Any]], None] | None,
    generate_json: AgentGenerator,
) -> dict[str, Any]:
    iteration = state["iteration"]
    if iteration:
        prompt_instructions = f"""{REPAIR_INSTRUCTIONS}

Previous implementation:
{state['implementation_code']}

Actual pytest result from attempt {iteration}:
{tool_text(state['test_result'])}

Repair attempt {iteration + 1} of {MAX_TEST_ATTEMPTS}."""
        agent_name = "Code Fixer"
        agent_role = "implementation repair agent that diagnoses actual pytest failures and corrects the implementation"
    else:
        prompt_instructions = INITIAL_GENERATION_INSTRUCTIONS
        agent_name = "Code Generator"
        agent_role = "initial implementation agent that produces a plausible draft for the acceptance suite"

    context = f"""User specification:
{state['spec']}

Acceptance tests generated from that specification:
{state['test_code']}

{prompt_instructions}

Output only the complete executable Python module source for implementation.py. Do not include tests, commentary, or markdown fences."""
    trace = call_agent(
        agent_name,
        agent_role,
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

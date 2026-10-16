"""Test-generation agent node."""

import ast
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

Generate a complete pytest acceptance suite for the specification. Cover all stated valid cases, meaningful boundaries, and invalid cases that the specification requires. Do not invent extra requirements or write an implementation. The tests must import the function or class under test from a module named implementation. Do not use placeholder assertions or skip tests.

Formatting is mandatory: output normal, readable Python source with real line breaks between every import, statement, and test function. Put each top-level test function on its own lines, use standard indentation, and separate functions with a blank line. Do not compress the file into one line or join statements with spaces/semicolons. Output only executable Python test code without markdown fences or commentary."""
    trace = call_agent(
        "Test Case Generator",
        "test design agent that derives a complete acceptance suite from a user specification",
        context,
        generate_json,
    )
    test_code = strip_code_fence(trace["output"])
    if not test_code:
        raise ValueError("Test Case Generator returned empty test code.")

    try:
        ast.parse(test_code, filename="test_implementation.py")
    except SyntaxError as syntax_error:
        syntax_location = (
            f"line {syntax_error.lineno}, column {syntax_error.offset}"
            if syntax_error.lineno is not None
            else "unknown location"
        )
        repair_context = f"""The test suite you generated is not valid Python. Python reported:
{syntax_error.msg} at {syntax_location}.

Regenerate the same acceptance suite as valid, readable Python. Preserve the intended assertions and test coverage; only correct the source structure/formatting as needed. Use real newlines between imports, statements, and each test function, with normal indentation and blank lines between functions. Never put multiple top-level statements or function definitions on one line. Return only the complete test file source, without markdown fences or commentary.

Invalid generated test source:
{test_code}"""
        trace = call_agent(
            "Test Suite Formatter",
            "Python syntax repair agent that preserves test intent while formatting a generated pytest suite as valid source",
            repair_context,
            generate_json,
        )
        test_code = strip_code_fence(trace["output"])
        if not test_code:
            raise ValueError("Test Suite Formatter returned empty test code.")
        try:
            ast.parse(test_code, filename="test_implementation.py")
        except SyntaxError as repaired_error:
            repaired_location = (
                f"line {repaired_error.lineno}, column {repaired_error.offset}"
                if repaired_error.lineno is not None
                else "unknown location"
            )
            raise ValueError(
                "Generated pytest source is still invalid after one syntax-repair pass: "
                f"{repaired_error.msg} at {repaired_location}."
            ) from repaired_error

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

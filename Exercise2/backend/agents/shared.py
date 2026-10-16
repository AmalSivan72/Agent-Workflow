from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any
from uuid import uuid4

from langchain_core.tools import BaseTool

from ..models import AgentTrace

AgentGenerator = Callable[[str], str]


def strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return cleaned


def parse_agent_json(raw_response: str) -> AgentTrace:
    payload = strip_code_fence(raw_response)
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini response was not valid JSON: {payload}") from exc

    if not isinstance(parsed, dict):
        raise TypeError("Gemini response must be a JSON object.")

    missing = [key for key in ("input", "thinking", "output") if key not in parsed]
    if missing:
        raise ValueError(f"Gemini response missing keys: {missing}")

    return {
        "input": str(parsed["input"]),
        "thinking": str(parsed["thinking"]),
        "output": str(parsed["output"]),
    }


def call_agent(
    agent_name: str,
    role: str,
    context: str,
    generate_json: AgentGenerator,
) -> AgentTrace:
    prompt = f"""You are {agent_name}, acting as a {role}. 
Respond with valid JSON only. The JSON must contain exactly these three keys: input, thinking, output.

Context:
{context}

Rules:
- input: a concise summary of the information reaching this agent
- thinking: the real reasoning this agent would use to decide what to do next
- output: the concrete message, plan, or result produced by this agent
- Do not include markdown fences, commentary, or extra keys.
"""
    return parse_agent_json(generate_json(prompt))


def tool_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)


def invoke_tool(
    *,
    node: str,
    owner: str,
    tool: BaseTool,
    tool_input: dict[str, Any],
    on_event: Callable[[dict[str, Any]], None] | None,
) -> tuple[Any, dict[str, Any]]:
    invocation_id = str(uuid4())
    input_text = tool_text(tool_input)
    if on_event:
        on_event({
            "type": "tool_start",
            "node": node,
            "owner": owner,
            "tool_name": tool.name,
            "invocation_id": invocation_id,
            "input": input_text,
        })

    try:
        result = tool.invoke(tool_input)
        status = "success"
    except Exception as exc:
        result = str(exc)
        status = "error"

    call = {
        "invocation_id": invocation_id,
        "node": node,
        "owner": owner,
        "tool_name": tool.name,
        "input": input_text,
        "output": tool_text(result),
        "status": status,
    }
    if on_event:
        on_event({"type": "tool_complete", "node": node, "owner": owner, "tool_call": call})
    if status == "error":
        raise RuntimeError(f"Tool {tool.name} failed: {result}")
    return result, call

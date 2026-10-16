from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from langchain.tools import tool


@tool
def run_pytest(generated_dir: str) -> dict[str, Any]:
    """Run generated pytest files in an isolated temporary workspace."""
    source = Path(generated_dir).resolve()
    if not source.is_dir():
        return {
            "passed": False,
            "stdout": "",
            "stderr": f"Generated test directory does not exist: {source}",
            "exit_code": 2,
            "passed_tests": [],
            "failed_tests": [],
        }

    with tempfile.TemporaryDirectory(prefix="agent-workflow-pytest-") as temporary_dir:
        isolated_root = Path(temporary_dir)
        isolated_generated = isolated_root / "generated"
        shutil.copytree(source, isolated_generated)
        report_path = isolated_root / "pytest-results.xml"
        command = [
            sys.executable,
            "-m",
            "pytest",
            str(isolated_generated),
            "-v",
            f"--junitxml={report_path}",
        ]
        try:
            result = subprocess.run(
                command,
                cwd=isolated_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=120,
            )
            stdout, stderr, exit_code = result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired as error:
            stdout = error.stdout or ""
            stderr = (error.stderr or "") + "\npytest timed out after 120 seconds."
            exit_code = 124

        passed_tests: list[str] = []
        failed_tests: list[str] = []
        if report_path.exists():
            try:
                root = ET.parse(report_path).getroot()
                for case in root.iter("testcase"):
                    class_name = case.get("classname", "").removeprefix("generated.")
                    test_id = f"{class_name}::{case.get('name', '')}"
                    if case.find("failure") is not None or case.find("error") is not None:
                        failed_tests.append(test_id)
                    elif case.find("skipped") is None:
                        passed_tests.append(test_id)
            except ET.ParseError:
                stderr += "\nCould not parse pytest's JUnit report."

    return {
        "passed": exit_code == 0,
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": exit_code,
        "passed_tests": passed_tests,
        "failed_tests": failed_tests,
    }

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
MAX_TEST_ATTEMPTS = 2
RUNS_DIR = BACKEND_DIR / "generated" / "agent_runs"

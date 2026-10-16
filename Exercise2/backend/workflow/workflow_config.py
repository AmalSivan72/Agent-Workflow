from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
MAX_TEST_ATTEMPTS = 3
RUNS_DIR = BACKEND_DIR / "generated" / "agent_runs"

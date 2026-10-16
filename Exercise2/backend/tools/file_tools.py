from pathlib import Path

from langchain.tools import tool


@tool
def write_file(content: str, file_path: str) -> str:
    """Write generated content to a file."""
    destination = Path(file_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")
    return f"Successfully written to {destination}"

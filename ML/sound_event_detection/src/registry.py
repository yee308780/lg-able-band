from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from utils import ensure_directory


def load_registry(registry_path: Path) -> dict[str, Any]:
    if not registry_path.exists():
        return {"entries": []}

    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    if "entries" not in registry:
        registry["entries"] = []
    return registry


def save_registry(registry_path: Path, registry: dict[str, Any]) -> None:
    ensure_directory(registry_path.parent)
    registry_path.write_text(
        json.dumps(registry, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def append_registry_entry(registry_path: Path, entry: dict[str, Any]) -> dict[str, Any]:
    registry = load_registry(registry_path)
    registry["entries"].append(entry)
    save_registry(registry_path, registry)
    return registry

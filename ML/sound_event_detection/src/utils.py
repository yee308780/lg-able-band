from __future__ import annotations

import json
from pathlib import Path
import random
import re
from typing import Any

import numpy as np
import torch
import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    resolved_config_path = Path(config_path) if config_path else PROJECT_ROOT / "configs" / "config.yaml"
    resolved_config_path = resolved_config_path.resolve()
    config = yaml.safe_load(resolved_config_path.read_text(encoding="utf-8"))
    config["config_path"] = str(resolved_config_path)
    return config


def resolve_project_path(path_value: str | Path) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return (PROJECT_ROOT / path).resolve()


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def select_device(device_name: str) -> torch.device:
    if device_name == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(device_name)


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def run_name(experiment_name: str) -> str:
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{timestamp}-{experiment_name}"


def save_json(path: Path, data: dict[str, Any]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def timestamp_id() -> str:
    from datetime import datetime

    return datetime.now().strftime("%Y%m%d-%H%M%S-%f")


def cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    denominator = float(np.linalg.norm(vector_a) * np.linalg.norm(vector_b))
    if denominator == 0:
        return 0.0
    return float(np.dot(vector_a, vector_b) / denominator)


def slugify_name(value: str) -> str:
    normalized = re.sub(r"\s+", "_", value.strip())
    normalized = re.sub(r"[^A-Za-z0-9_.-]", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized)
    return normalized.strip("._") or "enrollment"

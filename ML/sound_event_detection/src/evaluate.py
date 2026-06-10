from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, precision_recall_fscore_support

from embedding import (
    build_embedding_model,
    build_feature_extractor,
    extract_audio_embedding,
    load_audio,
    prepare_waveform,
)
from registry import load_registry
from utils import cosine_similarity, load_config, resolve_project_path, save_json, select_device, timestamp_id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate the personalized sound matching system on enrolled sounds and optional unknown sounds."
    )
    parser.add_argument("--threshold", type=float, default=None, help="Override similarity threshold.")
    parser.add_argument("--top-k", type=int, default=None, help="How many ranked candidates to include.")
    parser.add_argument(
        "--unknown-dir",
        type=str,
        default=None,
        help="Optional directory of unknown wav/mp3 files that should be rejected as unknown.",
    )
    parser.add_argument("--save-json", action="store_true", help="Save evaluation JSON under outputs/reports.")
    parser.add_argument("--config", type=str, default=None, help="Path to a YAML config file.")
    return parser.parse_args()


def build_identity_label(entry: dict) -> str:
    name = str(entry.get("registered_sound_name") or "").strip()
    sound_type = str(entry.get("sound_type") or "").strip()
    if sound_type:
        return f"{name} [{sound_type}]"
    return name or "unknown"


def build_ranked_matches(
    entries: list[dict],
    query_embedding: np.ndarray,
    exclude_entry_id: str | None = None,
) -> list[dict]:
    ranked_matches: list[dict] = []

    for entry in entries:
        if exclude_entry_id is not None and entry["id"] == exclude_entry_id:
            continue

        embedding_path = Path(entry["embedding_path"])
        if not embedding_path.exists():
            continue

        enrolled_embedding = np.load(embedding_path)
        similarity = cosine_similarity(query_embedding, enrolled_embedding)
        ranked_matches.append(
            {
                "enrollment_id": entry["id"],
                "registered_sound_name": entry["registered_sound_name"],
                "sound_type": entry["sound_type"],
                "label": build_identity_label(entry),
                "similarity": similarity,
                "enrollment_audio_path": entry["enrollment_audio_path"],
                "source_audio_path": entry["source_audio_path"],
            }
        )

    return sorted(ranked_matches, key=lambda item: item["similarity"], reverse=True)


def predict_label(
    ranked_matches: list[dict],
    threshold: float,
    unknown_label: str,
    top_k: int,
) -> tuple[str, float, list[dict]]:
    top_matches = ranked_matches[:top_k]
    best_match = top_matches[0] if top_matches else None
    if best_match is None:
        return unknown_label, 0.0, top_matches

    similarity = float(best_match["similarity"])
    if similarity >= threshold:
        return str(best_match["label"]), similarity, top_matches
    return unknown_label, similarity, top_matches


def evaluate_registered_entries(
    entries: list[dict],
    threshold: float,
    top_k: int,
    unknown_label: str,
) -> list[dict]:
    results: list[dict] = []

    for entry in entries:
        query_embedding = np.load(entry["embedding_path"])
        ranked_matches = build_ranked_matches(entries, query_embedding, exclude_entry_id=entry["id"])
        predicted_label, similarity, top_matches = predict_label(
            ranked_matches=ranked_matches,
            threshold=threshold,
            unknown_label=unknown_label,
            top_k=top_k,
        )
        expected_label = build_identity_label(entry)
        results.append(
            {
                "query_kind": "registered",
                "query_path": entry["source_audio_path"],
                "query_entry_id": entry["id"],
                "expected_label": expected_label,
                "predicted_label": predicted_label,
                "similarity": similarity,
                "correct": predicted_label == expected_label,
                "top_matches": top_matches,
            }
        )

    return results


def evaluate_unknown_entries(
    unknown_dir: Path | None,
    entries: list[dict],
    threshold: float,
    top_k: int,
    unknown_label: str,
    model_name: str,
    sample_rate: int,
    clip_duration_seconds: float,
    device,
    pooling_strategy: str,
) -> list[dict]:
    if unknown_dir is None or not unknown_dir.exists():
        return []

    target_num_samples = int(sample_rate * clip_duration_seconds)
    feature_extractor = build_feature_extractor(model_name, sample_rate)
    embedding_model = build_embedding_model(model_name)

    results: list[dict] = []
    audio_files = [
        path
        for path in sorted(unknown_dir.rglob("*"))
        if path.is_file() and path.suffix.lower() in {".wav", ".mp3", ".m4a"}
    ]

    for audio_path in audio_files:
        waveform = load_audio(audio_path, sample_rate)
        waveform = prepare_waveform(waveform, target_num_samples)
        query_embedding = extract_audio_embedding(
            model=embedding_model,
            feature_extractor=feature_extractor,
            waveform=waveform.squeeze(0).numpy(),
            sample_rate=sample_rate,
            device=device,
            pooling_strategy=pooling_strategy,
        )
        ranked_matches = build_ranked_matches(entries, query_embedding)
        predicted_label, similarity, top_matches = predict_label(
            ranked_matches=ranked_matches,
            threshold=threshold,
            unknown_label=unknown_label,
            top_k=top_k,
        )
        results.append(
            {
                "query_kind": "unknown",
                "query_path": str(audio_path.resolve()),
                "expected_label": unknown_label,
                "predicted_label": predicted_label,
                "similarity": similarity,
                "correct": predicted_label == unknown_label,
                "top_matches": top_matches,
            }
        )

    return results


def summarize_results(results: list[dict], threshold: float, unknown_label: str) -> dict:
    y_true = [result["expected_label"] for result in results]
    y_pred = [result["predicted_label"] for result in results]

    labels = sorted(set(y_true) | set(y_pred))
    accuracy = float(accuracy_score(y_true, y_pred)) if results else 0.0
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )
    report = classification_report(
        y_true,
        y_pred,
        labels=labels,
        zero_division=0,
        output_dict=True,
    )

    return {
        "threshold": threshold,
        "unknown_label": unknown_label,
        "num_queries": len(results),
        "accuracy": accuracy,
        "precision_macro": float(precision),
        "recall_macro": float(recall),
        "f1_macro": float(f1),
        "labels": labels,
        "classification_report": report,
        "results": results,
    }


def format_console_summary(summary: dict) -> str:
    lines = [
        f"num_queries: {summary['num_queries']}",
        f"accuracy: {summary['accuracy']:.4f}",
        f"precision_macro: {summary['precision_macro']:.4f}",
        f"recall_macro: {summary['recall_macro']:.4f}",
        f"f1_macro: {summary['f1_macro']:.4f}",
        f"threshold: {summary['threshold']:.2f}",
        "per_query:",
    ]

    for result in summary["results"]:
        status = "correct" if result["correct"] else "wrong"
        lines.append(
            "  - "
            f"{result['query_kind']} | "
            f"expected={result['expected_label']} | "
            f"predicted={result['predicted_label']} | "
            f"similarity={result['similarity']:.4f} | "
            f"{status}"
        )

    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    device = select_device(config["project"]["device"])

    model_name = config["embedding"]["pretrained_model_name"]
    pooling_strategy = config["embedding"]["pooling_strategy"]
    threshold = float(args.threshold if args.threshold is not None else config["matching"]["similarity_threshold"])
    top_k = int(args.top_k if args.top_k is not None else config["matching"]["top_k"])
    unknown_label = str(config["matching"]["unknown_label"])
    sample_rate = int(config["data"]["sample_rate"])
    clip_duration_seconds = float(config["data"]["clip_duration_seconds"])

    registry_path = resolve_project_path(config["outputs"]["registry_file"])
    registry = load_registry(registry_path)
    entries = registry.get("entries", [])
    if len(entries) < 2:
        raise ValueError("At least two enrolled sounds are needed for leave-one-out evaluation.")

    registered_results = evaluate_registered_entries(
        entries=entries,
        threshold=threshold,
        top_k=top_k,
        unknown_label=unknown_label,
    )
    unknown_dir = Path(args.unknown_dir).resolve() if args.unknown_dir else None
    unknown_results = evaluate_unknown_entries(
        unknown_dir=unknown_dir,
        entries=entries,
        threshold=threshold,
        top_k=top_k,
        unknown_label=unknown_label,
        model_name=model_name,
        sample_rate=sample_rate,
        clip_duration_seconds=clip_duration_seconds,
        device=device,
        pooling_strategy=pooling_strategy,
    )

    summary = summarize_results(
        results=registered_results + unknown_results,
        threshold=threshold,
        unknown_label=unknown_label,
    )

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print()
    print(format_console_summary(summary))

    if args.save_json:
        reports_dir = resolve_project_path(config["outputs"]["reports_dir"])
        report_path = reports_dir / f"evaluation-{timestamp_id()}.json"
        save_json(report_path, summary)
        print(f"\nSaved report: {report_path}")


if __name__ == "__main__":
    main()

from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
import torch
import torchaudio
from transformers import AutoFeatureExtractor, AutoModel


def build_feature_extractor(model_name: str, sampling_rate: int):
    return AutoFeatureExtractor.from_pretrained(model_name, sampling_rate=sampling_rate)


def build_embedding_model(model_name: str):
    return AutoModel.from_pretrained(model_name)


def load_audio(audio_path: Path, sample_rate: int) -> torch.Tensor:
    try:
        waveform, source_sample_rate = torchaudio.load(audio_path)
    except Exception:
        waveform_np, source_sample_rate = librosa.load(audio_path, sr=None, mono=False)
        if waveform_np.ndim == 1:
            waveform_np = np.expand_dims(waveform_np, axis=0)
        waveform = torch.tensor(waveform_np, dtype=torch.float32)

    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)

    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    if source_sample_rate != sample_rate:
        resampler = torchaudio.transforms.Resample(source_sample_rate, sample_rate)
        waveform = resampler(waveform)

    return normalize_waveform(waveform)


def normalize_waveform(waveform: torch.Tensor) -> torch.Tensor:
    max_abs = waveform.abs().max()
    if max_abs > 0:
        waveform = waveform / max_abs
    return waveform


def prepare_waveform(waveform: torch.Tensor, target_num_samples: int) -> torch.Tensor:
    current_num_samples = waveform.shape[-1]

    if current_num_samples == target_num_samples:
        return waveform

    if current_num_samples > target_num_samples:
        start_index = (current_num_samples - target_num_samples) // 2
        end_index = start_index + target_num_samples
        return waveform[:, start_index:end_index]

    padding = target_num_samples - current_num_samples
    return torch.nn.functional.pad(waveform, (0, padding))


@torch.no_grad()
def extract_audio_embedding(
    model,
    feature_extractor,
    waveform: np.ndarray,
    sample_rate: int,
    device: torch.device,
    pooling_strategy: str = "mean",
) -> np.ndarray:
    inputs = feature_extractor(
        [waveform],
        sampling_rate=sample_rate,
        return_tensors="pt",
        padding=True,
    )
    inputs = {key: value.to(device) for key, value in inputs.items()}
    model = model.to(device)
    model.eval()

    outputs = model(**inputs)

    if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
        embedding_tensor = outputs.pooler_output
    elif hasattr(outputs, "last_hidden_state") and outputs.last_hidden_state is not None:
        if pooling_strategy == "cls":
            embedding_tensor = outputs.last_hidden_state[:, 0, :]
        else:
            embedding_tensor = outputs.last_hidden_state.mean(dim=1)
    else:
        raise ValueError("Model output does not contain a usable embedding tensor.")

    embedding = embedding_tensor.squeeze(0).detach().cpu().numpy().astype(np.float32)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    return embedding

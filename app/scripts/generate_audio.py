#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "piper-tts",
#   "soundfile",
#   "numpy",
# ]
# ///
"""Generate OGG audio files for every card value in curricula that opt in to audio."""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "public"
MODEL_DIR = Path(__file__).resolve().parent / ".piper-models"

HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


def piper_url(voice: str) -> str:
    """Derive the HuggingFace model URL from a Piper voice name.

    e.g. "en_US-lessac-medium" -> ".../en/en_US/lessac/medium/en_US-lessac-medium.onnx"
    """
    locale, speaker, quality = voice.split("-")
    lang = locale.split("_")[0]
    return f"{HF_BASE}/{lang}/{locale}/{speaker}/{quality}/{voice}.onnx"


def slug(word: str) -> str:
    return hashlib.sha1(word.encode("utf-8")).hexdigest()[:16]


def ensure_model(voice: str, url: str) -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    onnx = MODEL_DIR / f"{voice}.onnx"
    cfg = MODEL_DIR / f"{voice}.onnx.json"
    for path, u in ((onnx, url), (cfg, url + ".json")):
        if not path.exists():
            print(f"Downloading {path.name}…")
            urllib.request.urlretrieve(u, path)
    return onnx


def as_list(v):
    return v if isinstance(v, list) else [v]


def main() -> int:
    from piper import PiperVoice  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415
    import soundfile as sf  # noqa: PLC0415

    wanted = set(sys.argv[1:])
    for data_file in sorted(DATA_DIR.glob("*/data.json")):
        cur_dir = data_file.parent
        if wanted and cur_dir.name not in wanted:
            continue
        data = json.loads(data_file.read_text())
        if not data.get("audio"):
            print(f"Skipping {cur_dir.name}: audio disabled")
            continue
        voice_name = data.get("piperVoice")
        if not voice_name:
            print(f"Skipping {cur_dir.name}: no piperVoice specified")
            continue

        values = sorted({
            v for lesson in data["lessons"] for card in lesson["cards"]
            for v in as_list(card["value"])
        })
        print(f"{cur_dir.name}: {len(values)} values")

        audio_dir = cur_dir / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        mapping = {w: slug(w) for w in values}
        (audio_dir / "index.json").write_text(
            json.dumps(mapping, ensure_ascii=False, indent=2)
        )

        model_path = ensure_model(voice_name, piper_url(voice_name))
        voice = PiperVoice.load(str(model_path))

        for i, word in enumerate(values, 1):
            out = audio_dir / f"{slug(word)}.ogg"
            if out.exists():
                continue
            chunks = list(voice.synthesize(word))
            audio = np.concatenate([c.audio_int16_array for c in chunks])
            sf.write(out, audio, chunks[0].sample_rate, format="OGG", subtype="VORBIS")
            print(f"  [{i}/{len(values)}] {word}")

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

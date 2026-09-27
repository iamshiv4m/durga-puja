#!/usr/bin/env python3
"""
Build the recorded sounds in public/sound/ from openly licensed Wikimedia Commons recordings.

  dhak-calm.m4a    the slow dhak for Bodhon, and again as she leaves
  dhak-arati.m4a   the fast dhak of the arati, from Sandhi to the third eye
  shankh.m4a       the conch

Each dhak loop is cut at a point where the rhythm repeats, crossfaded into itself, and
written out once plus LOOP_PAD more seconds. The file is therefore periodic, and any
window of LOOP seconds starting after the first 50 ms loops without a seam. That holds
even if the AAC decoder shifts the start. `audio.ts` loops from 1 s to 1 s + LOOP.

Usage (needs ffmpeg on the PATH):
  pip install numpy
  python3 tools/make_sounds.py

The sources, authors and licences are listed in SOURCES and in public/sound/CREDITS.md.
The files written here are adaptations (trimmed, looped, levelled), so they are shared
under the same licences.
"""

import subprocess
import tempfile
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sound"
RATE = 48000
LOOP_PAD = 2.0
CROSSFADE = 0.06
UA = {"User-Agent": "trinayani-build/1.0 (make_sounds.py)"}

SOURCES = {
    "royd": "https://upload.wikimedia.org/wikipedia/commons/0/04/Rhythm_of_Dhak_a_huge_membranophone_instrument_from_Bengal_and_Assam%2C_used_in_Hindu_religious_festivals%2C_especially_Durga_Puja.mp3",
    "dhody": "https://upload.wikimedia.org/wikipedia/commons/4/46/Durga_Puja_Dhak_Dhol.ogg",
    "conch": "https://upload.wikimedia.org/wikipedia/commons/2/24/Conch_shell.ogg",
}

# (source, start seconds, loop length seconds), found by matching the onset pattern at
# the start of the loop against the pattern one loop later.
LOOPS = {
    "dhak-calm": ("royd", 20.29, 13.03),
    "dhak-arati": ("dhody", 24.22, 12.01),
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(RATE), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def encode(samples: np.ndarray, path: Path, channels: int = 2) -> None:
    samples = samples if channels == 2 else samples.mean(axis=1, keepdims=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", str(channels), "-ar", str(RATE), "-i", "-",
         "-c:a", "aac", "-b:a", "128k" if channels == 2 else "96k", "-movflags", "+faststart", str(path)],
        input=samples.astype(np.float32).tobytes(),
        check=True,
    )


def level(samples: np.ndarray, rms_db: float) -> np.ndarray:
    rms = np.sqrt(np.mean(samples**2))
    out = samples * (10 ** (rms_db / 20) / rms)
    peak = np.abs(out).max()
    return out * (0.89 / peak) if peak > 0.89 else out


def seamless(audio: np.ndarray, start: float, length: float) -> np.ndarray:
    a, n, fade = int(start * RATE), int(length * RATE), int(CROSSFADE * RATE)
    loop = audio[a : a + n].copy()
    # The head of the loop fades in as what follows its end fades out, so the jump from the
    # last sample back to the first continues the recording.
    t = np.linspace(0, np.pi / 2, fade)[:, None]
    loop[:fade] = audio[a : a + fade] * np.sin(t) + audio[a + n : a + n + fade] * np.cos(t)
    reps = int(np.ceil((n + LOOP_PAD * RATE) / n))
    return np.tile(loop, (reps, 1))[: n + int(LOOP_PAD * RATE)]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        audio = {}
        for name, url in SOURCES.items():
            path = Path(tmp) / f"{name}{Path(url).suffix}"
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as response:
                path.write_bytes(response.read())
            audio[name] = decode(path)

    for name, (source, start, length) in LOOPS.items():
        path = OUT / f"{name}.m4a"
        encode(level(seamless(audio[source], start, length), -17), path)
        print(f"{path.relative_to(ROOT)}  loop {length}s  {path.stat().st_size // 1024} KB")

    conch = audio["conch"]
    fade = int(0.08 * RATE)
    conch[-fade:] *= np.linspace(1, 0, fade)[:, None]
    path = OUT / "shankh.m4a"
    encode(level(conch, -14), path, channels=1)
    print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

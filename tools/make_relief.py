#!/usr/bin/env python3
"""
Turn a Durga painting into the two files the stage needs:

  public/pratima/albedo.png   the painting, figure cut out on a transparent background
  public/pratima/height.png   greyscale depth, white = nearest to the viewer

Usage:
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r tools/requirements.txt
  python3 tools/make_relief.py path/to/painting.jpg

Then set `albedoUrl` / `heightUrl` in src/lib/pratima.ts and re-measure the eye and sindoor
ellipses in the painting's pixel coordinates (after it is resized to --size).
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "pratima"


def square(image: Image.Image, size: int) -> Image.Image:
    """Pad to a square on transparent black, then resize."""
    w, h = image.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(image, ((side - w) // 2, (side - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def cut_out(image: Image.Image) -> Image.Image:
    """Remove the background with rembg, keeping the figure's alpha."""
    from rembg import remove

    return remove(image.convert("RGBA"))


def estimate_depth(image: Image.Image, model: str) -> np.ndarray:
    """Monocular depth with Depth Anything V2 (relative depth, larger = nearer)."""
    from transformers import pipeline

    estimator = pipeline("depth-estimation", model=model)
    depth = estimator(image.convert("RGB"))["predicted_depth"]
    depth = depth.squeeze().detach().cpu().numpy().astype(np.float32)
    return np.array(Image.fromarray(depth).resize(image.size, Image.BICUBIC))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("painting", type=Path)
    parser.add_argument("--size", type=int, default=1024, help="square output size in pixels")
    parser.add_argument("--model", default="depth-anything/Depth-Anything-V2-Base-hf")
    parser.add_argument("--no-cutout", action="store_true", help="the painting already has an alpha background")
    parser.add_argument("--blur", type=float, default=1.5, help="depth smoothing radius in pixels")
    args = parser.parse_args()

    source = Image.open(args.painting)
    figure = source.convert("RGBA") if args.no_cutout else cut_out(source)
    figure = square(figure, args.size)
    alpha = np.asarray(figure.getchannel("A"), dtype=np.float32) / 255.0

    depth = estimate_depth(figure, args.model)
    inside = depth[alpha > 0.5]
    lo, hi = np.percentile(inside, 1), np.percentile(inside, 99.5)
    depth = np.clip((depth - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    # Keep some thickness even at the figure's farthest point, and nothing outside it.
    depth = (0.12 + 0.88 * depth) * (alpha > 0.5)

    height = Image.fromarray((depth * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(args.blur))

    OUT.mkdir(parents=True, exist_ok=True)
    figure.save(OUT / "albedo.png")
    height.save(OUT / "height.png")
    print(f"wrote {OUT / 'albedo.png'} and {OUT / 'height.png'} ({args.size}x{args.size})")


if __name__ == "__main__":
    main()

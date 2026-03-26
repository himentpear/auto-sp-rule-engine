import argparse
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageOps, ImageStat


DEFAULT_PREPROCESSING = {
    "grayscale": True,
    "scale": 1.0,
    "threshold": {"enabled": False, "value": 180},
    "trim_border": {"enabled": False, "margin": 0},
    "mask_regions": [],
}

DEFAULT_NORMALIZATION = {
    "collapse_whitespace": True,
    "preserve_line_breaks": False,
    "case": "none",
    "simple_noise_cleanup": True,
}

DEFAULT_OCR_BEHAVIOR = {
    "fallback_to_full_window_on_empty": False,
}


def run_winrt_ocr(image_path: Path):
    root = Path(__file__).resolve().parent
    impl = root / "Invoke-WinRtOcr.ps1"
    preferred_languages = ["zh-CN", "zh-Hans", "en-US"]
    cmd = [
        "powershell",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(impl),
        "-ImagePath",
        str(image_path.resolve()),
        "-PreferredLanguages",
        ",".join(preferred_languages),
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    )
    return json.loads(result.stdout)


def merge_dict(defaults: dict, override: dict | None):
    merged = json.loads(json.dumps(defaults))
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key].update(value)
        else:
            merged[key] = value
    return merged


def clamp_roi(image: Image.Image, roi_cfg: dict | None):
    if not roi_cfg:
        return None
    x = max(0, int(roi_cfg.get("x", 0)))
    y = max(0, int(roi_cfg.get("y", 0)))
    width = max(1, int(roi_cfg.get("width", image.width - x)))
    height = max(1, int(roi_cfg.get("height", image.height - y)))
    right = min(image.width, x + width)
    bottom = min(image.height, y + height)
    if right <= x or bottom <= y:
        return None
    return {
        "x": x,
        "y": y,
        "width": right - x,
        "height": bottom - y,
    }


def apply_roi(image: Image.Image, roi_cfg: dict | None):
    roi_used = clamp_roi(image, roi_cfg)
    if not roi_used:
        return image.copy(), None
    cropped = image.crop(
        (
            roi_used["x"],
            roi_used["y"],
            roi_used["x"] + roi_used["width"],
            roi_used["y"] + roi_used["height"],
        )
    )
    return cropped, roi_used


def trim_border(image: Image.Image, margin: int):
    grayscale = image.convert("L")
    bbox = ImageOps.invert(grayscale).getbbox()
    if not bbox:
        return image
    left = max(0, bbox[0] - margin)
    top = max(0, bbox[1] - margin)
    right = min(image.width, bbox[2] + margin)
    bottom = min(image.height, bbox[3] + margin)
    return image.crop((left, top, right, bottom))


def clamp_mask_region(image: Image.Image, region_cfg: dict | None):
    if not region_cfg:
        return None
    unit = str(region_cfg.get("unit", "pixels")).lower()
    if unit == "ratio":
        x = int(round(float(region_cfg.get("x", 0.0)) * image.width))
        y = int(round(float(region_cfg.get("y", 0.0)) * image.height))
        width = int(round(float(region_cfg.get("width", 1.0)) * image.width))
        height = int(round(float(region_cfg.get("height", 1.0)) * image.height))
    else:
        x = int(region_cfg.get("x", 0))
        y = int(region_cfg.get("y", 0))
        width = int(region_cfg.get("width", image.width - x))
        height = int(region_cfg.get("height", image.height - y))

    x = max(0, x)
    y = max(0, y)
    width = max(1, width)
    height = max(1, height)
    right = min(image.width, x + width)
    bottom = min(image.height, y + height)
    if right <= x or bottom <= y:
        return None
    return {
        "x": x,
        "y": y,
        "width": right - x,
        "height": bottom - y,
    }


def apply_mask_regions(image: Image.Image, preprocessing_cfg: dict | None):
    cfg = merge_dict(DEFAULT_PREPROCESSING, preprocessing_cfg)
    regions = cfg.get("mask_regions") or []
    if not regions:
        return image.copy(), []

    masked = image.copy()
    fill_value = 255 if masked.mode == "L" else tuple(255 for _ in masked.getbands())
    applied = []
    for region in regions:
        clamped = clamp_mask_region(masked, region)
        if not clamped:
            continue
        masked.paste(
            fill_value,
            (
                clamped["x"],
                clamped["y"],
                clamped["x"] + clamped["width"],
                clamped["y"] + clamped["height"],
            ),
        )
        applied.append(clamped)
    return masked, applied


def preprocess_image(image: Image.Image, preprocessing_cfg: dict | None):
    cfg = merge_dict(DEFAULT_PREPROCESSING, preprocessing_cfg)
    processed, applied_mask_regions = apply_mask_regions(image, cfg)

    if cfg.get("grayscale", True):
        processed = processed.convert("L")

    scale = float(cfg.get("scale", 1.0))
    if scale != 1.0:
        new_size = (
            max(1, int(round(processed.width * scale))),
            max(1, int(round(processed.height * scale))),
        )
        processed = processed.resize(new_size, Image.Resampling.LANCZOS)

    threshold_cfg = cfg.get("threshold", {})
    if threshold_cfg.get("enabled"):
        threshold_value = int(threshold_cfg.get("value", 180))
        processed = processed.convert("L").point(
            lambda pixel: 255 if pixel >= threshold_value else 0
        )

    trim_cfg = cfg.get("trim_border", {})
    if trim_cfg.get("enabled"):
        processed = trim_border(processed, int(trim_cfg.get("margin", 0)))

    cfg["mask_regions"] = applied_mask_regions
    return processed, cfg


def normalize_text(raw_text: str, normalization_cfg: dict | None):
    cfg = merge_dict(DEFAULT_NORMALIZATION, normalization_cfg)
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    if cfg.get("simple_noise_cleanup", True):
        text = re.sub(r"[\u200b-\u200f\u2060\ufeff]", "", text)
        text = text.replace("\u2018", "'").replace("\u2019", "'")
        text = text.replace("\u201c", '"').replace("\u201d", '"')

    if cfg.get("collapse_whitespace", True):
        if cfg.get("preserve_line_breaks", False):
            lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
            text = "\n".join(lines)
            text = re.sub(r"\n{3,}", "\n\n", text)
        else:
            text = re.sub(r"\s+", " ", text).strip()
    else:
        text = "\n".join(line.rstrip() for line in text.split("\n")).strip()

    case_mode = cfg.get("case", "none")
    if case_mode == "lower":
        text = text.lower()
    elif case_mode == "upper":
        text = text.upper()

    return text, cfg


def save_image(image: Image.Image, out_path: Path | None):
    if not out_path:
        return None
    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path)
    return str(out_path.resolve())


def prepare_image(image_path: Path, ocr_cfg: dict | None, processed_out_path: Path | None = None):
    with Image.open(image_path) as source:
        source = source.convert("RGB")
        roi_image, roi_used = apply_roi(source, (ocr_cfg or {}).get("roi"))
        processed_image, preprocessing_cfg = preprocess_image(
            roi_image, (ocr_cfg or {}).get("preprocessing")
        )
        processed_path = save_image(processed_image, processed_out_path)
        prepared = processed_image.copy()

    return {
        "image": prepared,
        "roi_used": roi_used,
        "preprocessing_settings": preprocessing_cfg,
        "processed_image_path": processed_path,
    }


def run_ocr_pipeline(image_path: Path, ocr_cfg: dict | None, processed_out_path: Path | None = None):
    behavior_cfg = merge_dict(DEFAULT_OCR_BEHAVIOR, (ocr_cfg or {}).get("behavior"))

    def execute_once(active_ocr_cfg: dict | None, out_path: Path | None):
        prepared_local = prepare_image(image_path, active_ocr_cfg, out_path)
        ocr_target_path_local = Path(prepared_local["processed_image_path"]) if prepared_local["processed_image_path"] else image_path
        if not prepared_local["processed_image_path"]:
            temp_path = image_path.parent / f"{image_path.stem}-processed{image_path.suffix}"
            prepared_local["processed_image_path"] = save_image(prepared_local["image"], temp_path)
            ocr_target_path_local = temp_path

        ocr_payload_local = run_winrt_ocr(Path(ocr_target_path_local))
        normalized_text_local, normalization_cfg_local = normalize_text(
            ocr_payload_local.get("Text", ""), (active_ocr_cfg or {}).get("normalization")
        )
        normalized_lines_local = []
        for line in ocr_payload_local.get("Lines", []) or []:
            normalized_line_text, _ = normalize_text(
                line.get("Text", ""), (active_ocr_cfg or {}).get("normalization")
            )
            normalized_lines_local.append(
                {
                    "text": normalized_line_text,
                    "raw_text": line.get("Text", ""),
                    "bounding_rect": line.get("BoundingRect"),
                    "words": line.get("Words", []),
                }
            )
        return prepared_local, ocr_payload_local, normalized_text_local, normalization_cfg_local, normalized_lines_local

    prepared, ocr_payload, normalized_text, normalization_cfg, normalized_lines = execute_once(ocr_cfg, processed_out_path)

    if (
        behavior_cfg.get("fallback_to_full_window_on_empty")
        and prepared["roi_used"] is not None
        and not normalized_text.strip()
    ):
        fallback_cfg = json.loads(json.dumps(ocr_cfg or {}))
        fallback_cfg["roi"] = None
        fallback_out_path = None
        if processed_out_path is not None:
            fallback_out_path = processed_out_path.parent / f"{processed_out_path.stem}-fallback{processed_out_path.suffix}"
        prepared, ocr_payload, normalized_text, normalization_cfg, normalized_lines = execute_once(fallback_cfg, fallback_out_path)

    return {
        "image_path": str(image_path.resolve()),
        "processed_image_path": prepared["processed_image_path"],
        "roi_used": prepared["roi_used"],
        "preprocessing_settings": prepared["preprocessing_settings"],
        "normalization_settings": normalization_cfg,
        "raw_ocr_output": ocr_payload.get("Text", ""),
        "normalized_ocr_output": normalized_text,
        "normalized_lines": normalized_lines,
        "language": ocr_payload.get("Language"),
        "line_count": ocr_payload.get("LineCount"),
    }


def build_change_detection_image(image_path: Path, ocr_cfg: dict | None):
    with Image.open(image_path) as source:
        source = source.convert("L")
        roi_image, _ = apply_roi(source, (ocr_cfg or {}).get("roi"))
        roi_image, _ = apply_mask_regions(roi_image, (ocr_cfg or {}).get("preprocessing"))
        reduced = roi_image.resize((64, 64), Image.Resampling.BILINEAR)
        return reduced.copy()


def compute_image_change_ratio(previous_image_path: Path, current_image_path: Path, ocr_cfg: dict | None):
    previous = build_change_detection_image(previous_image_path, ocr_cfg)
    current = build_change_detection_image(current_image_path, ocr_cfg)
    diff = ImageChops.difference(previous, current)
    stat = ImageStat.Stat(diff)
    return float(stat.mean[0]) / 255.0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("image_path")
    parser.add_argument("--ocr-config-json")
    parser.add_argument("--processed-image-out")
    args = parser.parse_args()

    ocr_cfg = json.loads(args.ocr_config_json) if args.ocr_config_json else {}
    processed_out = Path(args.processed_image_out).resolve() if args.processed_image_out else None
    payload = run_ocr_pipeline(Path(args.image_path).resolve(), ocr_cfg, processed_out)
    print(json.dumps(payload, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

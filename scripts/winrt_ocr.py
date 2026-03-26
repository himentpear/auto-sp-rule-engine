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

DEFAULT_POSTPROCESS = {
    "chinese_repair": {
        "enabled": False,
        "high_confidence_enabled": True,
        "low_confidence_enabled": False,
    },
}

DEFAULT_OCR_BEHAVIOR = {
    "fallback_to_full_window_on_empty": False,
}

HIGH_CONFIDENCE_CHINESE_REPAIR_MAP = {
    "\u4ebb\u5c14": "\u4f60",
    "\u767d\u52fa": "\u7684",
    "\u53e3\u9a6c": "\u5417",
}

LOW_CONFIDENCE_CHINESE_REPAIR_MAP = {
    "\u5973\u5b50": "\u597d",
    "\u5fc4\u9752": "\u60c5",
}

META_LINGUISTIC_KEYWORDS = (
    "\u8fd9\u4e2a\u5b57",
    "\u504f\u65c1",
    "\u90e8\u9996",
    "\u7ed3\u6784",
    "\u5b57\u5f62",
    "\u7ec4\u6210",
    "\u7ec4\u5408",
    "\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
    "\u662f\u4ec0\u4e48\u610f\u601d",
    "\u4ec0\u4e48\u610f\u601d",
    "\u5ff5",
    "\u8bfb",
    "\u600e\u4e48\u5199",
    "\u72ec\u7acb\u5b57",
    "\u600e\u4e48\u8bfb",
    "\u8bed\u6c14\u8bcd",
    "\u4ec0\u4e48\u5b57",
)

LOW_CONFIDENCE_BLOCK_PATTERNS = (
    re.compile("\u5973\u5b50\u5b66\u6821"),
    re.compile("\u5973\u5b50\u7ec4"),
    re.compile("\u5973\u5b50\u8d5b"),
    re.compile("\u53e4\u4ee3\u5973\u5b50"),
)


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


def is_cjk_character(value: str):
    return bool(re.fullmatch(r"[\u3400-\u4dbf\u4e00-\u9fff]", value or ""))


def is_meta_linguistic_context(text: str, index: int, window: int = 8):
    left = max(0, index - window)
    right = min(len(text), index + 2 + window)
    snippet = text[left:right]
    return any(keyword in snippet for keyword in META_LINGUISTIC_KEYWORDS)


def should_block_high_confidence_repair(text: str, index: int, pair: str, replacement: str):
    del replacement
    if pair not in {"\u767d\u52fa", "\u53e3\u9a6c"}:
        return False
    left = max(0, index - 16)
    right = min(len(text), index + 2 + 16)
    snippet = text[left:right]
    if pair == "\u767d\u52fa":
        keywords = (
            "\u8fd9\u4e2a\u5b57",
            "\u504f\u65c1",
            "\u90e8\u9996",
            "\u7ed3\u6784",
            "\u5b57\u5f62",
            "\u7ec4\u6210",
            "\u7ec4\u5408",
            "\u72ec\u7acb\u5b57",
            "\u4ec0\u4e48\u5b57",
            "\u4ec0\u4e48\u610f\u601d",
            "\u600e\u4e48\u5199",
        )
        return any(keyword in snippet for keyword in keywords)
    return is_meta_linguistic_context(text, index, window=16)


def should_apply_low_confidence_repair(text: str, index: int, pair: str, replacement: str):
    del replacement
    if is_meta_linguistic_context(text, index):
        return False

    for pattern in LOW_CONFIDENCE_BLOCK_PATTERNS:
        if pattern.search(text):
            return False

    prev_char = text[index - 1] if index > 0 else ""
    next_char = text[index + 2] if index + 2 < len(text) else ""

    if is_cjk_character(prev_char) or is_cjk_character(next_char):
        return False

    if pair == "\u5973\u5b50":
        return False

    return True


def should_apply_high_confidence_repair(text: str, index: int, pair: str):
    if should_block_high_confidence_repair(text, index, pair, HIGH_CONFIDENCE_CHINESE_REPAIR_MAP.get(pair)):
        return False
    return True


def apply_chinese_repair(text: str, repair_cfg: dict | None):
    cfg = merge_dict(DEFAULT_POSTPROCESS["chinese_repair"], repair_cfg)
    if not cfg.get("enabled", False) or not text:
        return text, cfg, []

    repaired_chars = []
    repairs = []
    index = 0

    while index < len(text):
        pair = text[index : index + 2]
        replacement = None
        confidence = None
        if (
            cfg.get("high_confidence_enabled", True)
            and pair in HIGH_CONFIDENCE_CHINESE_REPAIR_MAP
            and len(pair) == 2
            and all(len(character) == 1 and is_cjk_character(character) for character in pair)
            and should_apply_high_confidence_repair(text, index, pair)
        ):
            replacement = HIGH_CONFIDENCE_CHINESE_REPAIR_MAP[pair]
            confidence = "high"
        elif (
            cfg.get("low_confidence_enabled", False)
            and pair in LOW_CONFIDENCE_CHINESE_REPAIR_MAP
            and len(pair) == 2
            and all(len(character) == 1 and is_cjk_character(character) for character in pair)
            and should_apply_low_confidence_repair(
                text,
                index,
                pair,
                LOW_CONFIDENCE_CHINESE_REPAIR_MAP[pair],
            )
        ):
            replacement = LOW_CONFIDENCE_CHINESE_REPAIR_MAP[pair]
            confidence = "low"

        if replacement:
            repaired_chars.append(replacement)
            repairs.append(
                {
                    "source": pair,
                    "replacement": replacement,
                    "start": index,
                    "end": index + 2,
                    "confidence": confidence,
                }
            )
            index += 2
            continue

        repaired_chars.append(text[index])
        index += 1

    return "".join(repaired_chars), cfg, repairs


def postprocess_text(normalized_text: str, postprocess_cfg: dict | None):
    cfg = merge_dict(DEFAULT_POSTPROCESS, postprocess_cfg)
    repaired_text, chinese_repair_cfg, repairs = apply_chinese_repair(
        normalized_text,
        cfg.get("chinese_repair"),
    )
    cfg["chinese_repair"] = chinese_repair_cfg
    return repaired_text, cfg, {"chinese_repairs": repairs}


def postprocess_lines(normalized_lines: list[dict], postprocess_cfg: dict | None):
    postprocessed_lines = []
    line_repairs = []

    for line in normalized_lines or []:
        repaired_text, _, details = postprocess_text(line.get("text", ""), postprocess_cfg)
        postprocessed_lines.append(
            {
                "text": repaired_text,
                "raw_text": line.get("raw_text", ""),
                "bounding_rect": line.get("bounding_rect"),
                "words": line.get("words", []),
            }
        )
        line_repairs.append(details.get("chinese_repairs", []))

    return postprocessed_lines, {"line_repairs": line_repairs}


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
        postprocessed_text_local, postprocess_cfg_local, postprocess_details_local = postprocess_text(
            normalized_text_local, (active_ocr_cfg or {}).get("postprocess")
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
        postprocessed_lines_local, postprocessed_line_details_local = postprocess_lines(
            normalized_lines_local,
            (active_ocr_cfg or {}).get("postprocess"),
        )
        postprocess_details_local["line_repairs"] = postprocessed_line_details_local["line_repairs"]
        return (
            prepared_local,
            ocr_payload_local,
            normalized_text_local,
            postprocessed_text_local,
            normalization_cfg_local,
            postprocess_cfg_local,
            postprocess_details_local,
            normalized_lines_local,
            postprocessed_lines_local,
        )

    (
        prepared,
        ocr_payload,
        normalized_text,
        postprocessed_text,
        normalization_cfg,
        postprocess_cfg,
        postprocess_details,
        normalized_lines,
        postprocessed_lines,
    ) = execute_once(ocr_cfg, processed_out_path)

    if (
        behavior_cfg.get("fallback_to_full_window_on_empty")
        and prepared["roi_used"] is not None
        and not postprocessed_text.strip()
    ):
        fallback_cfg = json.loads(json.dumps(ocr_cfg or {}))
        fallback_cfg["roi"] = None
        fallback_out_path = None
        if processed_out_path is not None:
            fallback_out_path = processed_out_path.parent / f"{processed_out_path.stem}-fallback{processed_out_path.suffix}"
        (
            prepared,
            ocr_payload,
            normalized_text,
            postprocessed_text,
            normalization_cfg,
            postprocess_cfg,
            postprocess_details,
            normalized_lines,
            postprocessed_lines,
        ) = execute_once(fallback_cfg, fallback_out_path)

    final_ocr_output = postprocessed_text or normalized_text
    return {
        "image_path": str(image_path.resolve()),
        "processed_image_path": prepared["processed_image_path"],
        "roi_used": prepared["roi_used"],
        "preprocessing_settings": prepared["preprocessing_settings"],
        "normalization_settings": normalization_cfg,
        "postprocess_settings": postprocess_cfg,
        "raw_ocr_output": ocr_payload.get("Text", ""),
        "normalized_ocr_output": normalized_text,
        "postprocessed_ocr_output": postprocessed_text,
        "final_ocr_output": final_ocr_output,
        "ocr_text": final_ocr_output,
        "postprocess_details": postprocess_details,
        "normalized_lines": normalized_lines,
        "postprocessed_lines": postprocessed_lines,
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

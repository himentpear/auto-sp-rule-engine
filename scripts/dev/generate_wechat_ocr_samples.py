import argparse
import importlib.util
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


DEFAULT_SCREENSHOT_DIR = Path.home() / "Desktop" / "screenshoot"
DEFAULT_PROFILE_PATH = (
    Path(__file__).resolve().parents[2]
    / "examples"
    / "profiles"
    / "wechat-vertical-dense-chat.json"
)
DEFAULT_OUTPUT_DIR = (
    Path(__file__).resolve().parents[2]
    / "examples"
    / "logs"
    / "wechat-ocr-samples"
)
DEFAULT_SUMMARY_PATH = (
    Path(__file__).resolve().parents[2]
    / "examples"
    / "logs"
    / "wechat-ocr-sample-suite.json"
)


def load_winrt_ocr_module():
    script_path = Path(__file__).resolve().parents[1] / "winrt_ocr.py"
    spec = importlib.util.spec_from_file_location("winrt_ocr", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def classify_sample(file_name: str, index: int):
    if "\u77ed\u4fe1\u606f" in file_name:
        return f"sample-{index:02d}-short-chat"
    if "\u8868\u60c5\u5305" in file_name:
        return f"sample-{index:02d}-sticker"
    if "\u957f\u4fe1\u606f\uff08\u4e0a\uff09" in file_name:
        return f"sample-{index:02d}-long-chat-top"
    if "\u957f\u4fe1\u606f\uff08\u4e0b\uff09" in file_name:
        return f"sample-{index:02d}-long-chat-bottom"
    return f"sample-{index:02d}-wechat"


def build_preview(lines: list[dict], fallback_text: str):
    preview_lines = []
    for line in lines[:6]:
        text = str(line.get("text") or line.get("raw_text") or "").strip()
        if text:
            preview_lines.append(text)
    if preview_lines:
        return " | ".join(preview_lines)
    return fallback_text[:160]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", default=str(DEFAULT_SCREENSHOT_DIR))
    parser.add_argument("--profile-json", default=str(DEFAULT_PROFILE_PATH))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--summary-out", default=str(DEFAULT_SUMMARY_PATH))
    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    profile_path = Path(args.profile_json).resolve()
    output_dir = Path(args.output_dir).resolve()
    summary_path = Path(args.summary_out).resolve()

    if not input_dir.exists():
        raise FileNotFoundError(f"Screenshot directory not found: {input_dir}")
    if not profile_path.exists():
        raise FileNotFoundError(f"Profile file not found: {profile_path}")

    with profile_path.open("r", encoding="utf-8") as handle:
        profile = json.load(handle)

    module = load_winrt_ocr_module()
    output_dir.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)

    screenshot_paths = sorted(
        path
        for path in input_dir.glob("*.png")
        if "-processed" not in path.stem.lower() and "-fallback" not in path.stem.lower()
    )

    generated = []
    for index, image_path in enumerate(screenshot_paths, start=1):
        sample_id = classify_sample(image_path.name, index)
        detail_path = output_dir / f"{sample_id}.json"

        with Image.open(image_path) as image:
            image_size = {"width": image.width, "height": image.height}

        processed_out = output_dir / f"{sample_id}-processed.png"
        payload = module.run_ocr_pipeline(image_path, profile, processed_out)
        preview = build_preview(
            payload.get("normalized_lines") or [],
            payload.get("normalized_ocr_output") or "",
        )

        detail_payload = {
            "sampleId": sample_id,
            "sourceImagePath": str(image_path),
            "sourceImageName": image_path.name,
            "imageSize": image_size,
            "profilePath": str(profile_path),
            "profileName": profile.get("name"),
            "result": payload,
            "preview": preview,
        }
        with detail_path.open("w", encoding="utf-8") as handle:
            json.dump(detail_payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

        generated.append(
            {
                "sampleId": sample_id,
                "sourceImageName": image_path.name,
                "sourceImagePath": str(image_path),
                "imageSize": image_size,
                "lineCount": payload.get("line_count"),
                "roiUsed": payload.get("roi_used"),
                "processedImagePath": payload.get("processed_image_path"),
                "outputPath": str(detail_path),
                "preview": preview,
            }
        )

    summary = {
        "generatedAt": os.environ.get("OPEN_CLOSE_SAMPLE_GENERATED_AT")
        or datetime.now(timezone.utc).isoformat(),
        "inputDir": str(input_dir),
        "profilePath": str(profile_path),
        "profileName": profile.get("name"),
        "sampleCount": len(generated),
        "samples": generated,
    }

    with summary_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    raise SystemExit(main())

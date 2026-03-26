import importlib.util
from pathlib import Path


def load_winrt_ocr_module():
    script_path = Path(__file__).resolve().parents[1] / "winrt_ocr.py"
    spec = importlib.util.spec_from_file_location("winrt_ocr", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def escape_text(value):
    return str(value).encode("unicode_escape").decode("ascii")


def assert_equal(actual, expected, label):
    if actual != expected:
        raise AssertionError(f"{label}: expected={escape_text(expected)} actual={escape_text(actual)}")


def run_postprocess(module, text, *, low_confidence_enabled=False):
    return module.postprocess_text(
        text,
        {
            "chinese_repair": {
                "enabled": True,
                "high_confidence_enabled": True,
                "low_confidence_enabled": low_confidence_enabled,
            }
        },
    )


def run_positive_tests(module):
    cases = [
        ("\u4ebb\u5c14\u597d", "\u4f60\u597d"),
        ("\u6211\u767d\u52fa\u4e66", "\u6211\u7684\u4e66"),
        ("\u662f\u53e3\u9a6c", "\u662f\u5417"),
    ]
    results = []
    for source, expected in cases:
        repaired, _cfg, details = run_postprocess(module, source)
        assert_equal(repaired, expected, "positive")
        results.append((source, repaired, len(details["chinese_repairs"])))
    return results


def run_negative_tests(module):
    cases = [
        "\u53e4\u4ee3\u5973\u5b50\u5f88\u591a",
        "\u5973\u5b50\u5b66\u6821",
        "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
        "\u767d\u52fa\u7ed3\u6784",
        "\u5973\u5b50\u662f\u4ec0\u4e48\u610f\u601d",
    ]
    results = []
    for source in cases:
        repaired, _cfg, details = run_postprocess(module, source)
        assert_equal(repaired, source, "negative")
        assert_equal(len(details["chinese_repairs"]), 0, "negative repairs")
        results.append((source, repaired))
    return results


def run_line_tests(module):
    normalized_lines = [
        {
            "text": "\u4ebb\u5c14\u597d",
            "raw_text": "\u4ebb\u5c14\u597d",
            "bounding_rect": {"X": 1, "Y": 2, "Width": 3, "Height": 4},
            "words": [{"Text": "\u4ebb\u5c14"}],
        },
        {
            "text": "\u6211\u767d\u52fa\u4e66",
            "raw_text": "\u6211\u767d\u52fa\u4e66",
            "bounding_rect": {"X": 5, "Y": 6, "Width": 7, "Height": 8},
            "words": [{"Text": "\u767d\u52fa"}],
        },
    ]
    postprocessed_lines, details = module.postprocess_lines(
        normalized_lines,
        {
            "chinese_repair": {
                "enabled": True,
                "high_confidence_enabled": True,
                "low_confidence_enabled": False,
            }
        },
    )
    assert_equal(len(postprocessed_lines), 2, "line count")
    assert_equal(postprocessed_lines[0]["text"], "\u4f60\u597d", "line 1 text")
    assert_equal(postprocessed_lines[1]["text"], "\u6211\u7684\u4e66", "line 2 text")
    assert_equal(normalized_lines[0]["text"], "\u4ebb\u5c14\u597d", "normalized line preserved")
    if len(details["line_repairs"]) != 2:
        raise AssertionError("line details count mismatch")
    return postprocessed_lines


def run_low_confidence_tests(module):
    default_repaired, _cfg, default_details = run_postprocess(module, "\u5973\u5b50")
    assert_equal(default_repaired, "\u5973\u5b50", "low confidence default disabled")
    assert_equal(len(default_details["chinese_repairs"]), 0, "low confidence default repairs")

    strict_repaired, _cfg, strict_details = run_postprocess(module, "\u5fc4\u9752", low_confidence_enabled=True)
    assert_equal(strict_repaired, "\u60c5", "low confidence allowed case")
    if not strict_details["chinese_repairs"] or strict_details["chinese_repairs"][0]["confidence"] != "low":
        raise AssertionError("low confidence repair metadata missing")

    blocked_repaired, _cfg, blocked_details = run_postprocess(module, "\u5973\u5b50\u662f\u4ec0\u4e48\u610f\u601d", low_confidence_enabled=True)
    assert_equal(blocked_repaired, "\u5973\u5b50\u662f\u4ec0\u4e48\u610f\u601d", "low confidence blocked meta context")
    assert_equal(len(blocked_details["chinese_repairs"]), 0, "low confidence blocked repairs")

    return {
        "default_disabled": default_repaired,
        "strict_allowed": strict_repaired,
        "blocked_meta": blocked_repaired,
    }


def main():
    module = load_winrt_ocr_module()

    positive = run_positive_tests(module)
    negative = run_negative_tests(module)
    line_results = run_line_tests(module)
    low_confidence = run_low_confidence_tests(module)

    print("Positive hits:")
    for source, repaired, repair_count in positive:
        print(f"  {escape_text(source)} -> {escape_text(repaired)} repairs={repair_count}")

    print("Negative no-op cases:")
    for source, repaired in negative:
        print(f"  {escape_text(source)} -> {escape_text(repaired)}")

    print("Line-level results:")
    for line in line_results:
        print(
            f"  text={escape_text(line['text'])} raw={escape_text(line['raw_text'])} rect={line['bounding_rect']}"
        )

    print("Low-confidence handling:")
    print(f"  default_disabled={escape_text(low_confidence['default_disabled'])}")
    print(f"  strict_allowed={escape_text(low_confidence['strict_allowed'])}")
    print(f"  blocked_meta={escape_text(low_confidence['blocked_meta'])}")


if __name__ == "__main__":
    raise SystemExit(main())

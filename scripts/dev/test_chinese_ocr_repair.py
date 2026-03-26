import importlib.util
from pathlib import Path


FAILURE_FALSE_POSITIVE = "false_positive"
FAILURE_FALSE_NEGATIVE = "false_negative"
FAILURE_LINE_CONSISTENCY = "line_consistency"
FAILURE_CONFIG_GATE = "config_gate"


def load_winrt_ocr_module():
    script_path = Path(__file__).resolve().parents[1] / "winrt_ocr.py"
    spec = importlib.util.spec_from_file_location("winrt_ocr", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def escape_text(value):
    return str(value).encode("unicode_escape").decode("ascii")


def make_postprocess_config(*, enabled=True, high_confidence_enabled=True, low_confidence_enabled=False):
    return {
        "chinese_repair": {
            "enabled": enabled,
            "high_confidence_enabled": high_confidence_enabled,
            "low_confidence_enabled": low_confidence_enabled,
        }
    }


def run_postprocess(module, text, *, enabled=True, high_confidence_enabled=True, low_confidence_enabled=False):
    return module.postprocess_text(
        text,
        make_postprocess_config(
            enabled=enabled,
            high_confidence_enabled=high_confidence_enabled,
            low_confidence_enabled=low_confidence_enabled,
        ),
    )


def build_line_fixture():
    return [
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


def evaluate_case(actual, expected, *, category, label, failures):
    passed = actual == expected
    result = {
        "label": label,
        "category": category,
        "expected": expected,
        "actual": actual,
        "passed": passed,
    }
    if not passed:
        failures.append(result)
    return result


def run_positive_tests(module, failures):
    cases = [
        ("\u4ebb\u5c14\u597d", "\u4f60\u597d"),
        ("\u6211\u767d\u52fa\u4e66", "\u6211\u7684\u4e66"),
        ("\u662f\u53e3\u9a6c", "\u662f\u5417"),
        ("\u6211\u767d\u52fa\u4e66\u662f\u4e0d\u662f\u5728\u4f60\u90a3\u91cc", "\u6211\u7684\u4e66\u662f\u4e0d\u662f\u5728\u4f60\u90a3\u91cc"),
        ("\u4f60\u8bf4\u7684\u662f\u53e3\u9a6c\uff0c\u4e0d\u662f\u5417", "\u4f60\u8bf4\u7684\u662f\u5417\uff0c\u4e0d\u662f\u5417"),
        ("\u8fd9\u4e2a\u662f\u4e0d\u662f\u6211\u767d\u52fa\u4f1e", "\u8fd9\u4e2a\u662f\u4e0d\u662f\u6211\u7684\u4f1e"),
        ("\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u767d\u52fa\u540d\u5b57", "\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u7684\u540d\u5b57"),
    ]
    results = []
    for source, expected in cases:
        repaired, _cfg, details = run_postprocess(module, source)
        results.append(
            {
                "source": source,
                "repair_count": len(details["chinese_repairs"]),
                "assertion": evaluate_case(
                    repaired,
                    expected,
                    category=FAILURE_FALSE_NEGATIVE,
                    label=f"positive:{source}",
                    failures=failures,
                ),
            }
        )
    return results


def run_negative_tests(module, failures):
    cases = [
        ("meta", "\u767d\u52fa\u7ed3\u6784\u5f88\u5e38\u89c1"),
        ("meta", "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408"),
        ("meta", "\u5973\u5b50\u662f\u4ec0\u4e48\u610f\u601d"),
        ("meta", "\u8fd9\u4e2a\u5b57\u7531\u5973\u5b50\u7ec4\u6210"),
        ("meta", "\u5fc4\u9752\u53ef\u4ee5\u7ec4\u6210\u4ec0\u4e48\u5b57"),
        ("meta", "\u8fd9\u4e2a\u504f\u65c1\u53eb\u767d\u52fa\u5417"),
        ("lexical", "\u53e4\u4ee3\u5973\u5b50\u5f88\u591a"),
        ("lexical", "\u5973\u5b50\u5b66\u6821"),
        ("lexical", "\u5973\u5b50\u7ec4\u6bd4\u8d5b"),
        ("lexical", "\u767d\u52fa\u4e0d\u662f\u4e00\u4e2a\u5e38\u7528\u72ec\u7acb\u5b57"),
        ("lexical", "\u53e3\u9a6c\u5728\u8fd9\u91cc\u4e0d\u662f\u53e5\u5b50\u8bed\u6c14\u8bcd"),
        ("lexical", "\u5973\u5b50\u7bee\u7403\u961f"),
        ("mixed", "\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c"),
        ("mixed", "\u6211\u5728\u770b\u767d\u52fa\u7ed3\u6784\u56fe"),
        ("mixed", "\u8001\u5e08\u8bf4\u5973\u5b50\u8fd9\u4e2a\u8bcd\u4e0d\u662f\u597d"),
        ("mixed", "\u4f60\u77e5\u9053\u53e3\u9a6c\u600e\u4e48\u8bfb\u5417"),
        ("mixed", "\u8fd9\u662f\u4e0d\u662f\u53e3\u9a6c\u7684\u8bfb\u97f3\u95ee\u9898"),
    ]
    results = []
    for kind, source in cases:
        repaired, _cfg, details = run_postprocess(module, source)
        assertion = evaluate_case(
            repaired,
            source,
            category=FAILURE_FALSE_POSITIVE,
            label=f"negative:{kind}:{source}",
            failures=failures,
        )
        if len(details["chinese_repairs"]) != 0 and assertion["passed"]:
            assertion["passed"] = False
            assertion["actual"] = f"{escape_text(repaired)} repairs={len(details['chinese_repairs'])}"
            failures.append(assertion)
        results.append({"kind": kind, "source": source, "assertion": assertion})
    return results


def run_line_tests(module, failures):
    normalized_lines = build_line_fixture()
    postprocessed_lines, details = module.postprocess_lines(
        normalized_lines,
        make_postprocess_config(enabled=True, high_confidence_enabled=True, low_confidence_enabled=False),
    )
    final_output = "\n".join(line["text"] for line in postprocessed_lines)
    expected_final = "\u4f60\u597d\n\u6211\u7684\u4e66"

    results = [
        evaluate_case(
            len(postprocessed_lines),
            2,
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:count",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[0]["text"],
            "\u4f60\u597d",
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:first_text",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[1]["text"],
            "\u6211\u7684\u4e66",
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:second_text",
            failures=failures,
        ),
        evaluate_case(
            normalized_lines[0]["text"],
            "\u4ebb\u5c14\u597d",
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:normalized_preserved",
            failures=failures,
        ),
        evaluate_case(
            final_output,
            expected_final,
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:final_output_alignment",
            failures=failures,
        ),
        evaluate_case(
            len(details["line_repairs"]),
            2,
            category=FAILURE_LINE_CONSISTENCY,
            label="lines:repair_details_count",
            failures=failures,
        ),
    ]

    for index, line in enumerate(postprocessed_lines):
        for key in ("text", "raw_text", "bounding_rect", "words"):
            results.append(
                evaluate_case(
                    key in line,
                    True,
                    category=FAILURE_LINE_CONSISTENCY,
                    label=f"lines:structure:{index}:{key}",
                    failures=failures,
                )
            )

    return {
        "normalized_lines": normalized_lines,
        "postprocessed_lines": postprocessed_lines,
        "final_output": final_output,
        "assertions": results,
    }


def run_multiline_negative_tests(module, failures):
    normalized_lines = [
        {
            "text": "\u4ebb\u5c14\u597d",
            "raw_text": "\u4ebb\u5c14\u597d",
            "bounding_rect": {"X": 10, "Y": 10, "Width": 20, "Height": 10},
            "words": [{"Text": "\u4ebb\u5c14"}],
        },
        {
            "text": "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
            "raw_text": "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
            "bounding_rect": {"X": 10, "Y": 30, "Width": 60, "Height": 10},
            "words": [{"Text": "\u53e3\u9a6c"}],
        },
        {
            "text": "\u6211\u767d\u52fa\u4e66",
            "raw_text": "\u6211\u767d\u52fa\u4e66",
            "bounding_rect": {"X": 10, "Y": 50, "Width": 40, "Height": 10},
            "words": [{"Text": "\u767d\u52fa"}],
        },
    ]
    postprocessed_lines, details = module.postprocess_lines(
        normalized_lines,
        make_postprocess_config(enabled=True, high_confidence_enabled=True, low_confidence_enabled=False),
    )
    final_output = "\n".join(line["text"] for line in postprocessed_lines)
    expected_output = "\u4f60\u597d\n\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408\n\u6211\u7684\u4e66"

    results = [
        evaluate_case(
            len(postprocessed_lines) > 0,
            True,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:postprocessed_lines_present",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[0]["text"],
            "\u4f60\u597d",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:first_line_repaired",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[1]["text"],
            "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:meta_line_preserved",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[2]["text"],
            "\u6211\u7684\u4e66",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:third_line_repaired",
            failures=failures,
        ),
        evaluate_case(
            normalized_lines[1]["text"],
            "\u53e3\u9a6c\u662f\u4ec0\u4e48\u504f\u65c1\u7ec4\u5408",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:normalized_meta_preserved",
            failures=failures,
        ),
        evaluate_case(
            final_output,
            expected_output,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:final_output_alignment",
            failures=failures,
        ),
        evaluate_case(
            len(details["line_repairs"]),
            3,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline:repair_details_count",
            failures=failures,
        ),
    ]

    return {
        "normalized_lines": normalized_lines,
        "postprocessed_lines": postprocessed_lines,
        "final_output": final_output,
        "assertions": results,
    }


def run_multiline_boundary_tests(module, failures):
    normalized_lines = [
        {
            "text": "\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u767d\u52fa\u540d\u5b57",
            "raw_text": "\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u767d\u52fa\u540d\u5b57",
            "bounding_rect": {"X": 12, "Y": 10, "Width": 56, "Height": 12},
            "words": [{"Text": "\u767d\u52fa"}],
        },
        {
            "text": "\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c",
            "raw_text": "\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c",
            "bounding_rect": {"X": 12, "Y": 28, "Width": 58, "Height": 12},
            "words": [{"Text": "\u53e3\u9a6c"}],
        },
        {
            "text": "\u4f60\u8bf4\u7684\u662f\u53e3\u9a6c\uff0c\u4e0d\u662f\u5417",
            "raw_text": "\u4f60\u8bf4\u7684\u662f\u53e3\u9a6c\uff0c\u4e0d\u662f\u5417",
            "bounding_rect": {"X": 12, "Y": 46, "Width": 64, "Height": 12},
            "words": [{"Text": "\u53e3\u9a6c"}],
        },
    ]
    postprocessed_lines, details = module.postprocess_lines(
        normalized_lines,
        make_postprocess_config(enabled=True, high_confidence_enabled=True, low_confidence_enabled=False),
    )
    final_output = "\n".join(line["text"] for line in postprocessed_lines)
    expected_output = "\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u7684\u540d\u5b57\n\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c\n\u4f60\u8bf4\u7684\u662f\u5417\uff0c\u4e0d\u662f\u5417"

    results = [
        evaluate_case(
            len(postprocessed_lines) > 0,
            True,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:postprocessed_lines_present",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[0]["text"],
            "\u4f60\u662f\u4e0d\u662f\u5fd8\u4e86\u6211\u7684\u540d\u5b57",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:first_line_repaired",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[1]["text"],
            "\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:meta_line_preserved",
            failures=failures,
        ),
        evaluate_case(
            postprocessed_lines[2]["text"],
            "\u4f60\u8bf4\u7684\u662f\u5417\uff0c\u4e0d\u662f\u5417",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:third_line_repaired",
            failures=failures,
        ),
        evaluate_case(
            normalized_lines[1]["text"],
            "\u8fd9\u4e2a\u5b57\u662f\u4e0d\u662f\u53e3\u9a6c",
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:normalized_meta_preserved",
            failures=failures,
        ),
        evaluate_case(
            final_output,
            expected_output,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:final_output_alignment",
            failures=failures,
        ),
        evaluate_case(
            len(details["line_repairs"]),
            3,
            category=FAILURE_LINE_CONSISTENCY,
            label="multiline_boundary:repair_details_count",
            failures=failures,
        ),
    ]

    return {
        "normalized_lines": normalized_lines,
        "postprocessed_lines": postprocessed_lines,
        "final_output": final_output,
        "assertions": results,
    }


def run_config_gate_tests(module, failures):
    results = []

    disabled_repaired, _cfg, disabled_details = run_postprocess(module, "\u4ebb\u5c14\u597d", enabled=False)
    results.append(
        {
            "label": "config:enabled_false",
            "assertion": evaluate_case(
                disabled_repaired,
                "\u4ebb\u5c14\u597d",
                category=FAILURE_CONFIG_GATE,
                label="config:enabled_false",
                failures=failures,
            ),
            "repair_count": len(disabled_details["chinese_repairs"]),
        }
    )

    low_conf_repaired, _cfg, low_conf_details = run_postprocess(
        module,
        "\u5973\u5b50",
        enabled=True,
        low_confidence_enabled=False,
    )
    results.append(
        {
            "label": "config:low_confidence_disabled",
            "assertion": evaluate_case(
                low_conf_repaired,
                "\u5973\u5b50",
                category=FAILURE_CONFIG_GATE,
                label="config:low_confidence_disabled",
                failures=failures,
            ),
            "repair_count": len(low_conf_details["chinese_repairs"]),
        }
    )

    return results


def print_section(title, items):
    print(title)
    for item in items:
        print(item)


def format_failure(failure):
    return (
        f"  [{failure['category']}] {failure['label']} "
        f"expected={escape_text(failure['expected'])} actual={escape_text(failure['actual'])}"
    )


def main():
    module = load_winrt_ocr_module()
    failures = []

    positive_results = run_positive_tests(module, failures)
    negative_results = run_negative_tests(module, failures)
    line_results = run_line_tests(module, failures)
    multiline_negative_results = run_multiline_negative_tests(module, failures)
    multiline_boundary_results = run_multiline_boundary_tests(module, failures)
    config_gate_results = run_config_gate_tests(module, failures)

    print("Coverage categories:")
    print("  A. positive_hits")
    print("  B. false_positive_guard")
    print("  C. line_consistency")
    print("  D. config_gate")

    print("Positive hits:")
    for item in positive_results:
        assertion = item["assertion"]
        print(
            f"  {escape_text(item['source'])} -> {escape_text(assertion['actual'])} "
            f"passed={assertion['passed']} repairs={item['repair_count']}"
        )

    print("Negative no-op cases:")
    for item in negative_results:
        assertion = item["assertion"]
        print(
            f"  [{item['kind']}] {escape_text(item['source'])} -> {escape_text(assertion['actual'])} "
            f"passed={assertion['passed']}"
        )

    print("Line-level consistency:")
    print(f"  normalized_lines_count={len(line_results['normalized_lines'])}")
    print(f"  postprocessed_lines_count={len(line_results['postprocessed_lines'])}")
    print(f"  final_output={escape_text(line_results['final_output'])}")

    print("Multiline negative consistency:")
    print(f"  normalized_lines_count={len(multiline_negative_results['normalized_lines'])}")
    print(f"  postprocessed_lines_count={len(multiline_negative_results['postprocessed_lines'])}")
    print(f"  final_output={escape_text(multiline_negative_results['final_output'])}")

    print("Multiline boundary consistency:")
    print(f"  normalized_lines_count={len(multiline_boundary_results['normalized_lines'])}")
    print(f"  postprocessed_lines_count={len(multiline_boundary_results['postprocessed_lines'])}")
    print(f"  final_output={escape_text(multiline_boundary_results['final_output'])}")

    print("Config gates:")
    for item in config_gate_results:
        assertion = item["assertion"]
        print(
            f"  {item['label']} actual={escape_text(assertion['actual'])} "
            f"passed={assertion['passed']} repairs={item['repair_count']}"
        )

    print("Failure summary:")
    if not failures:
        print("  none")
        return 0

    for failure in failures:
        print(format_failure(failure))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

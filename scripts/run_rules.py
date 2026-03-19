import argparse
import json
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path

from winrt_ocr import compute_image_change_ratio, run_ocr_pipeline


DEFAULT_OCR = {
    "roi": None,
    "preprocessing": {
        "grayscale": True,
        "scale": 1.0,
        "threshold": {"enabled": False, "value": 180},
        "trim_border": {"enabled": False, "margin": 0},
    },
    "normalization": {
        "collapse_whitespace": True,
        "preserve_line_breaks": False,
        "case": "none",
        "simple_noise_cleanup": True,
    },
    "watch": {
        "enabled": False,
        "polling_interval_seconds": 1.0,
        "max_checks": 1,
        "change_threshold": 0.005,
        "forced_ocr_interval_seconds": 5.0,
        "consecutive_match_count": 1,
    },
}

DEFAULT_FOCUS_STRATEGY = {
    "type": "activate_then_focus_control",
    "wait_timeout_seconds": 1.0,
    "settle_delay_ms": 150,
}

DEFAULT_READBACK_STRATEGY = {
    "type": "control_text",
    "focus_strategy": {},
}

DEFAULT_TARGET_BUNDLE = {
    "name": "default",
    "window_matcher": {},
    "focus_strategy": {},
    "control_strategy": {},
    "readback_strategy": {},
    "default_ocr_profile": None,
    "ocr_overrides": {},
    "roi_presets": {},
    "default_roi_preset": None,
}

SAFE_ACTION_TYPES = {
    "append_text",
    "prepend_text",
    "replace_text",
    "write_if_missing",
    "append_timestamped_note",
}

SAFE_MATCH_TYPES = {"contains", "contains_any", "contains_all", "not_contains", "regex"}
SAFE_ACTION_FIELDS = {"type", "text"}
SAFE_BOUNDARY = "capture -> OCR -> rule match -> control-targeted write"
DESIGNER_DRAFT_SCHEMA_VERSION = "designer-draft/v1"
DESIGNER_DRAFT_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "examples" / "drafts" / "valid-designer-draft.json"
ALLOWED_AHK_WRITE_COMMANDS = ("ControlSetText(", "ControlSend(")
AHK_EXIT_MESSAGES = {
    2: "Target window not found.",
    5: "Action payload file not found.",
    6: "Unsupported action type reached AutoHotkey layer.",
    7: "Target control name is missing.",
    8: "Target control could not be focused.",
    9: "Target control text could not be read.",
    10: "Target control text could not be written.",
    64: "AutoHotkey script received invalid arguments.",
}
BANNED_AHK_PATTERNS = (
    (re.compile(r"(?<!Control)SendInput\s*\(", re.IGNORECASE), "SendInput"),
    (re.compile(r"(?<!Control)SendEvent\s*\(", re.IGNORECASE), "SendEvent"),
    (re.compile(r"(?<!Control)SendPlay\s*\(", re.IGNORECASE), "SendPlay"),
    (re.compile(r"(?<!Control)SendText\s*\(", re.IGNORECASE), "SendText"),
    (re.compile(r"(?<!Control)Send\s*\(", re.IGNORECASE), "Send"),
    (re.compile(r"\bClick\s*\(", re.IGNORECASE), "Click"),
    (re.compile(r"\bMouseMove\s*\(", re.IGNORECASE), "MouseMove"),
    (re.compile(r"\bMouseClick\s*\(", re.IGNORECASE), "MouseClick"),
)


class UnsafeAutomationError(RuntimeError):
    pass


def run_cmd(cmd, check=True):
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def resolve_from_root(root: Path, value: str) -> Path:
    candidate = Path(value)
    if candidate.is_absolute():
        return candidate
    return (root / candidate).resolve()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_security_log(logs_dir: Path, message: str, context: dict | None = None) -> Path:
    logs_dir.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": datetime.now().strftime("%Y%m%d-%H%M%S"),
        "category": "security_violation",
        "message": message,
        "context": context or {},
    }
    log_path = logs_dir / f"security-{record['timestamp']}.json"
    log_path.write_text(json.dumps(record, ensure_ascii=True, indent=2), encoding="utf-8")
    return log_path


def raise_security_violation(logs_dir: Path, message: str, context: dict | None = None):
    log_path = write_security_log(logs_dir, message, context)
    raise UnsafeAutomationError(f"{message} (logged to {log_path})")


def deep_merge(defaults: dict, override: dict | None):
    merged = json.loads(json.dumps(defaults))
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def normalize_match_text(value: str):
    return value.lower()


def validate_match_config(match_cfg: dict, logs_dir: Path, rule_name: str):
    match_type = (match_cfg or {}).get("type")
    if match_type not in SAFE_MATCH_TYPES:
        raise_security_violation(
            logs_dir,
            "Unsupported match type requested.",
            {"rule_name": rule_name, "match_type": match_type, "allowed_match_types": sorted(SAFE_MATCH_TYPES)},
        )

    if match_type in {"contains", "not_contains"} and not match_cfg.get("value"):
        raise_security_violation(logs_dir, "Match config requires a non-empty value.", {"rule_name": rule_name, "match": match_cfg})
    if match_type == "regex" and not match_cfg.get("pattern"):
        raise_security_violation(logs_dir, "Regex match config requires a pattern.", {"rule_name": rule_name, "match": match_cfg})
    if match_type in {"contains_any", "contains_all"}:
        values = match_cfg.get("values")
        if not isinstance(values, list) or not values or not all(isinstance(value, str) and value for value in values):
            raise_security_violation(
                logs_dir,
                "List-based match config requires at least one non-empty string value.",
                {"rule_name": rule_name, "match": match_cfg},
            )


def validate_action_config(action_cfg: dict, logs_dir: Path, rule_name: str):
    action_type = (action_cfg or {}).get("type")
    if action_type not in SAFE_ACTION_TYPES:
        raise_security_violation(
            logs_dir,
            "Unsupported action type requested.",
            {"rule_name": rule_name, "action_type": action_type, "allowed_action_types": sorted(SAFE_ACTION_TYPES)},
        )

    unexpected_fields = sorted(set((action_cfg or {}).keys()) - SAFE_ACTION_FIELDS)
    if unexpected_fields:
        raise_security_violation(
            logs_dir,
            "Action config contains unsupported fields. Low-level keyboard or mouse instructions are forbidden.",
            {"rule_name": rule_name, "unexpected_fields": unexpected_fields},
        )

    if action_type != "append_timestamped_note" and not isinstance(action_cfg.get("text", ""), str):
        raise_security_violation(logs_dir, "Action text must be a string.", {"rule_name": rule_name, "action": action_cfg})


def load_designer_template():
    return load_json(DESIGNER_DRAFT_TEMPLATE_PATH)


def build_execution_draft(rule: dict, target_bundle: dict, target: dict, control: dict, ocr_profile_name: str, ocr_cfg: dict):
    template = load_designer_template()
    return {
        "schema_version": DESIGNER_DRAFT_SCHEMA_VERSION,
        "draft_only": True,
        "export_only": True,
        "non_executing": True,
        "generated_from": "workspace-electron-executor",
        "exported_at": datetime.now().isoformat(),
        "safe_boundary": SAFE_BOUNDARY,
        "target_bundle_ref": target_bundle.get("name") or rule.get("target") or "workspace_target",
        "target_bundle": target_bundle,
        "target": target,
        "control": control,
        "selected_ocr_profile_ref": ocr_profile_name,
        "resolved_ocr_profile": ocr_cfg,
        "applied_roi_preset": target_bundle.get("default_roi_preset"),
        "template_metadata": {
            "template_id": "execution-template",
            "template_label": "Execution Validation Template",
            "template_schema_version": template.get("schema_version"),
            "source_template_file": str(DESIGNER_DRAFT_TEMPLATE_PATH),
        },
        "onboarding": template.get("onboarding"),
        "rule_draft": {
            "name": rule["name"],
            "target": rule.get("target") or target_bundle.get("name") or "default",
            "ocr_profile": ocr_profile_name,
            "match": rule["match"],
            "action": rule["action"],
        },
        "scenario_context": None,
        "notes": {
            "browser_designer_only": True,
            "repository_writeback": False,
            "frontend_execution_controls": False,
            "source_template": str(DESIGNER_DRAFT_TEMPLATE_PATH),
            "source_target_bundle": target_bundle.get("name"),
            "source_ocr_profile": ocr_profile_name,
            "source_scenario": None,
        },
    }


def validate_execution_draft(rule: dict, target_bundle: dict, target: dict, control: dict, ocr_profile_name: str, ocr_cfg: dict, logs_dir: Path):
    template = load_designer_template()
    draft = build_execution_draft(rule, target_bundle, target, control, ocr_profile_name, ocr_cfg)

    missing_keys = [key for key in template.keys() if key not in draft]
    if missing_keys:
        raise_security_violation(logs_dir, "Execution draft is missing required template keys.", {"missing_keys": missing_keys})
    if draft["schema_version"] != template["schema_version"]:
        raise_security_violation(logs_dir, "Execution draft schema version mismatch.", {"schema_version": draft["schema_version"]})
    if draft["safe_boundary"] != template["safe_boundary"]:
        raise_security_violation(logs_dir, "Execution draft boundary mismatch.", {"safe_boundary": draft["safe_boundary"]})
    if not rule.get("dry_run") and not control.get("name"):
        raise_security_violation(logs_dir, "Control-targeted write requires a concrete control name.", {"rule_name": rule["name"]})

    validate_match_config(draft["rule_draft"]["match"], logs_dir, rule["name"])
    validate_action_config(draft["rule_draft"]["action"], logs_dir, rule["name"])
    return draft


def validate_ahk_write_script(trigger_script: Path, logs_dir: Path):
    script_text = trigger_script.read_text(encoding="utf-8")
    banned_hits = [label for pattern, label in BANNED_AHK_PATTERNS if pattern.search(script_text)]
    if banned_hits:
        raise_security_violation(
            logs_dir,
            "Unsafe AutoHotkey command detected. Only control-targeted writes are allowed.",
            {"trigger_script": str(trigger_script), "banned_tokens": banned_hits},
        )


def raise_ahk_runtime_error(exit_code: int, control_name: str | None, window_title: str | None):
    message = AHK_EXIT_MESSAGES.get(exit_code, f"AutoHotkey runtime failed with exit code {exit_code}.")
    detail = f" Window: {window_title or 'n/a'}."
    if control_name:
        detail += f" Control: {control_name}."
    if exit_code in (8, 9, 10):
        detail += " The current app version may not expose a standard editable control for safe control-targeted writes."
    raise RuntimeError(message + detail)
    if not any(command in script_text for command in ALLOWED_AHK_WRITE_COMMANDS):
        raise_security_violation(
            logs_dir,
            "AutoHotkey write script does not contain an allowed control-targeted write command.",
            {"trigger_script": str(trigger_script), "allowed_commands": ALLOWED_AHK_WRITE_COMMANDS},
        )


def evaluate_match(match_cfg: dict, ocr_text: str):
    match_type = match_cfg["type"]
    haystack = normalize_match_text(ocr_text)
    details = {"type": match_type, "matched": False, "reason": ""}

    if match_type == "contains":
        needle = normalize_match_text(match_cfg["value"])
        details["matched"] = needle in haystack
        details["reason"] = f"contains('{match_cfg['value']}')={'true' if details['matched'] else 'false'}"
    elif match_type == "contains_any":
        values = match_cfg["values"]
        hits = [value for value in values if normalize_match_text(value) in haystack]
        details["matched"] = bool(hits)
        details["reason"] = f"contains_any hits={hits}"
    elif match_type == "contains_all":
        values = match_cfg["values"]
        missing = [value for value in values if normalize_match_text(value) not in haystack]
        details["matched"] = not missing
        details["reason"] = f"contains_all missing={missing}"
    elif match_type == "not_contains":
        needle = normalize_match_text(match_cfg["value"])
        details["matched"] = needle not in haystack
        details["reason"] = f"not_contains('{match_cfg['value']}')={'true' if details['matched'] else 'false'}"
    elif match_type == "regex":
        pattern = match_cfg["pattern"]
        details["matched"] = re.search(pattern, ocr_text, flags=re.IGNORECASE) is not None
        details["reason"] = f"regex('{pattern}')={'true' if details['matched'] else 'false'}"
    else:
        details["reason"] = f"unsupported match type: {match_type}"

    return details


def build_action_payload(action_cfg: dict):
    action_type = action_cfg["type"]
    if action_type not in SAFE_ACTION_TYPES:
        raise UnsafeAutomationError(f"Unsupported action type: {action_type}")
    if action_type == "append_timestamped_note":
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"[{ts}] {action_cfg['text']}"
    return action_cfg.get("text", "")


def map_action_to_ahk_mode(action_type: str):
    mapping = {
        "append_text": "append_text",
        "prepend_text": "prepend_text",
        "replace_text": "replace_text",
        "write_if_missing": "write_if_missing",
        "append_timestamped_note": "append_text",
    }
    if action_type not in mapping:
        raise UnsafeAutomationError(f"Unsupported action type for AHK mapping: {action_type}")
    return mapping[action_type]


def load_recent_logs(logs_dir: Path, prefix: str):
    records = []
    for path in sorted(logs_dir.glob(f"{prefix}-*.json"), reverse=True):
        try:
            records.append(load_json(path))
        except Exception:
            continue
    return records


def was_recent_rule_hit(recent_logs, target_window: str, rule_name: str, cooldown_seconds: int):
    if cooldown_seconds <= 0:
        return False
    now = datetime.now()
    for record in recent_logs:
        if record.get("target_window") != target_window:
            continue
        if record.get("matched_rule") != rule_name:
            continue
        validation = record.get("validation_result") or {}
        if not validation.get("action_applied"):
            continue
        ts = record.get("timestamp")
        try:
            then = datetime.strptime(ts, "%Y%m%d-%H%M%S")
        except Exception:
            continue
        if (now - then).total_seconds() <= cooldown_seconds:
            return True
    return False


def normalize_focus_strategy(strategy: dict | None, fallback_type: str = "activate_then_focus_control"):
    normalized = deep_merge(DEFAULT_FOCUS_STRATEGY, strategy or {})
    normalized["type"] = normalized.get("type") or fallback_type
    return normalized


def normalize_readback_strategy(strategy: dict | None, fallback_focus: dict | None):
    normalized = deep_merge(DEFAULT_READBACK_STRATEGY, strategy or {})
    normalized["type"] = normalized.get("type") or "control_text"
    normalized["focus_strategy"] = normalize_focus_strategy(
        normalized.get("focus_strategy"), (fallback_focus or {}).get("type", "activate_then_focus_control")
    )
    return normalized


def normalize_target_bundle(entry: dict | None, inherited_bundle: dict | None = None, name: str = "default"):
    merged_entry = deep_merge({}, entry or {})
    bundle = deep_merge(DEFAULT_TARGET_BUNDLE, inherited_bundle or {})
    bundle = deep_merge(bundle, merged_entry.get("target_bundle", {}))

    legacy_target = merged_entry.get("target", {})
    legacy_control = merged_entry.get("control", {})

    bundle["name"] = bundle.get("name") or name
    bundle["window_matcher"] = deep_merge(bundle.get("window_matcher", {}), {k: v for k, v in legacy_target.items() if v is not None})
    control_legacy_override = {}
    if legacy_control.get("name") is not None:
        control_legacy_override["control_name"] = legacy_control.get("name")
    if legacy_control.get("type") is not None:
        control_legacy_override["control_type"] = legacy_control.get("type")
    bundle["control_strategy"] = deep_merge(bundle.get("control_strategy", {}), control_legacy_override)

    default_focus_type = "activate_then_focus_control" if bundle["control_strategy"].get("control_name") else "activate_then_wait"
    bundle["focus_strategy"] = normalize_focus_strategy(bundle.get("focus_strategy"), default_focus_type)
    bundle["readback_strategy"] = normalize_readback_strategy(bundle.get("readback_strategy"), bundle["focus_strategy"])

    if bundle["readback_strategy"]["type"] in ("control_text", "hybrid_readback") and not bundle["readback_strategy"].get(
        "control_name"
    ):
        bundle["readback_strategy"]["control_name"] = bundle["control_strategy"].get("control_name")

    target = {
        "window_title_substring": bundle["window_matcher"].get("window_title_substring"),
        "window_title": bundle["window_matcher"].get("window_title"),
        "process_name": bundle["window_matcher"].get("process_name"),
    }
    control = {
        "name": bundle["control_strategy"].get("control_name"),
        "type": bundle["control_strategy"].get("control_type"),
    }

    return {"bundle": bundle, "target": target, "control": control}


def apply_ocr_roi_preset(ocr_cfg: dict, target_bundle: dict, preset_name: str | None):
    if not preset_name:
        return ocr_cfg
    preset = (target_bundle.get("roi_presets") or {}).get(preset_name)
    if not preset:
        raise KeyError(f"unknown target ROI preset: {preset_name}")
    return deep_merge(ocr_cfg, {"roi": preset})


def materialize_target_ocr_override(override: dict | None, target_bundle: dict):
    if not override:
        override = {}
    resolved = deep_merge({}, override)
    preset_name = resolved.pop("roi_preset", None)
    if preset_name:
        resolved = apply_ocr_roi_preset(resolved, target_bundle, preset_name)
    return resolved


def execute_readback_script(
    ahk_exe: Path,
    readback_script: Path,
    readback_path: Path,
    resolved_target: dict,
    resolved_control: dict,
    readback_strategy: dict,
):
    read_proc = subprocess.run(
        [
            str(ahk_exe),
            str(readback_script),
            resolved_target["window_title"],
            readback_strategy.get("control_name") or resolved_control.get("name") or "",
            str(readback_path),
            readback_strategy["focus_strategy"]["type"],
            "window_text" if readback_strategy["type"] == "window_text" else "control_text",
            str(readback_strategy["focus_strategy"]["wait_timeout_seconds"]),
            str(readback_strategy["focus_strategy"]["settle_delay_ms"]),
        ],
        capture_output=True,
        text=True,
    )
    current_text = readback_path.read_text(encoding="utf-8") if readback_path.exists() else None
    if read_proc.returncode not in (0,):
        raise_ahk_runtime_error(
            read_proc.returncode,
            readback_strategy.get("control_name") or resolved_control.get("name"),
            resolved_target.get("window_title"),
        )
    return read_proc.returncode, current_text


def capture_target_window(capture_script: Path, resolved_target: dict, screenshot_path: Path):
    capture_cmd = [
        "powershell",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(capture_script),
        "-WindowTitleSubstring",
        resolved_target["window_title_substring"],
        "-ProcessName",
        resolved_target["process_name"],
        "-OutFile",
        str(screenshot_path),
    ]
    return json.loads(run_cmd(capture_cmd).stdout)


def read_target_text(
    ahk_exe: Path,
    readback_script: Path,
    readback_path: Path,
    capture_script: Path,
    screenshots_dir: Path,
    prefix: str,
    timestamp: str,
    rule_name: str,
    readback_phase: str,
    resolved_target: dict,
    resolved_control: dict,
    readback_strategy: dict,
    ocr_cfg: dict,
):
    strategy_type = readback_strategy.get("type", "control_text")

    if strategy_type in ("control_text", "window_text"):
        return execute_readback_script(
            ahk_exe=ahk_exe,
            readback_script=readback_script,
            readback_path=readback_path,
            resolved_target=resolved_target,
            resolved_control=resolved_control,
            readback_strategy=readback_strategy,
        )

    screenshot_path = screenshots_dir / f"{prefix}-{timestamp}-{rule_name}-{readback_phase}-readback.png"
    processed_path = screenshots_dir / f"{prefix}-{timestamp}-{rule_name}-{readback_phase}-readback-processed.png"
    capture_target_window(capture_script, resolved_target, screenshot_path)
    ocr_payload = run_ocr_pipeline(screenshot_path, ocr_cfg, processed_path)
    ocr_text = ocr_payload["normalized_ocr_output"]

    if strategy_type == "ocr_readback":
        return 0, ocr_text

    if strategy_type == "hybrid_readback":
        exit_code, current_text = execute_readback_script(
            ahk_exe=ahk_exe,
            readback_script=readback_script,
            readback_path=readback_path,
            resolved_target=resolved_target,
            resolved_control=resolved_control,
            readback_strategy=deep_merge(readback_strategy, {"type": "control_text"}),
        )
        if exit_code == 0 and current_text:
            return exit_code, current_text
        return 0, ocr_text

    raise KeyError(f"unsupported readback strategy: {strategy_type}")


def get_targets_map(config: dict):
    targets = {}
    default_bundle = None
    if config.get("target_bundle") or config.get("target") or config.get("control"):
        default_target = normalize_target_bundle(
            {
                "target_bundle": config.get("target_bundle", {}),
                "target": config.get("target", {}),
                "control": config.get("control", {}),
            },
            name="default",
        )
        default_bundle = default_target["bundle"]
        targets["default"] = default_target
    for name, entry in config.get("targets", {}).items():
        targets[name] = normalize_target_bundle(entry, inherited_bundle=default_bundle, name=name)
    return targets


def resolve_rule_target(config: dict, rule: dict):
    targets = get_targets_map(config)
    default_target = targets.get("default") or normalize_target_bundle(
        {
            "target_bundle": config.get("target_bundle", {}),
            "target": config.get("target", {}),
            "control": config.get("control", {}),
        },
        name="default",
    )
    resolved_target = deep_merge(default_target["target"], {})
    resolved_control = deep_merge(default_target["control"], {})
    resolved_bundle = deep_merge(DEFAULT_TARGET_BUNDLE, default_target["bundle"])

    target_ref = rule.get("target")
    if isinstance(target_ref, str):
        if target_ref not in targets:
            raise KeyError(f"unknown rule target reference: {target_ref}")
        resolved_target = deep_merge(resolved_target, targets[target_ref]["target"])
        resolved_control = deep_merge(resolved_control, targets[target_ref]["control"])
        resolved_bundle = deep_merge(resolved_bundle, targets[target_ref]["bundle"])

    if isinstance(target_ref, dict):
        inline = normalize_target_bundle(target_ref, inherited_bundle=resolved_bundle, name=resolved_bundle.get("name", "inline"))
        resolved_target = deep_merge(resolved_target, inline["target"])
        resolved_control = deep_merge(resolved_control, inline["control"])
        resolved_bundle = deep_merge(resolved_bundle, inline["bundle"])

    resolved_bundle = deep_merge(resolved_bundle, rule.get("target_bundle_override", {}))
    resolved_target = deep_merge(resolved_target, rule.get("target_override", {}))
    resolved_control = deep_merge(resolved_control, rule.get("control_override", {}))
    resolved_bundle["window_matcher"] = deep_merge(resolved_bundle.get("window_matcher", {}), resolved_target)
    resolved_bundle["control_strategy"] = deep_merge(
        resolved_bundle.get("control_strategy", {}),
        {"control_name": resolved_control.get("name"), "control_type": resolved_control.get("type")},
    )
    resolved_bundle["focus_strategy"] = normalize_focus_strategy(
        deep_merge(resolved_bundle.get("focus_strategy", {}), rule.get("focus_override", {})),
        resolved_bundle.get("focus_strategy", {}).get("type", "activate_then_focus_control"),
    )
    resolved_bundle["readback_strategy"] = normalize_readback_strategy(
        deep_merge(resolved_bundle.get("readback_strategy", {}), rule.get("readback_override", {})),
        resolved_bundle["focus_strategy"],
    )
    if resolved_bundle["readback_strategy"]["type"] in ("control_text", "hybrid_readback") and not resolved_bundle[
        "readback_strategy"
    ].get("control_name"):
        resolved_bundle["readback_strategy"]["control_name"] = resolved_control.get("name")
    return resolved_target, resolved_control, resolved_bundle


def get_ocr_profiles(config: dict):
    profiles = {}
    if config.get("ocr"):
        profiles["default"] = deep_merge(DEFAULT_OCR, config.get("ocr", {}))
    for name, profile in config.get("ocr_profiles", {}).items():
        profiles[name] = deep_merge(DEFAULT_OCR, profile)
    if "default" not in profiles:
        profiles["default"] = deep_merge(DEFAULT_OCR, {})
    return profiles


def resolve_rule_ocr_profile(config: dict, rule: dict, target_bundle: dict):
    profiles = get_ocr_profiles(config)
    default_name = target_bundle.get("default_ocr_profile") or config.get("ocr_profile", "default")
    if default_name not in profiles:
        profiles[default_name] = deep_merge(DEFAULT_OCR, config.get("ocr", {}))

    profile_name = rule.get("ocr_profile", default_name)
    if profile_name not in profiles:
        raise KeyError(f"unknown OCR profile: {profile_name}")
    resolved = deep_merge(profiles[profile_name], materialize_target_ocr_override(target_bundle.get("ocr_overrides"), target_bundle))
    default_roi_preset = target_bundle.get("default_roi_preset")
    if default_roi_preset and not resolved.get("roi"):
        resolved = apply_ocr_roi_preset(resolved, target_bundle, default_roi_preset)
    resolved = deep_merge(resolved, materialize_target_ocr_override(rule.get("ocr_override"), target_bundle))
    return profile_name, resolved


def evaluate_rules_for_ocr_text(
    rule: dict,
    normalized_ocr_text: str,
    current_text: str | None,
    recent_logs: list,
    dry_run: bool,
    ahk_exe: Path,
    trigger_script: Path,
    readback_script: Path,
    readback_path: Path,
    logs_dir: Path,
    capture_script: Path,
    screenshots_dir: Path,
    timestamp: str,
    prefix: str,
    resolved_target: dict,
    resolved_control: dict,
    resolved_bundle: dict,
    ocr_cfg: dict,
    cooldown_seconds: int,
):
    evaluation = {
        "name": rule["name"],
        "match": evaluate_match(rule["match"], normalized_ocr_text),
        "eligible_for_action": False,
        "duplicate_prevented": False,
        "duplicate_reason": None,
    }
    action_type = None
    action_payload = None
    ahk_exit_code = None
    validation_result = {
        "action_applied": False,
        "duplicate_prevented": False,
        "duplicate_reason": None,
        "post_action_control_text": current_text,
    }

    if evaluation["match"]["matched"]:
        action_type = rule["action"]["type"]
        action_payload = build_action_payload(rule["action"])
        duplicate_reason = None

        if was_recent_rule_hit(recent_logs, resolved_target["window_title"], rule["name"], cooldown_seconds):
            duplicate_reason = f"recent_rule_hit_within_{cooldown_seconds}s"
        elif current_text is not None and action_payload and action_payload in current_text:
            duplicate_reason = "payload_already_present"

        if duplicate_reason:
            evaluation["duplicate_prevented"] = True
            evaluation["duplicate_reason"] = duplicate_reason
        else:
            evaluation["eligible_for_action"] = True
            if not dry_run:
                action_file = logs_dir / f"{prefix}-{timestamp}-{rule['name']}-action.txt"
                action_file.write_text(action_payload, encoding="utf-8")
                trigger_cmd = [
                    str(ahk_exe),
                    str(trigger_script),
                    resolved_target["window_title"],
                    resolved_control["name"],
                    map_action_to_ahk_mode(action_type),
                    str(action_file),
                    resolved_bundle["focus_strategy"]["type"],
                    str(resolved_bundle["focus_strategy"]["wait_timeout_seconds"]),
                    str(resolved_bundle["focus_strategy"]["settle_delay_ms"]),
                ]
                action_proc = subprocess.run(trigger_cmd, capture_output=True, text=True)
                ahk_exit_code = action_proc.returncode
                if action_proc.returncode != 0:
                    raise_ahk_runtime_error(
                        action_proc.returncode,
                        resolved_control.get("name"),
                        resolved_target.get("window_title"),
                    )
                read_exit_code, current_text = read_target_text(
                    ahk_exe,
                    readback_script,
                    readback_path,
                    capture_script,
                    screenshots_dir,
                    prefix,
                    timestamp,
                    rule["name"],
                    "post-action",
                    resolved_target,
                    resolved_control,
                    resolved_bundle["readback_strategy"],
                    ocr_cfg,
                )
                validation_result["readback_exit_code"] = read_exit_code
                validation_result["post_action_control_text"] = current_text
                validation_result["action_applied"] = action_proc.returncode == 0
            else:
                validation_result["post_action_control_text"] = current_text

    validation_result["duplicate_prevented"] = evaluation["duplicate_prevented"]
    validation_result["duplicate_reason"] = evaluation["duplicate_reason"]

    return {
        "evaluation": evaluation,
        "action_type": action_type,
        "action_payload": action_payload,
        "ahk_exit_code": ahk_exit_code,
        "validation_result": validation_result,
        "current_text": current_text,
    }


def run_rule_pipeline(
    root: Path,
    config: dict,
    rule: dict,
    timestamp: str,
    prefix: str,
    dry_run: bool,
    recent_logs: list,
    capture_script: Path,
    trigger_script: Path,
    ahk_exe: Path,
    readback_script: Path,
    readback_path: Path,
    logs_dir: Path,
    screenshots_dir: Path,
    cooldown_seconds: int,
):
    resolved_target, resolved_control, resolved_bundle = resolve_rule_target(config, rule)
    ocr_profile_name, ocr_cfg = resolve_rule_ocr_profile(config, rule, resolved_bundle)
    validate_execution_draft(rule, resolved_bundle, resolved_target, resolved_control, ocr_profile_name, ocr_cfg, logs_dir)
    validate_ahk_write_script(trigger_script, logs_dir)

    read_exit_code, current_text = read_target_text(
        ahk_exe,
        readback_script,
        readback_path,
        capture_script,
        screenshots_dir,
        prefix,
        timestamp,
        rule["name"],
        "pre-action",
        resolved_target,
        resolved_control,
        resolved_bundle["readback_strategy"],
        ocr_cfg,
    )
    watch_cfg = ocr_cfg["watch"]
    watch_enabled = bool(watch_cfg.get("enabled", False))
    max_checks = int(watch_cfg.get("max_checks", 1 if watch_enabled else 1))
    poll_interval = float(watch_cfg.get("polling_interval_seconds", 1.0))
    change_threshold = float(watch_cfg.get("change_threshold", 0.005))
    forced_ocr_interval = float(watch_cfg.get("forced_ocr_interval_seconds", 5.0))
    consecutive_required = int(watch_cfg.get("consecutive_match_count", 1))

    frames = []
    previous_capture_path = None
    last_ocr_monotonic = None
    last_normalized_text = None
    consecutive_count = 0
    selected_ocr_payload = None

    final_result = {
        "matched_rule": None,
        "action_type": None,
        "action_payload": None,
        "ahk_exit_code": None,
        "evaluated_rules": [],
        "validation_result": {
            "readback_exit_code": read_exit_code,
            "pre_action_control_text": current_text,
            "action_applied": False,
            "duplicate_prevented": False,
            "duplicate_reason": None,
            "post_action_control_text": current_text,
        },
    }

    for check_index in range(1, max_checks + 1):
        screenshot_path = screenshots_dir / f"{prefix}-{timestamp}-{rule['name']}-check{check_index}.png"
        capture = capture_target_window(capture_script, resolved_target, screenshot_path)

        change_ratio = None
        ocr_skipped = False
        forced_ocr = check_index == 1
        if previous_capture_path:
            change_ratio = compute_image_change_ratio(previous_capture_path, screenshot_path, ocr_cfg)
            if not forced_ocr:
                if forced_ocr_interval <= 0:
                    forced_ocr = True
                elif last_ocr_monotonic is not None:
                    forced_ocr = (time.monotonic() - last_ocr_monotonic) >= forced_ocr_interval
            if watch_enabled and not forced_ocr and change_ratio is not None and change_ratio < change_threshold:
                ocr_skipped = True

        frame = {
            "check_index": check_index,
            "screenshot_path": capture["OutFile"],
            "processed_image_path": None,
            "change_ratio": change_ratio,
            "ocr_skipped_no_change": ocr_skipped,
            "forced_ocr": forced_ocr,
            "raw_ocr_output": None,
            "normalized_ocr_output": None,
            "roi_used": None,
            "preprocessing_settings": ocr_cfg["preprocessing"],
            "normalization_settings": ocr_cfg["normalization"],
            "multi_frame_confirmation_count": consecutive_count,
            "multi_frame_confirmation_satisfied": False,
            "rule_evaluation_skipped_reason": None,
        }

        if not ocr_skipped:
            processed_path = screenshots_dir / f"{prefix}-{timestamp}-{rule['name']}-check{check_index}-processed.png"
            ocr_payload = run_ocr_pipeline(screenshot_path, ocr_cfg, processed_path)
            selected_ocr_payload = ocr_payload
            last_ocr_monotonic = time.monotonic()
            frame["processed_image_path"] = ocr_payload["processed_image_path"]
            frame["raw_ocr_output"] = ocr_payload["raw_ocr_output"]
            frame["normalized_ocr_output"] = ocr_payload["normalized_ocr_output"]
            frame["roi_used"] = ocr_payload["roi_used"]
            frame["preprocessing_settings"] = ocr_payload["preprocessing_settings"]
            frame["normalization_settings"] = ocr_payload["normalization_settings"]

            normalized_text = ocr_payload["normalized_ocr_output"]
            if last_normalized_text == normalized_text:
                consecutive_count += 1
            else:
                consecutive_count = 1
            last_normalized_text = normalized_text

            frame["multi_frame_confirmation_count"] = consecutive_count
            frame["multi_frame_confirmation_satisfied"] = consecutive_count >= consecutive_required

            if frame["multi_frame_confirmation_satisfied"]:
                rule_eval = evaluate_rules_for_ocr_text(
                    rule=rule,
                    normalized_ocr_text=normalized_text,
                    current_text=current_text,
                    recent_logs=recent_logs,
                    dry_run=dry_run,
                    ahk_exe=ahk_exe,
                    trigger_script=trigger_script,
                    readback_script=readback_script,
                    readback_path=readback_path,
                    logs_dir=logs_dir,
                    capture_script=capture_script,
                    screenshots_dir=screenshots_dir,
                    timestamp=timestamp,
                    prefix=prefix,
                    resolved_target=resolved_target,
                    resolved_control=resolved_control,
                    resolved_bundle=resolved_bundle,
                    ocr_cfg=ocr_cfg,
                    cooldown_seconds=cooldown_seconds,
                )
                final_result["matched_rule"] = rule["name"] if rule_eval["evaluation"]["match"]["matched"] else None
                final_result["action_type"] = rule_eval["action_type"]
                final_result["action_payload"] = rule_eval["action_payload"]
                final_result["ahk_exit_code"] = rule_eval["ahk_exit_code"]
                final_result["evaluated_rules"] = [rule_eval["evaluation"]]
                final_result["validation_result"] = deep_merge(
                    final_result["validation_result"], rule_eval["validation_result"]
                )
                frames.append(frame)
                break
            frame["rule_evaluation_skipped_reason"] = (
                f"waiting_for_multi_frame_confirmation_{consecutive_count}_of_{consecutive_required}"
            )
        else:
            frame["rule_evaluation_skipped_reason"] = "ocr_skipped_no_change"

        frames.append(frame)
        previous_capture_path = screenshot_path
        if not watch_enabled:
            break
        if check_index < max_checks:
            time.sleep(poll_interval)

    return {
        "rule_name": rule["name"],
        "resolved_target": resolved_target,
        "resolved_control": resolved_control,
        "focus_strategy": resolved_bundle["focus_strategy"],
        "readback_strategy": resolved_bundle["readback_strategy"],
        "target_bundle_name": resolved_bundle.get("name"),
        "ocr_profile_used": ocr_profile_name,
        "roi_used": selected_ocr_payload["roi_used"] if selected_ocr_payload else ocr_cfg.get("roi"),
        "preprocessing_settings": selected_ocr_payload["preprocessing_settings"] if selected_ocr_payload else ocr_cfg["preprocessing"],
        "normalization_settings": selected_ocr_payload["normalization_settings"] if selected_ocr_payload else ocr_cfg["normalization"],
        "raw_ocr_output": selected_ocr_payload["raw_ocr_output"] if selected_ocr_payload else None,
        "normalized_ocr_output": selected_ocr_payload["normalized_ocr_output"] if selected_ocr_payload else None,
        "screenshot_path": selected_ocr_payload["image_path"] if selected_ocr_payload else (frames[-1]["screenshot_path"] if frames else None),
        "ocr_skipped_no_change": any(frame["ocr_skipped_no_change"] for frame in frames),
        "multi_frame_confirmation_required": consecutive_required,
        "multi_frame_confirmation_satisfied": any(frame["multi_frame_confirmation_satisfied"] for frame in frames),
        "evaluated_rules": final_result["evaluated_rules"],
        "matched_rule": final_result["matched_rule"],
        "action_type": final_result["action_type"],
        "action_payload": final_result["action_payload"],
        "ahk_exit_code": final_result["ahk_exit_code"],
        "validation_result": final_result["validation_result"],
        "frames": frames,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("config_path")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--logs-dir", default=None)
    parser.add_argument("--screenshots-dir", default=None)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    config_path = resolve_from_root(root, args.config_path)
    logs_dir = resolve_from_root(root, args.logs_dir) if args.logs_dir else root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    screenshots_dir = resolve_from_root(root, args.screenshots_dir) if args.screenshots_dir else root / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    config = load_json(config_path)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    capture_script = root / "scripts" / "capture_window.ps1"
    trigger_script = root / "scripts" / "trigger_action.ahk"
    ahk_exe = resolve_from_root(root, config["automation"]["ahk_exe"])
    readback_script = root / "scripts" / "ahk" / "read_control_text.ahk"
    readback_path = root / "scripts" / "ahk" / "read_control_text.txt"

    engine_settings = config.get("engine", {})
    stop_after_first_match = engine_settings.get("stop_after_first_match", True)
    cooldown_seconds = int(engine_settings.get("recent_rule_hit_cooldown_seconds", 0))
    prefix = engine_settings.get("log_prefix", "phase4")
    recent_logs = load_recent_logs(logs_dir, prefix)

    rule_runs = []
    matched_rule = None
    action_type = None
    action_payload = None
    ahk_exit_code = None
    top_target_window = None
    top_target_control = None
    top_screenshot_path = None
    top_roi_used = None
    top_preprocessing = None
    top_normalization = None
    top_raw_ocr = None
    top_normalized_ocr = None
    top_ocr_profile = None
    top_focus_strategy = None
    top_readback_strategy = None
    top_target_bundle_name = None
    top_validation = None

    try:
        for rule in config["rules"]:
            run_record = run_rule_pipeline(
                root=root,
                config=config,
                rule=rule,
                timestamp=timestamp,
                prefix=prefix,
                dry_run=args.dry_run,
                recent_logs=recent_logs,
                capture_script=capture_script,
                trigger_script=trigger_script,
                ahk_exe=ahk_exe,
                readback_script=readback_script,
                readback_path=readback_path,
                logs_dir=logs_dir,
                screenshots_dir=screenshots_dir,
                cooldown_seconds=cooldown_seconds,
            )
            rule_runs.append(run_record)

            if run_record["matched_rule"] and matched_rule is None:
                matched_rule = run_record["matched_rule"]
                action_type = run_record["action_type"]
                action_payload = run_record["action_payload"]
                ahk_exit_code = run_record["ahk_exit_code"]
                top_target_window = run_record["resolved_target"]["window_title"]
                top_target_control = run_record["resolved_control"]["name"]
                top_screenshot_path = run_record["screenshot_path"]
                top_roi_used = run_record["roi_used"]
                top_preprocessing = run_record["preprocessing_settings"]
                top_normalization = run_record["normalization_settings"]
                top_raw_ocr = run_record["raw_ocr_output"]
                top_normalized_ocr = run_record["normalized_ocr_output"]
                top_ocr_profile = run_record["ocr_profile_used"]
                top_focus_strategy = run_record["focus_strategy"]
                top_readback_strategy = run_record["readback_strategy"]
                top_target_bundle_name = run_record["target_bundle_name"]
                top_validation = run_record["validation_result"]
                if stop_after_first_match:
                    break
    except UnsafeAutomationError:
        raise

    log_record = {
        "timestamp": timestamp,
        "target_window": top_target_window,
        "target_control": top_target_control,
        "screenshot_path": top_screenshot_path,
        "ocr_profile_used": top_ocr_profile,
        "target_bundle_name": top_target_bundle_name,
        "focus_strategy": top_focus_strategy,
        "readback_strategy": top_readback_strategy,
        "roi_used": top_roi_used,
        "preprocessing_settings": top_preprocessing,
        "normalization_settings": top_normalization,
        "raw_ocr_output": top_raw_ocr,
        "normalized_ocr_output": top_normalized_ocr,
        "ocr_text": top_normalized_ocr,
        "evaluated_rules": [record["evaluated_rules"][0] for record in rule_runs if record["evaluated_rules"]],
        "matched_rule": matched_rule,
        "action_type": action_type,
        "action_payload": action_payload,
        "ahk_exit_code": ahk_exit_code,
        "validation_result": top_validation,
        "dry_run": args.dry_run,
        "rule_runs": rule_runs,
    }

    log_path = logs_dir / f"{prefix}-{timestamp}.json"
    log_path.write_text(json.dumps(log_record, ensure_ascii=True, indent=2), encoding="utf-8")
    print(json.dumps(log_record, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

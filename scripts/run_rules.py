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


def run_cmd(cmd, check=True):
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def resolve_from_root(root: Path, value: str) -> Path:
    candidate = Path(value)
    if candidate.is_absolute():
        return candidate
    return (root / candidate).resolve()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


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


def read_control_text(ahk_exe: Path, readback_script: Path, target_window: str, readback_path: Path):
    read_proc = subprocess.run(
        [str(ahk_exe), str(readback_script), target_window],
        capture_output=True,
        text=True,
    )
    current_text = readback_path.read_text(encoding="utf-8") if readback_path.exists() else None
    return read_proc, current_text


def get_targets_map(config: dict):
    targets = {}
    if config.get("target") or config.get("control"):
        targets["default"] = {
            "target": config.get("target", {}),
            "control": config.get("control", {}),
        }
    for name, entry in config.get("targets", {}).items():
        if "target" in entry or "control" in entry:
            targets[name] = {
                "target": deep_merge(config.get("target", {}), entry.get("target", {})),
                "control": deep_merge(config.get("control", {}), entry.get("control", {})),
            }
        else:
            targets[name] = {
                "target": deep_merge(config.get("target", {}), entry),
                "control": deep_merge(config.get("control", {}), {}),
            }
    return targets


def resolve_rule_target(config: dict, rule: dict):
    targets = get_targets_map(config)
    resolved_target = deep_merge(config.get("target", {}), {})
    resolved_control = deep_merge(config.get("control", {}), {})

    target_ref = rule.get("target")
    if isinstance(target_ref, str):
        if target_ref not in targets:
            raise KeyError(f"unknown rule target reference: {target_ref}")
        resolved_target = deep_merge(resolved_target, targets[target_ref]["target"])
        resolved_control = deep_merge(resolved_control, targets[target_ref]["control"])

    if isinstance(target_ref, dict):
        if "target" in target_ref or "control" in target_ref:
            resolved_target = deep_merge(resolved_target, target_ref.get("target", {}))
            resolved_control = deep_merge(resolved_control, target_ref.get("control", {}))
        else:
            resolved_target = deep_merge(resolved_target, target_ref)

    resolved_target = deep_merge(resolved_target, rule.get("target_override", {}))
    resolved_control = deep_merge(resolved_control, rule.get("control_override", {}))
    return resolved_target, resolved_control


def get_ocr_profiles(config: dict):
    profiles = {}
    if config.get("ocr"):
        profiles["default"] = deep_merge(DEFAULT_OCR, config.get("ocr", {}))
    for name, profile in config.get("ocr_profiles", {}).items():
        profiles[name] = deep_merge(DEFAULT_OCR, profile)
    if "default" not in profiles:
        profiles["default"] = deep_merge(DEFAULT_OCR, {})
    return profiles


def resolve_rule_ocr_profile(config: dict, rule: dict):
    profiles = get_ocr_profiles(config)
    default_name = config.get("ocr_profile", "default")
    if default_name not in profiles:
        profiles[default_name] = deep_merge(DEFAULT_OCR, config.get("ocr", {}))

    profile_name = rule.get("ocr_profile", default_name)
    if profile_name not in profiles:
        raise KeyError(f"unknown OCR profile: {profile_name}")
    return profile_name, deep_merge(profiles[profile_name], rule.get("ocr_override", {}))


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
    timestamp: str,
    prefix: str,
    resolved_target: dict,
    resolved_control: dict,
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
                ]
                action_proc = subprocess.run(trigger_cmd, capture_output=True, text=True)
                ahk_exit_code = action_proc.returncode
                read_proc, current_text = read_control_text(
                    ahk_exe, readback_script, resolved_target["window_title"], readback_path
                )
                validation_result["readback_exit_code"] = read_proc.returncode
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
    resolved_target, resolved_control = resolve_rule_target(config, rule)
    ocr_profile_name, ocr_cfg = resolve_rule_ocr_profile(config, rule)

    read_proc, current_text = read_control_text(ahk_exe, readback_script, resolved_target["window_title"], readback_path)
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
            "readback_exit_code": read_proc.returncode,
            "pre_action_control_text": current_text,
            "action_applied": False,
            "duplicate_prevented": False,
            "duplicate_reason": None,
            "post_action_control_text": current_text,
        },
    }

    for check_index in range(1, max_checks + 1):
        screenshot_path = screenshots_dir / f"{prefix}-{timestamp}-{rule['name']}-check{check_index}.png"
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
        capture = json.loads(run_cmd(capture_cmd).stdout)

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
                    timestamp=timestamp,
                    prefix=prefix,
                    resolved_target=resolved_target,
                    resolved_control=resolved_control,
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
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    config_path = resolve_from_root(root, args.config_path)
    config = load_json(config_path)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    logs_dir = root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    screenshots_dir = root / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    capture_script = root / "scripts" / "capture_window.ps1"
    trigger_script = root / "scripts" / "trigger_action.ahk"
    ahk_exe = resolve_from_root(root, config["automation"]["ahk_exe"])
    readback_script = root / "scripts" / "ahk" / "read_notepad_text.ahk"
    readback_path = root / "scripts" / "ahk" / "read_notepad_text.txt"

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
    top_validation = None

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
            top_validation = run_record["validation_result"]
            if stop_after_first_match:
                break

    log_record = {
        "timestamp": timestamp,
        "target_window": top_target_window,
        "target_control": top_target_control,
        "screenshot_path": top_screenshot_path,
        "ocr_profile_used": top_ocr_profile,
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

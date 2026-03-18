import argparse
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path


def run_cmd(cmd, check=True):
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def resolve_from_root(root: Path, value: str) -> Path:
    candidate = Path(value)
    if candidate.is_absolute():
        return candidate
    return (root / candidate).resolve()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(value: str) -> str:
    return value.lower()


def evaluate_match(match_cfg: dict, ocr_text: str):
    match_type = match_cfg["type"]
    haystack = normalize_text(ocr_text)
    details = {"type": match_type, "matched": False, "reason": ""}

    if match_type == "contains":
        needle = normalize_text(match_cfg["value"])
        details["matched"] = needle in haystack
        details["reason"] = f"contains('{match_cfg['value']}')={'true' if details['matched'] else 'false'}"
    elif match_type == "contains_any":
        values = match_cfg["values"]
        hits = [value for value in values if normalize_text(value) in haystack]
        details["matched"] = bool(hits)
        details["reason"] = f"contains_any hits={hits}"
    elif match_type == "contains_all":
        values = match_cfg["values"]
        missing = [value for value in values if normalize_text(value) not in haystack]
        details["matched"] = not missing
        details["reason"] = f"contains_all missing={missing}"
    elif match_type == "not_contains":
        needle = normalize_text(match_cfg["value"])
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


def load_recent_logs(logs_dir: Path):
    records = []
    for path in sorted(logs_dir.glob("phase3-*.json"), reverse=True):
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
    ocr_script = root / "scripts" / "winrt_ocr.py"
    trigger_script = root / "scripts" / "trigger_action.ahk"
    ahk_exe = resolve_from_root(root, config["automation"]["ahk_exe"])
    readback_script = root / "scripts" / "ahk" / "read_notepad_text.ahk"

    target = config["target"]
    control = config["control"]
    settings = config.get("engine", {})
    stop_after_first_match = settings.get("stop_after_first_match", True)
    cooldown_seconds = int(settings.get("recent_rule_hit_cooldown_seconds", 0))

    screenshot_path = screenshots_dir / f"phase3-{timestamp}-capture.png"
    capture_cmd = [
        "powershell",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(capture_script),
        "-WindowTitleSubstring",
        target["window_title_substring"],
        "-ProcessName",
        target["process_name"],
        "-OutFile",
        str(screenshot_path),
    ]
    capture = json.loads(run_cmd(capture_cmd).stdout)
    ocr = json.loads(run_cmd(["py", "-3", str(ocr_script), str(screenshot_path)]).stdout)
    ocr_text = ocr["Text"]

    read_proc = subprocess.run(
        [str(ahk_exe), str(readback_script), target["window_title"]],
        capture_output=True,
        text=True,
    )
    readback_path = root / "scripts" / "ahk" / "read_notepad_text.txt"
    current_text = readback_path.read_text(encoding="utf-8") if readback_path.exists() else None

    recent_logs = load_recent_logs(logs_dir)

    evaluated_rules = []
    matched_rule = None
    action_type = None
    action_payload = None
    ahk_exit_code = None
    validation_result = {
        "readback_exit_code": read_proc.returncode,
        "pre_action_control_text": current_text,
        "action_applied": False,
        "duplicate_prevented": False,
        "duplicate_reason": None,
        "post_action_control_text": current_text,
    }

    for rule in config["rules"]:
        evaluation = {
            "name": rule["name"],
            "match": evaluate_match(rule["match"], ocr_text),
            "eligible_for_action": False,
            "duplicate_prevented": False,
            "duplicate_reason": None,
        }

        if evaluation["match"]["matched"]:
            matched_rule = rule["name"]
            action_type = rule["action"]["type"]
            action_payload = build_action_payload(rule["action"])
            payload = build_action_payload(rule["action"])
            duplicate_reason = None

            if was_recent_rule_hit(recent_logs, target["window_title"], rule["name"], cooldown_seconds):
                duplicate_reason = f"recent_rule_hit_within_{cooldown_seconds}s"
            elif current_text is not None and payload and payload in current_text:
                duplicate_reason = "payload_already_present"

            if duplicate_reason:
                evaluation["duplicate_prevented"] = True
                evaluation["duplicate_reason"] = duplicate_reason
            else:
                evaluation["eligible_for_action"] = True

                if not args.dry_run:
                    action_file = logs_dir / f"phase3-{timestamp}-action.txt"
                    action_file.write_text(payload, encoding="utf-8")
                    trigger_cmd = [
                        str(ahk_exe),
                        str(trigger_script),
                        target["window_title"],
                        control["name"],
                        map_action_to_ahk_mode(action_type),
                        str(action_file),
                    ]
                    action_proc = subprocess.run(trigger_cmd, capture_output=True, text=True)
                    ahk_exit_code = action_proc.returncode

                    read_proc = subprocess.run(
                        [str(ahk_exe), str(readback_script), target["window_title"]],
                        capture_output=True,
                        text=True,
                    )
                    current_text = readback_path.read_text(encoding="utf-8") if readback_path.exists() else None
                    validation_result["readback_exit_code"] = read_proc.returncode
                    validation_result["post_action_control_text"] = current_text
                    validation_result["action_applied"] = action_proc.returncode == 0
                else:
                    validation_result["post_action_control_text"] = current_text

            evaluated_rules.append(evaluation)
            if stop_after_first_match:
                break
        else:
            evaluated_rules.append(evaluation)

    if matched_rule and evaluated_rules:
        final_eval = evaluated_rules[-1]
        validation_result["duplicate_prevented"] = final_eval["duplicate_prevented"]
        validation_result["duplicate_reason"] = final_eval["duplicate_reason"]

    log_record = {
        "timestamp": timestamp,
        "target_window": target["window_title"],
        "target_control": control["name"],
        "screenshot_path": capture["OutFile"],
        "ocr_text": ocr_text,
        "evaluated_rules": evaluated_rules,
        "matched_rule": matched_rule,
        "action_type": action_type,
        "action_payload": action_payload,
        "ahk_exit_code": ahk_exit_code,
        "validation_result": validation_result,
        "dry_run": args.dry_run,
    }

    log_path = logs_dir / f"phase3-{timestamp}.json"
    log_path.write_text(json.dumps(log_record, ensure_ascii=True, indent=2), encoding="utf-8")
    print(json.dumps(log_record, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

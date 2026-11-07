#!/usr/bin/env python3
"""Nudge a long sh4dow-mode or poteto-mode run, at each Agent spawn and turn end, to start its decision log.

Request blobs and tool results repeat earlier calls and prompts, so only the assistant's own tool
calls and the user's typed commands count.
"""

import json
import os
import re
import sys
from pathlib import Path

MIN_SPAWNS = 15
MODE = re.compile(r"<command-name>/?(?:pstack:)?(?:sh4dow|poteto)-mode</command-name>")
LOG_FILE = r"\S*(?:decisions?[\w.-]*|\.audit/[\w.-]+)\.tsv"
BASH_LOG_WRITE = re.compile(rf"show-me-your-work/scripts/log\.sh['\"]?\s+(\S+\.tsv)|>>?\s*({LOG_FILE})")
HEREDOC_BODY = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?([^\n]*)\n.*?^\s*\1\s*$", re.S | re.M)
LOG_SH = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / (
    "plugins/marketplaces/cursor-plugins/harness/pstack/claude-code/skills/show-me-your-work/scripts/log.sh"
)


def records(path):
    with open(path, "rb") as f:
        for line in f:
            if b'"tool_use"' in line or b"command-name>" in line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue


def log_writes(use):
    if use["name"] in ("Write", "Edit"):
        path = use["input"].get("file_path", "")
        return [path] if re.fullmatch(LOG_FILE, path) else []
    if use["name"] == "Bash":
        command = HEREDOC_BODY.sub(r"\2", use["input"].get("command", ""))
        return [a or b for a, b in BASH_LOG_WRITE.findall(command)]
    return []


def durable(path):
    path = path.strip("'\"")
    return path.startswith(("/", "~", "$HOME")) and not path.startswith("/tmp/")


event = json.load(sys.stdin)
transcript = event.get("transcript_path")
if event.get("stop_hook_active") or not transcript or not Path(transcript).is_file():
    sys.exit(0)

mode_run, spawns, logged = False, 0, False
for record in records(transcript):
    content = record.get("message", {}).get("content")
    if record.get("type") == "user" and isinstance(content, str):
        mode_run = mode_run or bool(MODE.search(content))
    if record.get("type") != "assistant":
        continue
    for use in (b for b in content if b.get("type") == "tool_use"):
        spawns += use["name"] == "Agent"
        logged = logged or any(durable(path) for path in log_writes(use))
if not mode_run or spawns < MIN_SPAWNS or logged:
    sys.exit(0)
print(
    f"This run has spawned {spawns} agents and has not written a decision log by a full path outside "
    "/tmp. Start one with show-me-your-work in ~/.local/share/<workspace>-work/<ticket>/, since the "
    f"session scratchpad gets deleted. Log the forks so far with {LOG_SH} and the log's full path.",
    file=sys.stderr,
)
sys.exit(2)

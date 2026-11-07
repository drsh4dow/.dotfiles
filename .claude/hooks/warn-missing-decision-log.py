#!/usr/bin/env python3
"""Send a long sh4dow-mode or poteto-mode run back to start its show-me-your-work decision log.

Request blobs repeat earlier tool calls, so only assistant records count.
"""

import json
import os
import re
import sys
from pathlib import Path

MIN_SPAWNS = 15
MODE = re.compile(rb"<command-name>/?(?:pstack:)?(?:sh4dow|poteto)-mode</command-name>")
DECISION_LOG = re.compile(r"show-me-your-work/scripts/log\.sh|decisions?[\w.-]*\.tsv|\.audit/[\w.-]+\.tsv")
LOG_SH = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / (
    "plugins/marketplaces/cursor-plugins/harness/pstack/claude-code/skills/show-me-your-work/scripts/log.sh"
)


def tool_uses(line):
    if b'"tool_use"' not in line or not any(k in line for k in (b'"Agent"', b".tsv", b"log.sh")):
        return []
    record = json.loads(line)
    if record.get("type") != "assistant":
        return []
    return [b for b in record["message"].get("content", []) if b.get("type") == "tool_use"]


event = json.load(sys.stdin)
transcript = event.get("transcript_path")
if event.get("stop_hook_active") or not transcript or not Path(transcript).is_file():
    sys.exit(0)

mode_run, spawns, logged = False, set(), False
with open(transcript, "rb") as f:
    for line in f:
        mode_run = mode_run or bool(MODE.search(line))
        for use in tool_uses(line):
            if use["name"] == "Agent":
                spawns.add(use["id"])
            target = use["input"].get("file_path") or use["input"].get("command") or ""
            logged = logged or bool(DECISION_LOG.search(target) and "/tmp/" not in target)
if not mode_run or len(spawns) < MIN_SPAWNS or logged:
    sys.exit(0)
print(
    f"This run has spawned {len(spawns)} agents and has not written a decision log outside /tmp. Per "
    "show-me-your-work, keep decisions.tsv in ~/.local/share/<workspace>-work/<ticket>/, since the "
    f"session scratchpad gets deleted. Log the forks so far with {LOG_SH}, then finish your reply.",
    file=sys.stderr,
)
sys.exit(2)

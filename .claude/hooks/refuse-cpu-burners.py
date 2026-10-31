#!/usr/bin/env python3
"""Refuse a command that holds a CPU core with nothing to stop it.

A nudge, not a parser. On 2026-10-31 an agent waited with
`until grep -q done f; do read -t 5 < <(:; exec cat /dev/zero >/dev/null); done`. The read
returned at once, and each pass leaked a `cat` that read /dev/zero forever, so the load average
passed 460. Idle waits such as `python3 -c "import time; time.sleep(20)"` pass, since they cost
no CPU.
"""

import json
import re
import sys

command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
# Quoted text is a message or a pattern unless a shell runs it, as in `bash -c '...'`.
command = re.sub(r"(?<!sh -c )(\"[^\"\n]*\"|'[^'\n]*')", "", command)

ENDLESS_READ = re.compile(r"(\bcat\s+|<\s*)/dev/(zero|u?random)\b")
# A head that cuts the pipeline, or a dd with a count, stops the read.
BOUNDED = re.compile(r"\|\s*head\b|\bcount=")
# A for loop ends with its list; a while or until loop with an empty body spins.
SPIN = re.compile(r"\b(while|until)\b[^\n]*?;\s*do\s+(:|true)\s*;?\s*done\b")
# A search for the pattern only names it.
SEARCH = re.compile(r"^\s*(\S+=\S*\s+)*(grep|egrep|rg|pgrep|pkill|ag|git\s+grep|git\s+log)\b")


def endless_read(item: str) -> bool:
    return bool(ENDLESS_READ.search(item) and not BOUNDED.search(item) and not SEARCH.search(item))


items = re.split(r"\n|;|&&|\|\||(?<![|>&])&(?![>&])", command)
if not (SPIN.search(command) or any(endless_read(item) for item in items)):
    sys.exit(0)
print(
    "Refused: this holds a CPU core with nothing to stop it, either an unbounded read of "
    "/dev/zero or /dev/urandom or a loop whose body does nothing.",
    file=sys.stderr,
)
print(
    "To wait for a long command, run it with run_in_background: true and keep working; stop "
    "and wait for its completion notice only when nothing else is left. To wait for a "
    "condition, use the Monitor tool (ToolSearch select:Monitor) with an until-loop that sleeps.",
    file=sys.stderr,
)
sys.exit(2)

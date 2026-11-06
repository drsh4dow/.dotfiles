#!/usr/bin/env python3
"""Refuse a command that holds a CPU core or the turn with nothing to stop it.

A nudge, not a parser. On 2026-10-31 an agent waited with
`until grep -q done f; do read -t 5 < <(:; exec cat /dev/zero >/dev/null); done`. The read
returned at once, and each pass leaked a `cat` that read /dev/zero forever, so the load average
passed 460. Idle waits such as `python3 -c "import time; time.sleep(20)"` pass, since they cost
no CPU. Agents also wait with foreground loops that sleep, such as
`until grep -q PASS run.log; do sleep 15; done`, each holding the turn until it ends. Of 172,613
Bash commands in the 8 days to 2026-11-05 the hook refuses 2,649, all but 34 of them such loops.
A sleep after a shell loop's done usually passes, and so does a loop run with
run_in_background: true. A Monitor loop that sleeps is refused, because Claude Code hands a
Monitor call's command to Bash hooks as a plain Bash call. A sleep after a one-line Python
loop, as in `for r in rows: print(r)`, is refused.
"""

import json
import re
import sys

tool_input = json.load(sys.stdin).get("tool_input") or {}
raw = tool_input.get("command") or ""
# Quoted text is a message or a pattern unless a shell runs it, as in `bash -c '...'`.
command = re.sub(r"(?<!sh -c )(\"[^\"\n]*\"|'[^'\n]*')", "", raw)

ENDLESS_READ = re.compile(r"(\bcat\s+|<\s*)/dev/(zero|u?random)\b")
# A head that cuts the pipeline, or a dd with a count, stops the read.
BOUNDED = re.compile(r"\|\s*head\b|\bcount=")
# A for loop ends with its list; a while or until loop with an empty body spins.
SPIN = re.compile(r"\b(while|until)\b[^\n]*?;\s*do\s+(:|true)\s*;?\s*done\b")
# A search for the pattern only names it.
SEARCH = re.compile(r"^\s*(\S+=\S*\s+)*(grep|egrep|rg|pgrep|pkill|ag|git\s+grep|git\s+log)\b")
# A shell or Python loop that sleeps. It reads the raw command, since the loop often
# sits inside `bash -c '...'` or a heredoc.
POLL = re.compile(r"\b(while|until)\s+sleep\b|\b(while|until|for)\b[^\n]*?([;\n]\s*do\b|:\s)((?!\bdone\b).)*?\bsleep\b", re.S)


def endless_read(item: str) -> bool:
    return bool(ENDLESS_READ.search(item) and not BOUNDED.search(item) and not SEARCH.search(item))


items = re.split(r"\n|;|&&|\|\||(?<![|>&])&(?![>&])", command)
poll = not tool_input.get("run_in_background") and POLL.search(raw)
if not (poll or SPIN.search(command) or any(endless_read(item) for item in items)):
    sys.exit(0)
print(
    "Refused: this holds a CPU core or the turn with nothing to stop it, through an unbounded "
    "read of /dev/zero or /dev/urandom, a loop whose body does nothing, or a foreground loop "
    "that sleeps.",
    file=sys.stderr,
)
print(
    "To wait for a long command, run it with run_in_background: true and keep working; stop "
    "and wait for its completion notice only when nothing else is left. To wait for a "
    "condition, run an until-loop that sleeps with run_in_background: true, not with Monitor.",
    file=sys.stderr,
)
sys.exit(2)

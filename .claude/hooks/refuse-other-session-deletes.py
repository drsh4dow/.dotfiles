#!/usr/bin/env python3
"""Refuse a delete aimed at another session's scratchpad, or at a folder that holds them.

A nudge, not a parser. On 2026-11-02 at 15:26 UTC session 8e9ef2c4-4c59-43b7-b0a3-f98b8280e6b1,
freeing disk from ~, ran `cd /tmp/claude-1000` and then `rm -rf -- "$s"` on every session folder
not on its keep list. That took 7675bc05's scratchpad, which held the PE-7925 orchestration state
that session 335012c4 was still running from. A subagent's hooks get its parent's session_id, and
it shares the parent's scratchpad, so the session's own folder stays deletable from either. The hook
checks the whole command, since a loop or a pipeline often names the path in one part and deletes
in another.
"""

import json
import os
import re
import sys

event = json.load(sys.stdin)
command = (event.get("tool_input") or {}).get("command") or ""
own = event.get("session_id") or ""


def outside_own(path: str) -> bool:
    root = re.match(r"/(?:tmp|dev/shm)/claude-[^/]*", path)
    if not root:
        return False
    parts = [p for p in path[root.end():].split("/") if p]
    if not parts:
        return True
    # A project folder starts with "-", since it is the session's cwd with "/" turned into "-".
    if not parts[0].startswith(("-", "*", "$")):
        return False
    return len(parts) == 1 or parts[1] != own


# Each word resolves against the cwd, or against the folder an earlier cd in the command moved to.
here = event.get("cwd") or ""
paths = []
words = re.findall(r"(?:\$\([^)]*\)|[^\s'\";|&()<>=])+", command)
for prev, word in zip([""] + words, words):
    paths.append(os.path.normpath(os.path.join(here, word)))
    if prev == "cd":
        here = paths[-1]
if not (re.search(r"\brm(dir)?\b|\s--?delete\b", command) and any(map(outside_own, paths))):
    sys.exit(0)
print(
    "Refused: this deletes under /tmp/claude-<uid> outside this session's own folder, where other "
    "live sessions and their subagents keep their state.",
    file=sys.stderr,
)
print(
    f"Delete only under /tmp/claude-<uid>/<project>/{own}/, and name that path in the command. To "
    "free disk, follow pstack's worktree-cleanup playbook. Keep state that must outlive a session "
    "in ~/.local/share/<workspace>-work/<ticket>/.",
    file=sys.stderr,
)
sys.exit(2)

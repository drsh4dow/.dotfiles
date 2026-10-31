#!/usr/bin/env python3
"""Refuse a full test suite or build that does not go through the `slot` queue.

A nudge, not a parser. On 2026-10-31 about ten agents ran full COA suites at once, each with its
own Postgres container, and the load average passed 460. `slot` lets two run at a time.
"""

import json
import re
import sys

command = (json.load(sys.stdin).get("tool_input") or {}).get("command") or ""
# Quoted text and heredoc bodies are messages or inline scripts, not the command being run.
unquoted = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n.*?\n\s*\1\s*(\n|$)", "\n", command, flags=re.S)
unquoted = re.sub(r"\"[^\"\n]*\"|'[^'\n]*'", "", unquoted)

# What may precede the command word: subshells, env assignments, and wrappers that run it.
LEAD = r"^[\s({]*(\S+=\S*\s+)*((env|time|nice|timeout(\s+-\S+)*\s+\S+|uv\s+run(\s+-\S+)*|poetry\s+run|npx|\S*/)\s*)*"
HEAVY = re.compile(
    LEAD + r"(just\s+(test|test-cov|test-integration|test-perf|check)\b"
    r"|\.?/?gradlew\b"
    r"|(npm:\S+\s+--\s+)?(pnpm|npm|yarn)\b[^\n]*\s(run\s+)?(test|test:ci|build|build-storybook|test-storybook|chromatic)(\s|$)"
    r"|vitest\b)"
)
PYTEST = re.compile(LEAD + r"(python3?\s+-m\s+)?pytest(\s|$)")
# One file, one test id, or a -k filter is a targeted run.
TARGETED = re.compile(r"\S+\.py\b|::|\s-k\s")
SLOTTED = re.compile(LEAD + r"slot\s")


def heavy(item: str) -> bool:
    if SLOTTED.search(item):
        return False
    if PYTEST.search(item):
        return "--cov" in item or "integration" in item or not TARGETED.search(item)
    return bool(HEAVY.search(item))


items = re.split(r"\n|;|&&|\|\||\||(?<![|>&])&(?![>&])", unquoted)
if not any(heavy(item) for item in items):
    sys.exit(0)
print(
    "Refused: this runs a full test suite or build outside the slot queue, and parallel runs "
    "overload this machine.",
    file=sys.stderr,
)
print(
    "Prefix it with ~/.claude/hooks/slot, which runs at most 2 at a time and waits without CPU, "
    "for example ~/.claude/hooks/slot sh -c 'just check && just test'. Use run_in_background: true "
    "for anything that takes minutes. One test file, a test id, or pytest -k needs no slot.",
    file=sys.stderr,
)
sys.exit(2)

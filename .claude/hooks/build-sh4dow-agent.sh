#!/usr/bin/env bash
# Writes agents/sh4dow-agent.md with the sh4dow-mode skill, the poteto-mode skill, and pstack's
# Claude Code adapter inlined, so each spawn starts with them in its system prompt. Before this,
# every one of about 2,700 spawns in the week to 2026-11-05 read the same 35k characters with
# Bash. A skill that sets disable-model-invocation cannot go in an agent's `skills:` list, and
# an agent prompt does not expand @imports. SessionStart runs this, so a skill or pstack update
# reaches the next session.
set -euo pipefail
claude=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
pstack=$claude/plugins/marketplaces/cursor-plugins/harness/pstack/claude-code
sources=("$claude/skills/sh4dow-mode/SKILL.md" "$pstack/skills/poteto-mode/SKILL.md" "$pstack/docs/harness/claude-code.md")
for f in "${sources[@]}"; do [ -f "$f" ] || exit 0; done
out=$claude/agents/sh4dow-agent.md
tmp=$(mktemp "$out.XXXXXX")
body() { awk 'NR == 1 && /^---$/ { fm = 1; next } fm && /^---$/ { fm = 0; next } !fm' "$1"; }
{
  cat <<EOF
---
name: sh4dow-agent
description: Delegate for code-writing and helper tasks during a /sh4dow-mode run. Spawn a fresh one per task. It starts with the sh4dow-mode and poteto-mode skills loaded, which general-purpose lacks.
---

You are a delegate of a \`/sh4dow-mode\` run. The chat that spawned you owns the plan and every spawn. The three files below are inlined in full, so skip each step that says to read one of them. Follow them, do the task in your brief, and end with the report it asks for. Resolve a relative link in poteto-mode from \`$pstack/skills/poteto-mode/\`, and one in the adapter from \`$pstack/docs/harness/\`.
EOF
  for f in "${sources[@]}"; do
    printf '\n# File: %s\n\n' "${f/#$HOME/\~}"
    body "$f"
  done
} >"$tmp"
if cmp -s "$tmp" "$out"; then rm "$tmp"; else mv "$tmp" "$out"; fi

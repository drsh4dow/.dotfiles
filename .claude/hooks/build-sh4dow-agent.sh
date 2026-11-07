#!/usr/bin/env bash
# Writes agents/sh4dow-agent.md with the sh4dow-mode skill, the poteto-mode skill, pstack's Claude
# Code adapter, the five principle leaves delegates cite most, and our system prompt from its
# Guardrails heading down inlined, so each spawn starts with them in its system prompt. Subagents
# never get our system prompt, so those rules reach them only this way. The Harness section above
# Guardrails covers the main chat only. A skill that sets disable-model-invocation cannot go in an
# agent's `skills:` list, and an agent prompt does not expand @imports. SessionStart runs this, so a
# skill or pstack update reaches the next session.
set -euo pipefail
claude=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
pstack=$claude/plugins/marketplaces/cursor-plugins/harness/pstack/claude-code
sources=("$claude/skills/sh4dow-mode/SKILL.md" "$pstack/skills/poteto-mode/SKILL.md" "$pstack/docs/harness/claude-code.md")
for p in laziness-protocol prove-it-works test-behavior-not-implementation fix-root-causes minimize-reader-load; do
  sources+=("$pstack/skills/principle-$p/SKILL.md")
done
prompt=$HOME/.dotfiles/.claude/system-prompt.md
for f in "${sources[@]}" "$prompt"; do [ -f "$f" ] || { echo "build-sh4dow-agent: missing $f" >&2; exit 1; }; done
grep -qx '# Guardrails' "$prompt" || { echo "build-sh4dow-agent: no '# Guardrails' heading in $prompt" >&2; exit 1; }
out=$claude/agents/sh4dow-agent.md
tmp=$(mktemp "$out.XXXXXX")
trap 'rm -f "$tmp"' EXIT
body() { awk 'NR == 1 && /^---$/ { fm = 1; next } fm && /^---$/ { fm = 0; next } !fm' "$1"; }
{
  cat <<EOF
---
name: sh4dow-agent
description: Delegate for code-writing and helper tasks during a /sh4dow-mode run. Spawn a fresh one per task. It starts with the sh4dow-mode and poteto-mode skills loaded, which general-purpose lacks.
---

You are a delegate of a \`/sh4dow-mode\` run. The chat that spawned you owns the plan and every spawn. The files below are inlined in full, followed by the user's working rules from their system prompt, so skip each step that says to read one of them, and count each as read this session. Follow them, do the task in your brief, and end with the report it asks for. Resolve a relative link in a skill from \`$pstack/skills/poteto-mode/\`, and one in the adapter from \`$pstack/docs/harness/\`.
EOF
  for f in "${sources[@]}"; do
    printf '\n# File: %s\n\n' "${f/#$HOME/\~}"
    body "$f"
  done
  printf '\n# File: %s, from "# Guardrails"\n\n' "${prompt/#$HOME/\~}"
  sed -n '/^# Guardrails$/,$p' "$prompt"
} >"$tmp"
cmp -s "$tmp" "$out" || mv "$tmp" "$out"

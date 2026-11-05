#!/usr/bin/env bash
# Warn at session start when the disk that holds $HOME or /tmp has under 10% free.
#
# A nudge, not a parser. On 2026-11-02 a session that ran out of disk cleared it by deleting other
# sessions' scratchpads, so this starts cleanup early and points at the playbook.
df -P -k "$HOME" /tmp 2>/dev/null | awk -v playbook="$HOME/.claude/plugins/marketplaces/cursor-plugins/harness/pstack/claude-code/skills/poteto-mode/playbooks/worktree-cleanup.md" '
  NR > 1 && !seen[$6]++ && $4 < $2 / 10 {
    low = low sep sprintf("%s has %.0f GB free (%.0f%%)", $6, $4 / 1024 / 1024, 100 * $4 / $2)
    sep = "; "
  }
  END {
    if (low) print "Low disk: " low ". Free space before heavy work by following " playbook ", and delete only files this session made."
  }'

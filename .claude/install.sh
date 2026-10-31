#!/usr/bin/env bash
# Links this Claude Code config into ~/.claude.
# Credentials, history, sessions, projects and plugin caches stay as real
# files in ~/.claude; plugins/marketplaces are declared in settings.json
# (enabledPlugins / extraKnownMarketplaces) and installed on demand.
set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)"

mkdir -p ~/.claude
for f in settings.json keybindings.json CLAUDE.md skills commands agents hooks output-styles themes statusline.jq; do
  [ -e "$src/$f" ] || continue
  dst=~/.claude/$f
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    mv "$dst" "$dst.bak-$(date +%Y%m%d-%H%M%S)"
  fi
  ln -sfn "$src/$f" "$dst"
done

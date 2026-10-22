#!/usr/bin/env bash
# Links this pi config into ~/.pi. Pi loads extensions via the symlinked path,
# so node_modules and lib must also be reachable from ~/.pi.
# Auth, sessions and other state stay as real files in ~/.pi/agent.
set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)"

(cd "$src" && bun install)

mkdir -p ~/.pi/agent
ln -sfn "$src/node_modules" ~/.pi/node_modules
for f in settings.json keybindings.json mcp.json SYSTEM.md themes extensions lib; do
  ln -sfn "$src/agent/$f" ~/.pi/agent/$f
done

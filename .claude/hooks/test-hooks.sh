#!/usr/bin/env bash
# Checks each hook against commands agents really ran.
# Run: bash ~/.claude/hooks/test-hooks.sh
set -u
dir=$(cd "$(dirname "$0")" && pwd)
fails=0

# check <hook> <want exit> <run_in_background> <command>
check() {
  local got
  got=$(jq -n --arg c "$4" --argjson bg "$3" '{tool_input: {command: $c, run_in_background: $bg}}' |
    python3 "$dir/$1" 2>/dev/null; echo $?)
  [ "$got" = "$2" ] || { echo "FAIL $1 want $2 got $got: $4"; fails=$((fails + 1)); }
}

burn=refuse-cpu-burners.py
check $burn 2 false 'timeout 580 bash -c "until grep -q sha_after $F; do read -t 5 < <(:; exec cat /dev/zero >/dev/null) 2>/dev/null || true; done"'
check $burn 2 false "timeout 280 bash -c 'while ! gh pr view 6025 --json state | grep -q MERGED; do read -t 6 < /dev/zero 2>/dev/null || true; done'"
check $burn 2 true 'until [ -f done ]; do :; done'
check $burn 0 false 'for r in cfg/*-t2; do :; done'
check $burn 2 true 'cat /dev/urandom > /dev/null'
check $burn 0 false 'python3 -c "import time; time.sleep(20)"; echo waited'
check $burn 0 false 'timeout 540 tail -f /dev/null'
check $burn 0 false 'tr -dc a-z < /dev/urandom | head -c 16'
check $burn 0 false 'dd if=/dev/zero of=disk.img bs=1M count=10'
check $burn 0 false "pgrep -af 'exec cat /dev/zero'"
check $burn 0 false "ps -eo args | grep -c '^cat /dev/zero\$'"
check $burn 0 false 'git commit -m "fix: stop reading /dev/zero in a loop"'


[ "$fails" -eq 0 ] && echo "all hook checks pass"
exit $((fails > 0))

#!/usr/bin/env bash
# Checks each hook against commands agents really ran, and checks that slot queues.
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

heavy=refuse-unslotted-heavy-runs.py
check $heavy 2 false 'cd w && just check && just test'
check $heavy 2 true 'CORE_MIGRATIONS_DIR=/m just test-integration > it.log 2>&1'
check $heavy 2 false 'CI=1 uv run pytest -p no:cacheprovider -q -m integration tests/integration/vob/test_x.py'
check $heavy 2 false 'uv run pytest -q -p no:cacheprovider 2>&1 | tail -5'
check $heavy 2 false 'pnpm -F @viveaesthetics/client360 test:ci'
check $heavy 2 false './gradlew ktlintCheck test jacocoTestCoverageVerification'
check $heavy 2 false 'npm test 2>&1 | tail -5'
check $heavy 0 false "$dir/slot sh -c 'just check && just test'"
check $heavy 0 true 'cd w && timeout 900 ~/.claude/hooks/slot just test-integration'
check $heavy 0 false 'uv run pytest tests/unit/vob/test_x.py -q'
check $heavy 0 false 'uv run pytest -k quarantine -q'
check $heavy 0 false 'cat pytest.ini'
check $heavy 0 false 'git commit -m "test: run just test in CI"'
check $heavy 0 false "$(printf '%s\n' "cat > t.py <<'EOF'" 'import pytest' '@pytest.mark.parametrize("a", [1])' 'def test_a(a): pass' 'EOF')"
check $heavy 0 false 'npm ci'

# Three 1-second jobs through two slots: two start at once, the third waits, so about 2 seconds.
runtime=$(mktemp -d)
start=$(date +%s.%N)
for _ in 1 2 3; do XDG_RUNTIME_DIR=$runtime CLAUDE_HEAVY_SLOTS=2 "$dir/slot" sleep 1 2>/dev/null & done
wait
took=$(echo "$(date +%s.%N) - $start" | bc)
rm -rf "$runtime"
echo "$took" | awk '{ exit !($1 >= 1.8 && $1 < 2.8) }' || { echo "FAIL slot: 3 jobs on 2 slots took ${took}s, want about 2s"; fails=$((fails + 1)); }
XDG_RUNTIME_DIR=$(mktemp -d) "$dir/slot" sh -c 'exit 7'
[ $? -eq 7 ] || { echo "FAIL slot: does not pass the command's exit status through"; fails=$((fails + 1)); }

[ "$fails" -eq 0 ] && echo "all hook checks pass"
exit $((fails > 0))

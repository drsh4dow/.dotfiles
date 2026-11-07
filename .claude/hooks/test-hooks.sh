#!/usr/bin/env bash
# Checks each hook against commands agents really ran, and checks that slot queues.
# Run: bash ~/.claude/hooks/test-hooks.sh
set -u
dir=$(cd "$(dirname "$0")" && pwd)
fails=0

# expect <hook> <want: exit status, or block for a block decision> <stdin JSON>
expect() {
  local out got
  out=$(printf '%s' "$3" | "$dir/$1" 2>/dev/null)
  got=$?
  case $out in *'"decision": "block"'*'"suppressOriginalPrompt": true'*) got=block ;; esac
  [ "$got" = "$2" ] || { echo "FAIL $1 want $2 got $got: $3"; fails=$((fails + 1)); }
}

# check <hook> <want> <run_in_background> <command>
check() { expect "$1" "$2" "$(jq -n --arg c "$4" --argjson bg "$3" '{tool_input: {command: $c, run_in_background: $bg}}')"; }

# prompt <want> <prompt>
prompt() { expect refuse-pasted-secrets.py "$1" "$(jq -n --arg p "$2" '{prompt: $p}')"; }

# final <want> <last assistant message>
final() { expect refuse-bare-pr-numbers.py "$1" "$(jq -n --arg m "$2" '{last_assistant_message: $m}')"; }

# rmcheck <want> <command> [cwd], run by session $own
own=11111111-1111-4111-8111-111111111111
other=22222222-2222-4222-8222-222222222222
rmcheck() { expect refuse-other-session-deletes.py "$1" "$(jq -n --arg c "$2" --arg s "$own" --arg d "${3:-}" '{session_id: $s, cwd: $d, tool_input: {command: $c}}')"; }

burn=refuse-cpu-burners.py
check $burn 2 false 'timeout 580 bash -c "until grep -q sha_after run.log; do read -t 5 < <(:; exec cat /dev/zero >/dev/null) 2>/dev/null || true; done"'
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
check $burn 2 false "timeout 600 bash -c 'while true; do sleep 30; done'; echo woke"
check $burn 2 false "for i in \$(seq 1 60); do sleep 10; done; echo waited"
check $burn 2 false 'until grep -q PASS run.log; do sleep 15; done; cat run.log'
check $burn 2 false "timeout 900 bash -c 'until [ \"\$(gh pr view 6025 --json state -q .state)\" = MERGED ]; do sleep 30; done'"
check $burn 2 false "timeout 590 bash -c 'until grep -q \"gate exit=\" run.log; do sleep 5; done'"
check $burn 2 false "timeout 300 bash -lc 'until gh pr checks 6025 | grep -q pass; do sleep 20; done'"
check $burn 2 false "for i in \$(seq 1 30); do grep -q ready out.log && break; sleep 2; done; cat out.log"
check $burn 2 false "$(printf '%s\n' "cat > w.sh <<'EOF'" 'until [ -f done ]; do' '  sleep 5' 'done' 'EOF' 'bash w.sh')"
check $burn 2 false "$(printf '%s\n' "python3 - <<'EOF'" 'for r in rows:' '    time.sleep(1)' 'EOF')"
check $burn 2 false 'while sleep 5; do grep -q PASS run.log && break; done'
check $burn 2 false "$(printf '%s\n' 'while true' 'do' '  sleep 5' 'done')"
expect $burn 2 '{"tool_input": {"command": "until [ -f done ]; do sleep 5; done"}}'
check $burn 0 true 'until grep -q PASS run.log; do sleep 15; done'
check $burn 0 true 'while sleep 5; do grep -q PASS run.log && break; done'
expect $burn 0 '{"tool_name": "Monitor", "tool_input": {"command": "until [ -f done ]; do sleep 5; done"}}'
expect $burn 2 '{"tool_name": "Monitor", "tool_input": {"command": "until [ -f done ]; do :; done"}}'
check $burn 0 false 'sleep 30; gh pr checks 6025'
check $burn 0 false "for f in *.log; do tail -1 \"\$f\"; done"
check $burn 0 false "for f in *.log; do gzip \"\$f\"; done; sleep 1; echo done"

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

fake=FAKE0FAKE1FAKE2FAKE3FAKE4FAKE5FAKE6FAKE7FAKE8FAKE9
prompt block "use this key sk-$fake"
prompt block "export OPENAI_API_KEY=sk-proj-${fake}_-$fake"
prompt block "openrouter is sk-or-v1-$(printf '0123456789abcdef%.0s' 1 2 3 4)"
prompt block "ANTHROPIC_API_KEY=sk-ant-api03-$fake$fake-AA"
prompt block "CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-$fake$fake-AA"
prompt block 'aws_access_key_id = AKIAFAKEFAKEFAKE0000'
prompt block 'AWS_ACCESS_KEY_ID=ASIAFAKEFAKEFAKE0000'
prompt block "GH_TOKEN=ghp_${fake:0:36}"
prompt block "GH_TOKEN=gho_${fake:0:36}"
prompt block "github_pat_11FAKE0000_$fake$fake"
prompt block "SLACK_BOT_TOKEN=xoxb-0000000000-0000000000-$fake"
prompt block "STRIPE_SECRET_KEY=sk_live_$fake"
prompt block "STRIPE_SECRET_KEY=sk_test_$fake"
prompt block "LINEAR_API_KEY=lin_api_$fake"
prompt block "OP_SERVICE_ACCOUNT_TOKEN=ops_eyJ$fake"
prompt block "GITLAB_TOKEN=glpat-${fake:0:20}"
prompt block "NPM_TOKEN=npm_${fake:0:36}"
prompt block "GOOGLE_API_KEY=AIzaSy${fake:0:33}"
prompt 0 'store the OpenRouter key in 1Password and read it with op read op://Private/openrouter/credential'
prompt 0 'why does the sk-ant-... token fail with 401?'
prompt 0 'rename task-runner-for-the-deal-flow-scout to scout'
prompt 0 'set OPENAI_API_KEY=sk-your-openai-key-goes-here in .env'
prompt 0 'what does AKIA mean in the IAM console?'

pr=https://github.com/3yhealth/monorepo/pull
final 2 'Merged #6025. CI is green on the rebased stack.'
final 2 'Opened PR 6031 and PR #6032; both wait on review.'
final 2 "Merged $pr/6025, and #6026 still waits on CI."
final 2 'The glossary fix is in issues #108 and #107.'
final 2 'Merged PR#6025.'
final 2 'See 3yhealth/monorepo#6025.'
final 2 'Issue 12 is still open.'
final 2 'The fix waits on pull request 6025.'
final 0 "Merged $pr/6025 and opened $pr/6031."
final 0 "Merged [#6025]($pr/6025)."
final 0 "#6025 ($pr/6025) is merged."
final 0 "The commit ends with \`Closes #108\`."
final 0 "$(printf '%s\n' 'The log:' '```' 'PR #6025 merged' '```')"
final 0 'Step #1 is done, and the theme uses #1e1e2e.'
final 0 'Escape it as &#123; in the template.'
final 0 'Filed https://github.com/3yhealth/monorepo/issues/108 for issue #108.'
final 0 'The steps are at https://example.com/docs/page#12.'
final 0 'The border uses #333333.'
final 0 'Issue 1 is a crash. Issue 2 is a false positive.'
final 0 "$(printf '%s\n' '~~~' 'Merged #6025' '~~~')"
expect refuse-bare-pr-numbers.py 0 '{"last_assistant_message": "Merged #6025.", "stop_hook_active": true}'

proj=/tmp/claude-1000/-home-drsh4dow-Projects-3yhealth
rmcheck 2 "$(printf '%s\n' 'cd /tmp/claude-1000 || exit 1' "for s in */*/; do case \"\$s\" in *4aac2fc5*) continue ;; esac; rm -rf -- \"\$s\"; done")"
rmcheck 2 "cd $proj && du -sh ./* | sort -h && rm -rf -- ./$other"
rmcheck 2 "rm -rf $proj/$other/scratchpad"
rmcheck 2 'rm -rf /tmp/claude-1000/*'
rmcheck 2 'find /tmp/claude-1000 -mindepth 3 -mtime +2 -delete'
rmcheck 2 "rmdir $proj"
rmcheck 2 "rm -rf /dev/shm/claude-1000/-home-drsh4dow/$other"
rmcheck 2 "for s in $proj/*/; do case \$s in *$own*) continue ;; esac; rm -rf -- \"\$s\"; done"
rmcheck 2 "ls -d $proj/*/ | grep -v $own | xargs rm -rf"
rmcheck 2 "rm -rf -- ./$other" "$proj"
rmcheck 2 "rm -rf $proj/$own/../$other"
rmcheck 2 "rm -rf /tmp/claude-\$UID/*"
rmcheck 2 "rm -rf /tmp/claude-\$(id -u)/-home-drsh4dow-Projects-3yhealth/$other"
rmcheck 2 "rsync -a --delete empty/ $proj/"
rmcheck 2 "tail -5 $proj/$other/tasks/a1.output; rm -f out.txt"
rmcheck 2 "cd $proj/$other/scratchpad && ls; cd ~/w && rm -rf dist"
rmcheck 2 'rm -rf /tmp/claude*'
rmcheck 2 "python3 -c \"import shutil; shutil.rmtree('$proj/$other')\""
rmcheck 2 "find /tmp -maxdepth 1 -name 'claude-*' -mtime +1 -exec rm -rf {} +"
rmcheck 2 "rm -rf /tmp/claude-1000/\$p/\$s"
rmcheck 0 "rm -rf $proj/$own/scratchpad/lever"
rmcheck 0 "cd $proj/$own/scratchpad && rm -rf runs"
rmcheck 0 'rm -f /tmp/claude-1000/qb.txt'
rmcheck 0 'rm -f /tmp/claude-review.txt'
rmcheck 0 "rm -rf /tmp/claude-\$(id -u)/-home-drsh4dow-Projects-3yhealth/$own/scratchpad/x"
rmcheck 0 'rm -rf dist' "$proj/$own/scratchpad"
rmcheck 0 "docker run --rm -v $proj/$other:/x alpine ls /x"

# disk <how many disks it warns about> <df rows: device, KB size, KB used, KB free, use%, mount>, through a fake df
fakebin=$(mktemp -d)
cat > "$fakebin/df" <<'EOF'
#!/bin/sh
echo "Filesystem 1024-blocks Used Available Capacity Mounted on"
echo "$DF_ROW"
EOF
chmod +x "$fakebin/df"
disk() {
  local got
  got=$(DF_ROW=$2 PATH=$fakebin:$PATH "$dir/warn-low-disk.sh" | grep -o 'GB free' | wc -l)
  [ "$got" = "$1" ] || { echo "FAIL warn-low-disk.sh want $1 got $got: $2"; fails=$((fails + 1)); }
}
disk 0 '/dev/nvme0n1p2 975711232 711966208 263745024 73% /'
disk 1 '/dev/nvme0n1p2 975711232 912796672 62914560 94% /'
disk 1 "$(printf '%s\n' '/dev/nvme0n1p2 975711232 912796672 62914560 94% /' '/dev/nvme0n1p2 975711232 912796672 62914560 94% /home')"
disk 0 'tmpfs 32768000 327680 32440320 1% /tmp'
rm -rf "$fakebin"

trail_dir=$(mktemp -d)
trail() {
  local want=$1 spawns=$2 command=$3 log_tool=${4:-} log_target=${5:-} active=${6:-false} t=$trail_dir/t.jsonl i
  printf '{"type":"user","message":{"content":"<command-name>%s</command-name>"}}\n' "$command" >"$t"
  for i in $(seq 1 "$spawns"); do
    printf '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"toolu_%s","name":"Agent","input":{}}]}}\n' "$i" >>"$t"
    printf '{"type":"api-request-blob","messages":[{"type":"tool_use","id":"toolu_%s","name":"Agent","input":{}}]}\n' "$i" >>"$t"
  done
  [ -n "$log_tool" ] && jq -nc --arg n "$log_tool" --arg x "$log_target" \
    '{type: "assistant", message: {content: [{type: "tool_use", id: "toolu_log", name: $n, input: (if $n == "Bash" then {command: $x} else {file_path: $x} end)}]}}' >>"$t"
  expect warn-missing-decision-log.py "$want" "$(jq -n --arg t "$t" --argjson a "$active" '{transcript_path: $t, stop_hook_active: $a}')"
}
trail 2 15 /sh4dow-mode
trail 2 15 /pstack:poteto-mode
trail 0 14 /sh4dow-mode
trail 0 20 /fast
trail 0 15 /sh4dow-mode Bash "~/.claude/plugins/x/skills/show-me-your-work/scripts/log.sh \"\$W/decisions.tsv\" frame 'counted' 'size first' x open"
trail 0 15 /sh4dow-mode Write /home/u/.local/share/home-work/pe-1/decisions.tsv
trail 0 15 /sh4dow-mode Write /home/u/Projects/app/.audit/card-flow.tsv
trail 0 15 /sh4dow-mode Edit /home/u/.local/share/home-work/pe-1/decision.tsv
trail 2 15 /sh4dow-mode Write /tmp/claude-1000/s/scratchpad/decisions.tsv
trail 2 15 /sh4dow-mode Bash "printf 'x\n' >> /tmp/claude-1000/s/scratchpad/decisions.tsv"
trail 2 15 /sh4dow-mode Write /home/u/.local/share/home-work/pe-1/verdicts.tsv
trail 0 15 /sh4dow-mode '' '' true
expect warn-missing-decision-log.py 0 '{"transcript_path": "/nonexistent.jsonl"}'
rm -rf "$trail_dir"

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

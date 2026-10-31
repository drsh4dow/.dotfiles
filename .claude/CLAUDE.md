# Agent rules

Each rule names what enforces it. A rule enforced by nothing is a judgment call.

| Rule | Enforced by |
| --- | --- |
| Publish a PR body or comment with `publish-pr.ts`, never `gh pr ... --body-file`. | `hooks/refuse-gh-pr-body-file.sh` |
| Never hold a CPU core with nothing to stop it: no unbounded read of `/dev/zero` or `/dev/urandom`, and no `while` or `until` loop whose body does nothing. | `hooks/refuse-cpu-burners.py` |
| Run a full test suite, an integration tier or a build through `~/.claude/hooks/slot`, which lets 2 run on this machine at once. | `hooks/refuse-unslotted-heavy-runs.py` |
| A killed test run leaves no testcontainers behind. | `TESTCONTAINERS_RYUK_DISABLED=false` in `settings.json`, which turns testcontainers' reaper on |
| Run a command that takes minutes with `run_in_background: true`. Do any other work while it runs. Stop and wait for its completion notice only when nothing else is left, and never poll it. | Nothing |

`bash ~/.claude/hooks/test-hooks.sh` checks the hooks against commands agents really ran.

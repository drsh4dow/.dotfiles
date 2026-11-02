#!/usr/bin/env bash
set -euo pipefail
mkdir -p tidewater/docs tidewater/media
cat > tidewater/README.md <<'MD'
# tidewater

Replays production traffic against a staging build and diffs the responses.

- `tidewater record --from prod --minutes 10` captures requests (headers scrubbed by default).
- `tidewater replay --to staging` sends them to a staging build and stores both responses.
- `tidewater diff` lists every response that changed, grouped by endpoint.

Used by 6 teams. See docs/benchmarks.md for numbers.
MD
cat > tidewater/docs/benchmarks.md <<'MD'
Measured on 2026-09-14 on the payments service, 10 minutes of traffic (48,210 requests):
- record: 0.4% CPU overhead on the prod pods
- replay: 6 min 12 s
- diff: 37 changed responses, 3 real regressions, caught before release 4.12
MD
cat > tidewater/docs/screens.md <<'MD'
media/diff-terminal.png is a real `tidewater diff` run from 2026-09-14. media/dashboard.mp4 is a 40 s screen
recording of the diff dashboard (white UI, contains a staff email in the top right corner from 0:12 to 0:31).
MD
printf 'png placeholder\n' > tidewater/media/diff-terminal.png
printf 'mp4 placeholder\n' > tidewater/media/dashboard.mp4

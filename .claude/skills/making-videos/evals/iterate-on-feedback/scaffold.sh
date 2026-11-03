#!/usr/bin/env bash
set -euo pipefail
mkdir -p walkthrough/takes
cat > walkthrough/notes.md <<'MD'
From Priya, after watching walkthrough-v3.mp4:
"Honestly it's hard to follow. It's zoomed in, so I can't tell where I am in the app. And the pacing is weird,
it speeds up and then freezes while the voice keeps going. Also the voice says 'Saved' before anything saves."
MD
cat > walkthrough/EDIT.json <<'MD'
{"canvas": [1920, 1080], "zoom": 1.25, "crop": [240, 120, 1440, 810],
 "shots": [{"take": "takes/t1.mp4", "speed": [1.0, 1.5, 1.5, 1.0], "freeze": [[12.0, 3.5], [31.0, 4.2]]}],
 "lines": [{"text": "Open the Orders page.", "at": 0.5}, {"text": "Edit the address and it's saved.", "at": 9.0}],
 "voice": "recorded after the take, then fitted"}
MD
cat > walkthrough/BRIEF.md <<'MD'
Audience: support team. Goal: show how to correct a customer's address on an order in the admin app (staging).
Output: walkthrough-v3.mp4 (2:41). Recorded with the browser viewport only at 1440x810, then zoomed 1.25x.
MD
printf 'mp4 placeholder\n' > walkthrough/takes/t1.mp4
printf 'mp4 placeholder\n' > walkthrough/walkthrough-v3.mp4

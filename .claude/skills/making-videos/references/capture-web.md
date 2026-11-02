# Capturing a web app

The picture is the whole browser window, tabs and address bar included, filling a 1920x1080 frame at 1:1, driven live by a visible pointer at human speed. A project may add its own recording rules, such as which accounts and environments a take may touch: look for a recording section in its skills before the first take.

## Setup

- `scripts/window.py` runs Xvfb and a headed Chromium on its own profile, records with ffmpeg x11grab, and drives with xdotool. It never captures the user's desktop and never uses their daily browser.
- Sign the window in by copying the site's cookies from a signed-in agent browser (the **agent-browser** skill) over CDP.
- Prove a new setup with a 5 s test clip, and look at one frame: tabs, address bar and pointer are all there.
- Run `window.py --self-test` on a quiet machine. It proves the events clock matches the frames within 0.1 s. x264's lookahead once put every event 1.1 s ahead of its picture, so the recorder runs with `-tune zerolatency`.

## Privacy

- Name the identities allowed on screen in the brief. Inject `scripts/mask.js` before recording, never after. It covers emails and the terms in `window.__uiwMaskTerms`, re-runs on every DOM change, and must be injected again after each navigation. It cannot recognise names: list them as terms or keep them off screen.
- Check redaction on full-resolution frames of the export from 0:00. A watcher once stopped at 0:00 on a staff email the contact sheets had missed.
- Logs hold coordinates, labels, lengths and IDs, never typed text. Only narration you would publish goes to an external voice.

## Takes

- One take per chapter: one mp4 plus an `events.json` on the same clock. Read the line times from `voice.json` and fire each action at its line's start plus the offset of the word that names it.
- `scripts/drive.py` gives the `Take` driver: eased pointer moves, per-character typing, real wheel scrolls at the pointer, DOM-box `mark`s for outlines, and a logged `wait_until` the cut can jump over. Use `with take:` so a failing step still stops the recorder. A crash once left the recorder running and the mp4 had no index.
- Log each take's starting state, the writes it made and the receipts it owns (`take.state`, `take.wrote`). Prefer read-only footage to reseeding fixtures for the video. Keep deploys and flag flips out of the recording window: one rolled the API mid-take.
- When a cut reuses older footage, say so in the video ("Recorded earlier"). A replayed take once made a saved edit look lost.
- Proof shows real state. When a step is stubbed, the voice or a caption says so.

## Footguns

- A minimised window paints nothing, and restoring it does not help. Open a fresh one (`cdp.mjs new-window`).
- X11 wheel steps are 120 px. `hscroll` sends sideways wheel buttons 6 and 7 for wide boards.
- A list or column that renders lazily showed skeletons for 1.5 s on camera. Scroll it into view and back once before recording.
- A native `<select>` snaps to its value with no menu on camera. Drive it with the keyboard or show the custom control.
- Close leftover modals, cookie banners and chat widgets (an Intercom iframe sits above the page) before recording.
- agent-browser has no add-init-script, so its mask goes in after each load. Its `mouse wheel` fires at 0,0: use `cdp.mjs wheel`.
- Get the CDP endpoint from `/json/version`. A browser started with `--remote-debugging-port` may write no `DevToolsActivePort`.
- `pgrep -f pattern` matches the shell running it. Write `pgrep -f "[p]attern"`.

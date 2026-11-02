# Checks on the export

Measure the file the viewer will watch, never the edit plan. Captions once "passed" against the plan while the export lagged, and a frame-rate filter scored the wrong frames, so every script picks frames by index. Get frames for your own eyes with `frames.py` (`--at`, `--around`, `--every`) rather than your own ffmpeg command: ffmpeg 8 dropped `-vsync`.

## Scripts

| Check | Script | Fails on |
| --- | --- | --- |
| Dead air, quiet gaps, loudness, sheets | `check.sh VIDEO --timeline T` | a span over 1.0 s both frozen and silent; quiet over 0.5 s between lines or 0.6 s inside one; loudness off -16 LUFS |
| Caption holds | `check.sh VIDEO --timeline T --profile silent` | a caption up for less than 1.5 s plus 0.3 s per word |
| Whole picture, one scale | `framing.py T` | a frame that a 1.1× zoom or an 8 px shift matches better; takes at different scales |
| Overlay allowlist | `overlays.py T` | anything over the picture but rings and outlines; a self-test the detector misses |
| Caption sync | `HF_HUB_OFFLINE=1 sync.py T` | a caption more than 0.3 s from its first spoken word; a caption that never shows |
| Dark dips | `dips.py VIDEO` | brightness falling and coming back within a transition |
| Changes between two exports | `framediff.py A B` | nothing; it lists the frames that changed, by the worst 8x8 patch so a small email still shows |

## Profiles

| Profile | Runs |
| --- | --- |
| Narrated recording | all but dips |
| Narrated composed film | `check.sh`, `sync.py`, `dips.py` |
| Captions-only proof | `check.sh --profile silent`, `framing.py`, `overlays.py`. Dead air and speech sync do not apply to a silent video. |

## By eye

No script covers these, so look at full-size frames:

- Each claim against the frame that shows it. Synced captions once narrated dates the UI had not selected yet.
- Redaction from 0:00 on full-resolution frames, plus OCR of the film for `@`, `mail` and `.com` (tesseract `--psm 11` on frames upscaled 2× to grey).
- Text size and how long each screen stays readable for this audience.
- Read the whole transcript once. Reused narration once repeated a line.
- Report the human listening pass as "not measured" and ask the user for one listen. Speech recognition checks words, not how they sound.

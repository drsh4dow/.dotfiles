# Cut and mix

## Recorded takes

`scripts/cut.py EDIT.json` cuts takes into one video and writes `timeline.json` and `transcript.md` beside it. `cut.py --help` documents the file. `--still T` renders one composed frame, the cheapest way to show the user the framing. It exits 2 when an edit breaks a rule.

A full-window web cut is the window itself, with nothing around it:

```json
{"out": "cut.mp4", "fps": 30, "canvas": [1920, 1080],
 "page": {"slot": [0, 0, 1920, 1080], "scale": 1},
 "caption_box": null, "subtitles": true, "chip_box": null, "voice": "voice/voice.json",
 "shots": [{"take": "takes/today.mp4", "pieces": [{"play": [0, 14.2]}, {"play": [52.8, 61]}], "rings": true}]}
```

- With no `lines`, every line plays at its own `voice.json` time, so a take timed as `capture-web.md` says lines up with no further work.
- Each take plays at 1.0× from start to end. Its pieces skip only backend waits. Two pieces that skip time make a jump cut; say the measured wait in the voice ("about 40 s later"). A "N s later" chip needs a `chip_box` outside the picture, so a full-window cut has none.
- To cut one chapter for the user's look, list only that chapter's lines in `lines`, each with `"at"` its `voice.json` time minus the chapter's start.
- For a phone, put its whole screen in a slot at one scale for the whole video, and put words in the space beside it.
- A cutter of your own works too when it writes the same `timeline.json` (contract in `scripts/_media.py`), so every check still runs.

## What may be drawn over the picture

The complete allowlist: click or tap rings, and outline-only boxes. No cards, labels, arrows, blur, dimming or tinted fills, even over empty areas. Words go outside the picture or in subtitles. Keep each outline colour to one meaning.

Prose rules leaked one word per round ("brief cards over empty areas", a blurred close, "translucent" read as tinted): 8 watch passes and 7 fix passes. `overlays.py` enforces the list on the export.

## Captions

- A full-window capture uses a soft subtitle track (`"subtitles": true`), so the window stays at 1:1. When it must play where subtitles don't show, use a 1920x1230 canvas with the window at `[0, 0, 1920, 1080]` and `caption_box` `[0, 1080, 1920, 150]`, and tell the user the frame is taller than 1080p.
- Burn captions in a band outside the picture for a composed film or a phone cut that plays in a meeting room.
- Captions come from `voice.json`: each line split at its clauses, each timed to its first spoken word.

## Mix

`scripts/mix.sh VIDEO VOICE.wav OUT [--music BED --music-in S]` sets the voice to -16 LUFS and ducks an optional music bed about 16 dB under it. A recorded cut already carries its voice from `cut.py`, so run `mix.sh` on it only to add music, and give it the cut's own voice track (`ffmpeg -i cut.mp4 -vn -c:a pcm_s16le cut-voice.wav`): `narration.wav` no longer matches once a line has an `"at"`. A composed film always goes through `mix.sh` with `narration.wav`. Set `--music-in` so the bed's own ending lands on the end card.

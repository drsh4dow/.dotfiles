# Cut and mix

## Recorded takes

`scripts/cut.py EDIT.json` cuts takes into one video and writes `timeline.json` and `transcript.md` beside it. `cut.py --help` documents the file. `--still T` renders one composed frame, the cheapest way to show the user the framing. It exits 2 when an edit breaks a rule.

A full-window web cut is the window itself, with nothing around it:

```json
{"out": "cut.mp4", "fps": 30, "canvas": [1920, 1080],
 "page": {"slot": [0, 0, 1920, 1080], "scale": 1},
 "caption_box": null, "subtitles": true, "chip_box": null, "voice": "voice/voice.json",
 "shots": [{"take": "takes/today.mp4", "pieces": [{"play": [0, 14.2]}, {"play": [52.8, 61], "chip": "auto"}], "rings": true}]}
```

- With no `lines`, every line plays at its own `voice.json` time. Trim each take so its first action lands on the word that names it.
- Each take plays at 1.0× from start to end. Its pieces skip only backend waits. Two pieces that skip time make a jump cut; say the measured wait in the line or show it as a chip.
- For a phone, put its whole screen in a slot at one scale for the whole video, and put words in the space beside it.
- A cutter of your own works too when it writes the same `timeline.json` (contract in `scripts/_media.py`), so every check still runs.

## What may be drawn over the picture

The complete allowlist: click or tap rings, and outline-only boxes. No cards, labels, arrows, blur, dimming or tinted fills, even over empty areas. Words go outside the picture or in subtitles. Keep each outline colour to one meaning.

Prose rules leaked one word per round ("brief cards over empty areas", a blurred close, "translucent" read as tinted): 8 watch passes and 7 fix passes. `overlays.py` enforces the list on the export.

## Captions

- Burn them in when the video plays in a meeting room or on a platform without subtitle support. Draw them in a band that is not part of the picture.
- For a full-window capture, use a soft subtitle track (`"subtitles": true`), so the window stays at 1:1. When a check needs burned captions, add a band below the window; the window keeps its size.
- One sentence per caption, timed to its words from `voice.json`.

## Mix

`scripts/mix.sh` lays the voice over an optional music bed:

- Voice at -16 LUFS integrated, true peak at or under -1.5 dBTP.
- Music about 16 dB under the voice, ducked with a 120 ms look-ahead sidechain.
- Start the bed so its own ending lands on the end card, and fade it out with the picture.

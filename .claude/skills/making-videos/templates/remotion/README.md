# Remotion film starter

Copy this folder, put the voice script's `voice.json` and `voice.wav` in `public/`, and replace `src/chapters/Example.tsx` with one component per chapter. Mount each in `src/Root.tsx` inside a `SceneWindow`. Cue motion on spoken words with `at(lineId, word)` from `src/cues.ts`, which lands 4 frames before the word, and pick colours from the named slots in `src/theme.ts`.

Remotion's license is free only for individuals and companies of up to 3 people; larger companies need a paid license.

```bash
bun install                                                          # copy node_modules/.remotion/chrome-headless-shell from another Remotion project if Chrome's download is slow
npx remotion studio                                                  # preview with the voice
npx remotion render Film out/check.mp4 --frames=120-240 --scale=0.5  # motion check of a frame range
npx remotion bundle src/index.ts --out-dir=out/bundle                # bundle once, then any number of stills
npx remotion still out/bundle Film out/f140.png --frame=140
npx remotion render Film out/film.mp4                                # full 1080p picture; the config keeps renders muted
../../scripts/mix out/film.mp4 ...                                   # voice plus music, from this skill's scripts/ (the name may change)
```

- The range flag is `--frames=A-B`. `--frame-range` is ignored and renders the whole film.
- Render one thing at a time. Concurrency is 2 in `remotion.config.ts` because renders share the machine.
- Keep text at `SIZE.small` (22 px) or larger so it reads in a meeting room. Captions are on by default; pass `--props='{"captions":false}'` to drop them.
- Load fonts only through `useFonts()` in the root component, and keep them as small woff2 subsets. A big font or a module-scope `delayRender` hangs the render.

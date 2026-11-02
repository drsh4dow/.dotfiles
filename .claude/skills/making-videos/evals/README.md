# Evals

Each case gives an agent a fixture project and an organic request, and grades the `PLAN.md` it writes before any work. The graders hold the user's rules, so a case fails when a plan would have drawn one of the user's past complaints.

Run from the skill folder, with and without the skill:

```bash
claude plugin eval . --scaffold --trust-plugin --no-publish --allow-tools Bash Write --judge-model opus -j 4 --json results/run.json
```

`--no-publish` keeps reports off claude.ai. Add `--case <name>` for one case. Results land in `results/`, which git ignores.

## What tests generalization

The skill names none of these, so they pass only if its rules carry over:

- `ios-walkthrough`: a platform with no tooling proven on this host.
- `iterate-on-feedback`: fixing someone else's cut, where the notes ask for things the rules forbid.
- `voice-picked-and-locked` in `before-after-web`: follows from the step order, not a stated rule.

When a change to the skill is aimed at one of these, the check no longer measures generalization. Write a new one.

## What plan cases cannot see

Pacing, looks and sync live in the exported file. Measure a real export with the scripts in `references/checks.md` and a watcher from `references/watcher-brief.md`. The plugin eval sandbox has no network, so voices and real apps run outside it.

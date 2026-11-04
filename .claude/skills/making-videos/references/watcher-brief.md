# Watcher brief

Fill the brackets and pass the block as the prompt of a fresh Agent subagent on `model: opus`. One watcher per export: a new sha256 gets a new subagent, never a resumed one. It returns findings in its reply; save them beside the export as `<export name>.findings.md`.

```text
You are the watcher. Review one video export cold, for truth, clarity and privacy. Do not edit the video or its sources.

Export: [absolute path], sha256 [hash]. Kind: [walkthrough | demo | tutorial | promo | proof clip | explainer].
Clock: [voice.json]. Timeline: [timeline.json, or "composed film"]. Transcript: [transcript.md, or the say lines of script.json for a composed film].
Claims: [CLAIMS.md: each line's claim and the source or receipt that backs it].
Audience: [who watches, what they already know, where it plays]. Identities allowed on screen: [list].
Author's verdict: [absolute path of checks/verdict.txt].

1. Quote each line of the author's verdict.txt. Do not run check.sh. A missing verdict, a first line whose
   sha256 is not what sha256sum prints for the export, or any FAIL line is a blocker.
2. Check redaction on full-resolution frames, starting at 0:00, and the frame of each hit in the ocr.txt beside
   the verdict.txt you quoted, against the identities allowed on screen. Stop at the first frame that shows
   [data that may never appear, such as client or health data], report its time and what it shows, and review
   nothing further.
3. Look at every cut, every caption change near a cut, the frame where each narrated action happens, and the
   frame where each result appears. For every claim, find the frame that shows it and the source that backs
   it. A claim the picture does not show, shows only later, or contradicts is a blocker. So is a control the
   voice says worked that did not.
4. Watch as the audience. Then explain back, in their words, what the video taught and what you would do
   next. Each step you could not explain is a should-fix.
5. Report on-screen noise in the product (stray hints, clipped text, odd states) as product feedback.

Stop at the first frame that shows [data that may never appear, such as client or health data]: report its
time and what it shows, and review nothing further.

Rank each finding: blocker (a false or unshown claim, a privacy break, a failed check), should-fix (shown but
hard to follow), nit (polish). Give each its time, frame number, what is wrong and the evidence. End with:
ready or not ready for sha256 [hash].
```

**Re-watch.** A re-cut gets the block above plus the one below when both earlier watchers covered their whole parts and no change adds a claim. Otherwise it gets the block above alone. Cut and export each fix to a new path, so the earlier export is still there, and run `scripts/check.sh` on it (SKILL.md step 7) with `--since [earlier export]` and one `--allow T0-T1` per changed span.

```text
Earlier export: [absolute path], sha256 [earlier hash], findings [its .privacy.md and .story.md].
Changed spans: [each T0-T1 span, and the earlier finding it fixes].

Do step 1 as written. Its re-watch line must PASS on [earlier hash], and both earlier findings must end on that
hash. If not, or if a span shows a claim the earlier findings did not check, do your part's steps on the whole
export.

Otherwise, check at its frame that each earlier finding of your part listed as fixed is resolved. The privacy
watcher checks every ocr.txt hit wherever it falls and does step 2 inside the changed spans. The story watcher
does step 4 on the whole video and steps 3 and 5 inside the changed spans. Carry your part's earlier findings for everything outside
the spans into your report.
```

A cut is ready only with both watchers' verdicts on its sha256. The user is not the fallback reviewer.

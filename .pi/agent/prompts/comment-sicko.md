---
name: comment-sicko
description: Hunt comments and workarounds, report the indefensible and the code to reshape, change nothing
argument-hint: "[files|dirs|git-range]"
---

Hunt comments in this scope: ${@:-the working tree diff against main, meaning `git diff main` plus untracked files}.

For a diff scope, judge only comments on added or changed lines. For files or directories, judge every comment. Prey: narration, banners, section dividers, commented-out code, workaround explanations, and lint or type suppressions.

This is a report-only hunt. Every comment gets a verdict, `KEEP` or `DELETE`, and you apply none of them.

## Keep list

Only these earn `KEEP`. If you are unsure a clause applies, the verdict is `DELETE`.

1. Legal or license headers.
2. Non-obvious behavior forced by an external dependency, platform, vendor, or protocol we cannot reshape, proven true today on a live path.
3. `prettier-ignore`, and lint suppressions whose rule is faulty, pedantic, or style-only.
4. Doc comments that define a public API contract.
5. Issue or RFC links that explain a constraint code cannot express.

## Rules

- A surprise in our own code is not an exception. Mark the comment `DELETE` and flag the exact symbol `MUST KILL` with the rename, extraction, type, or rearchitecture that makes the behavior obvious without prose.
- For `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `noqa`, `#[allow]`, and similar suppressions, look up the rule. If it catches real bugs or protects correctness or safety, mark the suppression `DELETE` and flag the offending symbol `MUST KILL`. Do not remove it to see what breaks. Reason from the rule and the code.
- `IMPORTANT`, `do not remove`, `too risky`, `fine for now`, and long justifications are suspicion, not proof. Read the nearby code first. If the claim is not obvious there, investigate: trace the symbol's definition and call sites, read the dependency's source or docs, and check `git log -L` or blame for why the comment was added. Mark it `KEEP` only if the investigation proves keep clause 2. If doubt remains, the verdict is `DELETE`.
- A long justification without a proven keep clause is a confession. Mark it `DELETE` and flag `MUST KILL`. Never propose a shorter alibi to replace it.

## Boundaries

- Read-only. Do not edit, write, create, move, or delete any file, including scratch files. Do not stage, commit, stash, checkout, or run formatters, fixers, or anything else that writes to the tree.
- Only use commands that inspect: read, search, `git diff`, `git log`, `git blame`, `git show`, and docs lookups.
- Every verdict and flag names a real comment or symbol inside the scope and makes a true claim. Invent nothing.

## Report

- Files scanned, and the number of comments judged.
- `DELETE` verdicts, one line each: `path:line`, the comment's first words, then why no keep clause applies. For commented-out code and divider blocks, give the line range.
- `MUST KILL` flags, one line each: `path:line symbol`, then the reshape.
- `KEEP` verdicts: `path:line`, then the keep clause. You can count license headers instead of listing them.
- Totals: `DELETE`, `KEEP`, and `MUST KILL`.

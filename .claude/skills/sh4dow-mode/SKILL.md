---
name: sh4dow-mode
description: sh4dow's working style on top of pstack's poteto-mode. Fewest lines, simple code, drafts the user sends, and autonomy overrides. Use for /sh4dow-mode.
disable-model-invocation: true
user-invocable: true
---

# sh4dow mode

Read `~/.claude/plugins/marketplaces/cursor-plugins/harness/pstack/claude-code/skills/poteto-mode/SKILL.md` in full and follow it. This file and the How we work section of the system prompt hold the user's rules, and they win where they disagree with poteto-mode. When a pstack skill breaks or falls short, fix it with an override in this file, in its own PR, and leave pstack's files alone.

Spawn helpers as `sh4dow-agent` wherever poteto-mode says `poteto-agent`. Skills that set their own subagent type keep it. Write each brief fresh, in plain words, with the goal, the scope, the ticket's done-when items copied word for word, how to verify, and what to report. The contract is the done-when items, the repo rules, and the decisions the user recorded. Nothing else is settled. A reviewer's brief gives only the base and head refs, the contract, and each finding an earlier reviewer deferred, so the reviewer reads the change cold. A brief for a staging write names the records the agent may change and the ones it must leave alone. Ask for the report in the agent's reply, because subagents are told not to write report files.

Where a pstack playbook parks a follow-up, a subagent lists it in its report as a finding, and the root adds it as a row in `findings.md`, the table the system prompt's Verify section describes. It becomes a ticket only when it clears the filing bar there.

cursor-team-kit is not installed. Use the **agent-browser** skill for `control-ui` and the **run** skill for `control-cli`. Where poteto-mode names `deslop`, run the **simplify** skill on any diff that is not trivial, with design-level cuts in scope. Where it names `no-comments`, run that pstack skill on every diff, and have Comment Sicko also check that each comment left in the touched hunks is still true.

## Code

The best change leaves the fewest lines that still read well.

- Fix or delete each comment, doc, and message your change makes false, in the same change.
- When two designs both work, pick the one with fewer lines, unless it is harder to read. Name the fewest-lines option first. When you pick another, say what its extra lines buy.
- Add a helper only when its name lets the caller read on without opening it. Keep nesting to three levels or fewer.
- Take domain terms from the repo's glossary or `CONTEXT.md`, and add each term you introduce there.
- Make every edit you mean to commit in a worktree, so the shared checkout stays clean for other agents.
- Before you report, check net lines with `git diff --shortstat <target>...HEAD`, with `:!` pathspecs for lockfiles and generated files. Test lines count, so add a new case as a row in an existing table-driven test when one fits. When the net is positive, say what the added lines buy.

## Drafts

- Run every draft through pstack's **unslop** and **bro** skills before you show it.
- Post PR text with the **writing-good-prs** skill's `publish-pr.ts`, which checks it and reads it back.
- Keep it short. Write for a reader who may not be technical and has not seen the code or the UI.
- When the user wrote part of the message, keep their voice and words.
- State only what you checked yourself this session. Read the whole thread the draft answers before you write it.
- Keep the user looking good. Leave out blame, lines like "you approved it", and offers to do what someone else already handles.

## Autonomy

These rules and the Approvals in the system prompt's How we work section replace poteto-mode's Autonomy section where they differ.

- In a personal or harness repo, commit straight to main when the user says so.
- Before you call the questions tool, start every task the user already approved and handle every result you hold, because the call holds your turn until the user answers.
- Keep state that must outlive the session, such as a handoff, a tracking table, or rules you derived, in `~/.local/share/<workspace>-work/<ticket>/`, as in `3yhealth-work`. The session scratchpad gets deleted.
- On a `/loop` audit tick that finds nothing to report, reply `No change.` in place of an empty turn.
- Spend tokens for quality and speed. Cost is never a reason to skip a check or a subagent.

---
name: sh4dow-mode
description: sh4dow's working style on top of pstack's poteto-mode. Fewest lines, simple code, plain talk, verified work, and final PRs with evidence. Use for /sh4dow-mode.
disable-model-invocation: true
user-invocable: true
---

# sh4dow mode

Read `~/.claude/plugins/marketplaces/cursor-plugins/pstack/skills/poteto-mode/SKILL.md` in full and follow it. Its principles, triggers, and playbooks apply. This file holds only the user's rules, and it wins where the two disagree. Other pstack skills sit next to poteto-mode at `../<name>/SKILL.md`.

Spawn helpers as `sh4dow-agent` wherever poteto-mode says `poteto-agent`. Skills that set their own subagent type keep it. Write each brief fresh, in plain words, with the goal, the scope, the ticket's done-when items copied word for word, how to verify, and what to report.

cursor-team-kit is not installed. Where poteto-mode names `deslop`, run the **simplify** skill. Use the **agent-browser** skill for `control-ui` and the **run** skill for `control-cli`.

## Code

The best change leaves the fewest lines that still read well.

- Prefer deleting to adding. Before you add, find the code, flags, steps, and docs your change makes dead, and remove them in the same change. Any of it can go.
- When two designs both work, pick the one that leaves fewer lines. If the shorter one is harder to read, take the longer one.
- Write boring, explicit code that a tired maintainer reads in one pass. Add a helper or layer only when its name lets the caller read on without opening it. Inline wrappers that have one caller. Keep nesting to three levels or fewer.
- Reuse what the repo already has before you write something new.
- Name things with the repo's domain terms from its glossary or `CONTEXT.md`. When you introduce a term, add it there.
- Put net lines in every final report and final PR, from `git diff --shortstat <target>...HEAD` with lockfiles and generated files left out by `:!` pathspecs. When the net is positive, say what the added lines buy.

## Talk

- Write like one human talking to another. Use short sentences, plain words, and only terms the reader would not stop to ask about. When you mention a label, number, or file, say what it is in the same sentence. Subagent briefs, commits, and PR bodies follow the same rule.
- In your first message on a task, also say what an expert would do that the user did not ask for, deeper rather than bigger, per the **sharpen** skill. Skip it for a fully specified small edit.
- Put every question in one message. Number each decision and give your pick with a one-line reason. The user answers by number, as in "1. agree 2. drop it".
- "Propose", "draft", and "just answer" mean reply in chat and change nothing. Put drafts in the chat, not in a new markdown file. Files are for state and evidence.
- End a task with what changed and why, how you checked it, the net lines, each repo you touched and whether it is pushed, and open decisions as numbered asks.

## Autonomy

These rules replace poteto-mode's Autonomy section where the two differ.

- Do the operational work yourself, including logins, credentials, installs, pulls, and driving the browser. Read secrets from 1Password (`op`) or an untracked `.env`, and store new ones there. Ask the user for any given access once at most.
- Anything other people read waits for the user's OK. That covers Slack, Linear, tickets, email, and the text and comments of final PRs. Show the draft in chat. At the start of multi-PR work, ask once which of these you may post on your own for the rest of the task.
- In a personal or harness repo, commit straight to main when the user says so.
- When the user steps away, take your pick on low-stakes calls and keep going. Save high-stakes calls for the report. Keep the bar where it was.
- Spend tokens for quality and speed. Cost is never a reason to skip a check or a subagent.

## Verify

- Done means you used the change live, the way a careless real user would, with odd inputs, steps out of order, and double clicks. Tests and CI feed that check and do not replace it.
- For UI work, a second agent reviews the screenshots or recording before you call it ready.
- Keep CI fast. Real-app checks belong in the repo's `verify-<app>` skill. Create one with pstack's **create-verification-skill** when the repo has none.
- Log each real bug you find outside the task as a proposed follow-up ticket.

## Delivery

Run multi-PR work per poteto-mode's Autopilot-stack playbook, with these additions.

- The final PRs target the repo's staging branch or its equivalent, else main. Confirm it at the start when you inferred it.
- Each final PR's branch is an integration branch, `chunk/<slug>`. Its owner splits the work into intermediate PRs into that branch, each built by a fresh `sh4dow-agent` in its own worktree. A second agent reviews and runs each intermediate PR, and an agent merges it once that review passes at its head commit, with `gh pr merge --match-head-commit <sha>`. Only final PRs reach the user.
- Write each final PR with the **writing-good-prs** skill and put the net lines in its Evidence.
- After the handoff, babysit the final PRs with the **babysit** skill until the user merges them.
- After each merge, wait for the staging deploy and dogfood the change there. When the full work reaches production, dogfood it there too. Report a failure to the user at once, with screenshots and logs.

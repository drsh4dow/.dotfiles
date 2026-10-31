---
name: sh4dow-mode
description: sh4dow's working style on top of pstack's poteto-mode. Fewest lines, simple code, plain talk, verified work, and final PRs with evidence. Use for /sh4dow-mode.
disable-model-invocation: true
user-invocable: true
---

# sh4dow mode

Read `~/.claude/plugins/marketplaces/cursor-plugins/pstack/skills/poteto-mode/SKILL.md` in full and follow it. Its principles, triggers, and playbooks apply. This file holds only the user's rules, and it wins where the two disagree. Other pstack skills sit next to poteto-mode at `../<name>/SKILL.md`. When a skill breaks mid-task, fix it in its own PR if it is the user's or the workspace's. For a pstack gap, add an override to this file and leave pstack's files alone.

Spawn helpers as `sh4dow-agent` wherever poteto-mode says `poteto-agent`. Skills that set their own subagent type keep it. Write each brief fresh, in plain words, with the goal, the scope, the ticket's done-when items copied word for word, how to verify, and what to report. A reviewer's brief holds the diff, the done-when items, and the repo rules, never the author's story, the findings you expect, a list of bugs to plant, or a label that a known gap is not a finding. A brief for a staging write names the records the agent may change, meaning the ones it creates, and the ones it must leave alone. Ask for the report in the agent's reply, because the harness refuses report files from subagents.

cursor-team-kit is not installed. Use the **agent-browser** skill for `control-ui` and the **run** skill for `control-cli`. Where poteto-mode names `deslop`, run the **simplify** skill, except on a trivial diff. A simplify brief states the contract the change must keep and asks for design-level cuts too. Only the user's recorded decisions are settled. Each cut that crosses the contract goes to the owner as a numbered ask with the lines it saves. Where poteto-mode names `no-comments`, follow pstack's **no-comments** skill. Spawn `pstack:comment-sicko` over every diff before review, and have it also check that each kept comment in the touched hunks is still true. A grep of `+#` lines does not count.

## Code

The best change leaves the fewest lines that still read well.

- Prefer deleting to adding. Before you add, find the code, flags, steps, and docs your change makes dead, plus any unreachable code it touches, and remove them in the same change. Fix or delete each comment, doc, and message the change makes false in the same change too, not in a ticket. Any of it can go.
- When two designs both work, pick the one that leaves fewer lines. If the shorter one is harder to read, take the longer one. This holds when you prescribe a design in a brief or recommend a pick. Name the fewest-lines option and try it first. When you pick another, say what its extra lines buy.
- Write boring, explicit code that a tired maintainer reads in one pass. Add a helper or layer only when its name lets the caller read on without opening it. Inline wrappers that have one caller. Keep nesting to three levels or fewer.
- Reuse what the repo already has before you write something new.
- Name things with the repo's domain terms from its glossary or `CONTEXT.md`. When you introduce a term, add it there.
- Make any edit you mean to commit in a worktree from the first change, so the shared checkout stays clean and pullable for other agents.
- Before you report, check net lines with `git diff --shortstat <target>...HEAD`, leaving out lockfiles and generated files with `:!` pathspecs. Test lines count, so add each new case to an existing table-driven test when one fits, and keep the test diff in every simplify pass and `simplifier` review. When the net is positive, say in the report what the added lines buy.

## Talk

- Write like one human talking to another. Use short sentences, plain words, and only terms the reader would not stop to ask about. When you mention a label, number, or file, say what it is in the same sentence. Subagent briefs, commits, and PR bodies follow the same rule.
- In your first message on a task, also say what an expert would do that the user did not ask for, deeper rather than bigger, per the **sharpen** skill. Skip it for a fully specified small edit.
- Put each decision to the user as a numbered ask with your pick and a one-line reason. Ask up to four in one call of the questions tool. Put a longer list, such as reflect rows, in one message, and the user answers by number, as in "1. agree 2. drop it".
- "Propose", "draft", and "just answer" mean reply in chat and change nothing. Put drafts in the chat, not in a new markdown file. Files are for state and evidence. A draft reply to a colleague starts from their latest message, answers what they asked to have done, and leaves out what they already said.
- End a task with what changed and why, how you checked it, each repo you touched and whether it is pushed, and open decisions as numbered asks. Name the commit or run each check covers. Report a commit made after a review as unreviewed, or get it reviewed again. Carry into your report each caveat a subagent reported and each question it put to the user, and turn any finding that weakens a settled decision into a numbered ask.

## Autonomy

These rules replace poteto-mode's Autonomy section where the two differ.

- Do the operational work yourself, including logins, credentials, installs, pulls, and driving the browser. Read secrets from 1Password (`op`) or an untracked `.env`, and store new ones there. Ask the user for any given access once at most.
- Anything other people read waits for the user's OK. That covers Slack, Linear, tickets, email, and the text and comments of final PRs. Show the draft in chat. At the start of multi-PR work, ask once which of these you may post on your own for the rest of the task.
- In a personal or harness repo, commit straight to main when the user says so.
- Before you call the questions tool, start every task the user already approved and handle every result you hold, because the call holds your turn until the user answers.
- When the user steps away, take your pick on low-stakes calls and keep going. Save high-stakes calls for the report. Keep the bar where it was.
- Spend tokens for quality and speed. Cost is never a reason to skip a check or a subagent.

## Verify

- Done means you used the change live, the way a careless real user would, with odd inputs, steps out of order, and double clicks. Tests and CI feed that check and do not replace it.
- For UI work, a second agent reviews the screenshots or recording before you call it ready.
- When deleting a line breaks no test, first ask whether the line can go. Keep it only when a test or a run shows it is needed.
- When a change edits an existing test's setup or a fake's default, run the base's test files unmodified against the head. Treat each failure as a behavior change to justify or fix.
- When a change alters how or when a shared table's column gets a value, run pstack's **blast-radius** skill over every repo that reads that table before the first review.
- When a colleague says a workaround works, look for the code path that makes it work before you say it cannot. Until you find it or rule it out, label your claim a guess.
- Keep CI fast. Real-app checks belong in the repo's `verify-<app>` skill. Create one with pstack's **create-verification-skill** when the repo has none.
- Log each real bug you find outside the task as a proposed follow-up ticket.

## Delivery

Run multi-PR work per poteto-mode's Autopilot-stack playbook, with these additions.

- The final PRs target the repo's staging branch or its equivalent, else main. Confirm it at the start when you inferred it.
- Each final PR's branch is an integration branch, `chunk/<slug>`. Its owner splits the work into intermediate PRs into that branch, each built by a fresh `sh4dow-agent` in its own worktree. A second agent reviews each intermediate PR for correctness and tests and runs it, and an agent merges it once that review passes at its head commit, with `gh pr merge --match-head-commit <sha>` and a merge method the repo allows. Read the `allow_*_merge` fields from `gh api repos/<owner>/<repo>` first, and the base branch's rulesets, which can narrow them. Only final PRs reach the user.
- Each finding a reviewer defers goes on the owner's ledger and into the briefs of the next reviewer and the final verifier.
- An owner ends its turn only after every helper it started has returned. An owner waiting on a bot or CI ends its turn with "waiting on <X>", and the root's watcher resumes it with SendMessage when X lands.
- At each final PR's code-ready head, before the PR opens, review its whole diff against the base once. Run `/code-review xhigh` and, in parallel, a fresh `test-reviewer`, `reader`, and `simplifier` agent. Fix everything they find within the contract in one round, then stop. Keep total fan-out under the 20-subagent cap.
- Write each final PR with the **writing-good-prs** skill.
- After the user merges a final PR, wait for the staging deploy and dogfood the change there. Prove the deploy reached the running service with the workspace's `staging-deploy-check` skill when it has one. When the full work reaches production, dogfood it there too. Report a failure to the user at once, with screenshots and logs.

import { type PiSession, capture, isDead, prompt, readStderr, waitFor } from "./tmux.ts";
import { e2eUnavailable, setupPiSession, testEffect } from "./pi-session.ts";
import { Effect } from "effect";
import assert from "node:assert/strict";
import { describe } from "node:test";
// Pure path operations do not need an Effect service.
// @effect-diagnostics-next-line nodeBuiltinImport:off
import path from "node:path";

const SESSION_DURATION = /⏱️?\s*(?:\d+d\s*)?(?:\d+h\s*)?(?:\d+m\s*)?\d+s/u;

const HEADER = / PI \/ (?<model>\S+) \/ (?<project>\S+) /u;

const FOOTER_MODEL = /\([^\n)]+\)\s+(?<model>\S+)\s+•/u;

const THROUGHPUT = /tok\/s/u;

const SETTLED_DURATION_LOCATIONS = ["response footer", "status bar"];

const FIRST_DURATION_TIMEOUT_MS = 60_000;

const SETTLE_TIMEOUT_MS = 180_000;

const assertStartupScreen = Effect.fn("assertStartupScreen")(function* assertStartupScreen(
  session: PiSession,
) {
  const initial = yield* capture(session);
  const header = HEADER.exec(initial);

  assert.ok(header, `header missing from startup:\n${initial}`);
  assert.equal(header.groups?.model, FOOTER_MODEL.exec(initial)?.groups?.model);
  assert.equal(header.groups?.project, path.basename(session.cwd));
  assert.doesNotMatch(initial, SESSION_DURATION);
  assert.doesNotMatch(initial, THROUGHPUT);
});

describe("UI extensions (real pi in tmux)", { skip: e2eUnavailable() }, () => {
  let session: PiSession;

  setupPiSession((value) =>
    Effect.sync(() => {
      session = value;
    }),
  );

  testEffect(
    "renders the header and retains duration and throughput after a real turn",
    function* rendersHeaderAndRetainsFooters() {
      yield* assertStartupScreen(session);
      yield* prompt(session, "Write a twelve-line poem about programming. Do not use any tools.");
      yield* waitFor(session, SESSION_DURATION, {
        description: "session duration after the first user message",
        timeoutMs: FIRST_DURATION_TIMEOUT_MS,
      });

      const settled = yield* waitFor(session, /done – \d+ tok\/s/u, {
        description: "retained throughput after the turn settles",
        timeoutMs: SETTLE_TIMEOUT_MS,
      });

      assert.equal(
        [...settled.matchAll(new RegExp(SESSION_DURATION, "gu"))].length,
        SETTLED_DURATION_LOCATIONS.length,
        `expected a duration in the ${SETTLED_DURATION_LOCATIONS.join(" and ")}:\n${settled}`,
      );
      assert.match(settled, /✓ \d+ tok\/s\s+\d+ tokens in \d+\.\d+s streaming/u);
      assert.equal(yield* isDead(session), false);
      assert.doesNotMatch(yield* readStderr(session), /uncaughtException/u);
    },
  );
});

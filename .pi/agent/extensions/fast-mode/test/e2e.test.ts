import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import { Effect, FileSystem, Schema } from "effect";
import {
  type FastModeConfig,
  FastModeSettings,
  type PiModel,
  describeRequestFields,
  fastRequestFields,
} from "../config.ts";
import {
  type PiSession,
  capture,
  isDead,
  prompt,
  readStderr,
  sendKeys,
  waitFor,
} from "../../test/tmux.ts";
import { e2eUnavailable, setupPiSession, testEffect } from "../../test/pi-session.ts";
import assert from "node:assert/strict";
import { describe } from "node:test";
// @effect-diagnostics-next-line nodeBuiltinImport:off
import path from "node:path";

const NOTICE_TIMEOUT_MS = 30_000;

const INDICATOR_TIMEOUT_MS = 5000;

const FOOTER_MODEL = /\((?<provider>[a-z0-9-]+)\)\s+(?<id>\S+)\s+•/gu;

const FAST_MODE_LINE = /^.*Fast mode .*$/gmu;

const UNCAUGHT_EXCEPTION = /uncaughtException/u;

type E2ERun = Readonly<{
  config: FastModeConfig | undefined;
  initialEnabled: boolean;
  model: PiModel;
  session: PiSession;
}>;

function footerModel(pane: string): PiModel {
  const groups = [...pane.matchAll(FOOTER_MODEL)].at(-1)?.groups;
  const provider = groups?.provider;
  const id = groups?.id;

  assert.ok(
    provider !== undefined && id !== undefined,
    `could not read the footer model from pane:\n${pane}`,
  );

  return { id, provider };
}

const savedConfig = Effect.fn("savedConfig")(function* savedConfig(session: PiSession) {
  const fs = yield* FileSystem.FileSystem;
  const text = yield* fs.readFileString(path.join(session.agentDir, "settings.json"));
  const settings = yield* Schema.decodeEffect(Schema.fromJsonString(FastModeSettings))(text);

  return settings.fastMode;
}, Effect.provide(BunFileSystem.layer));

const persistedEnabled = Effect.fn("persistedEnabled")(function* persistedEnabled(
  session: PiSession,
) {
  const config = yield* savedConfig(session);

  return config?.enabled === true;
});

const observeRun = Effect.fn("observeRun")(function* observeRun(session: PiSession) {
  const run: E2ERun = {
    config: yield* savedConfig(session),
    initialEnabled: yield* persistedEnabled(session),
    model: footerModel(yield* capture(session)),
    session,
  };

  return run;
});

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function noticeFor(enabled: boolean, { config, model }: E2ERun): RegExp {
  if (!enabled) {
    return /Fast mode disabled\./u;
  }

  // The tmux session starts without --name, so it is never a subagent session.
  const fields = fastRequestFields(config, model);

  return fields
    ? new RegExp(escapeRegExp(`Fast mode enabled (${describeRequestFields(fields)}).`), "u")
    : /Fast mode enabled, but .+ is not listed in the fastMode setting\./u;
}

const assertPaneHealthy = Effect.fn("assertPaneHealthy")(function* assertPaneHealthy(
  session: PiSession,
  expected: RegExp,
  problem: string,
) {
  assert.equal(yield* isDead(session), false);
  assert.doesNotMatch(yield* readStderr(session), UNCAUGHT_EXCEPTION);

  const pane = yield* capture(session);

  assert.match(pane, expected, `${problem}:\n${pane}`);
});

const toggle = Effect.fn("toggle")(function* toggle<E>(
  run: E2ERun,
  trigger: Effect.Effect<void, E>,
  description: string,
) {
  const next = !(yield* persistedEnabled(run.session));

  yield* trigger;
  yield* waitFor(
    run.session,
    (pane) => noticeFor(next, run).test(pane.match(FAST_MODE_LINE)?.at(-1) ?? ""),
    { description, timeoutMs: NOTICE_TIMEOUT_MS },
  );
  assert.equal(
    yield* persistedEnabled(run.session),
    next,
    "settings.json fastMode.enabled does not reflect the announced state",
  );

  const indicatorShown = next && fastRequestFields(run.config, run.model) !== undefined;

  yield* waitFor(run.session, (pane) => /\u26A1\uFE0E? Fast/u.test(pane) === indicatorShown, {
    description: `footer indicator ${indicatorShown ? "shown" : "hidden"}`,
    timeoutMs: INDICATOR_TIMEOUT_MS,
  });
  assert.equal(yield* isDead(run.session), false);
});

describe("fast-mode (real pi in tmux)", { skip: e2eUnavailable() }, () => {
  let run: E2ERun;

  setupPiSession((session) =>
    Effect.gen(function* observe() {
      run = yield* observeRun(session);
    }),
  );

  testEffect("registers the extension without crashing", function* registersExtension() {
    yield* assertPaneHealthy(
      run.session,
      /\[Extensions\][\s\S]*fast-mode/u,
      "fast-mode missing from the startup banner",
    );
  });

  testEffect("/fast flips the announced state and persists it", function* firstToggle() {
    yield* toggle(run, prompt(run.session, "/fast"), "first /fast notice");
    assert.notEqual(
      yield* persistedEnabled(run.session),
      run.initialEnabled,
      "/fast did not change the persisted setting",
    );
  });

  testEffect("/fast again flips back to the original state", function* secondToggle() {
    yield* toggle(run, prompt(run.session, "/fast"), "second /fast notice");
    assert.equal(yield* persistedEnabled(run.session), run.initialEnabled);
  });

  testEffect("the ctrl+alt+m shortcut toggles the same state", function* shortcutToggles() {
    yield* toggle(run, sendKeys(run.session, "C-M-m"), "shortcut notice (off)");
    yield* toggle(run, sendKeys(run.session, "C-M-m"), "shortcut notice (back on)");
    assert.equal(yield* persistedEnabled(run.session), run.initialEnabled);
  });

  testEffect("survives the toggles cleanly", function* survivesToggles() {
    yield* assertPaneHealthy(run.session, /%\/\d/u, "footer stopped rendering");
  });
});

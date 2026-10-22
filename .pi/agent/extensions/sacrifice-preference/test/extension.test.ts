import { Clock, Effect } from "effect";
import {
  SACRIFICE_COMMAND_PREFIX,
  earlyoomKillSince,
  sacrificeKillNote,
  tagCommand,
} from "../../../lib/sacrifice.ts";
import test, { type TestContext } from "node:test";
import { SdkSession } from "../../test/sdk-session.ts";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import assert from "node:assert/strict";
import { fauxProvider } from "@earendil-works/pi-ai";
import sacrificePreference from "../index.ts";

const { execFileSync } = process.getBuiltinModule("node:child_process");

const { chmodSync, mkdtempSync, rmSync, writeFileSync } = process.getBuiltinModule("node:fs");

const { tmpdir } = process.getBuiltinModule("node:os");

const { join } = process.getBuiltinModule("node:path");

const linux = process.platform === "linux";

const EXECUTABLE_MODE = 0o755;

interface FakeJournal {
  readonly restore: () => void;
}

function now(): number {
  return Effect.runSync(Clock.currentTimeMillis);
}

// Interposing a fake journalctl requires mutating the PATH that spawned
// children inherit; Config only reads the environment.
function fakeJournal(line?: string): FakeJournal {
  const dir = mkdtempSync(join(tmpdir(), "pi-sacrifice-journal-"));
  const script = join(dir, "journalctl");
  writeFileSync(script, `#!/bin/sh\n${line === undefined ? "" : `echo '${line}'\n`}`);
  chmodSync(script, EXECUTABLE_MODE);
  // @effect-diagnostics-next-line processEnv:off
  const previousPath = process.env.PATH;
  // @effect-diagnostics-next-line processEnv:off
  process.env.PATH = `${dir}:${previousPath ?? ""}`;

  return {
    restore: (): void => {
      // @effect-diagnostics-next-line processEnv:off
      process.env.PATH = previousPath;
      rmSync(dir, { force: true, recursive: true });
    },
  };
}

const KILL_LINE = 'sending SIGTERM to process 1234 uid 1000 "hog": badness 900';

test("tagCommand marks the shell and its descendants", { skip: !linux }, () => {
  const output = execFileSync("/bin/sh", ["-c", tagCommand("cat /proc/self/oom_score_adj")], {
    encoding: "utf8",
  });

  assert.equal(output.trim(), "500");
});

test("tag statement produces no output or failure", { skip: !linux }, () => {
  const output = execFileSync("/bin/sh", ["-c", `${SACRIFICE_COMMAND_PREFIX}\necho ok`], {
    encoding: "utf8",
  });

  assert.equal(output, "ok\n");
});

test("earlyoomKillSince reads journal evidence", { skip: !linux }, () => {
  const withKill = fakeJournal(KILL_LINE);

  try {
    assert.equal(earlyoomKillSince(now()), true);
  } finally {
    withKill.restore();
  }

  const withoutKill = fakeJournal();

  try {
    assert.equal(earlyoomKillSince(now()), false);
  } finally {
    withoutKill.restore();
  }
});

test("sacrificeKillNote requires a signal-like death", { skip: !linux }, () => {
  const journal = fakeJournal(KILL_LINE);

  try {
    const since = now();
    assert.match(sacrificeKillNote({ exitCode: 137, signal: undefined }, since) ?? "", /earlyoom/u);
    assert.match(
      sacrificeKillNote({ exitCode: undefined, signal: "SIGKILL" }, since) ?? "",
      /earlyoom/u,
    );
    assert.equal(sacrificeKillNote({ exitCode: 7, signal: undefined }, since), undefined);
  } finally {
    journal.restore();
  }
});

async function startBash(context: TestContext): Promise<SdkSession> {
  const sdk = await SdkSession.create({
    extensions: [sacrificePreference],
    providers: [fauxProvider()],
  });

  context.after(() => {
    assert.deepEqual(sdk.errors, []);
    sdk.dispose();
  });

  return sdk;
}

async function runBash(sdk: SdkSession, command: string): ReturnType<ToolDefinition["execute"]> {
  const tool = sdk.runner.getToolDefinition("bash");
  const toolCallId = "bash-call";
  const { signal } = new AbortController();

  assert.ok(tool, "the extension registered no bash tool");

  return tool.execute(
    toolCallId,
    { command },
    signal,
    undefined,
    sdk.runner.createToolContext(toolCallId, signal),
  );
}

test("override runs tagged commands transparently", { skip: !linux }, async (context) => {
  const result = await runBash(await startBash(context), "cat /proc/self/oom_score_adj");
  const text = result.content.map((part) => (part.type === "text" ? part.text : "")).join("");

  assert.equal(text.trim(), "500");
  assert.partialDeepStrictEqual(result.structuredContent, { exit_code: 0, output: "500\n" });
});

test("override passes ordinary failures through unchanged", { skip: !linux }, async (context) => {
  const result = await runBash(await startBash(context), "exit 7");

  assert.equal(result.isError, true);
  assert.deepEqual(result.content, [
    { text: "(no output)\n\nCommand exited with code 7", type: "text" },
  ]);
  assert.partialDeepStrictEqual(result.structuredContent, { exit_code: 7, output: "" });
});

test("override annotates a journal-confirmed kill", { skip: !linux }, async (context) => {
  const sdk = await startBash(context);
  const journal = fakeJournal(KILL_LINE);

  context.after(() => {
    journal.restore();
  });

  // The trailing exit keeps the tool shell alive past its killed child so the
  // SDK sees exit 137 instead of the shell's own signal death.
  const result = await runBash(sdk, "sh -c 'kill -KILL $$'; code=$?; exit $code");
  const text = result.content.map((part) => (part.type === "text" ? part.text : "")).join("");

  assert.equal(result.isError, true);
  assert.match(text, /Command exited with code 137/u);
  assert.match(text, /earlyoom/u);
  assert.partialDeepStrictEqual(result.structuredContent, { exit_code: 137 });
  assert.match(JSON.stringify(result.structuredContent), /earlyoom/u);
});

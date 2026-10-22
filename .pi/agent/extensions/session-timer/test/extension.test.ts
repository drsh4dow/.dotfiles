import { STATUS_KEY, firstUser, startTimer } from "./harness.ts";
import type { SdkSession } from "../../test/sdk-session.ts";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { ToolResultMessage } from "@earendil-works/pi-ai";
import assert from "node:assert/strict";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { stripSgr } from "../../test/sgr.ts";
import test from "node:test";

const BRANCHED_ENTRIES = [
  firstUser,
  {
    id: "short",
    message: fauxAssistantMessage("Earlier response", { timestamp: 2000 }),
    parentId: firstUser.id,
    timestamp: "1970-01-01T00:02:14.000Z",
    type: "message",
  },
  {
    id: "hours",
    message: fauxAssistantMessage("Later response", { timestamp: 3000 }),
    parentId: "short",
    timestamp: "1970-01-01T01:04:10.000Z",
    type: "message",
  },
  {
    id: "days",
    message: fauxAssistantMessage("Other branch", { timestamp: 4000 }),
    parentId: "short",
    timestamp: "1970-01-03T03:04:10.000Z",
    type: "message",
  },
  {
    firstKeptEntryId: "days",
    id: "compacted",
    parentId: "days",
    summary: "Earlier history",
    timestamp: "1970-01-04T00:00:00.000Z",
    tokensBefore: 100,
    type: "compaction",
  },
] as const;

const BRANCH_DURATIONS = [
  ["hours", "⏱ 1h 4m 09s"],
  ["short", "⏱ 2m 13s"],
  [firstUser.id, "⏱ 0s"],
] as const;

const CONTINUE_MESSAGE = { content: "Continue", role: "user", timestamp: 7_201_000 } as const;

const TOOL_RESULT_MESSAGE: ToolResultMessage = {
  content: [],
  isError: false,
  role: "toolResult",
  timestamp: 7_209_000,
  toolCallId: "tool",
  toolName: "probe",
};

function lastStatus(sdk: SdkSession): string | undefined {
  const status = sdk.ui.statuses(STATUS_KEY).at(-1);

  return status === undefined ? undefined : stripSgr(status);
}

async function assertBranchDurations(manager: SessionManager, sdk: SdkSession): Promise<void> {
  for (const [id, expected] of BRANCH_DURATIONS) {
    const oldLeafId = manager.getLeafId();
    manager.branch(id);
    // oxlint-disable-next-line no-await-in-loop -- Drive the shared fixture and observe each result before the next step.
    await sdk.runner.emit({ newLeafId: id, oldLeafId, type: "session_tree" });
    assert.equal(lastStatus(sdk), expected);
  }
}

test("restores selected-branch duration from completion times without backfilling footers", async (context) => {
  const manager = SessionManager.inMemory(undefined, undefined, [...BRANCHED_ENTRIES]);
  const sdk = await startTimer(context, manager);

  await sdk.runner.emit({ reason: "resume", type: "session_start" });
  assert.equal(lastStatus(sdk), "⏱ 2d 3h 04m 09s");

  await assertBranchDurations(manager, sdk);
  assert.ok(!manager.getEntries().some((entry) => entry.type === "custom"));
  manager.resetLeaf();
  await sdk.runner.emit({ reason: "new", type: "session_start" });
  assert.equal(lastStatus(sdk), undefined);
});

test("user submissions and produced tool results advance duration, including idle gaps", async (context) => {
  const sdk = await startTimer(context, SessionManager.inMemory());

  await sdk.runner.emit({ reason: "startup", type: "session_start" });
  await sdk.runner.emit({ message: firstUser.message, type: "message_start" });
  assert.equal(lastStatus(sdk), "⏱ 0s");
  await sdk.runner.emit({ message: CONTINUE_MESSAGE, type: "message_start" });
  assert.equal(lastStatus(sdk), "⏱ 2h 0m 00s");
  await sdk.runner.emitMessageEnd({ message: TOOL_RESULT_MESSAGE, type: "message_end" });
  assert.equal(lastStatus(sdk), "⏱ 2h 0m 08s");
  await sdk.runner.emit({ reason: "reload", type: "session_shutdown" });
  assert.equal(lastStatus(sdk), undefined);
});

for (const mode of ["rpc", "json", "print"] as const) {
  test(`does not set terminal status in ${mode} mode`, async (context) => {
    const manager = SessionManager.inMemory(undefined, undefined, [firstUser]);
    const sdk = await startTimer(context, manager, mode);

    await sdk.runner.emit({ reason: "resume", type: "session_start" });
    await sdk.runner.emit({ message: firstUser.message, type: "message_start" });
    await sdk.runner.emit({ reason: "quit", type: "session_shutdown" });
    assert.deepEqual(sdk.ui.statuses(STATUS_KEY), []);
  });
}

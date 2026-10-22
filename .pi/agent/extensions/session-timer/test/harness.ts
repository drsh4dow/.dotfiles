import { SdkSession, type SdkSessionOptions } from "../../test/sdk-session.ts";
import type { SessionManager, SessionMessageEntry } from "@earendil-works/pi-coding-agent";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { fauxProvider } from "@earendil-works/pi-ai";
import sessionTimer from "../index.ts";

export const STATUS_KEY = "session-timer";

export const firstUser = {
  id: "first-user",
  message: { content: "Start", role: "user", timestamp: 1000 },
  // oxlint-disable-next-line unicorn/no-null -- The SDK marks the root session entry with a null parent.
  parentId: null,
  timestamp: "1970-01-01T00:00:01.000Z",
  type: "message",
} satisfies SessionMessageEntry;

export async function startTimer(
  context: TestContext,
  sessionManager: SessionManager,
  mode: SdkSessionOptions["mode"] = "tui",
): Promise<SdkSession> {
  const sdk = await SdkSession.create({
    extensions: [sessionTimer],
    mode,
    providers: [fauxProvider()],
    sessionManager,
  });

  context.after(() => {
    assert.deepEqual(sdk.errors, []);
    sdk.dispose();
  });

  return sdk;
}

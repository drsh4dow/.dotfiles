import {
  type AssistantMessage,
  type FauxProviderHandle,
  Type,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxThinking,
  fauxToolCall,
} from "@earendil-works/pi-ai";
import {
  type CustomEntry,
  type ExtensionAPI,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { STATUS_KEY, firstUser, startTimer } from "./harness.ts";
import test, { type TestContext } from "node:test";
import { SdkSession } from "../../test/sdk-session.ts";
import assert from "node:assert/strict";
import sessionTimer from "../index.ts";
import { stripSgr } from "../../test/sgr.ts";

const { mkdtempSync, rmSync } = process.getBuiltinModule("node:fs");

const { tmpdir } = process.getBuiltinModule("node:os");

const { join } = process.getBuiltinModule("node:path");

const MOMENT_ENTRY = "session-timer-moment";

const RENDER_WIDTH = 80;

const SAMPLE_ELAPSED_MS = 133_000;

const PROBE_TURN = [
  fauxAssistantMessage(
    [fauxText("Checking"), fauxToolCall("probe", {}), fauxToolCall("probe", {})],
    { stopReason: "toolUse", timestamp: 2000 },
  ),
  fauxAssistantMessage(fauxToolCall("probe", {}), { stopReason: "toolUse", timestamp: 3000 }),
  fauxAssistantMessage("Done", { timestamp: 4000 }),
];

const PROBE_TURN_TEXT_RESPONSES = PROBE_TURN.filter((message) =>
  message.content.some((part) => part.type === "text" && part.text.trim() !== ""),
).length;

const SECOND_TURN_ROLES = [
  "user",
  "user",
  "assistant",
  "toolResult",
  "toolResult",
  "assistant",
  "toolResult",
  "assistant",
  "user",
];

function probeExtension(pi: ExtensionAPI): void {
  pi.registerTool({
    description: "Return a tool result",
    execute: async () => ({ content: [{ text: "tool output", type: "text" }], details: {} }),
    label: "Probe",
    name: "probe",
    parameters: Type.Object({}),
  });
}

function lastStatus(sdk: SdkSession): string {
  return stripSgr(sdk.ui.statuses(STATUS_KEY).at(-1) ?? "");
}

class RealSession {
  readonly #manager: SessionManager;

  readonly #provider: FauxProviderHandle;

  readonly #sdk: SdkSession;

  private constructor(manager: SessionManager, provider: FauxProviderHandle, sdk: SdkSession) {
    this.#manager = manager;
    this.#provider = provider;
    this.#sdk = sdk;
  }

  public static async create(context: TestContext): Promise<RealSession> {
    const directory = mkdtempSync(join(tmpdir(), "pi-session-timer-"));
    const manager = SessionManager.create(directory, directory);
    const provider = fauxProvider();

    context.after(() => {
      rmSync(directory, { force: true, recursive: true });
    });
    manager.appendMessage(firstUser.message);

    const sdk = await SdkSession.create({
      directory,
      extensions: [sessionTimer, probeExtension],
      providers: [provider],
      sessionManager: manager,
    });

    context.after(() => {
      assert.deepEqual(sdk.errors, []);
      sdk.dispose();
    });
    sdk.session.setActiveToolsByName(["probe"]);

    return new RealSession(manager, provider, sdk);
  }

  public async assertTextResponsesGetFooters(): Promise<CustomEntry[]> {
    this.#provider.setResponses(PROBE_TURN);
    await this.#sdk.session.prompt("Continue");
    assert.equal(this.#sdk.session.getLastAssistantText(), "Done");
    assert.match(lastStatus(this.#sdk), /^⏱ \d+d /u);

    const moments = this.#manager.getBranch().filter((entry) => entry.type === "custom");

    assert.equal(moments.length, PROBE_TURN_TEXT_RESPONSES);

    for (const moment of moments) {
      this.#assertMoment(moment);
    }

    return moments;
  }

  public async assertFootersStayDisplayOnly(): Promise<void> {
    this.#provider.setResponses([
      (context): AssistantMessage => {
        assert.deepEqual(
          context.messages.map((message) => message.role),
          SECOND_TURN_ROLES,
        );
        assert.doesNotMatch(JSON.stringify(context.messages), /⏱|session-timer-moment/u);

        return fauxAssistantMessage([fauxThinking("No visible text"), fauxText("  ")]);
      },
    ]);
    await this.#sdk.session.prompt("Think only");
  }

  public async assertReloadRestoresFooters(
    context: TestContext,
    moments: readonly Readonly<CustomEntry>[],
  ): Promise<void> {
    const file = this.#manager.getSessionFile();

    assert.ok(file !== undefined);

    const reopened = SessionManager.open(file, this.#manager.getCwd());

    const customEntries = (): CustomEntry[] =>
      reopened.getEntries().filter((entry) => entry.type === "custom");

    assert.deepEqual(customEntries(), moments);

    const reloaded = await startTimer(context, reopened);

    await reloaded.runner.emit({ reason: "reload", type: "session_start" });
    assert.match(lastStatus(reloaded), /^⏱ /u);
    assert.deepEqual(customEntries(), moments);
  }

  #assertMoment(moment: Readonly<CustomEntry>): void {
    assert.equal(moment.customType, MOMENT_ENTRY);
    assert.ok(moment.parentId !== null);

    const response = this.#manager.getEntry(moment.parentId);

    assert.equal(response?.type, "message");
    assert.equal(response.message.role, "assistant");
    assert.equal(moment.data, Date.parse(response.timestamp) - firstUser.message.timestamp);
    this.#assertMomentRenders(moment);
  }

  #assertMomentRenders(moment: Readonly<CustomEntry>): void {
    const renderer = this.#sdk.runner.getEntryRenderer(moment.customType);
    const { theme } = this.#sdk.ui;

    assert.ok(renderer);

    const sample = renderer({ ...moment, data: SAMPLE_ELAPSED_MS }, { expanded: false }, theme);

    assert.equal(stripSgr(sample?.render(RENDER_WIDTH).join("\n") ?? "").trim(), "⏱ 2m 13s");
    assert.equal(renderer({ ...moment, data: "invalid" }, { expanded: false }, theme), undefined);
  }
}

test("real turns persist one display-only footer after each text response and restore it on reload", async (context) => {
  const realSession = await RealSession.create(context);
  const moments = await realSession.assertTextResponsesGetFooters();

  await realSession.assertFootersStayDisplayOnly();
  await realSession.assertReloadRestoresFooters(context, moments);
});

import type { Api, Model } from "@earendil-works/pi-ai";
import test, { type TestContext } from "node:test";
import type { Notice } from "../../test/recording-ui.ts";
import { SUBAGENT_SESSION_PREFIX } from "../config.ts";
import { SdkSession } from "../../test/sdk-session.ts";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import assert from "node:assert/strict";
import { config } from "./fixtures.ts";
import extension from "../index.ts";
import { fauxProvider } from "@earendil-works/pi-ai";

const { mkdtempSync, readFileSync, rmSync, writeFileSync } = process.getBuiltinModule("node:fs");

const { tmpdir } = process.getBuiltinModule("node:os");

const { join } = process.getBuiltinModule("node:path");

type HarnessOptions = Readonly<{
  enabled?: boolean;
  initialModel: Model<Api>;
  sessionName?: string;
}>;

const openai = fauxProvider({ models: [{ id: "gpt-6.1-sol" }], provider: "openai" });

const opencode = fauxProvider({ models: [{ id: "glm-5.3-flash" }], provider: "opencode-go" });

const FAST_MODEL = openai.getModel();

const UNLISTED_MODEL = opencode.getModel();

const PAYLOAD = { input: "hello", model: FAST_MODEL.id };

const FAST_PAYLOAD = { ...PAYLOAD, service_tier: "fast" };

const INDICATOR_TEXT = "\u26A1\uFE0E Fast";

const LOCK_FAILURE = /^Could not save Fast mode setting: could not lock .*settings\.json: /u;

const ENABLED_NOTICE: Notice = ["Fast mode enabled (service_tier: fast).", "info"];

const DISABLED_NOTICE: Notice = ["Fast mode disabled.", "info"];

const SUBAGENT_NOTICE: Notice = [
  "Fast mode enabled, but the fastMode setting disables openai in subagent sessions.",
  "warning",
];

const UNLISTED_NOTICE: Notice = [
  "Fast mode enabled, but opencode-go/glm-5.3-flash is not listed in the fastMode setting.",
  "warning",
];

const STARTUP_INDICATORS: readonly string[] = ["hidden"];

const ENABLE_INDICATORS: readonly string[] = ["shown"];

const ENABLED_STARTUP_INDICATORS: readonly string[] = ["shown"];

const MODEL_SWITCH_INDICATORS: readonly string[] = ["hidden", "shown"];

const SUBAGENT_TOGGLE_INDICATORS: readonly string[] = ["hidden", "hidden"];

const UNLISTED_TOGGLE_INDICATORS: readonly string[] = ["hidden"];

class FastModeHarness {
  readonly #sdk: SdkSession;

  private constructor(sdk: SdkSession) {
    this.#sdk = sdk;
  }

  public get notices(): readonly Notice[] {
    return this.#sdk.ui.notices;
  }

  public get indicators(): string[] {
    const shown = this.#sdk.ui.theme.fg("dim", INDICATOR_TEXT);

    return this.#sdk.ui.statuses("speed").map((status): string => {
      if (status === undefined) {
        return "hidden";
      }

      return status === shown ? "shown" : status;
    });
  }

  public static async start(
    context: TestContext,
    { enabled, initialModel, sessionName }: HarnessOptions,
  ): Promise<FastModeHarness> {
    const root = mkdtempSync(join(tmpdir(), "pi-fast-mode-"));
    const sessionManager = SessionManager.inMemory(root);

    context.after(() => {
      rmSync(root, { force: true, recursive: true });
    });
    writeFileSync(
      join(root, "settings.json"),
      JSON.stringify({ fastMode: { ...config, enabled }, theme: "x" }),
    );

    if (sessionName !== undefined) {
      sessionManager.appendSessionInfo(sessionName);
    }

    const sdk = await SdkSession.create({
      directory: root,
      extensions: [async (pi): Promise<void> => extension(pi, root)],
      providers: initialModel === FAST_MODEL ? [openai, opencode] : [opencode, openai],
      sessionManager,
    });

    context.after(() => {
      assert.deepEqual(sdk.errors, []);
      sdk.dispose();
    });

    return new FastModeHarness(sdk);
  }

  public assertPersisted(enabled: boolean): void {
    const text = readFileSync(join(this.#sdk.directory, "settings.json"), "utf8");

    assert.deepEqual(JSON.parse(text), { fastMode: { ...config, enabled }, theme: "x" });
  }

  public removeAgentDir(): void {
    rmSync(this.#sdk.directory, { recursive: true });
  }

  public async toggle(): Promise<void> {
    const command = this.#sdk.runner.getCommand("fast");

    assert.ok(command, "the extension did not register /fast");
    await command.handler("", this.#sdk.runner.createCommandContext());
  }

  public async selectModel(model: Model<Api>): Promise<void> {
    await this.#sdk.session.setModel(model);
  }

  public async assertRequestUntouched(): Promise<void> {
    assert.equal(await this.#sdk.runner.emitBeforeProviderRequest(PAYLOAD), PAYLOAD);
  }

  public async assertRequest(expected: Readonly<Record<string, string>>): Promise<void> {
    assert.deepEqual(await this.#sdk.runner.emitBeforeProviderRequest(PAYLOAD), expected);
  }
}

test("/fast persists the setting, tags fast-model requests, and shows the indicator", async (context) => {
  const harness = await FastModeHarness.start(context, { initialModel: FAST_MODEL });

  await harness.assertRequestUntouched();
  await harness.toggle();
  await harness.assertRequest(FAST_PAYLOAD);
  harness.assertPersisted(true);
  assert.deepEqual(harness.notices, [ENABLED_NOTICE]);
  assert.deepEqual(harness.indicators, [...STARTUP_INDICATORS, ...ENABLE_INDICATORS]);
});

test("a persisted setting applies at startup and the indicator follows model switches", async (context) => {
  const harness = await FastModeHarness.start(context, { enabled: true, initialModel: FAST_MODEL });

  await harness.assertRequest(FAST_PAYLOAD);
  await harness.selectModel(UNLISTED_MODEL);
  await harness.selectModel(FAST_MODEL);
  assert.deepEqual(harness.notices, []);
  assert.deepEqual(harness.indicators, [...ENABLED_STARTUP_INDICATORS, ...MODEL_SWITCH_INDICATORS]);
});

test("/fast leaves subagent requests alone for providers that disable subagents", async (context) => {
  const harness = await FastModeHarness.start(context, {
    initialModel: FAST_MODEL,
    sessionName: `${SUBAGENT_SESSION_PREFIX} review the diff`,
  });

  await harness.toggle();
  await harness.assertRequestUntouched();
  await harness.toggle();
  assert.deepEqual(harness.notices, [SUBAGENT_NOTICE, DISABLED_NOTICE]);
  assert.deepEqual(harness.indicators, [...STARTUP_INDICATORS, ...SUBAGENT_TOGGLE_INDICATORS]);
});

test("/fast warns when the current model is not listed", async (context) => {
  const harness = await FastModeHarness.start(context, { initialModel: UNLISTED_MODEL });

  await harness.toggle();
  await harness.assertRequestUntouched();
  assert.deepEqual(harness.notices, [UNLISTED_NOTICE]);
  assert.deepEqual(harness.indicators, [...STARTUP_INDICATORS, ...UNLISTED_TOGGLE_INDICATORS]);
});

test("overlapping /fast toggles apply in order", async (context) => {
  const harness = await FastModeHarness.start(context, { initialModel: FAST_MODEL });

  await Promise.all([harness.toggle(), harness.toggle()]);
  harness.assertPersisted(false);
  assert.deepEqual(harness.notices, [ENABLED_NOTICE, DISABLED_NOTICE]);
  await harness.assertRequestUntouched();
});

test("/fast reports a settings lock failure", async (context) => {
  const harness = await FastModeHarness.start(context, { initialModel: FAST_MODEL });

  harness.removeAgentDir();
  await harness.toggle();

  const [failure] = harness.notices;

  assert.equal(failure?.[1], "error");
  assert.match(failure[0], LOCK_FAILURE);
});

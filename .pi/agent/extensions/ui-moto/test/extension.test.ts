import { type Component, visibleWidth } from "@earendil-works/pi-tui";
import { type FauxProviderHandle, fauxProvider } from "@earendil-works/pi-ai";
import test, { type TestContext } from "node:test";
import { CountingTui } from "../../test/counting-tui.ts";
import { SdkSession } from "../../test/sdk-session.ts";
import assert from "node:assert/strict";
import { stripSgr } from "../../test/sgr.ts";
import uiMoto from "../index.ts";

const WIDTH = 60;

const MAX_WIDTH = 80;

const BAR_SIDES = 2;

const OTHER_MODEL_IDS = ["model-two", "model-three"];

function expectedHeader(modelId: string): string[] {
  const project = process.cwd().split("/").at(-1);

  assert.ok(project !== undefined && project !== "");

  const label = ` PI / ${modelId} / ${project} `;
  const fill = WIDTH - label.length;

  return [
    "",
    `${"─".repeat(Math.floor(fill / BAR_SIDES))}${label}${"─".repeat(Math.ceil(fill / BAR_SIDES))}`,
    "",
  ];
}

class HeaderHarness {
  readonly #sdk: SdkSession;

  readonly #provider: FauxProviderHandle;

  readonly #tui = new CountingTui();

  private constructor(sdk: SdkSession, provider: FauxProviderHandle) {
    this.#sdk = sdk;
    this.#provider = provider;
  }

  public get installed(): boolean {
    return this.#sdk.ui.header !== undefined;
  }

  public get renders(): number {
    return this.#tui.renders;
  }

  public static async start(context: TestContext, modelId: string): Promise<HeaderHarness> {
    const provider = fauxProvider({
      models: [modelId, ...OTHER_MODEL_IDS].map((id) => ({ id })),
    });

    const sdk = await SdkSession.create({ extensions: [uiMoto], providers: [provider] });

    context.after(() => {
      assert.deepEqual(sdk.errors, []);
      sdk.dispose();
    });

    return new HeaderHarness(sdk, provider);
  }

  public header(): Component {
    const factory = this.#sdk.ui.header;

    assert.ok(factory, "the extension did not install a header");

    return factory(this.#tui, this.#sdk.ui.theme);
  }

  public async shutdown(): Promise<void> {
    await this.#sdk.runner.emit({ reason: "quit", type: "session_shutdown" });
  }

  public async selectModel(modelId: string): Promise<void> {
    const model = this.#provider.getModel(modelId);

    assert.ok(model, `no faux model ${modelId}`);
    await this.#sdk.session.setModel(model);
  }
}

test("installs the session header for the current model", async (context) => {
  const harness = await HeaderHarness.start(context, "model-one");

  assert.ok(harness.installed);
  assert.deepEqual(
    harness
      .header()
      .render(WIDTH)
      .map((line) => stripSgr(line)),
    expectedHeader("model-one"),
  );
});

test("updates the header on model changes and removes it on shutdown", async (context) => {
  const harness = await HeaderHarness.start(context, "model-one");
  const component = harness.header();

  await harness.selectModel("model-two");
  assert.equal(harness.renders, 1);
  assert.match(stripSgr(component.render(WIDTH)[1] ?? ""), / PI \/ model-two \//u);
  await harness.shutdown();
  assert.equal(harness.installed, false);
  await harness.selectModel("model-three");
  assert.equal(harness.renders, 1);
});

test("header preserves graphemes within terminal column limits", async (context) => {
  const harness = await HeaderHarness.start(context, "项目👩‍💻é");
  const header = harness.header();

  for (let width = 0; width <= MAX_WIDTH; width += 1) {
    for (const line of header.render(width)) {
      assert.ok(visibleWidth(line) <= width, `width ${width}: ${stripSgr(line)}`);
    }
  }

  const widest = header.render(MAX_WIDTH)[1] ?? "";

  assert.match(widest, /👩‍💻/u);
  assert.match(widest, /é/u);
});

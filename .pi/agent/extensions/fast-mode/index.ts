import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import { Effect, Semaphore } from "effect";
import {
  type ExtensionAPI,
  type ExtensionContext,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
import {
  type FastModeConfig,
  type PiModel,
  type RequestFields,
  SETTINGS_FIELD,
  describeRequestFields,
  fastRequestFields,
  listingProvider,
  readConfig,
  withFastRequest,
} from "./config.ts";
import { loadEnabled, loadShortcuts, saveEnabled } from "./settings.ts";

type FastModeView = Readonly<{
  config: FastModeConfig | undefined;
  enabled: boolean;
  sessionName: string | undefined;
}>;

function enabledNotice(model: PiModel | undefined, { config, sessionName }: FastModeView): string {
  const fields = fastRequestFields(config, model, sessionName);

  if (fields) {
    return `Fast mode enabled (${describeRequestFields(fields)}).`;
  }

  if (model && listingProvider(config, model)) {
    return `Fast mode enabled, but the ${SETTINGS_FIELD} setting disables ${model.provider} in subagent sessions.`;
  }

  return `Fast mode enabled, but ${model ? `${model.provider}/${model.id}` : "unknown model"} is not listed in the ${SETTINGS_FIELD} setting.`;
}

function announceState(ctx: ExtensionContext, view: FastModeView): void {
  if (!view.enabled) {
    ctx.ui.notify("Fast mode disabled.", "info");

    return;
  }

  const { model } = ctx;

  ctx.ui.notify(
    enabledNotice(model, view),
    fastRequestFields(view.config, model, view.sessionName) ? "info" : "warning",
  );
}

function showIndicator(ctx: ExtensionContext, view: FastModeView): void {
  if (ctx.mode !== "tui") {
    return;
  }

  const active =
    view.enabled && fastRequestFields(view.config, ctx.model, view.sessionName) !== undefined;

  // The footer orders extension statuses by key; "speed" sorts after "session-timer",
  // so the indicator follows the session time.
  // U+FE0E asks for the text glyph: U+26A1 otherwise renders as a color emoji that ignores dim.
  ctx.ui.setStatus("speed", active ? ctx.ui.theme.fg("dim", "\u26A1\uFE0E Fast") : undefined);
}

class FastMode {
  readonly #pi: ExtensionAPI;

  readonly #agentDir: string;

  // Pi runs shortcut handlers without waiting for earlier ones, so each toggle reads the
  // state, saves its inverse, and commits it before the next toggle starts.
  readonly #enabledTransitions = Semaphore.makeUnsafe(1);

  #enabled = false;

  public constructor(pi: ExtensionAPI, agentDir: string) {
    this.#pi = pi;
    this.#agentDir = agentDir;
  }

  public async start(ctx: ExtensionContext): Promise<void> {
    await Effect.runPromise(
      loadEnabled(this.#agentDir).pipe(
        Effect.tap((enabled) =>
          Effect.sync(() => {
            this.#enabled = enabled;
          }),
        ),
        (load) => this.#enabledTransitions.withPermit(load),
        Effect.provide(BunFileSystem.layer),
      ),
    );
    this.refresh(ctx, this.#pi.getSessionName());
  }

  public refresh(ctx: ExtensionContext, sessionName: string | undefined): void {
    showIndicator(ctx, this.#view(sessionName));
  }

  public request<Payload>(
    model: PiModel | undefined,
    payload: Payload,
  ): Payload | RequestFields | undefined {
    return this.#enabled
      ? withFastRequest(
          { config: this.#config(), model, sessionName: this.#pi.getSessionName() },
          payload,
        )
      : undefined;
  }

  public async toggle(ctx: ExtensionContext): Promise<void> {
    return Effect.runPromise(
      Effect.suspend(() => this.#saveToggle(ctx)).pipe(
        (transition) => this.#enabledTransitions.withPermit(transition),
        Effect.catchTag("SettingsSaveError", (error) =>
          Effect.sync(() => {
            ctx.ui.notify(`Could not save Fast mode setting: ${error.message}`, "error");
          }),
        ),
        Effect.provide(BunFileSystem.layer),
      ),
    );
  }

  public async registerShortcuts(): Promise<void> {
    const shortcuts = await Effect.runPromise(
      loadShortcuts(this.#agentDir).pipe(Effect.provide(BunFileSystem.layer)),
    );

    for (const shortcut of shortcuts) {
      this.#pi.registerShortcut(shortcut, {
        description: "Toggle Fast mode",
        handler: async (ctx) => this.toggle(ctx),
      });
    }
  }

  #config(): FastModeConfig | undefined {
    return readConfig(this.#pi.getSettings());
  }

  #view(sessionName: string | undefined): FastModeView {
    return { config: this.#config(), enabled: this.#enabled, sessionName };
  }

  #saveToggle(ctx: ExtensionContext): ReturnType<typeof saveEnabled> {
    const nextEnabled = !this.#enabled;

    return saveEnabled(this.#agentDir, nextEnabled).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          this.#enabled = nextEnabled;
          const view = this.#view(this.#pi.getSessionName());
          announceState(ctx, view);
          showIndicator(ctx, view);
        }),
      ),
    );
  }
}

export default async function fastModeExtension(
  pi: ExtensionAPI,
  agentDir = getAgentDir(),
): Promise<void> {
  const fastMode = new FastMode(pi, agentDir);

  pi.registerCommand("fast", {
    description: "Toggle Fast mode",
    handler: async (_args, ctx) => fastMode.toggle(ctx),
  });

  // Pi records `--name` before extensions start, so subagent sessions are named by now.
  pi.on("session_start", async (_event, ctx) => fastMode.start(ctx));
  // Pi updates ctx.model before emitting model_select.
  pi.on("model_select", (_event, ctx) => {
    fastMode.refresh(ctx, pi.getSessionName());
  });
  pi.on("session_info_changed", (event, ctx) => {
    fastMode.refresh(ctx, event.name);
  });
  pi.on("before_provider_request", (event, ctx) => fastMode.request(ctx.model, event.payload));

  return fastMode.registerShortcuts();
}

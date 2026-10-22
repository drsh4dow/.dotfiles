import {
  type AgentSession,
  DefaultResourceLoader,
  type ExtensionContext,
  type ExtensionFactory,
  type ExtensionRunner,
  SessionManager,
  SettingsManager,
  createAgentSession,
  initTheme,
} from "@earendil-works/pi-coding-agent";
import type { FauxProviderHandle } from "@earendil-works/pi-ai";
import { RecordingUI } from "./recording-ui.ts";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";

const { mkdtempSync, rmSync } = process.getBuiltinModule("node:fs");

const { join } = process.getBuiltinModule("node:path");

export interface SdkSessionOptions {
  readonly extensions: readonly ExtensionFactory[];
  readonly providers: readonly [FauxProviderHandle, ...FauxProviderHandle[]];
  readonly directory?: string;
  readonly mode?: ExtensionContext["mode"];
  readonly sessionManager?: SessionManager;
}

async function loadExtensions(
  directory: string,
  settingsManager: SettingsManager,
  extensions: readonly ExtensionFactory[],
): Promise<DefaultResourceLoader> {
  const loader = new DefaultResourceLoader({
    agentDir: directory,
    cwd: directory,
    extensionFactories: [...extensions],
    noContextFiles: true,
    noPromptTemplates: true,
    noSkills: true,
    noThemes: true,
    settingsManager,
  });

  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);

  return loader;
}

export class SdkSession {
  public readonly directory: string;

  public readonly errors: string[] = [];

  readonly #ownsDirectory: boolean;

  #session: AgentSession | undefined;

  #ui: RecordingUI | undefined;

  private constructor(directory: string | undefined) {
    this.#ownsDirectory = directory === undefined;
    this.directory = directory ?? mkdtempSync(join(tmpdir(), "pi-sdk-session-"));
  }

  public get session(): AgentSession {
    assert.ok(this.#session, "the agent session has not been created");

    return this.#session;
  }

  public get runner(): ExtensionRunner {
    return this.session.extensionRunner;
  }

  public get ui(): RecordingUI {
    assert.ok(this.#ui, "the agent session has not been bound to a UI");

    return this.#ui;
  }

  public static async create(options: SdkSessionOptions): Promise<SdkSession> {
    const sdkSession = new SdkSession(options.directory);

    try {
      await sdkSession.#start(options);
    } catch (error) {
      sdkSession.dispose();

      throw error;
    }

    return sdkSession;
  }

  public dispose(): void {
    this.#session?.dispose();

    if (this.#ownsDirectory) {
      rmSync(this.directory, { force: true, recursive: true });
    }
  }

  async #start(options: SdkSessionOptions): Promise<void> {
    const settingsManager = SettingsManager.create(this.directory, this.directory);

    const { session } = await createAgentSession({
      agentDir: this.directory,
      cwd: this.directory,
      model: options.providers[0].getModel(),
      resourceLoader: await loadExtensions(this.directory, settingsManager, options.extensions),
      sessionManager: options.sessionManager ?? SessionManager.inMemory(this.directory),
      settingsManager,
      thinkingLevel: "off",
    });

    this.#session = session;

    for (const provider of options.providers) {
      session.modelRuntime.registerNativeProvider(provider.provider);
    }

    initTheme("dark");
    this.#ui = new RecordingUI(session.extensionRunner.getUIContext().theme);
    await session.bindExtensions({
      mode: options.mode ?? "tui",
      onError: (error) => {
        this.errors.push(error.error);
      },
      uiContext: this.#ui,
    });
  }
}

import {
  type AgentSession,
  DefaultResourceLoader,
  type ExtensionAPI,
  type ExtensionFactory,
  SessionManager,
  SettingsManager,
  createAgentSession,
  createCodemodeExtension,
} from "@earendil-works/pi-coding-agent";
import {
  type AssistantMessage,
  Type,
  fauxAssistantMessage,
  fauxProvider,
  fauxToolCall,
  getCurrentSystemMessage,
  getCurrentSystemPrompt,
  getCurrentTools,
} from "@earendil-works/pi-ai";
import assert from "node:assert/strict";
import extension from "../index.ts";
import test from "node:test";
import { tmpdir } from "node:os";

const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = process.getBuiltinModule("fs");

const { join } = process.getBuiltinModule("path");

const INITIAL_SERVER_SUMMARY = "INITIAL MCP SUMMARY";

const UPDATED_SERVER_SUMMARY = "UPDATED MCP SUMMARY";

const PROBE_TOOLS: { name: string; promptSnippet?: string; promptGuidelines: string[] }[] = [
  {
    name: "probe_write",
    promptGuidelines: [" Keep edits focused ", "", "Keep edits focused", "Write safely"],
    promptSnippet: "Write an artifact",
  },
  {
    name: "read",
    promptGuidelines: ["Keep edits focused", "Inspect evidence"],
    promptSnippet: "Read an artifact",
  },
  { name: "no_snippet", promptGuidelines: ["Unlisted tool guidance"] },
];

const TOOL_SETS = [
  ["probe_write", "read", "no_snippet", "codemode"],
  ["probe_write", "read", "no_snippet", "codemode"],
  ["read"],
  [],
];

const POLICY_MARKERS = [
  "PROJECT CONTEXT POLICY",
  "APPENDED POLICY",
  "EARLIER EXTENSION POLICY",
  "GLOBAL TOOL POLICY",
];

const TOOL_MARKERS = [
  ["- probe_write: Write an artifact", "probe_write"],
  ["- read: Read an artifact", "read"],
  ["Write safely", "probe_write"],
  ["Keep edits focused", "read"],
  ["Inspect evidence", "read"],
  ["Unlisted tool guidance", "no_snippet"],
  ["Use codemode to batch", "codemode"],
  ["SAMPLE SKILL DESCRIPTION", "read"],
] as const;

function occurrences(text: string, marker: string): number {
  return text.split(marker).length - 1;
}

function probeTools(pi: ExtensionAPI): void {
  for (const tool of PROBE_TOOLS) {
    pi.registerTool({
      ...tool,
      description: tool.name,
      execute: async () => ({
        content: [{ text: "artifact contents", type: "text" }],
        details: {},
      }),
      label: tool.name,
      parameters: Type.Object({}),
    });
  }

  pi.on("before_agent_start", ({ systemPromptOptions: options }) => {
    options.sections.earlier_policy = "EARLIER EXTENSION POLICY";
    options.promptGuidelines.push("GLOBAL TOOL POLICY");
  });
}

function nativeMcpSectionStub(serverSummary: () => string): ExtensionFactory {
  return (pi): void => {
    pi.on("before_agent_start", ({ systemPromptOptions: options }) => {
      options.sections.mcp_servers = serverSummary();
    });
  };
}

function writeAgentFiles(agentDir: string, custom: boolean): void {
  mkdirSync(join(agentDir, "skills", "sample"), { recursive: true });
  writeFileSync(join(agentDir, "AGENTS.md"), "PROJECT CONTEXT POLICY");
  writeFileSync(join(agentDir, "APPEND_SYSTEM.md"), "APPENDED POLICY");
  writeFileSync(
    join(agentDir, "skills", "sample", "SKILL.md"),
    "---\nname: sample\ndescription: SAMPLE SKILL DESCRIPTION\n---\nInspect the sample.\n",
  );

  if (custom) {
    writeFileSync(join(agentDir, "SYSTEM.md"), "CUSTOM POLICY");
  }
}

class PromptSession {
  readonly #directory: string;

  readonly #custom: boolean;

  readonly #provider = fauxProvider();

  #serverSummary = INITIAL_SERVER_SUMMARY;

  #session: AgentSession | undefined;

  private constructor(directory: string, custom: boolean) {
    this.#directory = directory;
    this.#custom = custom;
  }

  get #agent(): AgentSession {
    assert.ok(this.#session, "the agent session has not been created");

    return this.#session;
  }

  public static async create(directory: string, custom: boolean): Promise<PromptSession> {
    const promptSession = new PromptSession(directory, custom);

    await promptSession.#start();

    return promptSession;
  }

  public dispose(): void {
    this.#session?.dispose();
  }

  public async assertToolSet(tools: readonly string[]): Promise<void> {
    this.#agent.setActiveToolsByName([...tools]);
    this.#provider.setResponses([
      (context): AssistantMessage => {
        const sections = getCurrentSystemMessage(context.messages)?.sections;

        assert.ok(sections, "prompt must remain structured");
        assert.equal(Boolean(sections.active_tool_context), this.#custom);
        assert.deepEqual(
          getCurrentTools(context.messages)
            .map((tool) => tool.name)
            .toSorted(),
          tools.toSorted(),
        );
        this.#assertPromptMarkers(getCurrentSystemPrompt(context.messages), tools);

        return fauxAssistantMessage("Verified response");
      },
    ]);
    await this.#agent.prompt("Inspect the artifact.");
    assert.equal(this.#agent.getLastAssistantText(), "Verified response");
    this.#serverSummary = UPDATED_SERVER_SUMMARY;
  }

  public async assertCodemodeRead(): Promise<void> {
    this.#agent.setActiveToolsByName(["read", "codemode"]);
    this.#provider.setResponses([
      fauxAssistantMessage(fauxToolCall("codemode", { code: "text(await tools.read({}));" })),
      (context): AssistantMessage => {
        const result = context.messages.at(-1);

        assert.equal(result?.role, "toolResult");
        assert.equal(result.toolName, "codemode");
        assert.equal(result.isError, false);
        assert.ok(
          result.content.some(
            (part) => part.type === "text" && part.text.includes("artifact contents"),
          ),
        );

        return fauxAssistantMessage("Codemode verified");
      },
    ]);
    await this.#agent.prompt("Read the artifact through codemode.");
    assert.equal(this.#agent.getLastAssistantText(), "Codemode verified");
  }

  #assertPromptMarkers(prompt: string, tools: readonly string[]): void {
    for (const marker of [...POLICY_MARKERS, this.#serverSummary]) {
      assert.equal(occurrences(prompt, marker), 1, marker);
    }

    for (const [marker, tool] of TOOL_MARKERS) {
      assert.equal(occurrences(prompt, marker), tools.includes(tool) ? 1 : 0, marker);
    }

    assert.ok(prompt.includes(this.#directory));

    if (this.#serverSummary !== INITIAL_SERVER_SUMMARY) {
      assert.ok(!prompt.includes(INITIAL_SERVER_SUMMARY));
    }
  }

  #extensionFactories(): ExtensionFactory[] {
    return [
      probeTools,
      extension,
      nativeMcpSectionStub(() => this.#serverSummary),
      createCodemodeExtension(),
    ];
  }

  async #start(): Promise<void> {
    const agentDir = join(this.#directory, "agent");

    const settingsManager = SettingsManager.inMemory({
      codemode: { mode: "on" },
      compaction: { enabled: false },
      defaultProjectTrust: "always",
      retry: { enabled: false },
    });

    const loader = new DefaultResourceLoader({
      agentDir,
      cwd: this.#directory,
      extensionFactories: this.#extensionFactories(),
      settingsManager,
    });

    writeAgentFiles(agentDir, this.#custom);
    await loader.reload();
    assert.deepEqual(loader.getExtensions().errors, []);

    const { session } = await createAgentSession({
      agentDir,
      cwd: this.#directory,
      model: this.#provider.getModel(),
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(this.#directory),
      settingsManager,
      thinkingLevel: "off",
    });

    this.#session = session;
    await session.bindExtensions({ mode: "print", onError: (error) => assert.fail(error.error) });
    session.modelRuntime.registerNativeProvider(this.#provider.provider);
  }
}

for (const custom of [true, false]) {
  test(`${custom ? "custom" : "stock"} prompt preserves sections, tracks tools, and supports codemode`, async (context) => {
    const directory = mkdtempSync(join(tmpdir(), "pi-prompt-context-"));

    context.after(() => {
      rmSync(directory, { force: true, recursive: true });
    });

    const promptSession = await PromptSession.create(directory, custom);

    context.after(() => {
      promptSession.dispose();
    });

    for (const tools of TOOL_SETS) {
      // oxlint-disable-next-line no-await-in-loop -- Drive the shared fixture and observe each result before the next step.
      await promptSession.assertToolSet(tools);
    }

    await promptSession.assertCodemodeRead();
  });
}

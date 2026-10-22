import type {
  BashOperations,
  BashToolOptions,
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Clock, Effect } from "effect";
import { SACRIFICE_COMMAND_PREFIX, sacrificeKillNote } from "../../lib/sacrifice.ts";
import {
  SettingsManager,
  createBashToolDefinition,
  createLocalBashOperations,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";

function bashOptions(ctx: ExtensionContext): BashToolOptions {
  const settings = SettingsManager.create(ctx.cwd, getAgentDir(), {
    projectTrusted: ctx.isProjectTrusted(),
  });

  const userPrefix = settings.getShellCommandPrefix();
  const shellPath = settings.getShellPath();

  return {
    commandPrefix:
      userPrefix === undefined || userPrefix === ""
        ? SACRIFICE_COMMAND_PREFIX
        : `${SACRIFICE_COMMAND_PREFIX}\n${userPrefix}`,
    ...(shellPath !== undefined && shellPath !== "" && { shellPath }),
  };
}

type ToolOutput = Readonly<Pick<Parameters<BashOperations["exec"]>[2], "onData">>;

function appendToToolOutput(output: ToolOutput, text: string): void {
  output.onData(Buffer.from(`\n${text}\n`));
}

function annotateKills(operations: BashOperations, startedAt: number): BashOperations {
  return {
    exec: async (command, cwd, execution) =>
      operations.exec(command, cwd, execution).then((result) => {
        const note = sacrificeKillNote(
          { exitCode: result.exitCode ?? undefined, signal: undefined },
          startedAt,
        );

        if (note !== undefined) {
          appendToToolOutput(execution, note);
        }

        return result;
      }),
  };
}

export default function sacrificePreference(pi: ExtensionAPI): void {
  if (process.platform !== "linux") {
    return;
  }

  pi.registerTool({
    ...createBashToolDefinition(process.cwd()),
    // oxlint-disable-next-line max-params -- The SDK fixes ToolDefinition.execute at five positional parameters.
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const startedAt = Effect.runSync(Clock.currentTimeMillis);
      const options = bashOptions(ctx);

      const tool = createBashToolDefinition(ctx.cwd, {
        ...options,
        operations: annotateKills(createLocalBashOperations(options), startedAt),
      });

      return tool.execute(toolCallId, params, signal, onUpdate, ctx);
    },
  });
}

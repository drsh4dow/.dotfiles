import { Clock, Effect } from "effect";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MS_PER_SECOND = 1000;

type UsageField = "cacheRead" | "cacheWrite" | "input" | "output" | "totalTokens";

type UsageTotals = Readonly<Record<UsageField, number>>;

function now(): number {
  return Effect.runSync(Clock.currentTimeMillis);
}

function totalUsage(usages: readonly UsageTotals[]): UsageTotals {
  const total = (field: UsageField): number =>
    usages.reduce((sum, usage) => sum + (usage[field] || 0), 0);

  return {
    cacheRead: total("cacheRead"),
    cacheWrite: total("cacheWrite"),
    input: total("input"),
    output: total("output"),
    totalTokens: total("totalTokens"),
  };
}

function formatReport(usage: UsageTotals, elapsedSeconds: number): string {
  const tokensPerSecond = usage.output / elapsedSeconds;

  return `TPS ${tokensPerSecond.toFixed(1)} tok/s. out ${usage.output.toLocaleString()}, in ${usage.input.toLocaleString()}, cache r/w ${usage.cacheRead.toLocaleString()}/${usage.cacheWrite.toLocaleString()}, total ${usage.totalTokens.toLocaleString()}, ${elapsedSeconds.toFixed(1)}s`;
}

export default function tpsTracker(pi: ExtensionAPI): void {
  let agentStartMs: number | undefined;

  pi.on("agent_start", () => {
    agentStartMs = now();
  });

  pi.on("agent_end", (event, ctx) => {
    const startedAt = agentStartMs;
    agentStartMs = undefined;

    if (!ctx.hasUI || startedAt === undefined) {
      return;
    }

    const elapsedMs = now() - startedAt;

    const usage = totalUsage(
      event.messages.flatMap((message) => (message.role === "assistant" ? [message.usage] : [])),
    );

    if (elapsedMs <= 0 || usage.output <= 0) {
      return;
    }

    ctx.ui.notify(formatReport(usage, elapsedMs / MS_PER_SECOND), "info");
  });
}

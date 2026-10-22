import type {
  ExtensionAPI,
  ExtensionContext,
  SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";
import { Schema } from "effect";
import { Text } from "@earendil-works/pi-tui";

const MOMENT_ENTRY = "session-timer-moment";

const MS_PER_SECOND = 1000;

const SECONDS_PER_MINUTE = 60;

const MINUTES_PER_HOUR = 60;

const HOURS_PER_DAY = 24;

const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

const CLOCK_DIGITS = 2;

const isElapsedMilliseconds = Schema.is(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)));

function padClock(value: number): string {
  return String(value).padStart(CLOCK_DIGITS, "0");
}

function formatClock(totalSeconds: number, padMinutes: boolean): string {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR;
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  if (padMinutes) {
    return `${hours}h ${padClock(minutes)}m ${padClock(seconds)}s`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${padClock(seconds)}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${padClock(seconds)}s`;
  }

  return `${seconds}s`;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.round(milliseconds / MS_PER_SECOND);
  const days = Math.floor(totalSeconds / SECONDS_PER_DAY);
  const clock = formatClock(totalSeconds % SECONDS_PER_DAY, days > 0);

  return days > 0 ? `${days}d ${clock}` : clock;
}

function messageTime(entry: SessionMessageEntry): number | undefined {
  switch (entry.message.role) {
    case "user":
    case "toolResult": {
      return entry.message.timestamp;
    }

    case "assistant": {
      // The message timestamp is generation start; the entry records completion.
      return Date.parse(entry.timestamp);
    }

    case "bashExecution":
    case "branchSummary":
    case "compactionSummary":
    case "custom":
    case "system": {
      return undefined;
    }

    default: {
      const unexpected: never = entry.message;

      throw new Error(`Unexpected session message: ${JSON.stringify(unexpected)}`);
    }
  }
}

function latestMessageEntry(ctx: ExtensionContext): SessionMessageEntry | undefined {
  let entry = ctx.sessionManager.getLeafEntry();

  while (entry && entry.type !== "message") {
    entry = entry.parentId === null ? undefined : ctx.sessionManager.getEntry(entry.parentId);
  }

  return entry;
}

function hasText({ message }: SessionMessageEntry): boolean {
  return (
    message.role === "assistant" &&
    message.content.some((block) => block.type === "text" && block.text.trim().length > 0)
  );
}

class SessionTimer {
  readonly #pi: ExtensionAPI;

  #origin: number | undefined;

  #pendingResponse = false;

  public constructor(pi: ExtensionAPI) {
    this.#pi = pi;
  }

  public reset(ctx: ExtensionContext): void {
    this.#origin = undefined;
    this.#pendingResponse = false;
    this.showDuration(ctx);
  }

  public restore(ctx: ExtensionContext): void {
    const messages = ctx.sessionManager
      .getBranch()
      .filter((entry): entry is SessionMessageEntry => entry.type === "message");

    const userTimes = messages.flatMap(({ message }) =>
      message.role === "user" ? [message.timestamp] : [],
    );

    const times = messages.flatMap((entry) => messageTime(entry) ?? []);

    [this.#origin] = userTimes;
    this.#pendingResponse = false;
    this.showDuration(ctx, times.at(-1));
  }

  public startUserMessage(ctx: ExtensionContext, timestamp: number): void {
    this.#origin ??= timestamp;
    this.showDuration(ctx, timestamp);
  }

  public endAssistantMessage(): void {
    this.#pendingResponse = true;
  }

  public showDuration(ctx: ExtensionContext, timestamp?: number): void {
    if (ctx.mode !== "tui") {
      return;
    }

    const elapsed = timestamp === undefined ? undefined : this.elapsedAt(timestamp);

    ctx.ui.setStatus(
      "session-timer",
      elapsed === undefined ? undefined : ctx.ui.theme.fg("dim", `⏱ ${formatDuration(elapsed)}`),
    );
  }

  public finishResponse(ctx: ExtensionContext): void {
    if (!this.#pendingResponse) {
      return;
    }

    this.#pendingResponse = false;

    // A message_end event precedes persistence. These hooks run after the assistant is
    // saved, before any tool results, so only extension metadata can follow it.
    const entry = latestMessageEntry(ctx);

    if (entry?.message.role !== "assistant") {
      return;
    }

    const timestamp = messageTime(entry);

    this.showDuration(ctx, timestamp);

    if (timestamp !== undefined && hasText(entry)) {
      this.recordMoment(timestamp);
    }
  }

  private recordMoment(timestamp: number): void {
    const elapsed = this.elapsedAt(timestamp);

    if (elapsed !== undefined) {
      this.#pi.appendEntry(MOMENT_ENTRY, elapsed);
    }
  }

  private elapsedAt(timestamp: number): number | undefined {
    if (this.#origin === undefined) {
      return undefined;
    }

    const elapsed = timestamp - this.#origin;

    return Number.isFinite(elapsed) ? Math.max(0, elapsed) : undefined;
  }
}

export default function sessionTimer(pi: ExtensionAPI): void {
  const timer = new SessionTimer(pi);

  pi.registerEntryRenderer(MOMENT_ENTRY, (entry, _options, theme) =>
    isElapsedMilliseconds(entry.data)
      ? new Text(theme.fg("dim", `⏱ ${formatDuration(entry.data)}`), 1, 0)
      : undefined,
  );

  pi.on("session_start", (_event, ctx) => {
    timer.restore(ctx);
  });
  pi.on("session_tree", (_event, ctx) => {
    timer.restore(ctx);
  });

  pi.on("message_start", ({ message }, ctx) => {
    if (message.role === "user") {
      timer.startUserMessage(ctx, message.timestamp);
    }
  });

  pi.on("message_end", ({ message }, ctx) => {
    if (message.role === "assistant") {
      timer.endAssistantMessage();
    }

    if (message.role === "toolResult") {
      timer.showDuration(ctx, message.timestamp);
    }
  });

  pi.on("tool_execution_start", (_event, ctx) => {
    timer.finishResponse(ctx);
  });
  pi.on("turn_end", (_event, ctx) => {
    timer.finishResponse(ctx);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    timer.reset(ctx);
  });
}

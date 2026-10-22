/** Drives the real `pi` binary in tmux so live-TTY failures reach tests. */
import * as BunChildProcessSpawner from "@effect/platform-bun/BunChildProcessSpawner";
import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import * as BunPath from "@effect/platform-bun/BunPath";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { Effect, FileSystem, Layer, Option, Path, type PlatformError, Schedule } from "effect";

const bunTestServices = BunChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
);

export const fs = Effect.runSync(FileSystem.FileSystem.pipe(Effect.provide(BunFileSystem.layer)));

export const pathService = Effect.runSync(Path.Path.pipe(Effect.provide(BunPath.layer)));

const spawner = Effect.runSync(
  ChildProcessSpawner.ChildProcessSpawner.pipe(Effect.provide(bunTestServices)),
);

const DEFAULT_TIMEOUT_MS = 120_000;

const POLL_INTERVAL_MS = 250;

const ENTER_AFTER_TYPING_DELAY_MS = 150;

export interface WaitOptions {
  readonly timeoutMs?: number;
  readonly scrollback?: boolean;
  readonly description?: string;
}

export interface PiSession {
  readonly name: string;
  readonly cwd: string;
  readonly agentDir: string;
  readonly stderrPath: string;
}

type PaneMatcher = RegExp | ((text: string) => boolean);

function pollUntilSome<A, E, R>(
  effect: Effect.Effect<Option.Option<A>, E, R>,
): Effect.Effect<A, E, R> {
  return effect.pipe(
    Effect.repeat({ schedule: Schedule.spaced(POLL_INTERVAL_MS), until: Option.isSome }),
    Effect.map(Option.getOrThrow),
  );
}

export function tmux(
  ...args: readonly string[]
): Effect.Effect<string, PlatformError.PlatformError> {
  return spawner.string(ChildProcess.make("tmux", args));
}

/** Tmux runs the pane command through a shell, so paths must be quoted. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function readStderr(session: PiSession): Effect.Effect<string> {
  return fs.readFileString(session.stderrPath).pipe(Effect.orElseSucceed(() => ""));
}

export function isDead(session: PiSession): Effect.Effect<boolean> {
  return tmux("list-panes", "-t", session.name, "-F", "#{pane_dead}").pipe(
    Effect.map((output) => output.trim() === "1"),
    Effect.orElseSucceed(() => true),
  );
}

export function capture(session: PiSession, scrollback = false): Effect.Effect<string> {
  return tmux(
    "capture-pane",
    "-p",
    "-J",
    "-t",
    session.name,
    ...(scrollback ? ["-S", "-"] : []),
  ).pipe(Effect.orElseSucceed(() => ""));
}

/** Polls until matched, failing early with diagnostics if pi exits. */
export const waitFor = Effect.fn("waitFor")(function* waitFor(
  session: PiSession,
  match: PaneMatcher,
  options: WaitOptions = {},
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const description = options.description ?? String(match);

  const poll = pollUntilSome(
    Effect.gen(function* poll() {
      const text = yield* capture(session, options.scrollback);

      if (match instanceof RegExp ? match.test(text) : match(text)) {
        return Option.some(text);
      }

      if (yield* isDead(session)) {
        return yield* Effect.die(
          new Error(
            `pi exited before ${description}\n` +
              `--- stderr ---\n${yield* readStderr(session)}\n--- pane ---\n${text}`,
          ),
        );
      }

      return Option.none<string>();
    }),
  );

  return yield* poll.pipe(
    Effect.timeoutOrElse({
      duration: timeoutMs,
      orElse: () =>
        Effect.gen(function* orElse() {
          return yield* Effect.die(
            new Error(
              `timed out after ${timeoutMs}ms waiting for ${description}\n` +
                `--- stderr ---\n${yield* readStderr(session)}\n` +
                `--- pane ---\n${yield* capture(session, options.scrollback)}`,
            ),
          );
        }),
    }),
  );
});

export const prompt = Effect.fn("prompt")(function* prompt(session: PiSession, text: string) {
  yield* tmux("send-keys", "-t", session.name, "-l", text);
  yield* Effect.sleep(ENTER_AFTER_TYPING_DELAY_MS);
  yield* tmux("send-keys", "-t", session.name, "Enter");
});

export function sendKeys(
  session: PiSession,
  ...keys: readonly string[]
): Effect.Effect<void, PlatformError.PlatformError> {
  return tmux("send-keys", "-t", session.name, ...keys).pipe(Effect.asVoid);
}

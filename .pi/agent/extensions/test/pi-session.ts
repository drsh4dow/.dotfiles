import {
  type Cause,
  Config,
  Effect,
  Exit,
  Option,
  type PlatformError,
  type Schema,
  Scope,
} from "effect";
import { type PiSession, fs, pathService, shellQuote, tmux, waitFor } from "./tmux.ts";
import test, { after, before } from "node:test";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

const { execFileSync } = process.getBuiltinModule("child_process");

const REPOSITORY_AGENT_DIR = Effect.runSync(
  pathService.fromFileUrl(new URL("../..", import.meta.url)),
);

const EXTENSIONS_DIR = pathService.join(REPOSITORY_AGENT_DIR, "extensions");

const USER_AGENT_FILES = ["settings.json", "auth.json", "keybindings.json", "models.json"];

const STARTUP_TIMEOUT_MS = 60_000;

const STARTUP_FOOTER = /\$?\s*\d+(?:\.\d+)?%\/\d/u;

const e2eEnabled = Effect.runSync(Config.option(Config.NonEmptyString("PI_E2E"))).pipe(
  Option.exists((value) => value === "1"),
);

type TestEffectError =
  | Cause.TimeoutError
  | Config.ConfigError
  | PlatformError.PlatformError
  | Schema.SchemaError;

let sessionCounter = 0;

export function testEffect(
  name: string,
  body: () => Generator<Effect.Effect<unknown, TestEffectError>, void, never>,
): void {
  test(name, async () => Effect.runPromise(Effect.gen(body)));
}

const copyUserAgentFiles = Effect.fn("copyUserAgentFiles")(function* copyUserAgentFiles(
  agentDir: string,
) {
  const sourceAgentDir = getAgentDir();

  for (const name of USER_AGENT_FILES) {
    const source = pathService.join(sourceAgentDir, name);

    if (yield* fs.exists(source)) {
      yield* fs.copyFile(source, pathService.join(agentDir, name));
    }
  }

  yield* fs.copy(
    pathService.join(REPOSITORY_AGENT_DIR, "themes"),
    pathService.join(agentDir, "themes"),
  );
});

const makePiRoot = Effect.fn("makePiRoot")(function* makePiRoot() {
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "pi-e2e-" });
  const cwd = pathService.join(root, "workspace");
  const agentDir = pathService.join(root, "agent");
  const sessionDir = pathService.join(root, "sessions");

  yield* fs.makeDirectory(cwd, { recursive: true });
  yield* fs.makeDirectory(agentDir, { mode: 0o700, recursive: true });
  yield* fs.makeDirectory(sessionDir, { recursive: true });
  yield* copyUserAgentFiles(agentDir);

  return { agentDir, cwd, root, sessionDir };
});

export function repositoryExtension(name: string): string {
  return pathService.join(EXTENSIONS_DIR, name, "index.ts");
}

const extensionEntryPoint = Effect.fn("extensionEntryPoint")(function* extensionEntryPoint(
  entryPath: string,
) {
  const info = yield* fs.stat(entryPath);
  const indexPath = pathService.join(entryPath, "index.ts");

  if (info.type === "File" && entryPath.endsWith(".ts")) {
    return [entryPath];
  }

  if (info.type === "Directory" && (yield* fs.exists(indexPath))) {
    return [indexPath];
  }

  return [];
});

const extensionArgs = Effect.fn("extensionArgs")(function* extensionArgs() {
  const entries = yield* fs.readDirectory(EXTENSIONS_DIR);

  const entryPoints = yield* Effect.all(
    entries.map((entry) => extensionEntryPoint(pathService.join(EXTENSIONS_DIR, entry))),
  );

  return entryPoints.flat().flatMap((entryPoint) => ["--extension", entryPoint]);
});

function keepPaneAfterExit(session: PiSession): Effect.Effect<string, PlatformError.PlatformError> {
  return tmux("set-option", "-t", session.name, "remain-on-exit", "on");
}

const launchPi = Effect.fn("launchPi")(function* launchPi(session: PiSession, command: string) {
  const environment = {
    PI_CODING_AGENT_DIR: session.agentDir,
    PI_SKIP_VERSION_CHECK: "1",
  };

  yield* Effect.acquireRelease(
    tmux(
      "new-session",
      "-d",
      "-s",
      session.name,
      "-x",
      "200",
      "-y",
      "50",
      "-c",
      session.cwd,
      ...Object.entries(environment).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
      `${command} 2>${shellQuote(session.stderrPath)}`,
    ),
    () => tmux("kill-session", "-t", session.name).pipe(Effect.ignore),
  );
  yield* keepPaneAfterExit(session);
});

const startPi = Effect.fn("startPi")(function* startPi() {
  const { root, cwd, agentDir, sessionDir } = yield* makePiRoot();

  sessionCounter += 1;

  const session: PiSession = {
    agentDir,
    cwd,
    name: `pi-e2e-${process.pid}-${sessionCounter}`,
    stderrPath: pathService.join(root, "pi.stderr.log"),
  };

  const piArgs = [
    "pi",
    "--session-dir",
    sessionDir,
    "--no-extensions",
    ...(yield* extensionArgs()),
  ];

  yield* launchPi(session, piArgs.map((arg) => shellQuote(arg)).join(" "));
  yield* waitFor(session, STARTUP_FOOTER, {
    description: "pi footer to render (startup)",
    timeoutMs: STARTUP_TIMEOUT_MS,
  });

  return session;
});

export function setupPiSession<E = never>(
  initialize: (session: PiSession) => Effect.Effect<void, E>,
): void {
  const scope = Scope.makeUnsafe();

  before(async () =>
    Effect.runPromise(
      Effect.gen(function* startSession() {
        yield* initialize(yield* startPi());
      }).pipe(Scope.provide(scope)),
    ),
  );
  after(async () => Effect.runPromise(Scope.close(scope, Exit.void)));
}

export function e2eUnavailable(): string | undefined {
  if (!e2eEnabled) {
    return "set PI_E2E=1 to run live E2E tests";
  }

  for (const binary of ["tmux", "pi"]) {
    try {
      execFileSync("which", [binary], { stdio: "ignore" });
    } catch {
      return `${binary} is not installed`;
    }
  }

  return undefined;
}

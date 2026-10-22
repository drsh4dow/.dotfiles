import { Data, Effect, FileSystem, Schema, type Scope } from "effect";
import { canonicalKeyText, isKeyId } from "./key-id.ts";
import type { KeyId } from "@earendil-works/pi-tui";
import { SETTINGS_FIELD } from "./config.ts";
import { lock } from "proper-lockfile";
// @effect-diagnostics-next-line nodeBuiltinImport:off
import path from "node:path";

const KEYBINDING_FIELD = "pi-fast-mode";

const DEFAULT_SHORTCUT: KeyId = "ctrl+alt+m";

const RESERVED_SHORTCUTS: ReadonlySet<KeyId> = new Set(["ctrl+m", "enter", "return"]);

const PI_SETTINGS_LOCK_ATTEMPTS = 10;

const PI_SETTINGS_LOCK_RETRY_DELAY_MS = 20;

const Keybindings = Schema.fromJsonString(
  Schema.Struct({
    [KEYBINDING_FIELD]: Schema.optional(Schema.Unknown),
  }),
);

const EnabledField = Schema.Struct({ enabled: Schema.optional(Schema.Boolean) });

const EnabledSetting = Schema.fromJsonString(
  Schema.Struct({ [SETTINGS_FIELD]: Schema.optional(EnabledField) }),
);

const SettingsObject = Schema.Record(Schema.String, Schema.Unknown);

const FastModeField = Schema.Struct({ [SETTINGS_FIELD]: Schema.optional(SettingsObject) });

const GlobalSettingsFile = Schema.fromJsonString(
  Schema.StructWithRest(FastModeField, [SettingsObject]),
  { space: 2 },
);

const isShortcutList = Schema.is(Schema.Array(Schema.Unknown));

const isString = Schema.is(Schema.String);

function settingsPath(agentDir: string): string {
  return path.join(agentDir, "settings.json");
}

function usableShortcut(text: string): KeyId[] {
  const shortcut = canonicalKeyText(text.trim());

  return isKeyId(shortcut) && !RESERVED_SHORTCUTS.has(shortcut) ? [shortcut] : [];
}

export const loadShortcuts = Effect.fn("loadShortcuts")(
  function* loadShortcuts(agentDir: string) {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* fs.readFileString(path.join(agentDir, "keybindings.json"));
    const parsed = yield* Schema.decodeEffect(Keybindings)(text);
    const value = parsed[KEYBINDING_FIELD];

    if (value === false || value === null) {
      return [];
    }

    const shortcuts = (isShortcutList(value) ? value : [value]).flatMap((item) =>
      isString(item) ? usableShortcut(item) : [],
    );

    return shortcuts.length > 0 ? shortcuts : [DEFAULT_SHORTCUT];
  },
  Effect.orElseSucceed((): KeyId[] => [DEFAULT_SHORTCUT]),
);

export const loadEnabled = Effect.fn("loadEnabled")(
  function* loadEnabled(agentDir: string) {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* fs.readFileString(settingsPath(agentDir));
    const settings = yield* Schema.decodeEffect(EnabledSetting)(text);

    return settings[SETTINGS_FIELD]?.enabled === true;
  },
  Effect.orElseSucceed(() => false),
);

class SettingsSaveError extends Data.TaggedError("SettingsSaveError")<{
  operation: "lock" | "read" | "decode" | "encode" | "write";
  path: string;
  cause: unknown;
}> {
  public override get message(): string {
    const reason = this.cause instanceof Error ? this.cause.message : String(this.cause);

    return `could not ${this.operation} ${this.path}: ${reason}`;
  }
}

// Pi rewrites settings.json under this lock from every running process, so the toggle takes it too.
function lockSettings(file: string): Effect.Effect<void, SettingsSaveError, Scope.Scope> {
  return Effect.acquireRelease(
    Effect.tryPromise({
      catch: (cause) => new SettingsSaveError({ cause, operation: "lock", path: file }),
      try: async () =>
        lock(file, {
          realpath: false,
          retries: {
            maxTimeout: PI_SETTINGS_LOCK_RETRY_DELAY_MS,
            minTimeout: PI_SETTINGS_LOCK_RETRY_DELAY_MS,
            retries: PI_SETTINGS_LOCK_ATTEMPTS - 1,
          },
        }),
    }),
    // A release() call must get no arguments: its optional first parameter is a completion callback.
    (release) => Effect.tryPromise(async () => release()).pipe(Effect.ignore),
  ).pipe(Effect.asVoid);
}

export const saveEnabled = Effect.fn("saveEnabled")(function* saveEnabled(
  agentDir: string,
  enabled: boolean,
) {
  const fs = yield* FileSystem.FileSystem;
  const file = settingsPath(agentDir);

  const failed =
    (operation: SettingsSaveError["operation"]) =>
    (cause: unknown): SettingsSaveError =>
      new SettingsSaveError({ cause, operation, path: file });

  yield* lockSettings(file);

  const exists = yield* fs.exists(file).pipe(Effect.mapError(failed("read")));

  const text = exists
    ? yield* fs.readFileString(file).pipe(Effect.mapError(failed("read")))
    : undefined;

  const settings =
    text === undefined
      ? {}
      : yield* Schema.decodeEffect(GlobalSettingsFile)(text).pipe(
          Effect.mapError(failed("decode")),
        );

  const encoded = yield* Schema.encodeEffect(GlobalSettingsFile)({
    ...settings,
    [SETTINGS_FIELD]: { ...settings[SETTINGS_FIELD], enabled },
  }).pipe(Effect.mapError(failed("encode")));

  yield* fs.writeFileString(file, encoded).pipe(Effect.mapError(failed("write")));
}, Effect.scoped);

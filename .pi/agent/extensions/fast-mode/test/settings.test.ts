import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import * as BunPath from "@effect/platform-bun/BunPath";
import { Effect, FileSystem, Layer, Path } from "effect";
import { loadEnabled, loadShortcuts, saveEnabled } from "../settings.ts";
import assert from "node:assert/strict";
import test from "node:test";

const TestServices = Layer.mergeAll(BunFileSystem.layer, BunPath.layer);

const KEYBINDING_JSON_CASES = [
  ["false", []],
  ["null", []],
  ['" ctrl+shift+f "', ["ctrl+shift+f"]],
  ['[1, null, {}, "", "enter", "CTRL+M", " ctrl+alt+f "]', ["ctrl+alt+f"]],
  [
    '["Ctrl+Alt+PageUp", "shift++", "ctrl+ctrl+f", "hyper+f", "ctrl+"]',
    ["ctrl+alt+pageUp", "shift++"],
  ],
  ['["return", " "]', ["ctrl+alt+m"]],
  ["42", ["ctrl+alt+m"]],
] as const;

const writeKeybindings = Effect.fn("writeKeybindings")(function* writeKeybindings(
  directory: string,
  text: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* fs.writeFileString(path.join(directory, "keybindings.json"), text);
});

test("loads shortcut settings, filtering invalid entries and preserving disable settings", async () =>
  Effect.runPromise(
    Effect.gen(function* loadsShortcutSettings() {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "pi-fast-shortcuts-" });
      const load = loadShortcuts(directory);

      assert.deepEqual(yield* load, ["ctrl+alt+m"]);

      for (const [setting, expected] of KEYBINDING_JSON_CASES) {
        yield* writeKeybindings(directory, `{"pi-fast-mode": ${setting}}`);
        assert.deepEqual(yield* load, expected);
      }

      yield* writeKeybindings(directory, "invalid json");
      assert.deepEqual(yield* load, ["ctrl+alt+m"]);
    }).pipe(Effect.scoped, Effect.provide(TestServices)),
  ));

test("loads the enabled setting that saveEnabled writes, treating a missing file as disabled", async () =>
  Effect.runPromise(
    Effect.gen(function* loadsEnabledSetting() {
      const fs = yield* FileSystem.FileSystem;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "pi-fast-enabled-" });

      assert.equal(yield* loadEnabled(directory), false);
      yield* saveEnabled(directory, true);
      assert.equal(yield* loadEnabled(directory), true);
      yield* saveEnabled(directory, false);
      assert.equal(yield* loadEnabled(directory), false);
    }).pipe(Effect.scoped, Effect.provide(TestServices)),
  ));

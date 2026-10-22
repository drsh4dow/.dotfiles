import {
  FastModeSettings,
  SUBAGENT_SESSION_PREFIX,
  fastRequestFields,
  readConfig,
  withFastRequest,
} from "../config.ts";
import { type PiSettings, config } from "./fixtures.ts";
import { describe, test } from "node:test";
import { Schema } from "effect";
import assert from "node:assert/strict";

describe("fast mode config", () => {
  test("the repository settings contain a valid config", () => {
    const { readFileSync } = process.getBuiltinModule("node:fs");

    const { fastMode: repositoryConfig } = Schema.decodeSync(
      Schema.fromJsonString(FastModeSettings),
    )(readFileSync(new URL("../../../default.settings.json", import.meta.url), "utf8"));

    assert.ok(repositoryConfig, "default.settings.json fastMode does not match the config schema");

    assert.deepEqual(
      fastRequestFields(repositoryConfig, { id: "claude-opus-5-5", provider: "anthropic" }),
      { betas: ["fast-mode-2026-02-01"], speed: "fast" },
    );
  });

  test("ignores missing or invalid configs", () => {
    const empty: PiSettings = {};

    assert.equal(readConfig(empty), undefined);

    for (const fastMode of [
      { providers: { openai: { models: ["gpt-6.1-sol"] } } },
      { providers: { openai: { models: "gpt-6.1-sol", request: {} } } },
    ]) {
      const settings = { fastMode, theme: "x" };

      assert.equal(readConfig(settings), undefined);
    }

    const settings = { fastMode: config, theme: "x" };

    assert.deepEqual(readConfig(settings), config);
  });
});

describe("fast mode provider defaults", () => {
  test("enables subagents for providers that omit subagentsEnabled", () => {
    const settings = {
      fastMode: { providers: { openai: { models: ["gpt-6.1-sol"], request: {} } } },
      theme: "x",
    };

    assert.equal(readConfig(settings)?.providers.openai?.subagentsEnabled, true);
  });
});

describe("fast mode request mapping", () => {
  for (const [provider, id, fields] of [
    ["anthropic", "claude-opus-5-5", { betas: ["fast-mode-2026-02-01"], speed: "fast" }],
    ["openai", "gpt-6.1-sol", { service_tier: "fast" }],
    ["openai-codex", "gpt-6-astra", { service_tier: "priority" }],
  ] as const) {
    test(`maps ${provider}/${id} without mutating the payload`, () => {
      const model = { id, provider };
      const payload = { input: "hello", model: id };

      assert.deepEqual(fastRequestFields(config, model), fields);
      assert.deepEqual(withFastRequest({ config, model }, payload), {
        ...payload,
        ...fields,
      });
      assert.deepEqual(payload, { input: "hello", model: id });
    });
  }

  test("merges array fields with the request's existing values once", () => {
    const model = { id: "claude-opus-5-5", provider: "anthropic" };

    for (const betas of [["oauth-2025-04-20"], ["oauth-2025-04-20", "fast-mode-2026-02-01"]]) {
      assert.deepEqual(withFastRequest({ config, model }, { betas, model: model.id }), {
        betas: ["oauth-2025-04-20", "fast-mode-2026-02-01"],
        model: model.id,
        speed: "fast",
      });
    }
  });
});

describe("fast mode request gating", () => {
  test("does not tag models or providers outside the config", () => {
    for (const model of [
      { id: "claude-fable-5-1", provider: "anthropic" },
      { id: "gpt-6-astra", provider: "openai" },
      { id: "glm-5.3-flash", provider: "opencode-go" },
      { id: "gpt-6.1-sol", provider: "constructor" },
    ]) {
      const payload = { model: model.id };

      assert.equal(fastRequestFields(config, model), undefined);
      assert.equal(withFastRequest({ config, model }, payload), payload);
    }
  });

  test("skips subagent sessions only for providers that set subagentsEnabled to false", () => {
    const subagent = `${SUBAGENT_SESSION_PREFIX} review the diff`;
    const openai = { id: "gpt-6.1-sol", provider: "openai" };
    const anthropic = { id: "claude-opus-5-5", provider: "anthropic" };

    assert.equal(fastRequestFields(config, openai, subagent), undefined);
    assert.deepEqual(fastRequestFields(config, openai, "review the diff"), {
      service_tier: "fast",
    });
    assert.deepEqual(fastRequestFields(config, anthropic, subagent), {
      betas: ["fast-mode-2026-02-01"],
      speed: "fast",
    });
  });
});

describe("fast mode request passthrough", () => {
  test("preserves requests for other models, non-object payloads, and missing inputs", () => {
    const model = { id: "gpt-6.1-sol", provider: "openai" };

    for (const payload of [
      { input: "hello", model: "gpt-5.5", service_tier: "auto" },
      {},
      [],
      // oxlint-disable-next-line unicorn/no-null -- Provider payloads are decoded JSON, which can be null.
      null,
      undefined,
      "request",
      1,
    ]) {
      assert.equal(withFastRequest({ config, model }, payload), payload);
    }

    const payload = { model: model.id };

    assert.equal(withFastRequest({ config: undefined, model }, payload), payload);
    assert.equal(withFastRequest({ config, model: undefined }, payload), payload);
  });
});

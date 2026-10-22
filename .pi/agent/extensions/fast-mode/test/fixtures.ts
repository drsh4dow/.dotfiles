import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { FastModeConfig } from "../config.ts";

export type PiSettings = ReturnType<ExtensionAPI["getSettings"]>;

export const config: FastModeConfig = {
  providers: {
    anthropic: {
      models: ["claude-opus-5-5"],
      request: { betas: ["fast-mode-2026-02-01"], speed: "fast" },
      subagentsEnabled: true,
    },
    openai: {
      models: ["gpt-6.1-sol"],
      request: { service_tier: "fast" },
      subagentsEnabled: false,
    },
    "openai-codex": {
      models: ["gpt-6-astra"],
      request: { service_tier: "priority" },
      subagentsEnabled: true,
    },
  },
};

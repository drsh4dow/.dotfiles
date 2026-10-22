import { Effect, Option, Schema } from "effect";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export const SETTINGS_FIELD = "fastMode";

export const SUBAGENT_SESSION_PREFIX = "subagent:";

export const RequestFields = Schema.Record(Schema.String, Schema.Unknown);

export type RequestFields = typeof RequestFields.Type;

const SubagentsEnabled = Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true)));

const ProviderConfig = Schema.Struct({
  models: Schema.Array(Schema.String),
  request: RequestFields,
  subagentsEnabled: SubagentsEnabled,
});

type ProviderConfig = typeof ProviderConfig.Type;

const FastModeConfig = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  providers: Schema.Record(Schema.String, ProviderConfig),
});

export type FastModeConfig = typeof FastModeConfig.Type;

export const FastModeSettings = Schema.Struct({
  [SETTINGS_FIELD]: Schema.optional(FastModeConfig),
});

const decodeFastModeSettings = Schema.decodeUnknownOption(FastModeSettings);

const isModelRequest = Schema.is(Schema.Struct({ model: Schema.String }));

const isRequestFields = Schema.is(RequestFields);

const isArray = Schema.is(Schema.Array(Schema.Unknown));

const isString = Schema.is(Schema.String);

type PiSettings = ReturnType<ExtensionAPI["getSettings"]>;

export type PiModel = Readonly<Pick<NonNullable<ExtensionContext["model"]>, "provider" | "id">>;

export type FastModeScope = Readonly<{
  config: FastModeConfig | undefined;
  model: PiModel | undefined;
  sessionName?: string | undefined;
}>;

export function readConfig(settings: PiSettings): FastModeConfig | undefined {
  return Option.getOrUndefined(decodeFastModeSettings(settings))?.[SETTINGS_FIELD];
}

function isSubagentSession(sessionName: string | undefined): boolean {
  return sessionName?.startsWith(SUBAGENT_SESSION_PREFIX) === true;
}

export function listingProvider(
  config: FastModeConfig | undefined,
  model: PiModel,
): ProviderConfig | undefined {
  if (!config || !Object.hasOwn(config.providers, model.provider)) {
    return undefined;
  }

  const provider = config.providers[model.provider];

  return provider?.models.includes(model.id) ? provider : undefined;
}

function disabledForSubagents(provider: ProviderConfig, sessionName: string | undefined): boolean {
  return !provider.subagentsEnabled && isSubagentSession(sessionName);
}

export function fastRequestFields(
  config: FastModeConfig | undefined,
  model: PiModel | undefined,
  sessionName?: string,
): RequestFields | undefined {
  if (!model) {
    return undefined;
  }

  const provider = listingProvider(config, model);

  if (!provider || disabledForSubagents(provider, sessionName)) {
    return undefined;
  }

  return provider.request;
}

export function withFastRequest<Payload>(
  { config, model, sessionName }: FastModeScope,
  payload: Payload,
): Payload | RequestFields {
  const fields = fastRequestFields(config, model, sessionName);

  if (!fields || !isModelRequest(payload) || !isRequestFields(payload)) {
    return payload;
  }

  if (payload.model !== model?.id) {
    return payload;
  }

  return {
    ...payload,
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => {
        const current = payload[key];

        return [
          key,
          isArray(current) && isArray(value) ? [...new Set([...current, ...value])] : value,
        ];
      }),
    ),
  };
}

export function describeRequestFields(fields: RequestFields): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${isString(value) ? value : JSON.stringify(value)}`)
    .join(", ");
}

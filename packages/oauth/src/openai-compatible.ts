import { readApiErrorMessage } from './api-error';
import {
  CUSTOM_REGISTRY_DEFAULT_CAPABILITIES,
  CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
} from './custom-registry';
import type { ManagedKimiConfigShape, ManagedKimiModelAlias } from './managed-kimi-code';
import { CUSTOM_REGISTRY_MODEL_FIELDS, mergeRefreshedModelAlias } from './model-alias-merge';
import { isRecord } from './utils';

/**
 * A hand-configured OpenAI-compatible provider whose model list is discovered
 * from the provider's own `GET {baseUrl}/models` endpoint rather than from an
 * api.json registry. `modelSource: 'discover'` marks the provider for the
 * refresh orchestrator; the `source` blob parks the stable identity (base URL +
 * API key) so a later refresh can re-discover it.
 */
export interface OpenAiCompatibleSource {
  readonly kind: 'openaiModels';
  readonly url: string;
  readonly apiKey: string;
}

export interface FetchOpenAiCompatibleModelsOptions {
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
  readonly userAgent?: string;
}

export class OpenAiCompatibleApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenAiCompatibleApiError';
    this.status = status;
  }
}

export function readOpenAiCompatibleSource(
  provider: unknown,
): OpenAiCompatibleSource | undefined {
  if (!isRecord(provider)) return undefined;
  const source = provider['source'];
  if (!isRecord(source)) return undefined;
  if (source['kind'] !== 'openaiModels') return undefined;
  if (typeof source['url'] !== 'string' || source['url'].length === 0) return undefined;
  if (typeof source['apiKey'] !== 'string') return undefined;
  return { kind: 'openaiModels', url: source['url'], apiKey: source['apiKey'] };
}

/**
 * Lists model ids from an OpenAI-compatible `GET {baseUrl}/models` endpoint.
 * Only the `data[].id` field is required — everything else (context length,
 * capabilities) is filled with the same conservative defaults a custom-registry
 * entry uses, and can be overridden by hand in `config.toml` afterwards.
 */
export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey: string,
  options: FetchOpenAiCompatibleModelsOptions = {},
): Promise<string[]> {
  const { signal, fetchImpl = fetch, userAgent } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (userAgent !== undefined) headers['User-Agent'] = userAgent;
  if (apiKey.length > 0) headers['Authorization'] = `Bearer ${apiKey}`;

  const init: RequestInit = { headers };
  if (signal !== undefined) init.signal = signal;

  const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/models`, init);
  if (!response.ok) {
    const message = await readApiErrorMessage(
      response,
      `Failed to list models at ${baseUrl} (HTTP ${response.status}).`,
    );
    throw new OpenAiCompatibleApiError(message, response.status);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload['data'])) {
    throw new Error(`Unexpected models response for ${baseUrl}.`);
  }

  const ids: string[] = [];
  for (const item of payload['data']) {
    if (!isRecord(item)) continue;
    const id = item['id'];
    if (typeof id === 'string' && id.length > 0 && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * Writes one discovered OpenAI-compatible provider into the config in place,
 * mirroring `applyCustomRegistryProvider`: the provider goes to
 * `config.providers` keyed by `providerId`, each discovered model id becomes an
 * alias under `config.models[\`${providerId}/${modelId}\`]`. Models that
 * upstream no longer lists are removed; user-added fields survive re-discovery.
 */
export function applyOpenAiCompatibleProvider(
  config: ManagedKimiConfigShape,
  input: {
    readonly providerId: string;
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly modelIds: readonly string[];
  },
): void {
  const providerKey = input.providerId;
  const source: OpenAiCompatibleSource = {
    kind: 'openaiModels',
    url: input.baseUrl,
    apiKey: input.apiKey,
  };

  config.providers[providerKey] = {
    type: 'openai',
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    modelSource: 'discover',
    source,
  };

  const existingModels = config.models ?? {};
  const upstreamKeys = new Set(
    input.modelIds.map((modelId) => `${providerKey}/${modelId}`),
  );
  for (const [key, model] of Object.entries(existingModels)) {
    if (isRecord(model) && model['provider'] === providerKey && !upstreamKeys.has(key)) {
      delete existingModels[key];
    }
  }

  for (const modelId of input.modelIds) {
    const aliasKey = `${providerKey}/${modelId}`;
    const existing = isRecord(existingModels[aliasKey]) ? existingModels[aliasKey] : {};
    const remoteAlias: ManagedKimiModelAlias = {
      provider: providerKey,
      model: modelId,
      maxContextSize: CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
      capabilities: [...CUSTOM_REGISTRY_DEFAULT_CAPABILITIES],
      displayName: modelId,
    };
    existingModels[aliasKey] = mergeRefreshedModelAlias(
      existing,
      remoteAlias,
      CUSTOM_REGISTRY_MODEL_FIELDS,
    );
  }

  config.models = existingModels;
}

export function removeOpenAiCompatibleProvider(
  config: ManagedKimiConfigShape,
  providerId: string,
): void {
  delete config.providers[providerId];

  let removedDefault = false;
  const existingModels = config.models ?? {};
  for (const [key, model] of Object.entries(existingModels)) {
    if (!isRecord(model) || model['provider'] !== providerId) continue;
    delete existingModels[key];
    if (config.defaultModel === key) removedDefault = true;
  }
  config.models = existingModels;

  if (removedDefault) config.defaultModel = undefined;
  if (config['defaultProvider'] === providerId) config['defaultProvider'] = undefined;
}

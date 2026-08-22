import { readApiErrorMessage } from './api-error';
import { CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT } from './custom-registry';
import type { ManagedKimiConfigShape, ManagedKimiModelAlias } from './managed-kimi-code';
import { CUSTOM_REGISTRY_MODEL_FIELDS, mergeRefreshedModelAlias } from './model-alias-merge';
import { isRecord } from './utils';

/**
 * 手动配置的 OpenAI 兼容供应商，其模型列表从供应商自己的
 * `GET {baseUrl}/models` 端点发现，而非来自 api.json 注册表。
 * `modelSource: 'discover'` 标记该供应商交给刷新编排器处理；
 * `source` 记录稳定身份（base URL + API key），供后续刷新重新发现。
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

export interface OpenAiCompatibleModelInfo {
  readonly id: string;
  readonly displayName?: string;
  readonly maxContextSize?: number;
  readonly maxOutputSize?: number;
  readonly toolCall?: boolean;
  readonly reasoning?: boolean;
  readonly supportEfforts?: readonly string[];
  readonly defaultEffort?: string;
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
 * 从 OpenAI 兼容的 `GET {baseUrl}/models` 端点列出模型。
 * `data[].id` 是唯一必填字段；当服务器同时返回上下文大小、输出上限、
 * 工具使用、思考能力或努力级别（使用常见的 OpenAI 兼容字段名）时，
 * 这些信息会被一并保留，从而用真实的限额配置模型别名，而不是保守默认值。
 */
export async function fetchOpenAiCompatibleModels(
  baseUrl: string,
  apiKey: string,
  options: FetchOpenAiCompatibleModelsOptions = {},
): Promise<OpenAiCompatibleModelInfo[]> {
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

  const entries: OpenAiCompatibleModelInfo[] = [];
  for (const item of payload['data']) {
    const entry = toOpenAiCompatibleModelInfo(item);
    if (entry !== undefined && !entries.some((e) => e.id === entry.id)) {
      entries.push(entry);
    }
  }
  return entries;
}

function toOpenAiCompatibleModelInfo(value: unknown): OpenAiCompatibleModelInfo | undefined {
  if (!isRecord(value)) return undefined;
  const id = value['id'];
  if (typeof id !== 'string' || id.length === 0) return undefined;

  const entry: {
    id: string;
    displayName?: string;
    maxContextSize?: number;
    maxOutputSize?: number;
    toolCall?: boolean;
    reasoning?: boolean;
    supportEfforts?: readonly string[];
    defaultEffort?: string;
  } = { id };

  const displayName = value['display_name'] ?? value['name'];
  if (typeof displayName === 'string' && displayName.length > 0) {
    entry.displayName = displayName;
  }

  const maxContextSize = pickPositiveInteger(
    value['context_length'],
    value['max_context_length'],
    value['context_window'],
  );
  if (maxContextSize !== undefined) entry.maxContextSize = maxContextSize;

  const maxOutputSize = pickPositiveInteger(
    value['max_completion_tokens'],
    value['max_output_tokens'],
  );
  if (maxOutputSize !== undefined) entry.maxOutputSize = maxOutputSize;

  const supportsTools = value['supports_tools'] ?? value['supports_tool_use'] ?? value['tool_call'];
  if (typeof supportsTools === 'boolean') entry.toolCall = supportsTools;

  const supportsReasoning =
    value['supports_reasoning'] ?? value['supports_thinking'] ?? value['reasoning'];
  if (typeof supportsReasoning === 'boolean') entry.reasoning = supportsReasoning;

  const thinkEfforts = parseThinkEfforts(value['think_efforts']);
  const supportEfforts =
    parseStringArray(value['valid_efforts'] ?? value['support_efforts']) ??
    thinkEfforts.supportEfforts;
  if (supportEfforts !== undefined) entry.supportEfforts = supportEfforts;

  const defaultEffort =
    typeof value['default_effort'] === 'string' ? value['default_effort'] : thinkEfforts.defaultEffort;
  if (defaultEffort !== undefined && defaultEffort.length > 0) {
    entry.defaultEffort = defaultEffort;
  }

  return entry;
}

function pickPositiveInteger(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  }
  return undefined;
}

function parseStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return out.length > 0 ? out : undefined;
}

function parseThinkEfforts(value: unknown): {
  supportEfforts: readonly string[] | undefined;
  defaultEffort: string | undefined;
} {
  if (!isRecord(value) || value['support'] !== true) {
    return { supportEfforts: undefined, defaultEffort: undefined };
  }
  const defaultEffort = value['default_effort'];
  return {
    supportEfforts: parseStringArray(value['valid_efforts']),
    defaultEffort:
      typeof defaultEffort === 'string' && defaultEffort.length > 0 ? defaultEffort : undefined,
  };
}

/**
 * 将一个发现的 OpenAI 兼容供应商写入配置，与 `applyCustomRegistryProvider`
 * 一致：供应商写入 `config.providers`（以 `providerId` 为键），每个发现的
 * 模型在 `config.models[\`${providerId}/${modelId}\`]` 下成为别名。上游不再
 * 列出的模型会被移除；用户手动添加的字段在重新发现时得以保留。
 */
export function applyOpenAiCompatibleProvider(
  config: ManagedKimiConfigShape,
  input: {
    readonly providerId: string;
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly models: readonly OpenAiCompatibleModelInfo[];
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
  const upstreamKeys = new Set(input.models.map((model) => `${providerKey}/${model.id}`));
  for (const [key, model] of Object.entries(existingModels)) {
    if (isRecord(model) && model['provider'] === providerKey && !upstreamKeys.has(key)) {
      delete existingModels[key];
    }
  }

  for (const model of input.models) {
    const aliasKey = `${providerKey}/${model.id}`;
    const existing = isRecord(existingModels[aliasKey]) ? existingModels[aliasKey] : {};

    const remoteAlias: ManagedKimiModelAlias = {
      provider: providerKey,
      model: model.id,
      maxContextSize: model.maxContextSize ?? CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
      capabilities: resolveCapabilities(model),
      displayName: model.displayName ?? model.id,
      ...(model.maxOutputSize !== undefined ? { maxOutputSize: model.maxOutputSize } : {}),
      ...(model.supportEfforts !== undefined ? { supportEfforts: model.supportEfforts } : {}),
      ...(model.defaultEffort !== undefined ? { defaultEffort: model.defaultEffort } : {}),
    };
    existingModels[aliasKey] = mergeRefreshedModelAlias(
      existing,
      remoteAlias,
      CUSTOM_REGISTRY_MODEL_FIELDS,
    );
  }

  config.models = existingModels;
}

function resolveCapabilities(model: OpenAiCompatibleModelInfo): string[] {
  const caps = new Set<string>();
  if (model.toolCall === true) caps.add('tool_use');
  if (model.reasoning === true || (model.supportEfforts?.length ?? 0) > 0) {
    caps.add('thinking');
  }
  if (caps.size > 0) return [...caps];
  return ['tool_use'];
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

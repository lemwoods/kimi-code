import { describe, expect, it, vi } from 'vitest';

import { CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT } from '../src/custom-registry';
import type { ManagedKimiConfigShape } from '../src/managed-kimi-code';
import {
  applyOpenAiCompatibleProvider,
  fetchOpenAiCompatibleModels,
  OpenAiCompatibleApiError,
  readOpenAiCompatibleSource,
  removeOpenAiCompatibleProvider,
} from '../src/openai-compatible';

function makeModelsResponse(items: unknown): Response {
  return new Response(
    JSON.stringify({ object: 'list', data: items }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function emptyConfig(): ManagedKimiConfigShape {
  return { providers: {}, models: {} };
}

describe('fetchOpenAiCompatibleModels', () => {
  it('parses ids, context size, output size, and capabilities', async () => {
    const fetchMock = vi.fn(async () =>
      makeModelsResponse([
        {
          id: 'gpt-4o',
          object: 'model',
          context_length: 1000000,
          max_completion_tokens: 384000,
          supports_tools: true,
          supports_reasoning: true,
        },
        { id: 'gpt-4o-mini', object: 'model' },
      ]),
    );

    const models = await fetchOpenAiCompatibleModels('https://api.example.test/v1', 'sk-key', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(models).toEqual([
      {
        id: 'gpt-4o',
        maxContextSize: 1000000,
        maxOutputSize: 384000,
        toolCall: true,
        reasoning: true,
        supportEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
        defaultEffort: 'medium',
      },
      { id: 'gpt-4o-mini' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-key',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('strips trailing slashes from the base URL', async () => {
    const fetchMock = vi.fn(async () => makeModelsResponse([{ id: 'm1' }]));

    await fetchOpenAiCompatibleModels('https://api.example.test/v1/', 'sk-key', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/models',
      expect.anything(),
    );
  });

  it('deduplicates ids and skips entries without a string id', async () => {
    const fetchMock = vi.fn(async () =>
      makeModelsResponse([
        { id: 'm1' },
        { id: 'm1' },
        { id: 42 },
        { object: 'model' },
        { id: 'm2' },
      ]),
    );

    const models = await fetchOpenAiCompatibleModels('https://api.example.test/v1', 'sk-key', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(models.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('omits the Authorization header when the apiKey is empty', async () => {
    const fetchMock = vi.fn(async () => makeModelsResponse([{ id: 'm1' }]));

    await fetchOpenAiCompatibleModels('https://api.example.test/v1', '', {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((call[1].headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('throws OpenAiCompatibleApiError on a non-200 response', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"error":{"message":"bad key"}}', { status: 401 }),
    );

    await expect(
      fetchOpenAiCompatibleModels('https://api.example.test/v1', 'sk-key', {
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(OpenAiCompatibleApiError);
  });

  it('throws on a malformed response body', async () => {
    const fetchMock = vi.fn(async () => makeModelsResponse('not-a-list'));

    await expect(
      fetchOpenAiCompatibleModels('https://api.example.test/v1', 'sk-key', {
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/Unexpected models response/);
  });
});

describe('applyOpenAiCompatibleProvider', () => {
  it('writes the provider and one alias per model, carrying context and output sizes', () => {
    const config = emptyConfig();
    applyOpenAiCompatibleProvider(config, {
      providerId: 'acme',
      baseUrl: 'https://acme.example.test/v1',
      apiKey: 'sk-acme',
      models: [
        {
          id: 'gpt-4o',
          maxContextSize: 1000000,
          maxOutputSize: 384000,
          toolCall: true,
          reasoning: true,
        },
        { id: 'gpt-4o-mini' },
      ],
    });

    expect(config.providers['acme']).toEqual({
      type: 'openai',
      baseUrl: 'https://acme.example.test/v1',
      apiKey: 'sk-acme',
      modelSource: 'discover',
      source: {
        kind: 'openaiModels',
        url: 'https://acme.example.test/v1',
        apiKey: 'sk-acme',
      },
    });
    expect(config.models?.['acme/gpt-4o']).toMatchObject({
      provider: 'acme',
      model: 'gpt-4o',
      maxContextSize: 1000000,
      maxOutputSize: 384000,
      capabilities: ['tool_use', 'thinking'],
    });
    expect(config.models?.['acme/gpt-4o-mini']).toMatchObject({
      provider: 'acme',
      model: 'gpt-4o-mini',
      maxContextSize: CUSTOM_REGISTRY_DEFAULT_MAX_CONTEXT,
      capabilities: ['tool_use'],
    });
  });

  it('removes aliases that upstream no longer lists', () => {
    const config = emptyConfig();
    config.models = {
      'acme/gpt-4o': { provider: 'acme', model: 'gpt-4o', maxContextSize: 131072 },
      'acme/gpt-4-turbo': {
        provider: 'acme',
        model: 'gpt-4-turbo',
        maxContextSize: 131072,
      },
    };
    applyOpenAiCompatibleProvider(config, {
      providerId: 'acme',
      baseUrl: 'https://acme.example.test/v1',
      apiKey: 'sk-acme',
      models: [{ id: 'gpt-4o' }],
    });

    expect(config.models?.['acme/gpt-4o']).toBeDefined();
    expect(config.models?.['acme/gpt-4-turbo']).toBeUndefined();
  });

  it('preserves user-added non-upstream fields on re-discovery', () => {
    const config = emptyConfig();
    config.models = {
      'acme/gpt-4o': {
        provider: 'acme',
        model: 'gpt-4o',
        maxContextSize: 131072,
        customField: 'kept',
      },
    };
    applyOpenAiCompatibleProvider(config, {
      providerId: 'acme',
      baseUrl: 'https://acme.example.test/v1',
      apiKey: 'sk-acme',
      models: [{ id: 'gpt-4o' }],
    });

    expect(config.models?.['acme/gpt-4o']).toMatchObject({ customField: 'kept' });
  });
});

describe('readOpenAiCompatibleSource', () => {
  it('reads the source from a provider record', () => {
    const source = readOpenAiCompatibleSource({
      source: { kind: 'openaiModels', url: 'https://x.test/v1', apiKey: 'k' },
    });
    expect(source).toEqual({ kind: 'openaiModels', url: 'https://x.test/v1', apiKey: 'k' });
  });

  it('returns undefined for non-discover providers', () => {
    expect(
      readOpenAiCompatibleSource({ source: { kind: 'apiJson', url: 'u', apiKey: 'k' } }),
    ).toBeUndefined();
    expect(readOpenAiCompatibleSource({})).toBeUndefined();
    expect(readOpenAiCompatibleSource(undefined)).toBeUndefined();
  });
});

describe('removeOpenAiCompatibleProvider', () => {
  it('removes the provider, its aliases, and a dangling defaultModel', () => {
    const config: ManagedKimiConfigShape = {
      providers: {
        acme: { type: 'openai', baseUrl: 'https://acme.example.test/v1', apiKey: 'k' },
      },
      models: {
        'acme/gpt-4o': { provider: 'acme', model: 'gpt-4o', maxContextSize: 131072 },
        'other/m1': { provider: 'other', model: 'm1', maxContextSize: 131072 },
      },
      defaultModel: 'acme/gpt-4o',
    };
    removeOpenAiCompatibleProvider(config, 'acme');

    expect(config.providers['acme']).toBeUndefined();
    expect(config.models?.['acme/gpt-4o']).toBeUndefined();
    expect(config.models?.['other/m1']).toBeDefined();
    expect(config.defaultModel).toBeUndefined();
  });
});

import type { ModelCapability } from '#/kosong/contract/capability';
import type { ProtocolTrait } from '#/kosong/protocol/protocolTrait';

import { registerProviderDefinition } from '../providerDefinition';

export const GLM_API_KEY_ENV = 'GLM_API_KEY';
export const GLM_BASE_URL_ENV = 'GLM_BASE_URL';
export const GLM_DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

export const glmOpenAITrait: ProtocolTrait = {
  strictThinkingValidation: true,

  endpoint: () => ({
    apiKeyEnv: GLM_API_KEY_ENV,
    baseUrlEnv: GLM_BASE_URL_ENV,
    defaultBaseUrl: GLM_DEFAULT_BASE_URL,
  }),

  withThinking: (effort) => ({
    thinking: { type: effort === 'off' ? 'disabled' : 'enabled' },
  }),

  reasoningKey: () => 'reasoning_content',

  capability: (): ModelCapability => ({
    image_in: false,
    video_in: false,
    audio_in: false,
    thinking: true,
    tool_use: true,
    max_context_tokens: 0,
  }),
};

registerProviderDefinition({
  id: 'glm',
  baseProtocol: 'openai',
  traits: [glmOpenAITrait],
  endpoint: {
    apiKeyEnv: GLM_API_KEY_ENV,
    baseUrlEnv: GLM_BASE_URL_ENV,
    defaultBaseUrl: GLM_DEFAULT_BASE_URL,
  },
});

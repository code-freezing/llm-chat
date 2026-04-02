// 所有可选模型集中维护在这里，避免在多个组件或服务里重复写死模型信息；每一项同时描述展示名称、真正发送给接口的模型值，以及该模型允许的最大 tokens。
export const MODEL_OPTIONS = [
  {
    label: 'MiniMax-M2.5',
    value: 'Pro/MiniMaxAI/MiniMax-M2.5',
    maxTokens: 65536,
  },
  {
    label: 'GLM-5',
    value: 'Pro/zai-org/GLM-5',
    maxTokens: 65536,
  },
  {
    label: 'GLM-4.7',
    value: 'Pro/zai-org/GLM-4.7',
    maxTokens: 65536,
  },
  {
    label: 'Kimi-K2.5',
    value: 'Pro/moonshotai/Kimi-K2.5',
    maxTokens: 65536,
  },
  {
    label: 'DeepSeek-V3.2',
    value: 'deepseek-ai/DeepSeek-V3.2',
    maxTokens: 65536,
  },
  {
    label: 'DeepSeek-V3.2(Pro)',
    value: 'Pro/deepseek-ai/DeepSeek-V3.2',
    maxTokens: 65536,
  },
  {
    label: 'DeepSeek-V3',
    value: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 65536,
  },
  {
    label: 'Qwen3.5-397B-A17B',
    value: 'Qwen/Qwen3.5-397B-A17B',
    maxTokens: 65536,
  },
  {
    label: 'test-model',
    value: 'test-model',
    maxTokens: 65536,
  },
]

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value

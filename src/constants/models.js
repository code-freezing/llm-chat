// 可选模型集中维护，避免在多个组件里重复写死模型信息。
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
]

// 默认模型直接取模型列表第一项，保证默认值始终有效。
export const DEFAULT_MODEL = MODEL_OPTIONS[0].value

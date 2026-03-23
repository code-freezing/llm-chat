import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/constants/models'

// 默认设置作为单一来源，供设置 store 初始化和后续重置逻辑复用。
export const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL,
  apiKey: '',
  stream: true,
  maxTokens: MODEL_OPTIONS[0].maxTokens,
  temperature: 0.7,
  topP: 0.7,
  topK: 50,
}

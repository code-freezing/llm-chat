import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/constants/models'

// 默认设置集中维护在这里，作为 setting store 的初始化来源。
// 这样设置面板、store 和请求层都能围绕同一组默认值工作。
export const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL,
  apiKey: '',
  stream: true,
  maxTokens: MODEL_OPTIONS[0].maxTokens,
  temperature: 0.7,
  topP: 0.7,
  topK: 50,
}

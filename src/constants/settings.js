import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/constants/models'
import {
  DEFAULT_SYSTEM_PROMPT_PRESET,
  getSystemPromptByPreset,
} from '@/constants/systemPrompts'

// 默认设置集中维护在这里，作为 setting store 的初始化来源，这样设置面板、store 和请求层都能围绕同一组默认值工作。
export const DEFAULT_SETTINGS = {
  // 默认模型和其最大输出上限保持联动，避免默认状态下出现非法 tokens 配置。
  model: DEFAULT_MODEL,
  apiKey: '',
  systemPromptPreset: DEFAULT_SYSTEM_PROMPT_PRESET,
  systemPrompt: getSystemPromptByPreset(DEFAULT_SYSTEM_PROMPT_PRESET),
  customSystemPrompt: '',
  stream: true,
  maxTokens: MODEL_OPTIONS[0].maxTokens,
}

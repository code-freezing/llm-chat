import { API_BASE_URL } from '@/config/env'
import { DEFAULT_SETTINGS } from '@/constants/settings'
import { useSettingStore } from '@/stores/setting'

// 所有聊天请求最终都从这里发出，页面层只负责提供消息数组和局部覆盖参数，不关心具体 fetch 细节。
export const createChatCompletion = async (messages, requestOptions = {}) => {
  const settingStore = useSettingStore()
  const stream =
    requestOptions.stream === undefined ? settingStore.settings.stream : requestOptions.stream
  const maxTokens = requestOptions.maxTokens ?? settingStore.settings.maxTokens
  const model = requestOptions.model ?? settingStore.settings.model
  const temperature =
    requestOptions.temperature ?? settingStore.settings.temperature ?? DEFAULT_SETTINGS.temperature
  const topP = requestOptions.topP ?? settingStore.settings.topP ?? DEFAULT_SETTINGS.topP
  const topK = requestOptions.topK ?? settingStore.settings.topK ?? DEFAULT_SETTINGS.topK

  // 请求体直接来自 setting store，确保界面上的配置和真正发出的参数保持一致；摘要请求会通过 requestOptions 覆盖 stream / max_tokens，这样不用再额外维护一套重复请求函数。
  const payload = {
    model,
    messages,
    stream,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    top_k: topK,
  }

  // 接口保持 OpenAI 兼容协议，请求头里只需要 API Key 和 JSON 类型。
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settingStore.settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }

  try {
    // 记录开始时间，用于在非流式模式下估算生成速度。
    const startTime = Date.now()
    const response = await fetch(`${API_BASE_URL}/chat/completions`, options)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 如果当前是流式模式，这里不直接解析内容，而是把原始 Response 交给 messageHandler 逐段读取 body。
    if (stream) {
      return response
    }

    // 非流式模式下接口直接返回完整 JSON，因此在这里一次性读取即可。
    const data = await response.json()
    const duration = (Date.now() - startTime) / 1000
    // 非流式没有增量包时间信息，只能用总耗时粗略估算平均速度。
    data.speed = (data.usage.completion_tokens / duration).toFixed(2)
    return data
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}

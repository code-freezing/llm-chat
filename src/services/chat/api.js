import { API_BASE_URL } from '@/config/env'
import { useSettingStore } from '@/stores/setting'

export const createChatCompletion = async (messages) => {
  const settingStore = useSettingStore()
  // 请求体直接来自 setting store，确保界面上的配置和真正发出的参数保持一致。
  const payload = {
    model: settingStore.settings.model,
    messages,
    stream: settingStore.settings.stream,
    max_tokens: settingStore.settings.maxTokens,
    temperature: settingStore.settings.temperature,
    top_p: settingStore.settings.topP,
    top_k: settingStore.settings.topK,
  }

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

    // 如果当前是流式模式，这里不直接解析内容，
    // 而是把原始 Response 交给 messageHandler 逐段读取 body。
    if (settingStore.settings.stream) {
      return response
    }

    // 非流式模式下接口直接返回完整 JSON，因此在这里一次性读取即可。
    const data = await response.json()
    const duration = (Date.now() - startTime) / 1000
    data.speed = (data.usage.completion_tokens / duration).toFixed(2)
    return data
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}

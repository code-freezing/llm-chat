import { API_BASE_URL } from '@/config/env'
import { useSettingStore } from '@/stores/setting'

export const createChatCompletion = async (messages) => {
  const settingStore = useSettingStore()
  // 请求体直接映射设置面板中的参数，确保界面配置和接口调用一致。
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
    // 非流式响应会一次性返回完整结果，这里顺手记录生成速度。
    const startTime = Date.now()
    const response = await fetch(`${API_BASE_URL}/chat/completions`, options)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 流式模式把原始 Response 交给上层逐段解析。
    if (settingStore.settings.stream) {
      return response
    }

    const data = await response.json()
    const duration = (Date.now() - startTime) / 1000
    data.speed = (data.usage.completion_tokens / duration).toFixed(2)
    return data
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}

export const messageHandler = {
  // 统一消息结构，方便 store 和组件按同一数据格式消费。
  formatMessage(role, content, reasoning_content = '', files = []) {
    return {
      id: Date.now(),
      role,
      content,
      reasoning_content,
      files,
      completion_tokens: 0,
      speed: 0,
      loading: false,
    }
  },

  async handleStreamResponse(response, updateCallback) {
    // 逐段读取流式输出，并把累计结果回传给页面更新最后一条消息。
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulatedContent = ''
    let accumulatedReasoning = ''
    const startTime = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')

      for (const line of lines) {
        if (line === 'data: [DONE]') continue
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(5))
          const content = data.choices[0].delta.content || ''
          const reasoning = data.choices[0].delta.reasoning_content || ''

          accumulatedContent += content
          accumulatedReasoning += reasoning

          updateCallback(
            accumulatedContent,
            accumulatedReasoning,
            data.usage?.completion_tokens || 0,
            ((data.usage?.completion_tokens || 0) / ((Date.now() - startTime) / 1000)).toFixed(2),
          )
        }
      }
    }
  },

  handleNormalResponse(response, updateCallback) {
    // 非流式模式只需要把最终结果回填一次。
    updateCallback(
      response.choices[0].message.content,
      response.choices[0].message.reasoning_content || '',
      response.usage.completion_tokens,
      response.speed,
    )
  },

  async handleResponse(response, isStream, updateCallback) {
    // 对外暴露统一入口，屏蔽流式和非流式解析差异。
    if (isStream) {
      await this.handleStreamResponse(response, updateCallback)
    } else {
      this.handleNormalResponse(response, updateCallback)
    }
  },
}

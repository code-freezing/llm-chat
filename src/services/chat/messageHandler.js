export const messageHandler = {
  // 统一构造消息对象，让不同来源的消息都保持一致结构。
  formatMessage(role, content, reasoning_content = '', files = []) {
    return {
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
    // 流式响应不能直接一次性 `json()` 读取，而要持续消费 response.body 中的数据块。
    // 服务端推送的是增量 token，因此这里需要手动把内容累计成完整结果。
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
          // 每一行 `data: ...` 都是一段 SSE 风格的增量数据。
          const data = JSON.parse(line.slice(5))
          const content = data.choices[0].delta.content || ''
          const reasoning = data.choices[0].delta.reasoning_content || ''

          // 页面展示需要的是“当前完整内容”，不是单次增量，因此这里自己做累计。
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
    // 非流式模式已经直接拿到了最终答案，因此只需要回填一次。
    updateCallback(
      response.choices[0].message.content,
      response.choices[0].message.reasoning_content || '',
      response.usage.completion_tokens,
      response.speed,
    )
  },

  async handleResponse(response, isStream, updateCallback) {
    // 对外暴露统一入口，让页面层不必显式区分流式和非流式解析逻辑。
    if (isStream) {
      await this.handleStreamResponse(response, updateCallback)
    } else {
      this.handleNormalResponse(response, updateCallback)
    }
  },
}

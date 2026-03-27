const SSE_EVENT_DELIMITER = '\n\n'
const DONE_EVENT = '[DONE]'

// 不同服务端和运行环境可能混用 `\r\n`、`\r`、`\n`，
// 先统一换成 `\n`，这样后续就可以按同一套 SSE 分隔规则处理。
const normalizeSSEChunk = (chunk) => chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

// SSE 协议里，一个完整事件通常以空行结尾。
// 这里从累计缓冲区中尽可能提取“已经收完整”的事件，
// 没收完整的尾部内容继续留在 remaining，等待下一个 chunk 拼上来。
const extractSSEEvents = (buffer) => {
  const events = []
  let remaining = buffer

  while (true) {
    const delimiterIndex = remaining.indexOf(SSE_EVENT_DELIMITER)
    if (delimiterIndex === -1) break

    events.push(remaining.slice(0, delimiterIndex))
    remaining = remaining.slice(delimiterIndex + SSE_EVENT_DELIMITER.length)
  }

  return { events, remaining }
}

// 一个 SSE 事件里可能包含多行 `data:`，协议语义是把这些 data 行按换行拼起来。
// 这里不关心 `event:`、`id:` 等字段，因为当前聊天接口只用 `data:` 传 JSON 载荷。
// 如果一个事件里根本没有 `data:`，就返回 null，让上层直接忽略。
const parseSSEEventData = (eventChunk) => {
  const dataLines = eventChunk
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())

  if (dataLines.length === 0) return null

  return dataLines.join('\n')
}

// 速度展示依赖“累计 completion tokens / 已耗时秒数”。
// 流式首包很快到达时，耗时可能非常接近 0，因此这里设一个极小下限，避免除零。
const calculateSpeed = (completionTokens, startTime) => {
  const elapsedSeconds = Math.max((Date.now() - startTime) / 1000, 0.001)
  return (completionTokens / elapsedSeconds).toFixed(2)
}

export const messageHandler = {
  // 统一构造消息对象，让不同来源的消息都保持一致结构。
  formatMessage(role, content, reasoning_content = '') {
    return {
      role,
      content,
      reasoning_content,
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
    // buffer 保存“还不能安全解析”的尾部内容。
    // 典型场景是一个 JSON 事件被网络拆成了前半段和后半段，这时必须先缓存前半段。
    let buffer = ''
    let accumulatedContent = ''
    let accumulatedReasoning = ''
    const startTime = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      // `TextDecoder` 开启 stream 模式后，会正确处理多字节字符跨 chunk 的情况，
      buffer += normalizeSSEChunk(decoder.decode(value, { stream: !done }))

      // 每次只消费已经完整结束的 SSE 事件，未结束的尾巴继续留在 buffer 中。
      const { events, remaining } = extractSSEEvents(buffer)
      buffer = remaining
      for (const eventChunk of events) {
        const eventData = parseSSEEventData(eventChunk)
        // `[DONE]` 是很多兼容 OpenAI 的流式接口都会发送的结束标记，
        // 它不是 JSON 载荷，因此要在这里提前跳过。
        if (!eventData || eventData === DONE_EVENT) continue
        // 一个 SSE 事件可能被拆成多个 chunk，也可能包含多行 data，这里只在事件完整后再解析 JSON。
        const data = JSON.parse(eventData)
        const delta = data.choices?.[0]?.delta || {}
        const content = delta.content || ''
        const reasoning = delta.reasoning_content || ''
        const completionTokens = data.usage?.completion_tokens || 0

        // 页面展示需要的是“当前完整内容”，不是单次增量，因此这里自己做累计。
        accumulatedContent += content
        accumulatedReasoning += reasoning

        updateCallback(
          accumulatedContent,
          accumulatedReasoning,
          completionTokens,
          calculateSpeed(completionTokens, startTime),
        )
      }

      if (done) break
    }

    // 某些服务端在流结束前不一定补上最后一个空行分隔符。
    // 因此循环结束后，再尝试把 buffer 里残留的最后一个事件按完整事件处理一次。
    const finalEventData = parseSSEEventData(buffer.trim())
    if (finalEventData && finalEventData !== DONE_EVENT) {
      const data = JSON.parse(finalEventData)
      const delta = data.choices?.[0]?.delta || {}
      const content = delta.content || ''
      const reasoning = delta.reasoning_content || ''
      const completionTokens = data.usage?.completion_tokens || 0

      accumulatedContent += content
      accumulatedReasoning += reasoning

      updateCallback(
        accumulatedContent,
        accumulatedReasoning,
        completionTokens,
        calculateSpeed(completionTokens, startTime),
      )
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

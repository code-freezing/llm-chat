import { useSettingStore } from '@/stores/setting'
import { createChatCompletion } from '@/services/chat/api'
import { messageHandler } from '@/services/chat/messageHandler'

const createLocalMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const MAX_CONTEXT_MESSAGES = 16
const SUMMARY_MAX_TOKENS = 400
const SUMMARY_SYSTEM_PROMPT = `你是一个对话摘要助手。
请把给定的旧对话整理成一段简洁、连续、可供后续模型继续使用的上下文摘要。
保留以下信息：
1. 用户的核心目标、偏好、约束和结论
2. 已经确认的事实、方案、决定和待办
3. 对后续回答仍有价值的上下文

不要写寒暄，不要重复无关细节，不要使用项目符号，直接输出摘要正文。`

// “重新生成”真正依赖的不是“最后两条消息”，
// 而是“最后一个 assistant 回复”以及它前面最近的一条 user 消息。
// 这里显式把这一轮问答找出来，避免后续消息结构稍有变化就删错消息。
const getLastRegeneratableTurn = (messageList) => {
  const assistantIndex = messageList.findLastIndex((message) => message.role === 'assistant')
  if (assistantIndex === -1) return null

  const userIndex = messageList.findLastIndex(
    (message, index) => index < assistantIndex && message.role === 'user',
  )
  if (userIndex === -1) return null

  return {
    userMessage: messageList[userIndex],
    startIndex: userIndex,
    deleteCount: assistantIndex - userIndex + 1,
  }
}

const summarizeMessageContent = (content) => {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 120)}...`
}

// 摘要请求不需要把完整 UI 消息对象原样发给模型，只需要稳定、可读的对话文本。
// 这里把旧消息整理成“用户/助手：内容”的连续文本，方便摘要模型抓取上下文重点。
const buildSummaryTranscript = (messageList) => {
  return messageList
    .map((message) => {
      const roleLabel = message.role === 'user' ? '用户' : '助手'
      return `- ${roleLabel}：${summarizeMessageContent(message.content || '')}`
    })
    .join('\n')
}

// 每次压缩时，把“已有摘要 + 新进入压缩区的旧消息”一起交给模型重写成一段新摘要。
// 这样摘要内容会随着对话推进不断迭代，而不是简单地把摘要和新片段生硬拼接在一起。
const buildSummaryMessages = (currentSummary, messageList) => {
  const summaryContext = currentSummary?.trim()
    ? `已有摘要：\n${currentSummary.trim()}`
    : '已有摘要：\n无'
  const transcript = buildSummaryTranscript(messageList)

  return [
    {
      role: 'system',
      content: SUMMARY_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `${summaryContext}\n\n需要压缩的新对话：\n${transcript}`,
    },
  ]
}

const extractSummaryContent = (response) => {
  return response.choices?.[0]?.message?.content?.trim() || ''
}

// 第一阶段先用滑动窗口控制上下文长度：
// 每次请求只保留最近一段有效消息，避免历史无限增长导致 token 持续膨胀。
// 这里的“有效消息”会排除当前轮为了 UI 流式展示而临时插入的空 assistant 占位消息。
const getEffectiveMessages = (messageList) => {
  return messageList.filter((message) => {
    return !(message.role === 'assistant' && message.loading && !message.content)
  })
}

const getContextMessages = (messageList) => {
  return getEffectiveMessages(messageList)
    .slice(-MAX_CONTEXT_MESSAGES)
    .map(({ role, content }) => ({ role, content }))
}

// 这个组合式函数只负责“聊天流程编排”：
// - 写入用户消息
// - 插入 assistant 占位消息
// - 发起请求
// - 把响应回填到最后一条 assistant 消息
// 页面组件只需要提供自己的消息读写方式，不再直接拼整条聊天流程。
export const useChatSession = ({
  messages,
  setLoading,
  addMessage,
  getLastMessage,
  createLocalMessage,
  getSummary,
  setSummary,
}) => {
  const settingStore = useSettingStore()

  // SearchDialog 的消息存在组件本地，需要自己补 id；
  // ChatView 走的是 store，store 已经会补 id 和时间戳，因此这里允许外部覆盖。
  const buildMessage = createLocalMessage || ((message) => ({ id: createLocalMessageId(), ...message }))

  // 历史消息超过窗口后，不再用本地规则直接拼摘要，
  // 而是额外发起一次“摘要请求”，让模型把旧上下文压成一段更自然、更可用的 summary。
  // 摘要失败时不裁掉旧消息，避免在压缩失败的情况下直接造成上下文丢失。
  const compressConversation = async () => {
    const effectiveMessages = getEffectiveMessages(messages.value)
    if (effectiveMessages.length <= MAX_CONTEXT_MESSAGES) return

    const messagesToCompress = effectiveMessages.slice(0, -MAX_CONTEXT_MESSAGES)
    const recentMessages = effectiveMessages.slice(-MAX_CONTEXT_MESSAGES)

    try {
      const summaryResponse = await createChatCompletion(
        buildSummaryMessages(getSummary(), messagesToCompress),
        {
          stream: false,
          maxTokens: SUMMARY_MAX_TOKENS,
        },
      )
      const nextSummary = extractSummaryContent(summaryResponse)
      if (!nextSummary) return

      setSummary(nextSummary)
      messages.value.splice(0, messages.value.length, ...recentMessages)
    } catch (error) {
      console.error('Failed to generate conversation summary:', error)
    }
  }

  const getMessagesForAPI = () => {
    const requestMessages = getContextMessages(messages.value)

    // 摘要不作为普通聊天消息展示，而是在请求时作为一条额外的 system 消息补回模型上下文。
    if (getSummary()) {
      requestMessages.unshift({
        role: 'system',
        content: getSummary(),
      })
    }

    // system prompt 不属于用户聊天记录本身，而是每次请求前附加的一层“全局行为约束”。
    // 因此它不写入消息历史，只在真正发请求时统一插到最前面。
    if (settingStore.settings.systemPrompt.trim()) {
      requestMessages.unshift({
        role: 'system',
        content: settingStore.settings.systemPrompt.trim(),
      })
    }

    return requestMessages
  }

  const fillAssistantMessage = (message, content, reasoningContent, completionTokens, speed) => {
    message.content = content
    message.reasoning_content = reasoningContent
    message.completion_tokens = completionTokens
    message.speed = speed
  }

  const handleSend = async (messageContent) => {
    let assistantMessage = null

    try {
      // 先写入用户消息，再补一条空的 assistant 消息占位。
      // 这样无论接口是流式还是非流式，都能统一回填到最后一条助手消息。
      addMessage(buildMessage(messageHandler.formatMessage('user', messageContent.text, '', messageContent.files)))
      await compressConversation()
      addMessage(buildMessage(messageHandler.formatMessage('assistant', '', '')))

      setLoading(true)
      assistantMessage = getLastMessage()
      assistantMessage.loading = true

      const response = await createChatCompletion(getMessagesForAPI())

      // 统一把响应交给 messageHandler，页面层不需要关心流式和非流式的解析差异。
      await messageHandler.handleResponse(
        response,
        settingStore.settings.stream,
        (content, reasoningContent, completionTokens, speed) => {
          fillAssistantMessage(
            assistantMessage,
            content,
            reasoningContent,
            completionTokens,
            speed,
          )
        },
      )
    } catch (error) {
      console.error('Failed to send message:', error)
      if (assistantMessage) {
        assistantMessage.content = '抱歉，发生了一些错误，请稍后重试。'
      }
    } finally {
      setLoading(false)
      if (assistantMessage) {
        assistantMessage.loading = false
      }
    }
  }

  const handleRegenerate = async () => {
    // 重新生成时，优先按“最后一个 assistant + 它前面的最近一条 user”定位最后一轮问答。
    // 这样即使中间插入了别的消息类型，或者消息条数不再恰好是最后两条，也不会误删。
    const lastTurn = getLastRegeneratableTurn(messages.value)
    if (!lastTurn) return

    messages.value.splice(lastTurn.startIndex, lastTurn.deleteCount)
    await handleSend({ text: lastTurn.userMessage.content, files: lastTurn.userMessage.files || [] })
  }

  return {
    handleSend,
    handleRegenerate,
  }
}

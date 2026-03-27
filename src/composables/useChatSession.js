import { useSettingStore } from '@/stores/setting'
import { createChatCompletion } from '@/services/chat/api'
import { messageHandler } from '@/services/chat/messageHandler'

const createLocalMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
}) => {
  const settingStore = useSettingStore()

  // SearchDialog 的消息存在组件本地，需要自己补 id；
  // ChatView 走的是 store，store 已经会补 id 和时间戳，因此这里允许外部覆盖。
  const buildMessage = createLocalMessage || ((message) => ({ id: createLocalMessageId(), ...message }))

  const getMessagesForAPI = () => {
    return messages.value.map(({ role, content }) => ({ role, content }))
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

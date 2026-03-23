import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const DEFAULT_CONVERSATION_TITLE = '日常问答'

export const useChatStore = defineStore(
  'llm-chat',
  () => {
    // conversations 是聊天域的核心状态，所有会话都保存在这里。
    const conversations = ref([
      {
        id: '1',
        title: DEFAULT_CONVERSATION_TITLE,
        messages: [],
        createdAt: Date.now(),
      },
    ])

    const currentConversationId = ref('1')
    const isLoading = ref(false)

    // 当前会话通过 id 派生，避免维护重复状态。
    const currentConversation = computed(() => {
      return conversations.value.find(
        (conversation) => conversation.id === currentConversationId.value,
      )
    })

    // 页面主要消费当前消息列表，不直接依赖整个会话数组。
    const currentMessages = computed(() => currentConversation.value?.messages || [])

    const createConversation = () => {
      const newConversation = {
        id: Date.now().toString(),
        title: DEFAULT_CONVERSATION_TITLE,
        messages: [],
        createdAt: Date.now(),
      }

      conversations.value.unshift(newConversation)
      currentConversationId.value = newConversation.id
    }

    const switchConversation = (conversationId) => {
      currentConversationId.value = conversationId
    }

    const addMessage = (message) => {
      if (!currentConversation.value) return

      // 消息入库时统一补充本地 id 和时间戳。
      currentConversation.value.messages.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...message,
      })
    }

    const setIsLoading = (value) => {
      isLoading.value = value
    }

    const updateLastMessage = (content, reasoning_content, completion_tokens, speed) => {
      if (!currentConversation.value?.messages.length) return

      // 流式响应会反复更新最后一条助手消息，因此单独封装这个方法。
      const lastMessage =
        currentConversation.value.messages[currentConversation.value.messages.length - 1]

      lastMessage.content = content
      lastMessage.reasoning_content = reasoning_content
      lastMessage.completion_tokens = completion_tokens
      lastMessage.speed = speed
    }

    const getLastMessage = () => {
      if (!currentConversation.value?.messages.length) return null

      return currentConversation.value.messages[currentConversation.value.messages.length - 1]
    }

    const updateConversationTitle = (conversationId, newTitle) => {
      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (conversation) {
        conversation.title = newTitle
      }
    }

    const deleteConversation = (conversationId) => {
      const index = conversations.value.findIndex((item) => item.id === conversationId)
      if (index === -1) return

      conversations.value.splice(index, 1)

      if (conversations.value.length === 0) {
        createConversation()
        return
      }

      if (conversationId === currentConversationId.value) {
        currentConversationId.value = conversations.value[0].id
      }
    }

    return {
      conversations,
      currentConversationId,
      currentConversation,
      currentMessages,
      isLoading,
      addMessage,
      setIsLoading,
      updateLastMessage,
      getLastMessage,
      createConversation,
      switchConversation,
      updateConversationTitle,
      deleteConversation,
    }
  },
  {
    persist: true,
  },
)

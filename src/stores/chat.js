import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const DEFAULT_CONVERSATION_TITLE = '日常问答'

export const useChatStore = defineStore(
  'llm-chat',
  () => {
    // conversations 是聊天域的核心数据源。
    // 历史会话列表、当前会话和当前消息，最终都从这里派生。
    const conversations = ref([
      {
        id: '1',
        title: DEFAULT_CONVERSATION_TITLE,
        summary: '',
        messages: [],
        createdAt: Date.now(),
      },
    ])

    const currentConversationId = ref('1')
    const isLoading = ref(false)

    // 当前会话通过当前 id 从 conversations 中派生出来，
    // 这样可以避免单独维护一份 currentConversation 对象导致的状态不同步。
    const currentConversation = computed(() => {
      return conversations.value.find(
        (conversation) => conversation.id === currentConversationId.value,
      )
    })

    // 页面最常消费的是当前消息列表，因此单独暴露一个衍生值给页面层使用。
    const currentMessages = computed(() => currentConversation.value?.messages || [])

    const createConversation = () => {
      const newConversation = {
        id: Date.now().toString(),
        title: DEFAULT_CONVERSATION_TITLE,
        summary: '',
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

      // 每条消息入库时统一补充本地 id 和时间戳，
      // 这样 UI 层可以默认认为消息具备完整基础字段。
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

      // 当前项目采用“先插入空 assistant 消息，再持续回填”的回复策略，
      // 因此更新助手回复时，直接改最后一条消息即可。
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

    // 允许用户在界面上直接修改会话标题。
    const updateConversationTitle = (conversationId, newTitle) => {
      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (conversation) {
        conversation.title = newTitle
      }
    }

    const updateConversationSummary = (conversationId, summary) => {
      const conversation = conversations.value.find((item) => item.id === conversationId)
      if (conversation) {
        conversation.summary = summary
      }
    }

    const deleteConversation = (conversationId) => {
      const index = conversations.value.findIndex((item) => item.id === conversationId)
      if (index === -1) return

      conversations.value.splice(index, 1)

      // 如果删完后没有任何会话，就自动补一个默认会话，
      // 避免页面进入没有当前会话可渲染的状态。
      if (conversations.value.length === 0) {
        createConversation()
        return
      }

      // 如果删掉的是当前会话，就把当前会话切到剩余列表第一项。
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
      updateConversationSummary,
      deleteConversation,
    }
  },
  {
    // 会话状态持久化到本地，刷新页面后仍然可以恢复对话历史。
    persist: true,
  },
)

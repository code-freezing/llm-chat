<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-left">
        <PopupMenu ref="popupMenu" />
        <el-button class="new-chat-btn" :icon="Plus" @click="handleNewChat">新对话</el-button>
        <div class="divider"></div>
        <div class="title-wrapper">
          <h1 class="chat-title">{{ formatTitle(currentTitle) }}</h1>
          <button
            class="edit-btn"
            @click="dialogEdit.openDialog(chatStore.currentConversationId, 'edit')"
          >
            <img src="@/assets/photo/编辑.png" alt="edit" />
          </button>
        </div>
      </div>

      <div class="header-right">
        <el-tooltip content="设置" placement="top">
          <button class="action-btn" @click="settingDrawer.openDrawer()">
            <img src="@/assets/photo/设置.png" alt="settings" />
          </button>
        </el-tooltip>
        <el-tooltip content="回到首页" placement="top">
          <button class="action-btn" @click="handleBack">
            <img src="@/assets/photo/返回.png" alt="back" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <template v-if="currentMessages.length > 0">
        <ChatMessage
          v-for="(message, index) in currentMessages"
          :key="message.id"
          :message="message"
          :is-last-assistant-message="
            index === currentMessages.length - 1 && message.role === 'assistant'
          "
          @regenerate="handleRegenerate"
        />
      </template>
      <div v-else class="empty-state">
        <div class="empty-content">
          <img src="@/assets/photo/对话.png" alt="chat" class="empty-icon" />
          <h2>开始对话吧</h2>
          <p>有什么想和我聊的吗？</p>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <ChatInput :loading="isLoading" @send="handleSend" />
    </div>

    <SettingsPanel ref="settingDrawer" />
    <DialogEdit ref="dialogEdit" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

import ChatInput from '@/components/ChatInput.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import DialogEdit from '@/components/DialogEdit.vue'
import PopupMenu from '@/components/PopupMenu.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import { createChatCompletion } from '@/services/chat/api'
import { messageHandler } from '@/services/chat/messageHandler'
import { useChatStore } from '@/stores/chat'
import { useSettingStore } from '@/stores/setting'

// ChatView 是聊天页的业务协调层。
// 页面输入、会话状态、接口请求和消息展示都会在这里汇合。
const chatStore = useChatStore()
const settingStore = useSettingStore()
const router = useRouter()

// 页面模板主要消费这几个衍生状态，而不是直接在模板里操作完整 store 结构。
const currentMessages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoading)
const currentTitle = computed(() => chatStore.currentConversation?.title || 'LLM Chat')

// 这些 ref 分别对应消息容器或子组件实例：
// - messagesContainer 用于控制滚动位置
// - settingDrawer / dialogEdit 用于调用子组件暴露的方法
const messagesContainer = ref(null)
const settingDrawer = ref(null)
const popupMenu = ref(null)
const dialogEdit = ref(null)

// 聊天界面最常见的交互就是“始终看到最后一条消息”，
// 因此只要当前消息列表变化，就把滚动条推到底部。
watch(
  currentMessages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { deep: true },
)

onMounted(() => {
  // 首次进入页面时，如果本地已恢复出历史消息，也需要滚动到最底部。
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })

  // 做一层兜底，避免页面在“没有当前会话”的状态下工作。
  if (chatStore.conversations.length === 0) {
    chatStore.createConversation()
  }
})

const handleSend = async (messageContent) => {
  try {
    // 第一步：先把用户输入写入当前会话。
    chatStore.addMessage(
      messageHandler.formatMessage('user', messageContent.text, '', messageContent.files),
    )

    // 第二步：立刻插入一条空的 assistant 消息作为占位。
    // 后续无论接口是流式还是非流式，都统一更新最后一条助手消息。
    chatStore.addMessage(messageHandler.formatMessage('assistant', '', ''))

    // 第三步：把页面切到生成中状态，并把占位消息标记为 loading。
    chatStore.setIsLoading(true)
    const lastMessage = chatStore.getLastMessage()
    lastMessage.loading = true

    // 第四步：从当前会话提取接口真正需要的上下文格式。
    // 这里仅保留 role 和 content，不把本地展示字段发送给模型接口。
    const messages = chatStore.currentMessages.map(({ role, content }) => ({ role, content }))
    const response = await createChatCompletion(messages)

    // 第五步：把响应交给统一的消息处理器。
    // 它会根据 stream 开关走不同解析逻辑，但最终都通过同一个回调回写 store。
    await messageHandler.handleResponse(
      response,
      settingStore.settings.stream,
      (content, reasoning_content, tokens, speed) => {
        chatStore.updateLastMessage(content, reasoning_content, tokens, speed)
      },
    )
  } catch (error) {
    console.error('Failed to send message:', error)
    chatStore.updateLastMessage('抱歉，发生了一些错误，请稍后重试。')
  } finally {
    chatStore.setIsLoading(false)
    const lastMessage = chatStore.getLastMessage()
    if (lastMessage) {
      lastMessage.loading = false
    }
  }
}

const handleRegenerate = async () => {
  try {
    // 重新生成的实现很直接：
    // 删除最后一轮 user + assistant，再把上一条用户消息重新走一遍发送流程。
    const lastUserMessage = chatStore.currentMessages[chatStore.currentMessages.length - 2]
    chatStore.currentMessages.splice(-2, 2)
    await handleSend({ text: lastUserMessage.content, files: lastUserMessage.files })
  } catch (error) {
    console.error('Failed to regenerate message:', error)
  }
}

const handleNewChat = () => {
  chatStore.createConversation()
}

// 顶部标题空间有限，因此只做一个非常轻量的截断展示。
const formatTitle = (title) => {
  return title.length > 12 ? `${title.slice(0, 12)}...` : title
}

const handleBack = async () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--bg-color);
  border-bottom: 1px solid #ffffff;

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;

    .action-btn {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      img {
        width: 1.4rem;
        height: 1.4rem;
        opacity: 1;
        transition: filter 0.2s;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
    }

    .new-chat-btn {
      font-size: 0.8rem;
      height: 2rem;
      padding: 0 0.5rem;
      display: inline-flex;
      align-items: center;
      line-height: 1;
      border-radius: 9999px;
      border: 1px solid #3f7af1;
      background-color: #ffffff;
      color: #3f7af1;

      &:hover {
        background-color: #3f7af1;
        border-color: #3f7af1;
        color: #ffffff;
      }

      :deep(.el-icon) {
        margin-right: 4px;
        font-size: 0.875rem;
      }
    }

    .divider {
      height: 1.5rem;
      width: 1px;
      background-color: #e5e7eb;
      margin: 0 0.2rem;
    }

    .title-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .chat-title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-color-primary);
      }

      .edit-btn {
        opacity: 0;
        width: 0.9rem;
        height: 0.9rem;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease;

        img {
          width: 100%;
          height: 100%;
        }
      }

      &:hover {
        .edit-btn {
          opacity: 1;
        }
      }
    }
  }

  .header-right {
    display: flex;
    gap: 0.5rem;

    .action-btn {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      img {
        width: 1.25rem;
        height: 1.25rem;
        opacity: 1;
        transition: filter 0.2s;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

        img {
          filter: brightness(0.4);
        }
      }
    }
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem;
  background-color: var(--bg-color-secondary);
  max-width: 796px;
  min-width: 0;
  margin: 0 auto;
  width: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #ddd;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;

  .empty-content {
    text-align: center;

    .empty-icon {
      width: 64px;
      height: 64px;
      opacity: 0.6;
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--text-color-primary);
      margin-bottom: 0.5rem;
    }

    p {
      font-size: 1rem;
      color: var(--text-color-secondary);
      margin: 0;
    }
  }
}

.chat-input-container {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bg-color);
  z-index: 10;
  padding: 0.6rem;
  max-width: 796px;
  margin: 0 auto;
  width: 100%;
}
</style>

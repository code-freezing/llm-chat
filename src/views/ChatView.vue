<template>
  <!-- 聊天页由“顶部工具栏 + 消息区 + 输入区”三段组成。 -->
  <div class="chat-container">
    <div class="chat-header">
      <div class="header-left">
        <PopupMenu />
        <el-button class="new-chat-btn" :icon="Plus" @click="handleNewChat">新对话</el-button>
        <div class="divider"></div>
        <div class="title-wrapper">
          <h1 class="chat-title">{{ formatTitle(currentTitle) }}</h1>
          <button class="edit-btn" @click="handleEditConversation">
            <img src="@/assets/photo/编辑.png" alt="edit" />
          </button>
        </div>
      </div>

      <div class="header-right">
        <el-tooltip content="设置" placement="top">
          <button class="action-btn" @click="handleOpenSettings">
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

    <VirtualMessageList
      v-if="currentMessages.length > 0"
      ref="messagesContainer"
      class="messages-container"
      :items="currentMessages"
      :item-key="getMessageKey"
    >
      <template #default="{ item: message, index }">
        <!-- 只有最后一条 assistant 消息才允许触发“重新生成”。 -->
        <ChatMessage
          :message="message"
          :is-last-assistant-message="
            index === currentMessages.length - 1 && message.role === 'assistant'
          "
          @regenerate="handleRegenerate"
        />
      </template>
    </VirtualMessageList>
    <div v-else class="messages-container">
      <!-- 空状态只在当前会话尚未产生任何消息时展示。 -->
      <div class="empty-state">
        <div class="empty-content">
          <img src="@/assets/photo/对话.png" alt="chat" class="empty-icon" />
          <h2>开始对话吧</h2>
          <p>有什么想和我聊的吗？</p>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <!-- 输入组件只负责收集文本，发送动作仍由当前页面驱动。 -->
      <ChatInput :loading="isLoading" @send="handleSend" />
    </div>

    <SettingsPanel ref="settingDrawer" />
    <DialogEdit ref="dialogEdit" />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

import ChatInput from '@/components/ChatInput.vue'
import ChatMessage from '@/components/ChatMessage.vue'
import PopupMenu from '@/components/PopupMenu.vue'
import VirtualMessageList from '@/components/VirtualMessageList.vue'
import { useAutoScroll } from '@/composables/useAutoScroll'
import { useChatSession } from '@/composables/useChatSession'
import { useChatStore } from '@/stores/chat'

const SettingsPanel = defineAsyncComponent(() => import('@/components/SettingsPanel.vue'))
const DialogEdit = defineAsyncComponent(() => import('@/components/DialogEdit.vue'))
// 设置面板和编辑弹窗按需异步加载，减少首屏进入聊天页时的同步体积。

// ChatView 是聊天页的业务协调层，现在它主要负责页面展示和页面级交互，具体聊天流程交给组合式函数处理。
const chatStore = useChatStore()
const router = useRouter()

// 页面模板主要消费这几个衍生状态，而不是直接在模板里操作完整 store 结构。
const currentMessages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoading)
const currentTitle = computed(() => chatStore.currentConversation?.title || 'LLM Chat')

// 这些 ref 分别对应消息容器或子组件实例：messagesContainer 用于控制滚动位置，settingDrawer 和 dialogEdit 用于调用子组件暴露的方法。
const messagesContainer = ref(null)
const settingDrawer = ref(null)
const dialogEdit = ref(null)

useAutoScroll(currentMessages, messagesContainer)

onMounted(() => {
  // 做一层兜底，避免页面在“没有当前会话”的状态下工作。
  if (chatStore.conversations.length === 0) {
    chatStore.createConversation()
  }
})

// useChatSession 只依赖一组“读写消息”的能力，因此这里通过回调把 store 行为注入进去。
const { handleSend, handleRegenerate } = useChatSession({
  messages: currentMessages,
  setLoading: (value) => {
    chatStore.setIsLoading(value)
  },
  addMessage: (message) => {
    chatStore.addMessage(message)
  },
  getLastMessage: () => chatStore.getLastMessage(),
  createLocalMessage: (message) => message,
  getSummary: () => chatStore.currentConversation?.summary || '',
  setSummary: (summary) => {
    chatStore.updateConversationSummary(chatStore.currentConversationId, summary)
  },
})

const handleNewChat = () => {
  chatStore.createConversation()
}

// 虚拟列表需要稳定 key 识别消息项和高度缓存。
const getMessageKey = (message) => message.id

const handleOpenSettings = async () => {
  await nextTick()
  settingDrawer.value?.openDrawer()
}

const handleEditConversation = async () => {
  await nextTick()
  dialogEdit.value?.openDialog(chatStore.currentConversationId, 'edit')
}

// 顶部标题空间有限，因此只做一个非常轻量的截断展示。
const formatTitle = (title) => {
  return title.length > 12 ? `${title.slice(0, 12)}...` : title
}

const handleBack = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.chat-container {
  // 聊天页固定占满整个视口，高度由自身管理。
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
      // 新对话按钮做成浅描边胶囊，和菜单按钮形成层级区分。
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
        // 编辑按钮默认隐藏，只在 hover 标题区域时出现，降低常驻噪音。
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
  // 消息区域本身也是一个居中内容容器，避免超宽屏上阅读行长过长。
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
  // 空态与真实消息区复用同一块容器，只替换内部内容。
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
  // 输入区吸附在底部，保证长消息滚动时也能稳定停留在页面下方。
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

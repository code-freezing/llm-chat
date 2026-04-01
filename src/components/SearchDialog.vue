<template>
  <!-- 首页搜索弹层复用聊天链路，但交互更轻量。 -->
  <div class="search-dialog">
    <div class="search-header">
      <div class="search-input">
        <input
          v-model="searchText"
          type="text"
          placeholder="提问"
          autofocus
          @keydown.enter.prevent="handleSend"
        />
        <button class="action-btn" :disabled="isLoading" @click="handleSend">
          <img src="@/assets/photo/回车.png" alt="enter" />
        </button>
      </div>
    </div>

    <div v-if="messages.length === 0" class="dialog-content">
      <!-- 初始状态先展示一段欢迎语和建议提示词。 -->
      <div class="initial-message">
        {{ aiMessage }}
      </div>

      <div class="suggested-prompts">
        <div class="prompt-title">建议提示词</div>
        <div class="prompt-list">
          <button
            v-for="prompt in suggestedPrompts"
            :key="prompt"
            class="prompt-item"
            @click="searchText = prompt"
          >
            {{ prompt }}
          </button>
        </div>
      </div>
    </div>

    <VirtualMessageList
      v-else
      ref="messagesContainer"
      class="dialog-content"
      :items="messages"
      :item-key="getMessageKey"
      :estimate-size="220"
    >
      <template #default="{ item: message, index }">
        <!-- 与聊天页共用消息组件，保持渲染和操作体验一致。 -->
        <ChatMessage
          :message="message"
          :is-last-assistant-message="index === messages.length - 1 && message.role === 'assistant'"
          @regenerate="handleRegenerate"
        />
      </template>
    </VirtualMessageList>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChatMessage from './ChatMessage.vue'
import VirtualMessageList from './VirtualMessageList.vue'
import { useAutoScroll } from '@/composables/useAutoScroll'
import { useChatSession } from '@/composables/useChatSession'

// SearchDialog 是首页里的轻量提问弹层；它复用了聊天请求与消息渲染能力，但消息状态只保存在本组件内部。
const searchText = ref('')
const messages = ref([])
const isLoading = ref(false)
const summary = ref('')

const aiMessage = 'Hi，我是你的 AI 小助手，有什么问题都可以问我。'

// 初始推荐问题用于帮助用户快速试用接口，不会自动发送。
const suggestedPrompts = [
  '如何快速上手 Vue 3 框架',
  '字节跳动前端面试难吗',
  '前端如何实现弹性布局',
  '喝酒脸红代表酒量好吗',
]

const messagesContainer = ref(null)

useAutoScroll(messages, messagesContainer)

// SearchDialog 不依赖全局会话 store，而是把“消息数组 + 摘要字符串”都留在组件本地。
const { handleSend: sendMessage, handleRegenerate } = useChatSession({
  messages,
  setLoading: (value) => {
    isLoading.value = value
  },
  addMessage: (message) => {
    messages.value.push(message)
  },
  getLastMessage: () => messages.value[messages.value.length - 1],
  getSummary: () => summary.value,
  setSummary: (value) => {
    summary.value = value
  },
})

const handleSend = async () => {
  if (!searchText.value.trim() || isLoading.value) return

  const text = searchText.value.trim()
  searchText.value = ''
  await sendMessage({ text })
}

const getMessageKey = (message) => message.id
</script>

<style lang="scss" scoped>
.search-dialog {
  // 弹层限制最大高度，内部内容超出后在自身滚动。
  max-width: 640px;
  min-width: 320px;
  max-height: 600px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .search-header {
    flex-shrink: 0;
    padding: 12px;
    border-bottom: 1px solid #eaeaea;

    .search-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      position: relative;

      input {
        flex: 1;
        height: 100%;
        border: none;
        outline: none;
        background: none;
        font-size: 1rem;
        color: #000;
        padding-right: 40px;

        &::placeholder {
          color: #999;
        }
      }

      .action-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 28px;
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;

        img {
          width: 16px;
          height: 16px;
        }

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
      }
    }
  }

  .dialog-content {
    // 初始推荐区和消息区共用同一滚动容器。
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .initial-message {
      padding: 12px;
      color: #000;
      font-size: 14px;
      line-height: 1.5;
      display: flex;
      align-items: center;
    }

    .suggested-prompts {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      .prompt-title {
        padding-left: 12px;
        font-size: 12px;
        color: #666;
      }

      .prompt-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .prompt-item {
          text-align: left;
          padding: 8px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          color: #000;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;

          &:hover {
            background-color: #f5f5f5;
          }
        }
      }
    }
  }
}
</style>

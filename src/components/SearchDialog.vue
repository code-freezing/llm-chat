<template>
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

    <div class="dialog-content" ref="messagesContainer">
      <template v-if="messages.length === 0">
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
      </template>

      <template v-else>
        <ChatMessage
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :is-last-assistant-message="index === messages.length - 1 && message.role === 'assistant'"
          @regenerate="handleRegenerate"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { useAutoScroll } from '@/composables/useAutoScroll'
import { useChatSession } from '@/composables/useChatSession'

// SearchDialog 是首页里的轻量提问弹层。
// 它复用了聊天请求与消息渲染能力，但消息状态只保存在本组件内部。
const searchText = ref('')
const messages = ref([])
const isLoading = ref(false)
const summary = ref('')

const aiMessage = 'Hi，我是你的 AI 小助手，有什么问题都可以问我。'

const suggestedPrompts = [
  '如何快速上手 Vue 3 框架',
  '字节跳动前端面试难吗',
  '前端如何实现弹性布局',
  '喝酒脸红代表酒量好吗',
]

const messagesContainer = ref(null)

useAutoScroll(messages, messagesContainer)

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
  await sendMessage({ text, files: [] })
}
</script>

<style lang="scss" scoped>
.search-dialog {
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

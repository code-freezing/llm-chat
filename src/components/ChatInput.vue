<template>
  <!-- 输入框和发送按钮属于一个整体输入区域。 -->
  <div class="chat-input-wrapper">
    <el-input
      v-model="inputValue"
      type="textarea"
      :autosize="{ minRows: 1, maxRows: 6 }"
      placeholder="输入消息，Enter 发送，Shift + Enter 换行"
      resize="none"
      @keydown.enter.exact.prevent="handleSend"
      @keydown.enter.shift="handleNewline"
    />

    <div class="button-group">
      <!-- loading 时禁用发送，避免用户连续点击导致重复请求。 -->
      <button class="action-btn send-btn" :disabled="props.loading" @click="handleSend">
        <img src="@/assets/photo/发送.png" alt="send" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ChatInput 只负责收集输入，不直接发请求；它把用户输入整理好后，通过 emit 交给父组件驱动真正的聊天流程。
const inputValue = ref('')

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['send'])

// 发送时只做两件事：组装当前输入内容并通知父组件处理业务；发送完成后立即清空输入框，避免残留上一轮状态。
const handleSend = () => {
  if (!inputValue.value.trim() || props.loading) return

  emit('send', { text: inputValue.value.trim() })

  inputValue.value = ''
}

const handleNewline = (event) => {
  // 阻止 Element Plus 默认提交行为，显式插入换行。
  event.preventDefault()
  inputValue.value += '\n'
}
</script>

<style lang="scss" scoped>
.chat-input-wrapper {
  // 输入区整体采用卡片样式，和上方消息区视觉分层。
  padding: 0.8rem;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  :deep(.el-textarea__inner) {
    border-radius: 8px;
    resize: none;
    border: none;
    box-shadow: none;

    &:focus {
      border: none;
      box-shadow: none;
    }
  }

  .button-group {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem;
    gap: 0.5rem;
    align-items: center;

    .action-btn {
      width: 1.75rem;
      height: 1.75rem;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s;

      img {
        width: 1rem;
        height: 1rem;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      &.send-btn {
        // 发送按钮使用主色实心，强化“主操作”感知。
        width: 2rem;
        height: 2rem;
        background-color: #3f7af1;

        img {
          width: 1.25rem;
          height: 1.25rem;
        }

        &:hover {
          background-color: #3266d6;
        }
      }
    }
  }
}
</style>

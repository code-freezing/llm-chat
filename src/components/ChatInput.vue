<template>
  <div class="chat-input-wrapper">
    <div v-if="fileList.length > 0" class="preview-area">
      <div v-for="file in fileList" :key="file.url" class="preview-item">
        <div v-if="file.type === 'image'" class="image-preview">
          <img :src="file.url" :alt="file.name" />
          <div class="remove-btn" @click="handleFileRemove(file)">
            <el-icon><Close /></el-icon>
          </div>
        </div>
        <div v-else class="file-preview">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ (file.size / 1024).toFixed(1) }}KB</span>
          <div class="remove-btn" @click="handleFileRemove(file)">
            <el-icon><Close /></el-icon>
          </div>
        </div>
      </div>
    </div>

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
      <el-upload
        class="upload-btn"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileUpload"
        accept=".pdf,.doc,.docx,.txt"
      >
        <button class="action-btn">
          <img src="@/assets/photo/附件.png" alt="attachment" />
        </button>
      </el-upload>
      <el-upload
        class="upload-btn"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileUpload"
        accept="image/*"
      >
        <button class="action-btn">
          <img src="@/assets/photo/图片.png" alt="picture" />
        </button>
      </el-upload>
      <div class="divider"></div>
      <button class="action-btn send-btn" :disabled="props.loading" @click="handleSend">
        <img src="@/assets/photo/发送.png" alt="send" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Close, Document } from '@element-plus/icons-vue'

// ChatInput 只负责收集输入，不直接发请求。
// 它把用户输入和附件列表整理好后，通过 emit 交给父组件驱动真正的聊天流程。
const inputValue = ref('')
const fileList = ref([])

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['send'])

// 发送时只做两件事：
// 1. 组装当前输入内容
// 2. 通知父组件处理业务
// 发送完成后立即清空输入框和附件预览，避免残留上一轮状态。
const handleSend = () => {
  if (!inputValue.value.trim() || props.loading) return

  const messageContent = {
    text: inputValue.value.trim(),
    files: fileList.value,
  }

  emit('send', messageContent)

  inputValue.value = ''
  fileList.value = []
}

const handleNewline = (event) => {
  event.preventDefault()
  inputValue.value += '\n'
}

// 当前版本里的附件只用于本地预览，不会在这里直接上传，也不会做内容解析。
// `URL.createObjectURL` 用来为本地文件生成临时预览地址。
const handleFileUpload = (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return false

  fileList.value.push({
    name: file.name,
    url: URL.createObjectURL(file),
    type: file.type.startsWith('image/') ? 'image' : 'file',
    size: file.size,
  })

  return false
}

// 移除附件时顺手释放对象 URL，避免浏览器持续持有无用的本地引用。
const handleFileRemove = (file) => {
  const index = fileList.value.findIndex((item) => item.url === file.url)
  if (index !== -1) {
    URL.revokeObjectURL(fileList.value[index].url)
    fileList.value.splice(index, 1)
  }
}
</script>

<style lang="scss" scoped>
.chat-input-wrapper {
  padding: 0.8rem;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  .preview-area {
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .preview-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;

      .image-preview {
        width: 60px;
        height: 60px;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .file-preview {
        padding: 8px;
        background-color: #f4f4f5;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;

        .file-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          color: #909399;
          font-size: 12px;
        }
      }

      .remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;

        &:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }
      }
    }
  }

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

    .upload-btn {
      display: inline-block;
    }

    .divider {
      height: 1rem;
      width: 1px;
      background-color: var(--border-color);
      margin: 0;
      margin-left: 0.125rem;
      margin-right: 0.25rem;
    }

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

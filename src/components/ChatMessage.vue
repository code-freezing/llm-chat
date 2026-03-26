<template>
  <div class="message-item" :class="{ 'is-mine': message.role === 'user' }">
    <div class="content">
      <div v-if="message.files && message.files.length > 0" class="files-container">
        <div v-for="file in message.files" :key="file.url" class="file-item">
          <div v-if="file.type === 'image'" class="image-preview">
            <img :src="file.url" :alt="file.name" />
          </div>
          <div v-else class="file-preview">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ (file.size / 1024).toFixed(1) }}KB</span>
          </div>
        </div>
      </div>

      <div v-if="message.loading && message.role === 'assistant'" class="thinking-text">
        <img src="@/assets/photo/加载中.png" alt="loading" class="loading-icon" />
        <span>内容生成中...</span>
      </div>

      <div v-if="message.reasoning_content" class="reasoning-toggle" @click="toggleReasoning">
        <img :src="thinkingIcon" alt="thinking" />
        <span>深度思考</span>
        <el-icon class="toggle-icon" :class="{ 'is-expanded': isReasoningExpanded }">
          <ArrowDown />
        </el-icon>
      </div>

      <div
        v-if="message.reasoning_content && isReasoningExpanded"
        class="reasoning markdown-body"
        v-html="renderedReasoning"
      ></div>

      <div class="bubble markdown-body" v-html="renderedContent"></div>

      <div v-if="message.role === 'assistant' && message.loading === false" class="message-actions">
        <button
          v-if="isLastAssistantMessage"
          class="action-btn"
          @click="handleRegenerate"
          data-tooltip="重新生成"
        >
          <img :src="regenerateIcon" alt="regenerate" />
        </button>
        <button class="action-btn" @click="handleCopy" data-tooltip="复制">
          <img :src="isCopied ? successIcon : copyIcon" alt="copy" />
        </button>
        <button class="action-btn" @click="handleLike" data-tooltip="喜欢">
          <img :src="isLiked ? likeActiveIcon : likeIcon" alt="like" />
        </button>
        <button class="action-btn" @click="handleDislike" data-tooltip="不喜欢">
          <img :src="isDisliked ? dislikeActiveIcon : dislikeIcon" alt="dislike" />
        </button>

        <span v-if="message.completion_tokens" class="tokens-info">
          tokens: {{ message.completion_tokens }}, speed: {{ message.speed }} tokens/s
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Document, ArrowDown } from '@element-plus/icons-vue'

import { renderMarkdown } from '@/renderers/markdown'
import copyIcon from '@/assets/photo/复制.png'
import successIcon from '@/assets/photo/成功.png'
import likeIcon from '@/assets/photo/赞.png'
import likeActiveIcon from '@/assets/photo/赞2.png'
import dislikeIcon from '@/assets/photo/踩.png'
import dislikeActiveIcon from '@/assets/photo/踩2.png'
import regenerateIcon from '@/assets/photo/重新生成.png'
import thinkingIcon from '@/assets/photo/深度思考.png'

// ChatMessage 负责把消息对象渲染成最终可见的聊天气泡。
// 除了普通内容展示外，它还承担 reasoning 展示、附件预览和消息操作按钮。
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  isLastAssistantMessage: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['regenerate'])

const isLiked = ref(false)
const isDisliked = ref(false)
const isCopied = ref(false)
const isReasoningExpanded = ref(true)

// 支持 reasoning 的模型会返回两段内容：
// 一段是推理过程，一段是最终回答，这里允许用户单独展开或折叠推理内容。
const toggleReasoning = () => {
  isReasoningExpanded.value = !isReasoningExpanded.value
}

// 这里复制的是最终回答正文，不包含 reasoning 内容。
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    isCopied.value = true

    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const handleLike = () => {
  if (isDisliked.value) isDisliked.value = false
  isLiked.value = !isLiked.value
}

const handleDislike = () => {
  if (isLiked.value) isLiked.value = false
  isDisliked.value = !isDisliked.value
}

const handleRegenerate = () => {
  emit('regenerate')
}

// 代码块内的复制和主题切换按钮并不是 Vue 组件事件。
// 原因是代码块 HTML 来自 Markdown 渲染字符串，最终通过 v-html 插入页面。
const handleCodeCopy = async (event) => {
  const codeBlock = event.target.closest('.code-block')
  const code = codeBlock.querySelector('code').textContent

  try {
    await navigator.clipboard.writeText(code)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const handleThemeToggle = (event) => {
  const codeBlock = event.target.closest('.code-block')
  const themeBtn = event.target.closest('[data-action="theme"]')
  const themeIcon = themeBtn.querySelector('img')
  const lightIcon = themeIcon.dataset.lightIcon
  const darkIcon = themeIcon.dataset.darkIcon

  codeBlock.classList.toggle('dark-theme')
  themeIcon.src = codeBlock.classList.contains('dark-theme') ? lightIcon : darkIcon
}

let observer = null

onMounted(() => {
  // 因为代码块 DOM 不是在模板里直接声明的，所以需要在渲染后手动补事件绑定。
  // 这里通过 MutationObserver 监听页面变化，一旦出现新的 code-block 就绑定按钮事件。
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes.length) return

      const codeBlocks = document.querySelectorAll('.code-block')
      codeBlocks.forEach((block) => {
        const copyBtn = block.querySelector('[data-action="copy"]')
        const themeBtn = block.querySelector('[data-action="theme"]')

        if (copyBtn && !copyBtn._hasListener) {
          copyBtn.addEventListener('click', handleCodeCopy)
          copyBtn._hasListener = true
        }

        if (themeBtn && !themeBtn._hasListener) {
          themeBtn.addEventListener('click', handleThemeToggle)
          themeBtn._hasListener = true
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
})

onUnmounted(() => {
  // 组件销毁时断开观察器，并清理已经挂上的按钮事件，避免内存泄漏。
  observer?.disconnect()

  const codeBlocks = document.querySelectorAll('.code-block')
  codeBlocks.forEach((block) => {
    const copyBtn = block.querySelector('[data-action="copy"]')
    const themeBtn = block.querySelector('[data-action="theme"]')

    copyBtn?.removeEventListener('click', handleCodeCopy)
    themeBtn?.removeEventListener('click', handleThemeToggle)
  })
})

// 最终消息内容和 reasoning 内容都会先转成 HTML，再交给模板里的 v-html 渲染。
const renderedContent = computed(() => renderMarkdown(props.message.content))

const renderedReasoning = computed(() => {
  if (!props.message.reasoning_content) return ''
  return renderMarkdown(props.message.reasoning_content)
})
</script>

<style lang="scss" scoped>
.message-item {
  display: flex;
  margin-bottom: 2rem;

  &.is-mine {
    justify-content: flex-end;

    .content .bubble.markdown-body {
      background-color: #f4f4f4;
    }
  }

  .content {
    max-width: 100%;
    min-width: 0;
    width: fit-content;
    overflow: hidden;

    .reasoning-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      margin-left: 16px;
      margin-bottom: 8px;
      cursor: pointer;
      width: fit-content;
      border-radius: 4px;
      background-color: #eef4ff;
      transition: background-color 0.2s;

      img {
        width: 14px;
        height: 14px;
      }

      span {
        font-size: 13px;
        color: #3f7af1;
      }

      .toggle-icon {
        font-size: 12px;
        color: #3f7af1;
        transition: transform 0.2s;

        &.is-expanded {
          transform: rotate(180deg);
        }
      }

      &:hover {
        background-color: #e0ebff;
      }
    }

    .reasoning {
      margin-bottom: 8px;
      margin-left: 16px;
      padding: 0 16px;
      background-color: #ffffff;
      border-left: 3px solid #dfe2e5;
      color: #8b8b8b;
      font-size: 14px;
      line-height: 1.6;

      :deep(p) {
        margin: 0;

        &:not(:last-child) {
          margin-bottom: 8px;
        }
      }

      :deep(code) {
        background-color: #f0f0f0;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.9em;
      }
    }

    .bubble.markdown-body {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      background-color: #ffffff;
      border-radius: 1rem;
      font-size: 1rem;
      line-height: 1.5;
      word-break: break-word;
      overflow: hidden;

      :deep(.code-block) {
        margin: 0.5rem 0;
        border: 1px solid var(--code-border);
        border-radius: 0.5rem;
        overflow: hidden;
        width: 100%;

        > pre {
          margin: 0 !important;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: var(--code-header-bg);

          .code-lang {
            font-size: 0.875rem;
            color: var(--code-lang-text);
            font-family: var(--code-font-family);
          }

          .code-actions {
            display: flex;
            gap: 0.5rem;

            .code-action-btn {
              width: 1.5rem;
              height: 1.5rem;
              padding: 0;
              border: none;
              background: none;
              cursor: pointer;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              position: relative;

              img {
                width: 1rem;
                height: 1rem;
                opacity: 1;
                transition: filter 0.2s;
              }

              &::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 0.25rem 0.5rem;
                background-color: rgba(0, 0, 0, 0.75);
                color: white;
                font-size: 0.75rem;
                border-radius: 4px;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                margin-bottom: 5px;
                z-index: 10;
              }

              &:hover {
                background-color: var(--code-header-button-hover-bg);
              }
            }
          }
        }

        pre.hljs {
          margin: 0 !important;
          padding: 1rem;
          background-color: var(--code-block-bg);
          overflow-x: auto;
          white-space: pre;

          code {
            white-space: pre;
          }
        }
      }

      :deep(p) {
        margin: 0;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }
      }

      :deep(code:not(pre code)) {
        font-family: var(--code-font-family);
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        background-color: #f0f0f0;
      }

      :deep(ul),
      :deep(ol) {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
      }

      :deep(blockquote) {
        margin: 0.5rem 0;
        padding-left: 1rem;
        border-left: 4px solid var(--border-color);
        color: var(--text-color-secondary);
      }

      :deep(table) {
        border-collapse: collapse;
        margin: 0.5rem 0;
        width: 100%;

        th,
        td {
          border: 1px solid var(--border-color);
          padding: 0.5rem;
        }

        th {
          background-color: var(--code-header-bg);
        }
      }

      :deep(a) {
        color: #3f7af1;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      :deep(img) {
        max-width: 100%;
        border-radius: 0.5rem;
      }
    }

    .message-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-left: 1rem;

      .action-btn {
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        position: relative;

        img {
          width: 1rem;
          height: 1rem;
          opacity: 1;
          transition: filter 0.2s;
        }

        &::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.25rem 0.5rem;
          background-color: rgba(0, 0, 0, 0.75);
          color: white;
          font-size: 0.75rem;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
          margin-bottom: 5px;
        }

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

          img {
            filter: brightness(0.4);
          }
        }

        &:hover::after {
          opacity: 1;
          visibility: visible;
        }

        img[src*='2'] {
          filter: none;
        }
      }

      .tokens-info {
        display: flex;
        gap: 0.5rem;
        color: var(--text-color-secondary);
        font-size: 0.75rem;
        background-color: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
      }
    }
  }

  .thinking-text {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0.75rem 1rem;
    color: #6b7280;
    font-size: 0.875rem;

    .loading-icon {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.files-container {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .file-item {
    .image-preview {
      max-width: 200px;
      border-radius: 8px;
      overflow: hidden;

      img {
        display: block;
        max-width: 100%;
        height: auto;
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
  }
}
</style>

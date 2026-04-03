<template>
  <!-- 单条消息最外层，根据 role 判断是否使用“我发送的消息”样式。 -->
  <div class="message-item" :class="{ 'is-mine': message.role === 'user' }">
    <div class="content" @click="handleContentClick">
      <!-- assistant 占位消息在真正内容回来前先展示加载态。 -->
      <div v-if="message.loading && message.role === 'assistant'" class="thinking-text">
        <img src="@/assets/photo/加载中.png" alt="loading" class="loading-icon" />
        <span>{{ message.loading_text || '内容生成中...' }}</span>
      </div>

      <!-- reasoning_content 存在时，允许用户单独折叠或展开推理过程。 -->
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

      <!-- 正文始终走统一的 Markdown 渲染链路。 -->
      <div class="bubble markdown-body" v-html="renderedContent"></div>

      <!-- 只有 assistant 最终回复才展示操作栏。 -->
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
import { onUnmounted, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

import { renderMarkdown } from '@/renderers/markdown'
import copyIcon from '@/assets/photo/复制.png'
import successIcon from '@/assets/photo/成功.png'
import likeIcon from '@/assets/photo/赞.png'
import likeActiveIcon from '@/assets/photo/赞2.png'
import dislikeIcon from '@/assets/photo/踩.png'
import dislikeActiveIcon from '@/assets/photo/踩2.png'
import regenerateIcon from '@/assets/photo/重新生成.png'
import thinkingIcon from '@/assets/photo/深度思考.png'

// 流式回复会非常频繁地更新 message.content，这里给一个短节流窗口，避免每个 token 都触发整段 Markdown 重渲染。
const STREAM_RENDER_DELAY = 100

// ChatMessage 负责把消息对象渲染成最终可见的聊天气泡，除了普通内容展示外，它还承担 reasoning 展示和消息操作按钮。
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

// 这些局部状态只影响当前这条消息的 UI 展示，不回写到全局 store。
const isLiked = ref(false)
const isDisliked = ref(false)
const isCopied = ref(false)
const isReasoningExpanded = ref(true)
// 模板最终消费的是这两个 HTML 字符串，而不是直接在 computed 里同步执行 Markdown 渲染。
const renderedContent = ref('')
const renderedReasoning = ref('')
let contentRenderTimer = 0
let reasoningRenderTimer = 0

const clearTimer = (timerId) => {
  if (timerId) {
    window.clearTimeout(timerId)
  }
}

const syncRenderedHtml = (targetRef, source) => {
  targetRef.value = renderMarkdown(source)
}

const scheduleRenderedHtmlUpdate = (targetRef, source, timerType) => {
  // 仅在流式阶段做节流；非流式消息通常只渲染一次，直接同步更新即可。
  const delay = props.message.loading ? STREAM_RENDER_DELAY : 0

  if (timerType === 'content') {
    clearTimer(contentRenderTimer)
    if (delay === 0) {
      syncRenderedHtml(targetRef, source)
      return
    }

    contentRenderTimer = window.setTimeout(() => {
      syncRenderedHtml(targetRef, source)
      contentRenderTimer = 0
    }, delay)
    return
  }

  clearTimer(reasoningRenderTimer)
  if (delay === 0) {
    syncRenderedHtml(targetRef, source)
    return
  }

  reasoningRenderTimer = window.setTimeout(() => {
    syncRenderedHtml(targetRef, source)
    reasoningRenderTimer = 0
  }, delay)
}

// 支持 reasoning 的模型会返回两段内容：一段是推理过程，一段是最终回答，这里允许用户单独展开或折叠推理内容。
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
  // 点赞和点踩互斥，保证同一时间只保留一种反馈状态。
  if (isDisliked.value) isDisliked.value = false
  isLiked.value = !isLiked.value
}

const handleDislike = () => {
  // 与点赞保持互斥。
  if (isLiked.value) isLiked.value = false
  isDisliked.value = !isDisliked.value
}

const handleRegenerate = () => {
  emit('regenerate')
}

// 代码块内的复制和主题切换按钮并不是 Vue 组件事件，因为代码块 HTML 来自 Markdown 渲染字符串，最终通过 v-html 插入页面。
const handleCodeCopy = async (codeBlock) => {
  const code = codeBlock?.querySelector('code')?.textContent
  if (!code) return

  try {
    await navigator.clipboard.writeText(code)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const handleThemeToggle = (codeBlock, themeButton) => {
  // 代码块明暗主题只影响当前块本身，不切换全局站点主题。
  const themeIcon = themeButton?.querySelector('img')
  if (!codeBlock || !themeIcon) return

  const lightIcon = themeIcon.dataset.lightIcon
  const darkIcon = themeIcon.dataset.darkIcon

  codeBlock.classList.toggle('dark-theme')
  themeIcon.src = codeBlock.classList.contains('dark-theme') ? lightIcon : darkIcon
}

// 代码块按钮最终是通过 v-html 注入的原生 DOM，比起给每条消息都挂一个全局 MutationObserver，这里直接在当前消息根节点做事件委托更轻。
const handleContentClick = (event) => {
  const actionButton = event.target.closest('[data-action]')
  if (!actionButton) return

  const codeBlock = actionButton.closest('.code-block')
  if (!codeBlock) return

  const action = actionButton.dataset.action
  if (action === 'copy') {
    handleCodeCopy(codeBlock)
    return
  }

  if (action === 'theme') {
    handleThemeToggle(codeBlock, actionButton)
  }
}

watch(
  () => props.message.content,
  (content) => {
    // assistant 流式输出时，正文会连续变化，这里把短时间内的多次变化合并成一次渲染。
    scheduleRenderedHtmlUpdate(renderedContent, content, 'content')
  },
  { immediate: true },
)

watch(
  () => props.message.reasoning_content,
  (reasoningContent) => {
    // reasoning 内容和正文分开节流，避免其中一段频繁变化时互相打断。
    scheduleRenderedHtmlUpdate(renderedReasoning, reasoningContent, 'reasoning')
  },
  { immediate: true },
)

watch(
  () => props.message.loading,
  (loading) => {
    // 流式结束时立即渲染最终内容，避免最后一批 token 还停留在节流窗口里。
    if (loading) return

    clearTimer(contentRenderTimer)
    contentRenderTimer = 0
    syncRenderedHtml(renderedContent, props.message.content)

    clearTimer(reasoningRenderTimer)
    reasoningRenderTimer = 0
    syncRenderedHtml(renderedReasoning, props.message.reasoning_content)
  },
)

onUnmounted(() => {
  // 组件被虚拟列表卸载时要及时清理定时器，避免异步回调继续写入已经销毁的组件状态。
  clearTimer(contentRenderTimer)
  clearTimer(reasoningRenderTimer)
})
</script>

<style lang="scss" scoped>
.message-item {
  display: flex;
  margin-bottom: 2rem;

  &:not(.is-mine) {
    // assistant 消息默认占满容器宽度，方便内部 Markdown 自适应布局。
    .content {
      width: 100%;
    }
  }

  &.is-mine {
    // 用户消息整体右对齐，形成经典 IM 气泡布局。
    justify-content: flex-end;

    .content {
      width: auto;
      max-width: min(100%, 680px);
    }

    .content .bubble.markdown-body {
      // 用户消息单独换一层浅灰底色，和 assistant 消息区分。
      background-color: #f4f4f4;
    }
  }

  .content {
    max-width: 100%;
    min-width: 0;
    width: fit-content;
    overflow: visible;

    .reasoning-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.4rem 0.75rem;
      margin-left: 4px;
      margin-bottom: 0.75rem;
      cursor: pointer;
      width: fit-content;
      border-radius: 999px;
      background-color: #eef4ff;
      border: 1px solid #d7e6ff;
      transition:
        background-color 0.2s,
        border-color 0.2s;

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
      // reasoning 用更轻的灰蓝色卡片承接，弱化信息层级但保持可读。
      width: min(100%, 760px);
      margin-bottom: 0.875rem;
      padding: 1rem 1.125rem;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: linear-gradient(180deg, #fbfcff 0%, #f7f9fc 100%);
      color: #667085;
    }

    .bubble.markdown-body,
    .reasoning.markdown-body {
      display: block;
      width: min(100%, 760px);
      font-size: 0.98rem;
      line-height: 1.82;
      word-break: break-word;

      :deep(> *:first-child) {
        margin-top: 0;
      }

      :deep(> *:last-child) {
        margin-bottom: 0;
      }

      :deep(h1),
      :deep(h2),
      :deep(h3),
      :deep(h4) {
        color: #111827;
        letter-spacing: -0.02em;
        line-height: 1.28;
        font-weight: 700;
        margin: 1.6rem 0 0.85rem;
      }

      :deep(h1) {
        font-size: 1.5rem;
      }

      :deep(h2) {
        font-size: 1.3rem;
      }

      :deep(h3) {
        font-size: 1.1rem;
      }

      :deep(h4) {
        font-size: 1rem;
      }

      :deep(p) {
        margin: 0 0 0.9rem;
      }

      :deep(ul),
      :deep(ol) {
        margin: 0.85rem 0;
        padding-left: 1.5rem;
      }

      :deep(li) {
        margin: 0.3rem 0;
      }

      :deep(li > p) {
        margin-bottom: 0.35rem;
      }

      :deep(code:not(pre code)) {
        // 行内代码保持轻量高亮，不和块级代码样式混淆。
        font-family: var(--code-font-family);
        padding: 0.18em 0.45em;
        border-radius: 0.38rem;
        background-color: #eef2f7;
        color: #334155;
        font-size: 0.92em;
      }

      :deep(blockquote) {
        margin: 1rem 0;
        padding: 0.85rem 1rem;
        border-left: 3px solid #cbd5e1;
        border-radius: 0 0.75rem 0.75rem 0;
        background-color: #f8fafc;
        color: #64748b;
      }

      :deep(table) {
        display: block;
        overflow-x: auto;
        border-collapse: collapse;
        margin: 1rem 0;
        width: 100%;

        th,
        td {
          border: 1px solid #e5e7eb;
          padding: 0.65rem 0.8rem;
          text-align: left;
        }

        th {
          background-color: #f8fafc;
          color: #111827;
          font-weight: 600;
        }
      }

      :deep(a) {
        color: #2563eb;
        text-decoration: none;
        text-underline-offset: 0.18em;

        &:hover {
          text-decoration: underline;
        }
      }

      // 普通图片要跟正文宽度适配，但代码块头部的操作图标需要单独走固定尺寸。
      :deep(img) {
        max-width: 100%;
        border-radius: 0.75rem;
      }

      :deep(.code-block) {
        // 代码块外壳样式与 markdown.js 注入的结构保持一一对应。
        margin: 1rem 0 1.15rem;
        border: 1px solid var(--code-border);
        border-radius: 0.9rem;
        overflow: hidden;
        width: 100%;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);

        > pre {
          margin: 0 !important;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.7rem 1rem;
          background-color: var(--code-header-bg);
          border-bottom: 1px solid var(--code-border);

          .code-lang {
            font-size: 0.84rem;
            color: var(--code-lang-text);
            font-family: var(--code-font-family);
          }

          .code-actions {
            display: flex;
            gap: 0.45rem;

            .code-action-btn {
              width: 1.75rem;
              height: 1.75rem;
              padding: 0;
              border: none;
              background: none;
              cursor: pointer;
              border-radius: 999px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              position: relative;

              img {
                width: 1rem;
                height: 1rem;
                min-width: 1rem;
                max-width: none;
                border-radius: 0;
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
          padding: 1rem 1.1rem;
          background-color: var(--code-block-bg);
          overflow-x: auto;
          white-space: pre;
          font-size: 0.92rem;
          line-height: 1.75;

          code {
            white-space: pre;
            background: none;
            padding: 0;
            border-radius: 0;
            color: inherit;
            font-size: inherit;
          }
        }
      }
    }

    .bubble.markdown-body {
      // 正文气泡维持较强可读性和轻量浮层感。
      padding: 1rem 1.25rem 1.05rem;
      background-color: #ffffff;
      border: 1px solid #edf1f5;
      border-radius: 1.25rem;
      color: #1f2937;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.04);
    }

    .message-actions {
      // 操作栏贴在 assistant 气泡下方，保持弱存在感但可快速访问。
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
    // 加载态不做骨架屏，只保留一条简洁状态提示。
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
</style>

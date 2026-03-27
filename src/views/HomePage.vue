<template>
  <div class="home-page">
    <header class="header">
      <div class="header-left">
        <span class="logo-text">LLM Chat</span>
      </div>
      <div class="header-right">
        <div class="search-container" @click="handleSearchClick">
          <div class="search-input">
            <el-icon class="search-icon"><Search /></el-icon>
            <input v-model="searchText" type="text" placeholder="搜索" readonly />
            <div class="shortcut-key">Ctrl K</div>
          </div>
        </div>
        <a href="https://github.com/code-freezing" target="_blank" class="github-link">
          <img src="@/assets/photo/github.png" alt="GitHub" class="github-icon" />
        </a>
      </div>
    </header>

    <main class="main-content">
      <div class="hero-section">
        <h1 class="title">欢迎使用 LLM Chat</h1>
        <p class="description">
          一个轻量、直接的 AI 聊天前端，支持多会话、流式响应和代码高亮展示。
        </p>
        <div class="features">
          <div class="feature-item">
            <el-icon class="feature-icon"><ChatLineRound /></el-icon>
            <h3>智能对话</h3>
            <p>支持多轮上下文聊天，适合日常问答、代码交流和信息整理。</p>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Document /></el-icon>
            <h3>附件支持</h3>
            <p>支持图片和文件的前端预览，便于整理聊天时的输入内容。</p>
            <p class="note">注意：当前版本不会解析文件内容，也不会作为模型上下文发送。</p>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Setting /></el-icon>
            <h3>参数可调</h3>
            <p>支持配置模型、流式输出、Tokens 和系统提示词。</p>
            <p class="note" style="color: #3f7af1">适合作为可持续迭代的 AI Chat 前端基础版。</p>
          </div>
        </div>
        <router-link to="/chat" class="start-button">
          <span class="mirror-text">开始对话</span>
          <div class="liquid"></div>
        </router-link>
      </div>
    </main>

    <Transition name="fade">
      <div v-if="showSearchDialog" class="search-dialog-overlay" @click="handleOverlayClick">
        <div class="search-dialog-container" @click.stop>
          <SearchDialog />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Search, ChatLineRound, Document, Setting } from '@element-plus/icons-vue'
import SearchDialog from '@/components/SearchDialog.vue'

// HomePage 是项目的入口页。
// 它主要负责展示产品简介，并承载一个独立的搜索/提问弹层入口。
const searchText = ref('')
const showSearchDialog = ref(false)

// 点击搜索框后直接打开搜索弹层。
const handleSearchClick = () => {
  showSearchDialog.value = true
}

// 点击遮罩层空白区域时关闭弹层，点击弹层内部则不关闭。
const handleOverlayClick = (event) => {
  if (event.target.classList.contains('search-dialog-overlay')) {
    showSearchDialog.value = false
  }
}

// 这里额外监听一次全局点击，是为了兼容从搜索框外部点击关闭弹层的交互。
const handleClickOutside = (event) => {
  const searchDialog = document.querySelector('.search-dialog')
  if (
    searchDialog &&
    !searchDialog.contains(event.target) &&
    !event.target.closest('.search-container')
  ) {
    showSearchDialog.value = false
  }
}

// 首页支持两个快捷关闭/打开动作：
// - Esc 关闭搜索弹层
// - Ctrl/Cmd + K 打开搜索弹层
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    showSearchDialog.value = false
  }

  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    showSearchDialog.value = true
  }
}

onMounted(() => {
  // 进入首页时挂上全局交互监听，离开首页后及时移除。
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: var(--el-bg-color);
}

.header {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);

  .header-left {
    flex-shrink: 0;

    .logo-text {
      font-size: 20px;
      font-weight: 600;
      color: #171717;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    justify-content: flex-end;

    .search-container {
      flex: 1;
      max-width: 280px;
      min-width: 40px;
      margin-left: 16px;

      .search-input {
        display: flex;
        align-items: center;
        width: 100%;
        height: 32px;
        padding: 0 12px;
        border-radius: 6px;
        background-color: #f2f2f2;

        .search-icon {
          flex-shrink: 0;
          font-size: 14px;
          color: #8f8f8f;
          margin-right: 8px;
        }

        input {
          flex: 1;
          width: 0;
          min-width: 0;
          border: none;
          outline: none;
          background: none;
          font-size: 13px;
          color: #000;

          &::placeholder {
            color: #666666;
          }
        }

        .shortcut-key {
          flex-shrink: 0;
          font-size: 12px;
          color: #171717;
          background-color: #fafafa;
          padding: 2px 4px;
          border-radius: 4px;
          border: 1.5px solid #dfdfdf;
        }
      }
    }

    .github-link {
      display: flex;
      align-items: center;
      height: 32px;
      flex-shrink: 0;
    }

    .github-icon {
      width: 22px;
      height: 22px;
      cursor: pointer;
      opacity: 1;
    }
  }
}

.main-content {
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;

  .hero-section {
    text-align: center;

    .title {
      font-size: 48px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 24px;
    }

    .description {
      font-size: 20px;
      color: #666;
      max-width: 600px;
      margin: 0 auto 64px;
      line-height: 1.5;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 40px;
      margin-bottom: 64px;

      .feature-item {
        padding: 32px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transition: transform 0.3s ease;

        &:hover {
          transform: translateY(-4px);
        }

        .feature-icon {
          font-size: 32px;
          color: var(--el-color-primary);
          margin-bottom: 20px;
        }

        h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }

        p {
          font-size: 16px;
          color: #666;
          line-height: 1.5;
        }

        .note {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
          font-style: italic;
        }
      }
    }

    .start-button {
      position: relative;
      display: inline-block;
      padding: 20px 40px;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      background: var(--el-color-primary);
      border-radius: 12px;
      text-decoration: none;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 30px -10px var(--el-color-primary);

      .mirror-text {
        position: relative;
        z-index: 1;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 700;
        text-transform: uppercase;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 1) 0%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(255, 255, 255, 0.6) 100%
        );
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: 0.5s ease;
      }

      .liquid {
        position: absolute;
        top: -80px;
        left: 0;
        width: 200px;
        height: 200px;
        background: var(--el-color-primary-light-3);
        box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.3);
        transition: 0.5s;

        &::before,
        &::after {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          top: 0;
          left: 50%;
          transform: translate(-50%, -75%);
          background: #fff;
        }

        &::before {
          border-radius: 45%;
          animation: animate 5s linear infinite;
        }

        &::after {
          border-radius: 40%;
          animation: animate 10s linear infinite;
        }
      }

      span {
        position: relative;
        z-index: 1;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 40px -10px var(--el-color-primary);

        &::before {
          left: 100%;
        }

        .liquid {
          top: -120px;
        }

        .mirror-text {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 255, 255, 0.9) 50%,
            rgba(255, 255, 255, 0.7) 100%
          );
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
      }

      &:active {
        transform: scale(0.98) translateY(0);
        box-shadow: 0 5px 20px -10px var(--el-color-primary);
      }
    }

    @keyframes animate {
      0% {
        transform: translate(-50%, -75%) rotate(0deg);
      }
      100% {
        transform: translate(-50%, -75%) rotate(360deg);
      }
    }
  }
}

.search-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  z-index: 1000;
}

.search-dialog-container {
  margin-top: 15vh;
  width: 640px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

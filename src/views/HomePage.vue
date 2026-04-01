<template>
  <!-- 首页以产品介绍和快捷入口为主，不承担完整聊天状态。 -->
  <div class="home-page">
    <header class="header">
      <div class="header-left">
        <span class="logo-text">LLM Chat</span>
      </div>
      <div class="header-right">
        <div class="search-container" @click="handleSearchClick">
          <div class="search-input">
            <el-icon class="search-icon"><Search /></el-icon>
            <!-- 这里只做触发器，不真的在首页输入文字。 -->
            <input v-model="searchText" type="text" placeholder="搜索" readonly />
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
        <div class="features">
          <div class="feature-item">
            <el-icon class="feature-icon"><ChatLineRound /></el-icon>
            <h3>多会话对话</h3>
            <p>支持创建、切换、重命名和删除历史会话。</p>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Document /></el-icon>
            <h3>Markdown 展示</h3>
            <p>支持代码高亮、复制、链接、表格和常用 Markdown 内容展示。</p>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Setting /></el-icon>
            <h3>参数配置</h3>
            <p>支持模型切换、系统提示词、最大输出长度和上下文压缩。</p>
          </div>
        </div>
        <router-link to="/chat" class="start-button">
          <span class="mirror-text">进入聊天</span>
          <div class="liquid"></div>
        </router-link>
      </div>
    </main>

    <Transition name="fade">
      <div v-if="showSearchDialog" class="search-dialog-overlay" @click="handleOverlayClick">
        <!-- 阻止内部点击冒泡到遮罩层，避免弹层内容一点击就关闭。 -->
        <div class="search-dialog-container" @click.stop>
          <SearchDialog />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { defineAsyncComponent, ref, onMounted, onUnmounted } from 'vue'
import { Search, ChatLineRound, Document, Setting } from '@element-plus/icons-vue'

const SearchDialog = defineAsyncComponent(() => import('@/components/SearchDialog.vue'))
// 搜索弹层按需加载，首页在未打开弹层时无需同步下载这部分逻辑。

// HomePage 是项目的入口页，它主要负责展示产品简介，并承载一个独立的搜索/提问弹层入口。
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

// - Esc 关闭搜索弹层
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    showSearchDialog.value = false
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
  // 首页背景保持极简，重点把视觉注意力交给中间内容区。
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
      max-width: 200px;
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
      margin-bottom: 64px;
    }

    .features {
      // 三个 feature 卡片描述当前仓库的主能力，不参与任何业务状态。
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
      // 主 CTA 用液态动画做强调，和普通按钮产生明显区分。
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
  // 搜索弹层使用整屏遮罩，保证焦点收敛到单一任务。
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

<template>
  <!-- 左上角悬浮菜单，集中承载会话切换与管理入口。 -->
  <div ref="wrapperRef" class="popup-wrapper">
    <button class="action-btn" @click="toggle">
      <img src="@/assets/photo/弹出框.png" alt="menu" />
    </button>
    <Transition
      enter-active-class="animate__animated animate__fadeInLeft"
      leave-active-class="animate__animated animate__fadeOutLeft"
    >
      <div v-show="isVisible" class="popup-menu">
        <div class="menu-section">
          <!-- 菜单内部也保留新建会话入口，减少来回移动光标。 -->
          <el-button class="new-chat-btn" :icon="Plus" @click="handleNewChat">新对话</el-button>
        </div>
        <div class="divider"></div>
        <div class="menu-section">
          <div class="section-title">历史对话</div>
          <div class="history-list">
            <div
              v-for="conversation in chatStore.conversations"
              :key="conversation.id"
              class="menu-item"
              :class="{ active: conversation.id === chatStore.currentConversationId }"
              @click="handleSwitchChat(conversation.id)"
            >
              <div class="item-content">
                <img src="@/assets/photo/对话.png" alt="conversation" />
                <span :title="conversation.title">{{ formatTitle(conversation.title) }}</span>
              </div>
              <div class="item-actions">
                <!-- stop 修饰避免点击编辑/删除时又触发外层切换会话。 -->
                <button class="action-btn" @click.stop="handleOpenDialog(conversation.id, 'edit')">
                  <img src="@/assets/photo/编辑.png" alt="edit" />
                </button>
                <button
                  class="action-btn"
                  @click.stop="handleOpenDialog(conversation.id, 'delete')"
                >
                  <img src="@/assets/photo/删除.png" alt="delete" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <DialogEdit ref="dialogEdit" />
  </div>
</template>

<script setup>
import { defineAsyncComponent, ref, onMounted, onUnmounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'

const DialogEdit = defineAsyncComponent(() => import('@/components/DialogEdit.vue'))

// PopupMenu 是聊天页左上角的会话入口菜单；它不保存会话数据，只把 store 里的会话列表可视化，并提供切换、编辑和删除入口。
const isVisible = ref(false)
const chatStore = useChatStore()
const dialogEdit = ref(null)
const wrapperRef = ref(null)

// 通过点击外部区域关闭弹层，避免菜单一直停留在页面上。
const handleClickOutside = (event) => {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target)) {
    isVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const toggle = () => {
  isVisible.value = !isVisible.value
}

const handleNewChat = () => {
  chatStore.createConversation()
  isVisible.value = false
}

const handleSwitchChat = (conversationId) => {
  chatStore.switchConversation(conversationId)
  isVisible.value = false
}

const handleOpenDialog = (conversationId, type) => {
  dialogEdit.value.openDialog(conversationId, type)
}

const formatTitle = (title) => {
  return title.length > 6 ? `${title.slice(0, 6)}...` : title
}

defineExpose({
  toggle,
})
</script>

<style lang="scss" scoped>
.popup-wrapper {
  position: relative;

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
}

.popup-menu {
  // 弹层用绝对定位挂在触发按钮下方，不影响顶部栏正常布局。
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 200px;
  background: #f7f7f7;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  padding: 0.5rem 0;
  margin-top: 0;
  animation-duration: 0.3s !important;

  .menu-section {
    padding: 0.5rem 0;

    .section-title {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      cursor: pointer;
      transition: background-color 0.2s;

      .item-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        img {
          width: 1rem;
          height: 1rem;
        }

        span {
          font-size: 0.875rem;
          color: #374151;
        }
      }

      .item-actions {
        display: flex;
        gap: 0.4rem;
        opacity: 0;
        transition: opacity 0.2s ease;

        .action-btn {
          width: 0.9rem;
          height: 0.9rem;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: filter 0.2s;

          img {
            width: 100%;
            height: 100%;
          }

          &:hover {
            filter: brightness(0.4);
          }
        }
      }

      &:hover,
      &.active {
        // 当前会话附带左侧蓝色标识，提升在长列表中的定位效率。
        background-color: #e5e7eb;

        .item-actions {
          opacity: 0.7;
        }
      }

      &.active {
        background-color: #e5e7eb;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: #3f7af1;
          border-radius: 0 2px 2px 0;
        }

        span {
          color: #3f7af1;
          font-weight: 500;
        }
      }
    }

    .new-chat-btn {
      width: 100%;
      justify-content: flex-start;
      border: none;
      background: none;
      height: 1.5rem;
      padding: 1rem;
      font-size: 0.875rem;
      color: #374151;

      &:hover {
        background-color: #e5e7eb;
      }

      :deep(.el-icon) {
        margin-right: 0.5rem;
        font-size: 1rem;
      }
    }
  }

  .divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 0.25rem 0;
  }
}
</style>

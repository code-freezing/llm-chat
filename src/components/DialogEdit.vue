<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogType === 'edit' ? '编辑对话名称' : '确定删除对话？'"
    width="30%"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <template v-if="dialogType === 'edit'">
      <el-input v-model="inputTitle" placeholder="请输入对话名称" maxlength="50" />
    </template>
    <template v-else>
      <div class="delete-warning">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <span>删除后，聊天记录将不可恢复。</span>
      </div>
    </template>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button :type="dialogType === 'edit' ? 'primary' : 'danger'" @click="handleConfirm">
          {{ dialogType === 'edit' ? '确定' : '删除' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { useChatStore } from '@/stores/chat'

// DialogEdit 复用一个弹窗承载两种操作：
// - 编辑会话标题
// - 删除会话确认
const chatStore = useChatStore()
const dialogVisible = ref(false)
const inputTitle = ref('')
const currentConversationId = ref(null)
const dialogType = ref('edit')

// 父组件通过 openDialog 传入会话 id 和模式，从外部驱动弹窗打开。
const openDialog = (conversationId, type = 'edit') => {
  currentConversationId.value = conversationId
  dialogType.value = type

  if (type === 'edit') {
    const conversation = chatStore.conversations.find((item) => item.id === conversationId)
    inputTitle.value = conversation?.title || ''
  }

  dialogVisible.value = true
}

// 确认按钮会根据当前模式执行不同动作：
// - edit：更新标题
// - delete：删除会话
const handleConfirm = () => {
  if (dialogType.value === 'edit') {
    if (!inputTitle.value.trim()) return
    chatStore.updateConversationTitle(currentConversationId.value, inputTitle.value.trim())
  } else {
    chatStore.deleteConversation(currentConversationId.value)
  }

  dialogVisible.value = false
  inputTitle.value = ''
}

// 取消时只负责关闭弹窗并清空临时输入，不触碰 store。
const handleCancel = () => {
  dialogVisible.value = false
  inputTitle.value = ''
}

defineExpose({
  // 暴露给父组件，方便从菜单或聊天页标题区域直接拉起弹窗。
  openDialog,
})
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.delete-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;

  .warning-icon {
    color: #ed3336;
    font-size: 20px;
  }
}
</style>

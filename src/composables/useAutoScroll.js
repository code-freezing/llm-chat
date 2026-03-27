import { watch, nextTick, onMounted } from 'vue'

// 聊天类界面几乎都会有“新消息到来后滚动到底部”的交互。
// 这里把这段模板无关的行为抽成组合式函数，避免 ChatView 和 SearchDialog 重复维护同一套 watch 逻辑。
export const useAutoScroll = (messages, containerRef) => {
  const scrollToBottom = () => {
    if (!containerRef.value) return

    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }

  // 消息列表发生变化后，等待 DOM 完成更新，再把滚动条推到底部。
  // `deep: true` 是因为流式输出时，经常只是最后一条消息的内容在持续变化，数组长度本身不一定变化。
  watch(
    messages,
    () => {
      nextTick(scrollToBottom)
    },
    { deep: true },
  )

  // 首次进入页面时，如果本地已经恢复出历史消息，也要立即滚动到底部。
  onMounted(() => {
    nextTick(scrollToBottom)
  })

  return {
    scrollToBottom,
  }
}

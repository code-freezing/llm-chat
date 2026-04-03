import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

// 这里不再承担“自动贴底”职责，只保留两件事：
// 1. 监听用户当前是否接近底部
// 2. 暴露一个稳定的手动滚到底部方法，供页面上的“到底”按钮调用
export const useScrollToBottom = (messages, containerRef) => {
  const isNearBottom = ref(true)
  let cleanupScrollListener = null
  let scrollFrameId = 0

  // 兼容原生滚动容器和 VirtualMessageList 暴露出来的内部滚动元素。
  const getScrollTarget = () => {
    if (!containerRef.value) return null

    if (typeof containerRef.value.getScrollElement === 'function') {
      return containerRef.value.getScrollElement()
    }

    return containerRef.value
  }

  const updateBottomState = () => {
    const target = getScrollTarget()
    if (!target) {
      isNearBottom.value = true
      return
    }

    // 给一个容错阈值，避免用户已经接近底部时因为 1~2px 偏差就显示“到底”按钮。
    isNearBottom.value = target.scrollHeight - target.scrollTop - target.clientHeight < 120
  }

  const cancelScrollFrame = () => {
    if (!scrollFrameId) return

    cancelAnimationFrame(scrollFrameId)
    scrollFrameId = 0
  }

  const scrollToBottom = () => {
    if (!containerRef.value) return

    if (typeof containerRef.value.scrollToBottom === 'function') {
      containerRef.value.scrollToBottom()
    } else {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }

    // 手动点击“到底”后，同步把底部状态刷新到最新值，避免按钮残留一帧。
    nextTick(updateBottomState)
  }

  const cleanupBindings = () => {
    cleanupScrollListener?.()
    cleanupScrollListener = null
  }

  const bindScrollState = () => {
    const target = getScrollTarget()
    if (!target) return false

    cleanupBindings()
    updateBottomState()

    const handleScroll = () => {
      cancelScrollFrame()

      // 滚动事件频率很高，这里收敛到一帧只更新一次“是否接近底部”的状态。
      scrollFrameId = requestAnimationFrame(() => {
        updateBottomState()
        scrollFrameId = 0
      })
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    cleanupScrollListener = () => {
      target.removeEventListener('scroll', handleScroll)
    }

    return true
  }

  watch(
    () => containerRef.value,
    () => {
      nextTick(bindScrollState)
    },
    { flush: 'post' },
  )

  watch(
    () => messages.value.length,
    () => {
      // 新消息增删后只更新按钮显隐状态，不再自动滚动到底部。
      nextTick(updateBottomState)
    },
    { flush: 'post' },
  )

  onMounted(() => {
    if (!bindScrollState()) {
      nextTick(bindScrollState)
    }
  })

  onUnmounted(() => {
    cancelScrollFrame()
    cleanupBindings()
  })

  return {
    isNearBottom,
    scrollToBottom,
  }
}

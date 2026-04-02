import { watch, nextTick, onMounted, onUnmounted } from 'vue'

// 聊天类界面几乎都会有“新消息到来后滚动到底部”的交互，这里把这段模板无关的行为抽成组合式函数，避免 ChatView 和 SearchDialog 重复维护同一套 watch 逻辑。
export const useAutoScroll = (messages, containerRef) => {
  let cleanupScrollListener = null
  let cleanupResizeObserver = null
  let scrollFrameId = 0
  let shouldStickToBottom = true
  let hasUserScrolled = false

  // 兼容原生滚动容器和 VirtualMessageList 暴露出来的内部滚动元素。
  const getScrollTarget = () => {
    if (!containerRef.value) return null

    if (typeof containerRef.value.getScrollElement === 'function') {
      return containerRef.value.getScrollElement()
    }

    return containerRef.value
  }

  const isNearBottom = () => {
    const target = getScrollTarget()
    if (!target) return true

    // 给一个容错阈值，避免用户刚好停在底部附近时因为 1~2px 偏差失去自动滚动。
    return target.scrollHeight - target.scrollTop - target.clientHeight < 120
  }

  const updateStickState = () => {
    shouldStickToBottom = isNearBottom()
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
      return
    }

    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }

  const queueScrollToBottom = (frames = 1) => {
    if (!shouldStickToBottom) return

    // 虚拟列表的真实高度往往要等 DOM 更新和下一帧布局后才稳定，
    // 因此把滚动动作延后到 nextTick + requestAnimationFrame。
    nextTick(() => {
      const run = (remainingFrames) => {
        requestAnimationFrame(() => {
          scrollToBottom()
          if (remainingFrames > 1) {
            run(remainingFrames - 1)
          }
        })
      }

      run(frames)
    })
  }

  // 刷新恢复历史消息时，通常需要多补几帧滚底，
  // 等待虚拟列表把估算高度逐步修正成真实高度。
  const queueInitialScrollToBottom = () => queueScrollToBottom(4)

  const resetStickToBottom = () => {
    shouldStickToBottom = true
  }

  const ensureInitialScroll = () => {
    resetStickToBottom()
    queueInitialScrollToBottom()
  }

  const cleanupBindings = () => {
    cleanupScrollListener?.()
    cleanupResizeObserver?.()
  }

  const bindAutoScrollState = () => {
    const target = getScrollTarget()
    if (!target) return false

    cleanupBindings()

    const handleScroll = () => {
      // 只有用户真的滚动过之后，才按当前位置重新计算“是否仍应贴底”。
      // 否则刷新首屏时天然位于顶部，容易被误判成“用户主动离开底部”。
      hasUserScrolled = true

      cancelScrollFrame()

      scrollFrameId = requestAnimationFrame(() => {
        updateStickState()
        scrollFrameId = 0
      })
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    cleanupScrollListener = () => {
      target.removeEventListener('scroll', handleScroll)
      cleanupScrollListener = null
    }

    // Markdown 渲染、虚拟列表高度修正、图片加载都可能只改变 scrollHeight，
    // 不一定伴随新的消息对象写入，因此这里额外监听容器尺寸变化。
    const resizeObserver = new ResizeObserver(() => {
      if (shouldStickToBottom) {
        queueScrollToBottom()
      }
    })
    resizeObserver.observe(target)
    cleanupResizeObserver = () => {
      resizeObserver.disconnect()
      cleanupResizeObserver = null
    }

    return true
  }

  // 消息列表发生变化后，等待 DOM 完成更新，再把滚动条推到底部；`deep: true` 是因为流式输出时，经常只是最后一条消息的内容在持续变化，数组长度本身不一定变化。
  watch(
    messages,
    () => {
      queueScrollToBottom()
    },
    { deep: true, flush: 'post' },
  )

  watch(
    () => containerRef.value,
    () => {
      // 容器可能晚于组件挂载才真正可用，尤其是 VirtualMessageList 场景。
      if (!bindAutoScrollState()) return
      ensureInitialScroll()
    },
    { flush: 'post' },
  )

  watch(
    () => messages.value.length,
    (length, previousLength) => {
      // 首屏恢复历史消息，或者容器刚创建出来时补一次稳定滚底。
      if (!length || length === previousLength) return
      if (!hasUserScrolled) {
        resetStickToBottom()
      }
      queueInitialScrollToBottom()
    },
    { flush: 'post' },
  )

  // 首次进入页面时，如果本地已经恢复出历史消息，也要立即滚动到底部。
  onMounted(() => {
    if (!bindAutoScrollState()) {
      nextTick(() => {
        bindAutoScrollState()
      })
    }
    ensureInitialScroll()
  })

  onUnmounted(() => {
    cancelScrollFrame()
    cleanupBindings()
  })

  return {
    scrollToBottom,
  }
}

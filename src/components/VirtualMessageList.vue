<template>
  <!--
    虚拟列表滚动容器。
    实际只渲染可见区附近的消息项，其余区域通过上下占位块撑出完整滚动高度。
  -->
  <div ref="containerRef" class="virtual-list" @scroll="handleScroll">
    <!-- 顶部占位块：代表当前可见区之前那些未挂载消息的累计高度。 -->
    <div :style="{ height: `${topSpacerHeight}px` }"></div>

    <div
      v-for="entry in visibleItems"
      :key="entry.key"
      :ref="(element) => setItemElement(entry.key, element)"
      class="virtual-item"
    >
      <!-- 把真实消息对象透传给父级插槽，由父级决定每条消息如何渲染。 -->
      <slot :item="entry.item" :index="entry.index"></slot>
    </div>

    <!-- 底部占位块：补齐当前可见区之后尚未挂载的消息高度。 -->
    <div :style="{ height: `${bottomSpacerHeight}px` }"></div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  // 原始消息数组，由父组件传入。
  items: {
    type: Array,
    required: true,
  },
  // 虚拟列表依赖稳定 key 识别每条消息，避免高度缓存错位。
  itemKey: {
    type: Function,
    required: true,
  },
  // 首次还未量到真实高度时，先用估算高度参与布局。
  estimateSize: {
    type: Number,
    default: 180,
  },
  // 在可见区前后额外多渲染几项，减少快速滚动时的白屏感。
  overscan: {
    type: Number,
    default: 4,
  },
})

// 容器尺寸、滚动位置和每项真实高度共同决定当前应该渲染哪些消息。
const containerRef = ref(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const heightCache = ref(new Map())
const itemElements = new Map()
const resizeObservers = new Map()
let scrollFrameId = 0

const getItemKey = (item) => props.itemKey(item)

// 优先使用量测后的真实高度；若还没量到，就退回估算值参与虚拟滚动计算。
const getItemHeight = (index) => {
  const item = props.items[index]
  if (!item) return 0

  return heightCache.value.get(getItemKey(item)) ?? props.estimateSize
}

// 容器高度变化会直接影响可见区计算，因此在挂载和窗口尺寸变化时都要更新。
const updateViewportHeight = () => {
  viewportHeight.value = containerRef.value?.clientHeight || 0
}

// 滚动过程中会频繁查询“某个索引之前累计了多高”，这里预先维护前缀高度表，避免每次滚动都重复做 O(n) 累加。
const prefixHeights = computed(() => {
  const offsets = [0]
  let total = 0

  for (let index = 0; index < props.items.length; index += 1) {
    total += getItemHeight(index)
    offsets.push(total)
  }

  return offsets
})

const getOffsetBefore = (endIndex) => prefixHeights.value[endIndex] ?? 0

// 整个列表理论上的总高度，就是最后一个前缀值。
const getTotalHeight = () => prefixHeights.value[prefixHeights.value.length - 1] ?? 0

// 前缀高度表准备好后，用二分查找定位视口对应的起始项，避免在滚动过程中一遍遍线性扫描整个消息数组。
const findStartIndex = (targetOffset) => {
  let left = 0
  let right = props.items.length - 1
  let answer = 0

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const itemStart = getOffsetBefore(middle)
    const itemEnd = getOffsetBefore(middle + 1)

    if (itemStart <= targetOffset && itemEnd > targetOffset) {
      return middle
    }

    if (itemStart < targetOffset) {
      answer = middle
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  return answer
}

// 结束项的查找目标是“第一个超出视口下边界的位置”，返回值会作为 slice 的 end 使用，因此可以直接等于 items.length。
const findEndIndex = (targetOffset) => {
  let left = 0
  let right = props.items.length

  while (left < right) {
    const middle = Math.floor((left + right) / 2)

    if (getOffsetBefore(middle) <= targetOffset) {
      left = middle + 1
    } else {
      right = middle
    }
  }

  return Math.min(left, props.items.length)
}

// 可见区由当前滚动位置和视口高度共同决定，再额外叠加 overscan 缓冲区。
const visibleRange = computed(() => {
  if (props.items.length === 0) {
    return {
      start: 0,
      end: 0,
    }
  }

  const startIndex = findStartIndex(scrollTop.value)
  const endIndex = findEndIndex(scrollTop.value + viewportHeight.value)

  return {
    start: Math.max(startIndex - props.overscan, 0),
    end: Math.min(endIndex + props.overscan, props.items.length),
  }
})

// 这里把原始数组裁成真正需要渲染的局部数组，并顺手带上原始下标和稳定 key。
const visibleItems = computed(() => {
  return props.items
    .slice(visibleRange.value.start, visibleRange.value.end)
    .map((item, offset) => {
      const index = visibleRange.value.start + offset

      return {
        item,
        index,
        key: getItemKey(item),
      }
    })
})

// 上下占位高度都基于前缀高度表推导，避免额外遍历。
const topSpacerHeight = computed(() => getOffsetBefore(visibleRange.value.start))

const bottomSpacerHeight = computed(() => {
  const visibleHeight = getOffsetBefore(visibleRange.value.end) - topSpacerHeight.value
  return Math.max(getTotalHeight() - topSpacerHeight.value - visibleHeight, 0)
})

// 只有当量到的新高度与缓存不同，才替换缓存，避免无意义触发响应式更新。
const updateItemHeight = (key, height) => {
  if (!height || heightCache.value.get(key) === height) return

  const nextCache = new Map(heightCache.value)
  nextCache.set(key, height)
  heightCache.value = nextCache
}

// 每个可见消息项都会绑定一个 ResizeObserver，当消息因为 Markdown 渲染、流式输出或图片加载导致高度变化时，列表会自动修正缓存。
const observeElement = (key, element) => {
  const currentElement = itemElements.get(key)
  if (currentElement === element) return

  const currentObserver = resizeObservers.get(key)
  if (currentObserver) {
    currentObserver.disconnect()
    resizeObservers.delete(key)
  }

  if (!element) {
    itemElements.delete(key)
    return
  }

  itemElements.set(key, element)

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    updateItemHeight(key, Math.ceil(entry.contentRect.height))
  })

  observer.observe(element)
  resizeObservers.set(key, observer)
  updateItemHeight(key, Math.ceil(element.getBoundingClientRect().height))
}

const setItemElement = (key, element) => {
  observeElement(key, element)
}

// 只同步滚动位置，不直接在滚动事件里做重计算；真正的可见区更新交给 requestAnimationFrame 里的响应式流程完成。
const handleScroll = (event) => {
  const nextScrollTop = event.target.scrollTop

  // 滚动事件频率很高，这里收敛到一帧只更新一次响应式状态，避免快速滚动时可见区计算和组件更新被触发过于频繁。
  if (scrollFrameId) {
    cancelAnimationFrame(scrollFrameId)
  }

  scrollFrameId = requestAnimationFrame(() => {
    scrollTop.value = nextScrollTop
    scrollFrameId = 0
  })
}

// 对外暴露“滚到底部”能力，供自动滚动逻辑和父组件复用。
const scrollToBottom = () => {
  if (!containerRef.value) return

  updateViewportHeight()
  scrollTop.value = Math.max(getTotalHeight() - viewportHeight.value, 0)
  containerRef.value.scrollTop = scrollTop.value
}

watch(
  () => props.items.length,
  () => {
    // 新增或删除消息后，先等 DOM 更新，再重新读取容器高度。
    nextTick(updateViewportHeight)
  },
)

watch(
  () => props.items.map((item) => getItemKey(item)),
  (keys) => {
    const activeKeys = new Set(keys)

    // 被移出列表的消息不需要继续保留高度缓存和 ResizeObserver，这里在删消息、切会话后顺手清理，避免缓存长期累积。
    itemElements.forEach((_, key) => {
      if (activeKeys.has(key)) return

      itemElements.delete(key)
      resizeObservers.get(key)?.disconnect()
      resizeObservers.delete(key)

      if (heightCache.value.has(key)) {
        const nextCache = new Map(heightCache.value)
        nextCache.delete(key)
        heightCache.value = nextCache
      }
    })
  },
)

onMounted(() => {
  // 初始化阶段先读取一次容器高度，并在窗口尺寸变化时同步更新。
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})

onUnmounted(() => {
  if (scrollFrameId) {
    cancelAnimationFrame(scrollFrameId)
  }
  window.removeEventListener('resize', updateViewportHeight)

  resizeObservers.forEach((observer) => {
    observer.disconnect()
  })
  resizeObservers.clear()
  itemElements.clear()
})

defineExpose({
  // 供 useAutoScroll 调用。
  scrollToBottom,
  // 供外部在需要时直接拿到底层滚动容器。
  getScrollElement: () => containerRef.value,
})
</script>

<style lang="scss" scoped>
.virtual-list {
  // 虚拟列表自身负责滚动，父组件只需要给定可用高度。
  height: 100%;
  overflow-y: auto;
}

.virtual-item {
  // 防止内部长文本或宽表格把 flex 子项最小宽度撑爆。
  min-width: 0;
}
</style>

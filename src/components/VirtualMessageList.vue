<template>
  <div ref="containerRef" class="virtual-list" @scroll="handleScroll">
    <div :style="{ height: `${topSpacerHeight}px` }"></div>

    <div
      v-for="entry in visibleItems"
      :key="entry.key"
      :ref="(element) => setItemElement(entry.key, element)"
      class="virtual-item"
    >
      <slot :item="entry.item" :index="entry.index"></slot>
    </div>

    <div :style="{ height: `${bottomSpacerHeight}px` }"></div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  itemKey: {
    type: Function,
    required: true,
  },
  estimateSize: {
    type: Number,
    default: 180,
  },
  overscan: {
    type: Number,
    default: 4,
  },
})

const containerRef = ref(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const heightCache = ref(new Map())
const itemElements = new Map()
const resizeObservers = new Map()
let scrollFrameId = 0

const getItemKey = (item) => props.itemKey(item)

const getItemHeight = (index) => {
  const item = props.items[index]
  if (!item) return 0

  return heightCache.value.get(getItemKey(item)) ?? props.estimateSize
}

const updateViewportHeight = () => {
  viewportHeight.value = containerRef.value?.clientHeight || 0
}

// 滚动过程中会频繁查询“某个索引之前累计了多高”。
// 这里预先维护前缀高度表，避免每次滚动都重复做 O(n) 累加。
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

const getTotalHeight = () => prefixHeights.value[prefixHeights.value.length - 1] ?? 0

// 前缀高度表准备好后，用二分查找定位视口对应的起始项，
// 避免在滚动过程中一遍遍线性扫描整个消息数组。
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

const topSpacerHeight = computed(() => getOffsetBefore(visibleRange.value.start))

const bottomSpacerHeight = computed(() => {
  const visibleHeight = getOffsetBefore(visibleRange.value.end) - topSpacerHeight.value
  return Math.max(getTotalHeight() - topSpacerHeight.value - visibleHeight, 0)
})

const updateItemHeight = (key, height) => {
  if (!height || heightCache.value.get(key) === height) return

  const nextCache = new Map(heightCache.value)
  nextCache.set(key, height)
  heightCache.value = nextCache
}

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

const handleScroll = (event) => {
  const nextScrollTop = event.target.scrollTop

  // 滚动事件频率很高，这里收敛到一帧只更新一次响应式状态，
  // 避免快速滚动时可见区计算和组件更新被触发过于频繁。
  if (scrollFrameId) {
    cancelAnimationFrame(scrollFrameId)
  }

  scrollFrameId = requestAnimationFrame(() => {
    scrollTop.value = nextScrollTop
    scrollFrameId = 0
  })
}

const scrollToBottom = () => {
  if (!containerRef.value) return

  updateViewportHeight()
  scrollTop.value = Math.max(getTotalHeight() - viewportHeight.value, 0)
  containerRef.value.scrollTop = scrollTop.value
}

watch(
  () => props.items.length,
  () => {
    nextTick(updateViewportHeight)
  },
)

watch(
  () => props.items.map((item) => getItemKey(item)),
  (keys) => {
    const activeKeys = new Set(keys)

    // 被移出列表的消息不需要继续保留高度缓存和 ResizeObserver。
    // 这里在删消息、切会话后顺手清理，避免缓存长期累积。
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
  scrollToBottom,
  getScrollElement: () => containerRef.value,
})
</script>

<style lang="scss" scoped>
.virtual-list {
  height: 100%;
  overflow-y: auto;
}

.virtual-item {
  min-width: 0;
}
</style>

<template>
  <div ref="containerRef" class="virtual-list" @scroll="handleScroll">
    <div :style="{ height: `${topSpacerHeight}px` }"></div>

    <div
      v-for="item in visibleItems"
      :key="getItemKey(item)"
      :ref="(element) => setItemElement(getItemKey(item), element)"
      class="virtual-item"
    >
      <slot :item="item" :index="item.__virtualIndex"></slot>
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

const getItemKey = (item) => props.itemKey(item)

const getItemHeight = (index) => {
  const item = props.items[index]
  if (!item) return 0

  return heightCache.value.get(getItemKey(item)) ?? props.estimateSize
}

const updateViewportHeight = () => {
  viewportHeight.value = containerRef.value?.clientHeight || 0
}

const getOffsetBefore = (endIndex) => {
  let total = 0

  for (let index = 0; index < endIndex; index += 1) {
    total += getItemHeight(index)
  }

  return total
}

const getTotalHeight = () => {
  let total = 0

  for (let index = 0; index < props.items.length; index += 1) {
    total += getItemHeight(index)
  }

  return total
}

const getStartIndex = () => {
  let offset = 0

  for (let index = 0; index < props.items.length; index += 1) {
    const itemHeight = getItemHeight(index)
    if (offset + itemHeight > scrollTop.value) {
      return index
    }

    offset += itemHeight
  }

  return Math.max(props.items.length - 1, 0)
}

const getEndIndex = (startIndex) => {
  let offset = getOffsetBefore(startIndex)
  let index = startIndex
  const viewportBottom = scrollTop.value + viewportHeight.value

  while (index < props.items.length && offset < viewportBottom) {
    offset += getItemHeight(index)
    index += 1
  }

  return index
}

const visibleRange = computed(() => {
  if (props.items.length === 0) {
    return {
      start: 0,
      end: 0,
    }
  }

  const startIndex = getStartIndex()
  const endIndex = getEndIndex(startIndex)

  return {
    start: Math.max(startIndex - props.overscan, 0),
    end: Math.min(endIndex + props.overscan, props.items.length),
  }
})

const visibleItems = computed(() => {
  return props.items
    .slice(visibleRange.value.start, visibleRange.value.end)
    .map((item, offset) => ({
      ...item,
      __virtualIndex: visibleRange.value.start + offset,
    }))
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
  scrollTop.value = event.target.scrollTop
}

const scrollToBottom = () => {
  if (!containerRef.value) return

  updateViewportHeight()
  scrollTop.value = Math.max(getTotalHeight() - viewportHeight.value, 0)
  containerRef.value.scrollTop = containerRef.value.scrollHeight
}

watch(
  () => props.items.length,
  () => {
    nextTick(updateViewportHeight)
  },
)

onMounted(() => {
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})

onUnmounted(() => {
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

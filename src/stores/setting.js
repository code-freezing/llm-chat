import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS } from '@/constants/settings'

export const useSettingStore = defineStore(
  'llm-setting',
  () => {
    // 设置项会持久化到本地，刷新后继续沿用用户上次的配置。
    const settings = ref({ ...DEFAULT_SETTINGS })

    return {
      settings,
    }
  },
  {
    persist: true,
  },
)

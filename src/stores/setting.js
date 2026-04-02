import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS } from '@/constants/settings'

export const useSettingStore = defineStore(
  'llm-setting',
  () => {
    // settings 是请求参数和界面设置的统一来源，页面刷新后仍然保留用户上次配置，因此默认值只在首次初始化时生效。
    const settings = ref({ ...DEFAULT_SETTINGS })

    return {
      settings,
    }
  },
  {
    persist: true,
  },
)

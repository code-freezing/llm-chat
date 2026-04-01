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
    // 设置项同样需要持久化，否则用户每次刷新都要重新填写 API Key 和参数。
    persist: true,
  },
)

<template>
  <el-drawer v-model="visible" title="设置" direction="rtl" size="350px">
    <div class="setting-container">
      <div class="setting-item">
        <div class="setting-label">Model</div>
        <el-select
          v-model="settingStore.settings.model"
          class="model-select"
          placeholder="选择模型"
        >
          <el-option
            v-for="option in MODEL_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>

      <div class="setting-item">
        <div class="setting-label-row">
          <div class="label-with-tooltip">
            <span>流式响应</span>
            <el-tooltip content="开启后会以流式方式展示模型回复" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
          <el-switch v-model="settingStore.settings.stream" />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label-row">
          <div class="label-with-tooltip">
            <span>API Key</span>
            <el-tooltip content="设置模型服务的 API Key" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>

          <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" class="get-key-link">
            获取 API Key
          </a>
        </div>
        <el-input
          v-model="settingStore.settings.apiKey"
          type="password"
          placeholder="请输入 API Key"
          show-password
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          角色设定
          <el-tooltip content="选择一套系统提示词预设，快速切换助手角色" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <el-select
          v-model="settingStore.settings.systemPromptPreset"
          class="model-select"
          placeholder="选择角色预设"
        >
          <el-option
            v-for="preset in SYSTEM_PROMPT_PRESETS"
            :key="preset.value"
            :label="preset.label"
            :value="preset.value"
          />
        </el-select>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          System Prompt
          <el-tooltip content="这段提示词会作为 system 消息插入到每次对话请求最前面" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <el-input
          v-model="settingStore.settings.systemPrompt"
          type="textarea"
          :rows="6"
          resize="vertical"
          placeholder="请输入系统提示词"
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          Max Tokens
          <el-tooltip content="限制单次生成内容的最大长度" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="setting-control">
          <el-slider
            v-model="settingStore.settings.maxTokens"
            :min="1"
            :max="currentMaxTokens"
            :step="1"
            :show-tooltip="false"
            class="setting-slider"
          />
          <el-input-number
            v-model="settingStore.settings.maxTokens"
            :min="1"
            :max="currentMaxTokens"
            :step="1"
            controls-position="right"
          />
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingStore } from '@/stores/setting'
import { MODEL_OPTIONS } from '@/constants/models'
import {
  SYSTEM_PROMPT_PRESETS,
  getSystemPromptByPreset,
} from '@/constants/systemPrompts'
import { QuestionFilled } from '@element-plus/icons-vue'

// SettingsPanel 直接操作 setting store。
// 用户在这里改动的模型和参数，会直接影响后续聊天请求的请求体。
const settingStore = useSettingStore()
const visible = ref(false)
let isUpdatingPromptFromPreset = false

// 不同模型支持的最大 tokens 上限不同，
// 因此这里根据当前选中的模型动态限制 Max Tokens 控件的最大值。
const currentMaxTokens = computed(() => {
  const selectedModel = MODEL_OPTIONS.find((option) => option.value === settingStore.settings.model)
  return selectedModel ? selectedModel.maxTokens : 4096
})

// 当模型发生切换时，如果当前 maxTokens 超出新模型上限，就自动收回。
watch(
  () => settingStore.settings.model,
  (newModel) => {
    const selectedModel = MODEL_OPTIONS.find((option) => option.value === newModel)
    if (!selectedModel) return

    settingStore.settings.maxTokens = Math.min(
      settingStore.settings.maxTokens,
      selectedModel.maxTokens,
    )
  },
)

// 角色预设是“填充 system prompt 的快捷入口”。
// 用户切换预设时，直接把对应提示词写入可编辑文本框，后续仍然允许用户继续手动修改。
watch(
  () => settingStore.settings.systemPromptPreset,
  (presetValue) => {
    if (presetValue === 'custom') return

    isUpdatingPromptFromPreset = true
    settingStore.settings.systemPrompt = getSystemPromptByPreset(presetValue)
    isUpdatingPromptFromPreset = false
  },
)

// 用户手动改写 system prompt 后，界面上的角色预设也要同步切到“自定义”，
// 避免下拉框仍然显示某个预设名称，但实际发送给模型的 prompt 已经变了。
watch(
  () => settingStore.settings.systemPrompt,
  (prompt) => {
    if (isUpdatingPromptFromPreset) return

    const matchedPreset = SYSTEM_PROMPT_PRESETS.find(
      (preset) => preset.value !== 'custom' && preset.prompt === prompt,
    )

    settingStore.settings.systemPromptPreset = matchedPreset ? matchedPreset.value : 'custom'
  },
)

// 聊天页通过组件 ref 调用 openDrawer，从外部直接打开设置抽屉。
const openDrawer = () => {
  visible.value = true
}

defineExpose({
  openDrawer,
})
</script>

<style lang="scss" scoped>
.setting-container {
  padding: 20px;
  color: #27272a;
}

.setting-item {
  margin-bottom: 24px;

  .setting-label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 500;
    color: #27272a;
  }

  .setting-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    color: #27272a;

    .label-with-tooltip {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .get-key-link {
      font-size: 14px;
      color: #3f7af1;
      text-decoration: none;
    }
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 16px;

    .setting-slider {
      flex: 1;
    }

    :deep(.el-input-number) {
      width: 120px;
    }
  }

  .model-select {
    width: 100%;
  }

  :deep(.el-select-dropdown__item) {
    color: #27272a;
  }
}
</style>

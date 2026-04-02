<template>
  <!-- 设置面板直接映射到 setting store，用户修改后立即生效。 -->
  <el-drawer v-model="visible" title="设置" direction="rtl" size="350px">
    <div class="setting-container">
      <div class="setting-item">
        <div class="setting-label">Model</div>
        <!-- 模型列表来自常量配置，避免在模板里硬编码选项。 -->
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
          <el-tooltip
            content="这段提示词会作为 system 消息插入到每次对话请求最前面"
            placement="top"
          >
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <el-input
          v-model="settingStore.settings.systemPrompt"
          type="textarea"
          :rows="6"
          :disabled="!isCustomPreset"
          resize="vertical"
          :placeholder="
            isCustomPreset ? '请输入系统提示词' : '当前为预设提示词，切换到“自定义”后才可编辑'
          "
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

      <div class="setting-item">
        <div class="setting-label">
          Temperature
          <el-tooltip content="控制输出的随机性，越高越发散" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="setting-control">
          <el-slider
            v-model="settingStore.settings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :show-tooltip="false"
            class="setting-slider"
          />
          <el-input-number
            v-model="settingStore.settings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :precision="1"
            controls-position="right"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          Top P
          <el-tooltip content="控制 nucleus sampling 的候选概率范围" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="setting-control">
          <el-slider
            v-model="settingStore.settings.topP"
            :min="0"
            :max="1"
            :step="0.1"
            :show-tooltip="false"
            class="setting-slider"
          />
          <el-input-number
            v-model="settingStore.settings.topP"
            :min="0"
            :max="1"
            :step="0.1"
            :precision="1"
            controls-position="right"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          Top K
          <el-tooltip content="限制每个 token 采样时参与竞争的候选数量" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="setting-control">
          <el-slider
            v-model="settingStore.settings.topK"
            :min="1"
            :max="100"
            :step="1"
            :show-tooltip="false"
            class="setting-slider"
          />
          <el-input-number
            v-model="settingStore.settings.topK"
            :min="1"
            :max="100"
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
import { SYSTEM_PROMPT_PRESETS, getSystemPromptByPreset } from '@/constants/systemPrompts'
import { QuestionFilled } from '@element-plus/icons-vue'

// SettingsPanel 直接操作 setting store，用户在这里改动的模型和参数会直接影响后续聊天请求的请求体。
const settingStore = useSettingStore()
const visible = ref(false)
let isUpdatingPromptFromPreset = false
const isCustomPreset = computed(() => settingStore.settings.systemPromptPreset === 'custom')

// 不同模型支持的最大 tokens 上限不同，因此这里根据当前选中的模型动态限制 Max Tokens 控件的最大值。
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

// 自定义 prompt 要和“当前真正发给模型的 system prompt”分开保存，这样用户切换到别的预设后，再切回“自定义”时，仍然能恢复自己写过的内容。
const normalizeSystemPromptSettings = () => {
  const currentPreset = settingStore.settings.systemPromptPreset
  const customPrompt = settingStore.settings.customSystemPrompt.trim()

  // 恢复时优先尊重“用户上次明确选择的预设”，只有当上次选择本身就是 custom 时，才去读取 customSystemPrompt。
  if (currentPreset === 'custom' && customPrompt) {
    settingStore.settings.systemPrompt = settingStore.settings.customSystemPrompt
    return
  }

  // 非 custom 预设直接恢复对应的固定提示词。
  settingStore.settings.systemPrompt = getSystemPromptByPreset(currentPreset)
}

normalizeSystemPromptSettings()

// 角色预设是“填充 system prompt 的快捷入口”，非自定义预设直接回填固定 prompt；切回自定义时恢复之前单独保存的自定义内容。
watch(
  () => settingStore.settings.systemPromptPreset,
  (presetValue) => {
    isUpdatingPromptFromPreset = true

    if (presetValue === 'custom') {
      settingStore.settings.systemPrompt = settingStore.settings.customSystemPrompt
    } else {
      settingStore.settings.systemPrompt = getSystemPromptByPreset(presetValue)
    }

    isUpdatingPromptFromPreset = false
  },
)

// System Prompt 文本框只允许在“自定义”模式下修改，这里把用户输入同步回 customSystemPrompt，供后续切回“自定义”时恢复。
watch(
  () => settingStore.settings.systemPrompt,
  (prompt) => {
    if (isUpdatingPromptFromPreset) return
    if (!isCustomPreset.value) return

    settingStore.settings.customSystemPrompt = prompt
  },
)

const openDrawer = () => {
  visible.value = true
}

defineExpose({
  openDrawer,
})
</script>

<style lang="scss" scoped>
.setting-container {
  // 抽屉内部整体留白比页面表单更大，减轻侧边栏压迫感。
  padding: 0 20px 0 20px;
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
    // 滑块和数字输入框并排，分别满足拖拽和精确输入两种操作习惯。
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

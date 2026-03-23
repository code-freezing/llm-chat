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
          <el-tooltip content="值越高，回复越随机" placement="top">
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
            controls-position="right"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          Top-P
          <el-tooltip content="控制候选词的累积概率范围" placement="top">
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
            controls-position="right"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          Top-K
          <el-tooltip content="保留概率最高的 K 个候选词" placement="top">
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
import { QuestionFilled } from '@element-plus/icons-vue'

const settingStore = useSettingStore()
const visible = ref(false)

// 选中模型变化时，联动限制 maxTokens 的可选上限。
const currentMaxTokens = computed(() => {
  const selectedModel = MODEL_OPTIONS.find((option) => option.value === settingStore.settings.model)
  return selectedModel ? selectedModel.maxTokens : 4096
})

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

// 暴露给父组件，允许从聊天页直接打开设置抽屉。
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

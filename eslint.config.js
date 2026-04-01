import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    // 只对源码文件执行 lint，避免把图片、样式示例等无关文件纳入规则范围。
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    // 构建产物和覆盖率目录不参与静态检查。
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    name: 'app/custom-rules',
    rules: {
      // 统一单文件组件块顺序，避免模板、脚本、样式来回穿插。
      'vue/block-order': [
        'error',
        {
          order: ['template', 'script', 'style'],
        },
      ],
    },
  },
  // 让 Prettier 接管格式层面的判断，避免和 ESLint 规则冲突。
  skipFormatting,
]

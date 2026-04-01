import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// Vite 配置保持很薄，主要处理三件事：
// 1. Vue 与 Element Plus 的自动导入
// 2. `@` 路径别名
// 3. 按依赖类型拆分构建产物
export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      // 自动导入 Element Plus 的 API，减少模板和脚本里的重复 import。
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      // 自动注册组件，让页面层按需使用 Element Plus 组件。
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ].filter(Boolean),
    server: {
      port: 5173,
      // 开发环境固定端口，方便本地调试和截图文档复用稳定地址。
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // 按库类型手动拆包，避免 markdown / highlight / element-plus 全部挤进同一个 chunk。
          manualChunks(id) {
            if (id.includes('node_modules/highlight.js')) {
              return 'highlight'
            }

            if (
              id.includes('node_modules/markdown-it') ||
              id.includes('node_modules/markdown-it-link-attributes') ||
              id.includes('node_modules/markdown-it-emoji') ||
              id.includes('node_modules/dompurify')
            ) {
              return 'markdown'
            }

            if (id.includes('node_modules/element-plus')) {
              return 'element-plus'
            }
          },
        },
      },
    },
  }
})

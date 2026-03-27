import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
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

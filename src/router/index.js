import { createRouter, createWebHistory } from 'vue-router'

// 路由层只负责建立“地址 -> 页面组件”的映射关系，当前仓库只有首页和聊天页两个主要入口，因此路由结构保持很薄。
const router = createRouter({
  // 使用 HTML5 History 模式，因此地址形态是 `/chat` 而不是 `/#/chat`；`BASE_URL` 用于兼容项目被部署到二级路径的场景。
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
    },
  ],
})

// 路由实例单独导出，供 main.js 注册。
export default router

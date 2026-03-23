import { createApp } from 'vue'
import { createPinia } from 'pinia'

import persist from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import 'animate.css'

// 应用入口：统一注册 Pinia、持久化插件、路由和全局样式。
const app = createApp(App)

app.use(createPinia().use(persist))
app.use(router)

app.mount('#app')

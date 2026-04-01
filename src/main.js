import { createApp } from 'vue'
import { createPinia } from 'pinia'

import persist from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import 'animate.css'

// 应用启动入口，这个文件只负责把全局运行时能力装配起来，不承担具体页面业务。
const app = createApp(App)

// 为应用注册 Pinia，并把持久化插件挂到 Pinia 实例上，这样声明了 `persist: true` 的 store 会自动同步到本地存储。
app.use(createPinia().use(persist))
// 路由在 Pinia 之后注册即可，二者之间没有前后依赖耦合。
app.use(router)

// 把根应用挂到 index.html 里的 #app 节点，应用从这里开始渲染。
app.mount('#app')

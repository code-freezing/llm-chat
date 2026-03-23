# LLM Chat

一个基于 Vue 3 的 AI 聊天前端项目，支持多会话管理、流式响应、Markdown 渲染、代码高亮和本地持久化。

这个项目是纯前端应用，不包含本地后端服务。前端会直接请求模型提供方 API。

## 项目简介

- 基于 Vue 3 + Vite 构建
- 使用 Pinia 管理状态
- 使用 Element Plus 构建界面
- 支持流式和非流式聊天响应
- 支持 Markdown 渲染和代码高亮
- 支持本地保存聊天记录和设置项

## 功能特性

- 多会话聊天
- 流式输出
- Markdown 渲染
- 代码块高亮
- 代码复制
- 代码块主题切换
- 本地持久化
- 模型参数可配置

## 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Sass
- markdown-it
- highlight.js

## 目录结构

```text
src/
├─ assets/         静态资源和样式
├─ components/     通用组件
├─ config/         运行时配置
├─ constants/      常量和默认配置
├─ renderers/      内容渲染逻辑
├─ router/         路由配置
├─ services/       接口请求和业务服务
├─ stores/         Pinia 状态管理
└─ views/          页面视图
```

关键目录说明：

- `src/views`：页面入口，如首页和聊天页
- `src/components`：聊天输入框、消息组件、设置面板、弹窗等
- `src/stores`：会话状态和系统设置状态
- `src/services/chat`：聊天接口调用和流式响应处理
- `src/renderers`：Markdown 与代码块渲染
- `src/constants`：默认设置和模型列表
- `src/config`：环境变量配置

## 快速开始

### 环境要求

- Node.js 18 及以上
- pnpm 9 及以上

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 本地预览生产构建

```bash
pnpm preview
```

## 配置说明

项目目前支持通过 Vite 环境变量和页面设置面板进行配置。

可以先复制一份环境变量模板：

```bash
cp .env.example .env.local
```

如果需要自定义接口地址，可以在 `.env.local` 中修改：

```bash
VITE_API_BASE_URL=https://api.siliconflow.cn/v1
```

运行时可在页面设置面板中配置：

- API Key
- 模型
- 是否流式输出
- Max Tokens
- Temperature
- Top-P
- Top-K

## 项目工作流程

1. 用户在输入框中输入消息并发送
2. 页面先把用户消息写入当前会话
3. 页面追加一条空的 assistant 消息作为占位
4. 前端将当前上下文发送给聊天接口
5. 如果开启流式输出，则逐段解析响应流
6. 持续更新最后一条 assistant 消息内容
7. 消息内容最终以 Markdown 形式渲染，并支持代码高亮

## 当前限制

- 这是一个纯前端项目，API Key 需要在浏览器界面中输入
- 文件上传目前主要用于前端预览和附件展示
- 上传的文件内容不会被解析，也不会作为文档上下文发送给模型
- 当前版本的错误处理和重试机制还比较基础

## 可用脚本

- `pnpm dev`：启动开发环境
- `pnpm build`：构建生产版本
- `pnpm preview`：预览生产构建
- `pnpm lint`：执行 ESLint 并自动修复
- `pnpm format`：使用 Prettier 格式化 `src/`

## 后续计划

- 完善请求错误处理和参数校验
- 补充 `.env.example`
- 支持更灵活的模型服务配置
- 优化打包体积和代码拆分
- 为消息处理和状态管理补充测试
- 完善上传和文档理解能力

## 说明

这个仓库当前目标是作为一个结构清晰、可持续迭代的第一版前端聊天项目，后续功能和性能优化会继续推进。

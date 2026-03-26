import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import mdLinkAttributes from 'markdown-it-link-attributes'
import { full as emoji } from 'markdown-it-emoji'
import 'highlight.js/styles/atom-one-dark.css'

import copyIcon from '@/assets/photo/复制.png'
import darkIcon from '@/assets/photo/暗黑模式.png'
import lightIcon from '@/assets/photo/明亮模式.png'

// 统一的 Markdown 渲染器。
// 模型返回的文本最终都会先经过这里转成 HTML，再交给消息组件展示。
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: function (str, lang) {
    // 如果识别到了受支持的语言，就交给 highlight.js 做语法高亮。
    // 这里还会额外拼出代码块头部，把复制和主题切换按钮一起注入。
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return `<div class="code-block"><div class="code-header"><span class="code-lang">${lang}</span><div class="code-actions"><button class="code-action-btn" data-action="copy" data-tooltip="复制"><img src="${copyIcon}" alt="copy" /></button><button class="code-action-btn" data-action="theme" data-tooltip="切换主题"><img src="${darkIcon}" alt="theme" data-light-icon="${lightIcon}" data-dark-icon="${darkIcon}" /></button></div></div><pre class="hljs"><code>${highlighted}</code></pre></div>`
      } catch {
        // 高亮失败时退回到安全转义后的普通代码块，避免整段渲染失败。
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
      }
    }

    // 没有语言标记时，同样输出安全转义后的代码块。
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

// 所有链接默认新开标签页，避免用户点击模型输出链接后直接离开当前应用。
md.use(mdLinkAttributes, {
  attrs: {
    target: '_blank',
    rel: 'noopener',
  },
})

// 支持 emoji 语法，例如 `:smile:`。
md.use(emoji)

export const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

export { md }

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import mdLinkAttributes from 'markdown-it-link-attributes'
import { full as emoji } from 'markdown-it-emoji'
import DOMPurify from 'dompurify'
import 'highlight.js/styles/atom-one-dark.css'

import copyIcon from '@/assets/photo/复制.png'
import darkIcon from '@/assets/photo/暗黑模式.png'
import lightIcon from '@/assets/photo/明亮模式.png'

const renderCodeBlock = (code, languageLabel = 'code') => {
  return `<div class="code-block"><div class="code-header"><span class="code-lang">${languageLabel}</span><div class="code-actions"><button class="code-action-btn" data-action="copy" data-tooltip="复制"><img src="${copyIcon}" alt="copy" /></button><button class="code-action-btn" data-action="theme" data-tooltip="切换主题"><img src="${darkIcon}" alt="theme" data-light-icon="${lightIcon}" data-dark-icon="${darkIcon}" /></button></div></div><pre class="hljs"><code>${code}</code></pre></div>`
}

// 聊天场景里高频出现的代码语言就这些，没必要把 highlight.js 的全部语言包都打进来。
// 改成 core + 手动注册后，可以明显收缩 markdown 渲染相关的体积。
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('vue', xml)

// 统一的 Markdown 渲染器。
// 模型返回的文本最终都会先经过这里转成 HTML，再交给消息组件展示。
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: function (str, lang) {
    const normalizedLang = lang?.trim().toLowerCase()

    // 如果识别到了受支持的语言，就交给 highlight.js 做语法高亮。
    // 这里还会额外拼出代码块头部，把复制和主题切换按钮一起注入。
    if (normalizedLang && hljs.getLanguage(normalizedLang)) {
      try {
        const highlighted = hljs.highlight(str, {
          language: normalizedLang,
          ignoreIllegals: true,
        }).value
        return renderCodeBlock(highlighted, normalizedLang)
      } catch {
        // 高亮失败时退回到安全转义后的普通代码块，避免整段渲染失败。
        return renderCodeBlock(md.utils.escapeHtml(str), normalizedLang)
      }
    }

    // 没有语言标记时，也统一走带头部的代码卡片，避免不同代码块样式割裂。
    return renderCodeBlock(md.utils.escapeHtml(str), 'code')
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

  // Markdown 渲染结果最终会通过 `v-html` 注入到页面里，
  // 因此这里统一用 DOMPurify 做一次净化，拦掉脚本、事件属性等危险内容。
  // 这样既保留当前 markdown-it 的富文本能力，也把 XSS 风险收敛到渲染器这一层处理。
  const html = md.render(content)
  return DOMPurify.sanitize(html)
}

export { md }

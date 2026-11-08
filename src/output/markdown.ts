import DOMPurify from 'dompurify';
import { marked } from 'marked';

// 将 Markdown 转换为受限的安全文档节点，原始 HTML 按普通文本显示。
export function renderMarkdown(text: string): HTMLElement {
  const element = document.createElement('article');
  element.className = 'lk-markdown';
  const renderer = new marked.Renderer();
  // 原始 HTML 保持字面量，避免文档引入额外交互节点。
  function escapeHtml({ text }: { text: string }): string {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
  renderer.html = escapeHtml;
  const html = marked.parse(text, { async: false, renderer });
  element.innerHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'a', 'em', 'strong', 'hr', 'br', 'del', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ALLOWED_ATTR: ['href', 'title'],
  });
  for (const link of element.querySelectorAll('a')) {
    const href = link.getAttribute('href') ?? '';
    if (!/^(https?:|mailto:|#)/iu.test(href)) link.removeAttribute('href');
    link.setAttribute('rel', 'noopener noreferrer');
  }
  return element;
}

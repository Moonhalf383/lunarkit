const blockTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL']);

// 将富内容的块边界和显式换行转换为容量统计用的逻辑行。
function logicalText(node: Node, preformatted = false): string {
  if (node.nodeType === 3) {
    const text = node.textContent ?? '';
    const betweenBlocks = (node.previousSibling?.nodeType === 1 && blockTags.has((node.previousSibling as Element).tagName))
      || (node.nextSibling?.nodeType === 1 && blockTags.has((node.nextSibling as Element).tagName));
    return !preformatted && betweenBlocks && /^\s*$/u.test(text) ? '' : text;
  }
  if (node.nodeType !== 1) return '';
  const element = node as Element;
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return '';
  if (element.tagName === 'BR') return '\n';
  preformatted ||= element.tagName === 'PRE';
  let text = '';
  for (const child of node.childNodes) {
    const block = child.nodeType === 1 && blockTags.has((child as Element).tagName);
    if (block && text && !text.endsWith('\n')) text += '\n';
    text += logicalText(child, preformatted);
    if (block && !text.endsWith('\n')) text += '\n';
  }
  return text;
}

// 从最旧记录开始收敛输出容量，不拆开富内容或正在交互的节点。
export function trimHistory(stream: HTMLElement, limit: number, protectedPanel?: HTMLElement): void {
  const entries: { element: HTMLElement; lines: number; protected: boolean }[] = [];
  let total = 0;
  for (const child of stream.children) {
    const element = child as HTMLElement;
    if (element.classList.contains('lk-scene-boundary')) {
      entries.push({ element, lines: 0, protected: element === stream.querySelectorAll('.lk-scene-boundary').item(stream.querySelectorAll('.lk-scene-boundary').length - 1) });
      continue;
    }
    const plain = element.classList.contains('lk-output') || element.classList.contains('lk-submission');
    const content = plain ? element.textContent ?? '' : logicalText(element).replace(/\n$/u, '');
    const lines = content.split('\n').length;
    const protectedEntry = (protectedPanel !== undefined && element.contains(protectedPanel))
      || element.querySelector('.lk-loading:not([data-state])') !== null;
    entries.push({ element, lines, protected: protectedEntry });
    total += lines;
  }
  for (const entry of entries) {
    if (total <= limit) break;
    if (entry.protected) continue;
    const { element, lines } = entry;
    if (element === stream.lastElementChild) {
      const text = element.classList.contains('lk-output') ? element : element.querySelector('.lk-submitted-text');
      if (text && lines > limit) {
        const retained = (text.textContent ?? '').split('\n').slice(-limit).join('\n');
        if (text.textContent !== retained) text.textContent = retained;
      }
      break;
    }
    element.remove();
    total -= lines;
  }
}

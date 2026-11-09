const blockTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL']);

const cachedLines = new WeakMap<HTMLElement, number>();

// 按 DOM 变化定位顶层记录，缓存仅失效受影响的输出。
export function invalidateHistory(stream: HTMLElement, records: readonly MutationRecord[]): void {
  for (const record of records) {
    const target = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement;
    if (target?.closest('[data-transient="true"]')) continue;
    let node: Node | null = record.target;
    while (node && node.parentNode !== stream) node = node.parentNode;
    if (node?.nodeType === 1) cachedLines.delete(node as HTMLElement);
  }
}

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
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true' || element.classList.contains('lk-typing-controls')) return '';
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
export function trimHistory(stream: HTMLElement, limit: number, protectedPanel?: HTMLElement, cache = false): void {
  const entries: { element: HTMLElement; lines: number; protected: boolean }[] = [];
  let total = 0;
  const boundaries = stream.querySelectorAll('.lk-scene-boundary');
  const lastBoundary = boundaries.item(boundaries.length - 1);
  for (const child of stream.children) {
    const element = child as HTMLElement;
    if (element.classList.contains('lk-scene-boundary')) {
      entries.push({ element, lines: 0, protected: element === lastBoundary });
      continue;
    }
    const plain = element.classList.contains('lk-output') || element.classList.contains('lk-submission');
    let lines = cache ? cachedLines.get(element) : undefined;
    if (lines === undefined) {
      const content = plain ? element.textContent ?? '' : logicalText(element).replace(/\n$/u, '');
      lines = content.split('\n').length;
      if (cache) cachedLines.set(element, lines);
    }
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
        if (text.textContent !== retained) { text.textContent = retained; cachedLines.delete(element); }
      }
      break;
    }
    element.remove();
    total -= lines;
  }
}

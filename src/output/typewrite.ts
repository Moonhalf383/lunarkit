export interface TypewriteOptions {
  element: HTMLElement;
  signal: AbortSignal;
  interval?: number;
}

// 在完整安全文档结构中按字素揭示文字，取消时恢复完整文案。
export function typewrite({ element, signal, interval = 12 }: TypewriteOptions): Promise<void> {
  signal.throwIfAborted();
  if (!Number.isFinite(interval) || interval < 0) throw new RangeError('interval must be nonnegative.');
  const walker = element.ownerDocument.createTreeWalker(element, 4);
  const nodes: { node: Text; text: string; graphemes: string[] }[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    const graphemes: string[] = [];
    for (const part of segmenter.segment(text)) graphemes.push(part.segment);
    nodes.push({ node: node as Text, text, graphemes });
    node = walker.nextNode();
  }
  if (!interval || element.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  for (const entry of nodes) entry.node.data = '';
  return new Promise<void>(wait);

  // 托管逐字计时和取消监听，完成后归还原始可读结构。
  function wait(resolve: () => void, reject: (reason: unknown) => void): void {
    let index = 0;
    let character = 0;
    let timer: ReturnType<typeof setTimeout>;
    // 释放计时并恢复全文，避免取消后留下截断句子。
    function cleanup(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      for (const entry of nodes) entry.node.data = entry.text;
    }
    // 响应命令取消并交还调用方。
    function abort(): void { cleanup(); reject(signal.reason); }
    // 逐个完整字素输出，保留链接和标题等既有节点。
    function tick(): void {
      if (index >= nodes.length) { cleanup(); resolve(); return; }
      const entry = nodes[index]!;
      entry.node.data += entry.graphemes[character] ?? '';
      character += 1;
      if (character >= entry.graphemes.length) { index += 1; character = 0; }
      timer = setTimeout(tick, interval);
    }
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(tick, interval);
    if (signal.aborted) abort();
  }
}

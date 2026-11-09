export interface TypewriteOptions {
  element: HTMLElement;
  signal: AbortSignal;
  interval?: number;
  skipSignal?: AbortSignal;
  skipLabel?: string;
  skipOnClick?: boolean;
}

const finishers = new WeakMap<HTMLElement, () => void>();

// 立即显示正在播放的完整消息，正常完成而非取消命令。
export function finishTypewrite(element: HTMLElement): void { finishers.get(element)?.(); }

// 按字素展示安全文档，并在完成后通过独立通道播报完整消息。
export function typewrite({ element, signal, interval = 12, skipSignal, skipLabel = 'Show full message', skipOnClick = true }: TypewriteOptions): Promise<void> {
  signal.throwIfAborted();
  finishTypewrite(element);
  if (!Number.isFinite(interval) || interval < 0) throw new RangeError('interval must be nonnegative.');
  const walker = element.ownerDocument.createTreeWalker(element, 4);
  const nodes: { node: Text; text: string; graphemes: string[] }[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let node = walker.nextNode();
  while (node) {
    if (node.parentElement?.closest('svg, [data-transient="true"]')) { node = walker.nextNode(); continue; }
    const text = node.textContent ?? '';
    const graphemes: string[] = [];
    for (const part of segmenter.segment(text)) graphemes.push(part.segment);
    nodes.push({ node: node as Text, text, graphemes });
    node = walker.nextNode();
  }
  if (!interval || skipSignal?.aborted || element.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const visuals = element.querySelectorAll<HTMLElement | SVGElement>('svg, [data-transient="true"]');
  const originalLive = element.getAttribute('aria-live');
  const originalHidden = element.getAttribute('aria-hidden');
  const controls = element.ownerDocument.createElement('div');
  controls.className = 'lk-typing-controls';
  const skip = element.ownerDocument.createElement('button');
  skip.type = 'button';
  skip.className = 'lk-skip-animation';
  skip.textContent = skipLabel;
  const announcement = element.ownerDocument.createElement('span');
  announcement.className = 'lk-sr-only';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-atomic', 'true');
  controls.append(skip, announcement);
  element.after(controls);
  element.setAttribute('aria-live', 'off');
  element.setAttribute('aria-hidden', 'true');
  for (const visual of visuals) visual.style.visibility = 'hidden';
  for (const entry of nodes) entry.node.data = '';
  element.dataset.typing = 'true';
  return new Promise<void>(wait);

  // 托管播放、跳过、播报及命令取消资源。
  function wait(resolve: () => void, reject: (reason: unknown) => void): void {
    let index = 0;
    let character = 0;
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    // 恢复消费端已有的辅助语义属性。
    function restoreAttribute(name: string, value: string | null): void {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
    // 清理全部计时、事件与视觉状态。
    function cleanup(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      skipSignal?.removeEventListener('abort', complete);
      skip.removeEventListener('click', complete);
      element.removeEventListener('click', clicked);
      finishers.delete(element);
      for (const entry of nodes) entry.node.data = entry.text;
      for (const visual of visuals) visual.style.removeProperty('visibility');
      restoreAttribute('aria-live', originalLive);
      restoreAttribute('aria-hidden', originalHidden);
      delete element.dataset.typing;
    }
    // 正常结束或跳过后播报一次完整消息。
    function complete(): void {
      if (settled) return;
      settled = true;
      cleanup();
      skip.remove();
      announcement.textContent = nodes.map(fullText).join(' ');
      resolve();
    }
    // 提取原文用于辅助技术整段播报。
    function fullText(entry: { text: string }): string { return entry.text; }
    // 点击普通文字时跳过，链接等交互节点保留原生动作。
    function clicked(event: Event): void {
      const target = event.target as Element | null;
      if (!target?.closest('a, button, input, textarea, select')) complete();
    }
    // 命令取消恢复文档并沿用原始取消原因。
    function abort(): void { if (settled) return; settled = true; cleanup(); controls.remove(); reject(signal.reason); }
    // 逐个完整字素展示，并逐步开放图形可见性。
    function tick(): void {
      if (index >= nodes.length) { complete(); return; }
      const visibleCount = Math.ceil(index / Math.max(1, nodes.length) * visuals.length);
      for (let visual = 0; visual < visibleCount; visual += 1) visuals[visual]!.style.removeProperty('visibility');
      const entry = nodes[index]!;
      entry.node.data += entry.graphemes[character] ?? '';
      character += 1;
      if (character >= entry.graphemes.length) { index += 1; character = 0; }
      timer = setTimeout(tick, interval);
    }
    finishers.set(element, complete);
    signal.addEventListener('abort', abort, { once: true });
    skipSignal?.addEventListener('abort', complete, { once: true });
    skip.addEventListener('click', complete);
    if (skipOnClick) element.addEventListener('click', clicked);
    timer = setTimeout(tick, interval);
    if (signal.aborted) abort();
  }
}

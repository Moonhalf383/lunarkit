import type { ScrollController } from './scroll.js';

// 创建可取消的场景分页，并用尾部空间保证旧内容完整离开视口。
export function createScenes(root: HTMLElement, getStream: () => HTMLElement, reveal: () => void, scroll: ScrollController) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const tail = document.createElement('div');
  tail.className = 'lk-scene-tail';
  tail.setAttribute('aria-hidden', 'true');
  let active: AbortController | undefined;
  let disposed = false;

  // 在流内放置零行数分页空间，等待滚动动画后再允许输出。
  async function next(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (disposed) throw new Error('Terminal scenes have been disposed.');
    active?.abort();
    const controller = new AbortController();
    active = controller;
    // 将命令取消原因传入当前滚动生命周期。
    function abort(): void { controller.abort(signal.reason); }
    signal.addEventListener('abort', abort, { once: true });
    const stream = getStream();
    const boundary = document.createElement('div');
    boundary.className = 'lk-scene-boundary';
    boundary.setAttribute('aria-hidden', 'true');
    boundary.style.height = `${scroll.viewport().height + scroll.sceneTopSpace}px`;
    const anchor = document.createElement('div');
    anchor.className = 'lk-scene-anchor';
    boundary.append(anchor);
    stream.append(boundary);
    root.append(tail);
    tail.style.height = `${scroll.viewport().height}px`;
    const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : scroll.sceneDuration;
    try {
      await new Promise<void>(animate);
    } finally {
      signal.removeEventListener('abort', abort);
      if (active === controller) active = undefined;
      reveal();
    }

    // 使用逐帧滚动，使取消和减少动态效果都具有确定的完成边界。
    function animate(resolve: () => void, reject: (reason: unknown) => void): void {
      let frame: number | undefined;
      let start: number | undefined;
      const initial = scroll.position();
      const destination = initial + anchor.getBoundingClientRect().top - scroll.viewport().top - scroll.sceneTopSpace;
      // 清理动画及监听，取消时保留已经建立的场景边界。
      function cleanup(): void {
        if (frame !== undefined) view?.cancelAnimationFrame(frame);
        controller.signal.removeEventListener('abort', cancel);
      }
      // 中断场景动画并释放后续命令执行权。
      function cancel(): void { cleanup(); reject(controller.signal.reason); }
      // 按缓出曲线推进页面，结束前重新对齐场景起点。
      function tick(time: number): void {
        start ??= time;
        const progress = duration ? Math.min(1, (time - start) / duration) : 1;
        scroll.move(initial + (destination - initial) * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = view?.requestAnimationFrame(tick);
        else {
          scroll.align(anchor);
          cleanup();
          resolve();
        }
      }
      controller.signal.addEventListener('abort', cancel, { once: true });
      if (controller.signal.aborted) cancel();
      else if (view?.requestAnimationFrame) frame = view.requestAnimationFrame(tick);
      else { cleanup(); resolve(); }
    }
  }

  // 判断滚动期间是否需要暂缓通常的输入可见性滚动。
  function isActive(): boolean { return active !== undefined; }
  // 返回当前场景边界，避免输入恢复将旧内容拉回视口。
  function floor(): HTMLElement | null {
    const anchors = getStream().querySelectorAll<HTMLElement>('.lk-scene-anchor');
    return anchors.item(anchors.length - 1);
  }
  // 视图切换后按当前场景恢复所需尾部空间。
  function refresh(): void {
    const anchor = floor();
    const contentHeight = anchor ? tail.getBoundingClientRect().top - anchor.getBoundingClientRect().top : 0;
    const padding = view ? Number.parseFloat(view.getComputedStyle(root).paddingBottom) || 0 : 0;
    const height = anchor ? Math.max(0, scroll.viewport().height - contentHeight - padding) : 0;
    tail.style.height = `${height}px`;
  }
  // 销毁时终止动画并移除分页尾部空间。
  function dispose(): void { disposed = true; active?.abort(); tail.remove(); }
  return { next, isActive, floor, refresh, dispose };
}

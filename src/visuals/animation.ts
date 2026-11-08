// 只在节点可见且允许动态效果时运行动画，释放时取消全部调度。
export function animateVisible(element: HTMLElement, draw: (time: number) => void, enabled = true): () => void {
  const view = element.ownerDocument.defaultView!;
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let visible = false;
  let disposed = false;
  let frame: number | undefined;
  let previous = 0;
  let elapsed = 0;
  // 累计可见动画时间，页面切后台时保持当前画面。
  function tick(time: number): void {
    frame = undefined;
    if (disposed || !visible || view.document.hidden || !enabled || reduced?.matches) return;
    elapsed += previous ? Math.min(50, time - previous) : 0;
    previous = time;
    draw(elapsed);
    frame = view.requestAnimationFrame(tick);
  }
  // 根据当前可见性及动态偏好恢复或停止调度。
  function sync(): void {
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = undefined;
    previous = 0;
    if (!disposed && visible && !view.document.hidden && enabled && !reduced?.matches) frame = view.requestAnimationFrame(tick);
    else draw(elapsed);
  }
  // 接收组件自身的屏幕可见性。
  function intersect(entries: IntersectionObserverEntry[]): void {
    visible = entries[0]?.isIntersecting ?? false;
    sync();
  }
  const observer = typeof view.IntersectionObserver === 'function' ? new view.IntersectionObserver(intersect) : undefined;
  observer?.observe(element);
  if (!observer) visible = true;
  view.document.addEventListener('visibilitychange', sync);
  reduced?.addEventListener('change', sync);
  draw(0);
  sync();
  // 停止帧循环并清理节点相关监听。
  function dispose(): void {
    disposed = true;
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    observer?.disconnect();
    view.document.removeEventListener('visibilitychange', sync);
    reduced?.removeEventListener('change', sync);
  }
  return dispose;
}

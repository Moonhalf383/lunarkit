export interface ScrollOptions {
  container?: HTMLElement;
  follow?: 'always' | 'near-bottom' | 'manual';
  threshold?: number;
  sceneDuration?: number;
  sceneTopSpace?: number;
}

// 在页面或宿主滚动容器中统一测量、定位及跟随策略。
export function createScroll(root: HTMLElement, options: ScrollOptions = {}) {
  const view = root.ownerDocument.defaultView!;
  const container = options.container;
  const follow = options.follow ?? 'always';
  const threshold = options.threshold ?? 80;
  const sceneDuration = options.sceneDuration ?? 240;
  const sceneTopSpace = options.sceneTopSpace ?? 0;
  for (const value of [threshold, sceneDuration, sceneTopSpace]) if (!Number.isFinite(value) || value < 0) throw new RangeError('Scroll settings must be finite and nonnegative.');
  let following = true;
  let programmatic = false;
  let frame: number | undefined;
  // 返回滚动视口的顶部坐标和可用高度。
  function viewport(): { top: number; height: number } {
    if (container) return { top: container.getBoundingClientRect().top + container.clientTop, height: container.clientHeight };
    return { top: view.visualViewport?.offsetTop ?? 0, height: view.visualViewport?.height ?? view.innerHeight };
  }
  // 读取当前滚动位置以支撑可取消场景动画。
  function position(): number { return container ? container.scrollTop : view.scrollY; }
  // 释放本帧程序滚动标识。
  function settled(): void { programmatic = false; frame = undefined; }
  // 定位指定滚动宿主并避免自身滚动改变跟随意图。
  function move(top: number): void {
    programmatic = true;
    if (container) container.scrollTo({ top, behavior: 'instant' });
    else view.scrollTo({ top, behavior: 'instant' });
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(settled);
  }
  // 将元素顶部定位到配置的场景留白处。
  function align(element: Element): void { move(position() + element.getBoundingClientRect().top - viewport().top - sceneTopSpace); }
  // 根据用户阅读位置更新接近底部的跟随状态。
  function changed(): void {
    if (programmatic) return;
    const bounds = viewport();
    following = root.getBoundingClientRect().bottom <= bounds.top + bounds.height + threshold;
  }
  // 判断当前输出是否应自动滚动。
  function shouldFollow(): boolean { return follow === 'always' || (follow === 'near-bottom' && following); }
  // 显式返回最新内容并恢复后续自动跟随。
  function resume(): void { following = true; }
  // 保持目标可见，并在底部保留输入空间。
  function reveal(element: Element, space: number): void {
    const bounds = viewport();
    const rect = element.getBoundingClientRect();
    if (rect.bottom + space > bounds.top + bounds.height) move(position() + rect.bottom + space - bounds.top - bounds.height);
    else if (rect.top < bounds.top && rect.height < bounds.height - space) move(position() + rect.top - bounds.top);
  }
  const host = container ?? view;
  host.addEventListener('scroll', changed, { passive: true });
  // 释放宿主监听及程序滚动标识调度。
  function dispose(): void { host.removeEventListener('scroll', changed); if (frame !== undefined) view.cancelAnimationFrame(frame); }
  return { viewport, position, move, align, reveal, resume, shouldFollow, dispose, sceneDuration, sceneTopSpace };
}
export type ScrollController = ReturnType<typeof createScroll>;

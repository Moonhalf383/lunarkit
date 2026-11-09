export interface CleanupStack {
  add: (dispose: () => void) => () => void;
  listen: (target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions) => () => void;
  timeout: (callback: () => void, delay: number) => () => void;
  dispose: () => void;
}

// 创建后进先出的幂等清理栈，单个回调失败仍继续释放。
export function createCleanup(onError?: (error: unknown) => void): CleanupStack {
  const callbacks = new Set<() => void>();
  let disposed = false;
  // 安全执行释放并隔离错误通知自身的异常。
  function invoke(callback: () => void): void {
    try { callback(); } catch (error) { try { onError?.(error); } catch { return; } }
  }
  // 注册一次性释放回调，栈关闭后立即释放新资源。
  function add(callback: () => void): () => void {
    let released = false;
    // 单个资源释放句柄可安全重复调用。
    function release(): void {
      if (released) return;
      released = true;
      callbacks.delete(release);
      invoke(callback);
    }
    if (disposed) release();
    else callbacks.add(release);
    return release;
  }
  // 注册监听并托管相同选项下的事件移除。
  function listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions): () => void {
    target.addEventListener(type, listener, options);
    // 移除本次注册的宿主监听器。
    function remove(): void { target.removeEventListener(type, listener, options); }
    return add(remove);
  }
  // 注册一次定时器，触发后自动移出清理栈。
  function timeout(callback: () => void, delay: number): () => void {
    // 执行定时任务前清理计时器的托管记录。
    function run(): void { release(); invoke(callback); }
    const timer = setTimeout(run, delay);
    // 清除尚未触发的计时器。
    function cancel(): void { clearTimeout(timer); }
    const release = add(cancel);
    return release;
  }
  // 关闭栈并逐个释放仍存活的资源。
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const callback of [...callbacks].reverse()) callback();
  }
  return { add, listen, timeout, dispose };
}

// 将消费端释放异常交给错误通道，避免中止其他资源清理。
export function disposeSafely(resource: { dispose: () => void }, report?: (error: unknown) => void): void {
  try { resource.dispose(); } catch (error) { try { report?.(error); } catch { return; } }
}

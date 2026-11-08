export interface LoadingOptions {
  label: string;
  duration: number;
  signal: AbortSignal;
  write: (element: HTMLElement) => void;
  kind?: 'spinner' | 'progress';
}

// 在输出流中展示可取消的 CLI 字符动画，并在结束时释放全部计时器。
export function showLoading({ label, duration, signal, write, kind = 'spinner' }: LoadingOptions): Promise<void> {
  signal.throwIfAborted();
  const element = document.createElement('div');
  element.className = 'lk-loading';
  element.setAttribute('role', 'status');
  const reduced = document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let step = 0;
  let elapsed = 0;

  // 更新文本轨道和百分比，减少动画模式仍保留进度语义。
  function render(): void {
    const percent = Math.min(100, Math.floor(elapsed / duration * 100));
    const count = Math.floor(percent / 5);
    element.textContent = kind === 'progress'
      ? `${label} [${'='.repeat(count)}${' '.repeat(20 - count)}] ${percent}%`
      : `${reduced ? '·' : frames[step % frames.length]} ${label}`;
    step += 1;
  }
  render();
  write(element);
  return new Promise<void>(wait);

  // 完成和取消共享清理路径，防止离开页面后动画继续运行。
  function wait(resolve: () => void, reject: (reason: unknown) => void): void {
    // 清除加载计时及取消监听。
    function cleanup(): void {
      clearInterval(interval);
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
    // 将加载状态转为完成并继续调用者流程。
    function finish(): void {
      cleanup();
      elapsed = duration;
      render();
      if (kind === 'spinner') element.textContent = `✓ ${label}`;
      element.dataset.state = 'complete';
      resolve();
    }
    // 中断动画并保留明确取消状态。
    function abort(): void {
      cleanup();
      element.textContent = `× ${label} — cancelled`;
      element.dataset.state = 'cancelled';
      reject(signal.reason);
    }
    // 按固定步长更新动画，便于浏览器虚拟时钟验证。
    function tick(): void {
      elapsed += 80;
      render();
    }
    const interval = setInterval(tick, 80);
    const timeout = setTimeout(finish, duration);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  }
}

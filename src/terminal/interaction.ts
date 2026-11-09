import { disposeSafely } from '../lifecycle/cleanup.js';
import type { InteractivePanel, ReadOptions } from '../commands/types.js';
import type { PromptController } from '../input/prompt.js';

// 托管命令提问及流内面板的取消与焦点生命周期。
export function createInteraction(
  prompt: PromptController,
  record: (text: string, label?: string) => void,
  write: (node: HTMLElement) => void,
  getLabel: () => string,
  restore: (ownedFocus?: boolean) => void,
) {
  // 仅允许一个交互回答处于等待状态。
  let pending: { answer: (text: string) => void; secret: boolean; label: string } | undefined;
  // 面板和提问独占输入，避免并发交互互相恢复焦点。
  let panelActive = false;
  let activeElement: HTMLElement | undefined;

  // 判断当前提交是否属于交互回答。
  function isReading(): boolean {
    return pending !== undefined;
  }

  // 将交互答案交给当前处理器，并仅记录可公开的回答。
  function answer(text: string): boolean {
    if (!pending) return false;
    const current = pending;
    record(current.secret ? '' : text, current.label);
    current.answer(text);
    return true;
  }

  // 请求一行输入，并在取消后恢复 shell 标签。
  function read(options: ReadOptions, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    if (pending || panelActive) return Promise.reject(new Error('An interaction is already active.'));
    return new Promise<string>(wait);
    // 注册答案与取消监听并托管提示符状态。
    function wait(resolve: (text: string) => void, reject: (reason: unknown) => void): void {
      // 恢复公开输入状态并清理监听器。
      function cleanup(): void {
        signal.removeEventListener('abort', abort);
        pending = undefined;
        prompt.setSecret(false);
        prompt.setLabel(getLabel());
        restore();
      }
      // 接受答案后恢复输入状态。
      function receive(text: string): void {
        cleanup();
        resolve(text);
      }
      // 取消提问并丢弃原生输入中的秘密值。
      function abort(): void {
        cleanup();
        reject(signal.reason);
      }
      pending = { answer: receive, secret: options.secret ?? false, label: options.prompt };
      signal.addEventListener('abort', abort, { once: true });
      prompt.setSecret(options.secret ?? false);
      prompt.setLabel(options.prompt);
      prompt.setVisible(true);
    }
  }

  // 挂载交互面板，关闭或取消时释放资源并恢复 shell。
  function present(panel: InteractivePanel, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      disposeSafely(panel);
      return Promise.reject(signal.reason);
    }
    if (pending || panelActive) {
      disposeSafely(panel);
      return Promise.reject(new Error('An interaction is already active.'));
    }
    panelActive = true;
    panel.element.dataset.scroll = panel.scroll ?? 'focus';
    activeElement = panel.element;
    return new Promise<void>(wait);
    // 等待面板关闭或命令取消。
    function wait(resolve: () => void, reject: (reason: unknown) => void): void {
      let finished = false;
      // 清理面板与监听并恢复输入焦点。
      function cleanup(): boolean {
        if (finished) return false;
        finished = true;
        panelActive = false;
        activeElement = undefined;
        signal.removeEventListener('abort', abort);
        panel.element.removeEventListener('keydown', keydown);
        const ownedFocus = panel.element.contains(panel.element.ownerDocument.activeElement);
        try {
          panel.dispose();
        } catch (error) {
          reject(error);
        } finally {
          restore(ownedFocus);
        }
        return true;
      }
      // 完成面板并继续命令执行。
      function close(): void {
        if (cleanup()) resolve();
      }
      // 中断面板等待并保留命令取消原因。
      function abort(): void {
        if (cleanup()) reject(signal.reason);
      }
      // 将面板中的 Ctrl+C 传给命令取消控制器。
      function keydown(event: KeyboardEvent): void {
        if (event.ctrlKey && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          panel.element.dispatchEvent(new CustomEvent('lk-interrupt', { bubbles: true }));
        }
      }
      panel.element.addEventListener('keydown', keydown);
      signal.addEventListener('abort', abort, { once: true });
      panel.closed.then(close, fail);
      // 将消费端回调抛出的异常纳入面板清理。
      function fail(error: unknown): void {
        if (cleanup()) reject(error);
      }
      try {
        if (signal.aborted) {
          abort();
          return;
        }
        write(panel.element);
        if (finished) return;
        prompt.setVisible(false);
        if (!finished) panel.focus();
      } catch (error) {
        fail(error);
      }
    }
  }

  // 返回当前面板节点，避免历史裁剪拆除仍在使用的控件。
  function getPanel(): HTMLElement | undefined {
    return activeElement;
  }

  // 命令结束时仅恢复未被提问或面板占用的输入行。
  function restoreShell(ownedFocus?: boolean): void {
    if (!pending && !panelActive) restore(ownedFocus);
  }

  return { isReading, getPanel, answer, read, present, restoreShell };
}

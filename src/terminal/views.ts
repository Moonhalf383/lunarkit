import type { TerminalView } from '../commands/types.js';

export interface ViewState { stream: HTMLElement; prompt: string; draft: string }

// 保存独立输出流的栈式会话，关闭时恢复前一流和输入快照。
export function createViews(initial: ViewState, activate: (state: ViewState) => void, release: (stream: HTMLElement) => void) {
  const states = [initial];
  let disposed = false;
  // 返回当前活动输出流及其输入快照。
  function current(): ViewState { return states.at(-1)!; }
  // 判断节点是否属于任一保留视图，避免提前释放组件。
  function contains(node: HTMLElement): boolean {
    for (const state of states) if (state.stream.contains(node)) return true;
    return false;
  }
  // 进入独立输出流并返回幂等的关闭句柄。
  function open(snapshot: { prompt: string; draft: string }): TerminalView {
    if (disposed) throw new Error('Terminal views have been disposed.');
    Object.assign(current(), snapshot);
    const stream = initial.stream.cloneNode(false) as HTMLElement;
    const state: ViewState = { stream, prompt: snapshot.prompt, draft: '' };
    states.push(state);
    activate(state);
    let closed = false;
    // 仅按栈顺序关闭视图，避免恢复错误的父级快照。
    function close(): void {
      if (disposed || closed) return;
      if (current() !== state) throw new Error('Close the innermost terminal view first.');
      closed = true;
      states.pop();
      release(stream);
      activate(current());
    }
    return { close };
  }
  // 释放所有活动及保留视图的输出资源。
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const state of states) release(state.stream);
  }
  return { open, current, contains, dispose };
}

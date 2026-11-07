import type { CompletionResult } from '../commands/types.js';
import { updateCaret } from './caret.js';
import { createInputHistory } from './history.js';

export interface PromptController {
  element: HTMLDivElement;
  focus: () => void;
  destroy: () => void;
  clear: () => string;
}

export interface PromptActions {
  submit: (text: string) => void;
  isBusy?: () => boolean;
  interrupt?: (text: string) => void;
  complete?: (text: string, cursor: number) => CompletionResult;
  suggest?: (candidates: readonly string[]) => void;
}

// 创建支持原生编辑、输入法和历史导航的输入行。
export function createPrompt(document: Document, label: string, actions: PromptActions): PromptController {
  const element = document.createElement('div');
  element.className = 'lk-prompt';
  const prefix = document.createElement('span');
  prefix.className = 'lk-prompt-prefix';
  prefix.textContent = label;
  prefix.setAttribute('aria-hidden', 'true');
  const editor = document.createElement('div');
  editor.className = 'lk-editor';
  const mirror = document.createElement('div');
  mirror.className = 'lk-input-mirror';
  mirror.setAttribute('aria-hidden', 'true');
  const caret = document.createElement('span');
  caret.className = 'lk-caret';
  caret.setAttribute('aria-hidden', 'true');
  const input = document.createElement('textarea');
  input.className = 'lk-input';
  input.setAttribute('aria-label', '输入内容');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.spellcheck = false;
  input.rows = 1;
  const history = createInputHistory();
  // 输入法组合期间的回车交给浏览器确认候选词。
  let composing = false;
  // 每次操作重置空闲倒计时，确保移动时光标始终可见。
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  // 清除空闲计时并退出闪烁状态。
  function stopBlinking(): void {
    clearTimeout(idleTimer);
    idleTimer = undefined;
    caret.classList.remove('lk-caret-idle');
  }

  // 仅在输入框仍聚焦且组合输入结束时恢复闪烁。
  function resumeBlinking(): void {
    idleTimer = undefined;
    if (document.activeElement === input && !composing) caret.classList.add('lk-caret-idle');
  }

  // 操作后先保持光标常亮，再等待空闲恢复闪烁。
  function markActivity(): void {
    stopBlinking();
    if (document.activeElement === input && !composing) idleTimer = setTimeout(resumeBlinking, 550);
  }

  // 同步完整文本镜像及按字符测量的块状光标。
  function render(): void {
    updateCaret(input, mirror, caret);
  }

  // 输入和选区变化均重置空闲时间并更新光标。
  function handleActivity(): void {
    markActivity();
    render();
  }

  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(render);

  // 在历史切换后将光标放到恢复文本的末尾。
  function restore(text: string): void {
    input.value = text;
    input.setSelectionRange(text.length, text.length);
    render();
  }

  // 清空草稿与历史浏览状态，并返回取消前的原文。
  function clear(): string {
    const text = input.value;
    history.reset();
    restore('');
    markActivity();
    return text;
  }

  // 处理命令补全并将歧义候选追加到流中。
  function complete(): void {
    try {
      const result = actions.complete?.(input.value, input.selectionEnd);
      if (!result) return;
      input.value = result.text;
      input.setSelectionRange(result.cursor, result.cursor);
      render();
      if (result.candidates.length) actions.suggest?.(result.candidates);
    } catch {
      render();
    }
  }

  // 处理提交、命令控制与上下历史导航。
  function handleKeydown(event: KeyboardEvent): void {
    markActivity();
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'c' && actions.interrupt) {
      const selection = document.getSelection();
      if (input.selectionStart !== input.selectionEnd || (selection && !selection.isCollapsed)) return;
      event.preventDefault();
      actions.interrupt(clear());
    } else if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && actions.complete) {
      event.preventDefault();
      complete();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (actions.isBusy?.()) return;
      const text = input.value;
      history.remember(text);
      restore('');
      actions.submit(text);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      restore(event.key === 'ArrowUp' ? history.previous(input.value) : history.next(input.value));
    }
  }

  // 标记输入法组合开始。
  function beginComposition(): void {
    composing = true;
    markActivity();
  }

  // 结束组合并同步已确认的文本。
  function endComposition(): void {
    composing = false;
    handleActivity();
  }

  // 只在当前输入框拥有焦点时同步全局选择变化。
  function handleSelection(): void {
    if (document.activeElement === input) handleActivity();
  }

  // 将键盘焦点移到输入框。
  function focus(): void {
    input.focus({ preventScroll: true });
    render();
  }

  // 移除输入框监听器并释放全局选择监听。
  function destroy(): void {
    stopBlinking();
    observer?.disconnect();
    document.fonts?.removeEventListener('loadingdone', render);
    document.removeEventListener('selectionchange', handleSelection);
    input.removeEventListener('focus', handleActivity);
    input.removeEventListener('blur', stopBlinking);
    input.removeEventListener('input', handleActivity);
    input.removeEventListener('select', handleActivity);
    input.removeEventListener('keydown', handleKeydown);
    input.removeEventListener('compositionstart', beginComposition);
    input.removeEventListener('compositionend', endComposition);
    element.remove();
  }

  input.addEventListener('focus', handleActivity);
  input.addEventListener('blur', stopBlinking);
  input.addEventListener('input', handleActivity);
  input.addEventListener('select', handleActivity);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('compositionstart', beginComposition);
  input.addEventListener('compositionend', endComposition);
  document.addEventListener('selectionchange', handleSelection);
  document.fonts?.addEventListener('loadingdone', render);
  observer?.observe(editor);
  editor.append(mirror, input, caret);
  element.append(prefix, editor);
  render();
  return { element, focus, destroy, clear };
}

import type { CompletionResult } from '../commands/types.js';
import { updateCaret } from './caret.js';
import { createCompletionMenu } from './completions.js';
import { createInputHistory } from './history.js';
import type { InputHistoryOptions } from './history.js';
import { defaultMessages } from '../terminal/messages.js';
import type { TerminalMessages } from '../terminal/messages.js';

export interface PromptController {
  element: HTMLDivElement;
  focus: () => void;
  destroy: () => void;
  clear: () => string;
  getDraft: () => string;
  setDraft: (text: string) => void;
  setLabel: (text: string) => void;
  setSecret: (secret: boolean) => void;
  setVisible: (visible: boolean, focusInput?: boolean) => void;
}

export interface PromptActions {
  submit: (text: string) => void;
  isBusy?: () => boolean;
  interrupt?: (text: string) => void;
  complete?: (text: string, cursor: number) => CompletionResult;
  suggest?: (candidates: readonly string[]) => void;
  isReading?: () => boolean;
  canInterrupt?: (text: string) => boolean;
}

// 创建支持原生编辑、输入法和历史导航的输入行。
export function createPrompt(document: Document, label: string, actions: PromptActions, options: { messages?: TerminalMessages; history?: InputHistoryOptions | undefined } = {}): PromptController {
  const messages = options.messages ?? defaultMessages;
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
  input.setAttribute('aria-label', messages.inputLabel);
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocomplete', 'off');
  input.spellcheck = false;
  input.rows = 1;
  const history = createInputHistory(options.history);
  // 插入补全并保持编辑器光标与文本镜像同步。
  function applyCompletion(text: string, cursor: number): void {
    input.value = text;
    input.setSelectionRange(cursor, cursor);
    render();
  }
  const completions = createCompletionMenu(document, input, applyCompletion, messages.completionsLabel);
  // 输入法组合期间的回车交给浏览器确认候选词。
  let composing = false;
  // 密码输入只留在原生输入值中，镜像和光标位置保持空白。
  let secret = false;
  let disposed = false;
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
    if (!disposed && document.activeElement === input && !composing) idleTimer = setTimeout(resumeBlinking, 550);
  }

  // 同步完整文本镜像及按字符测量的块状光标。
  function render(): void {
    if (secret) {
      mirror.replaceChildren(document.createTextNode('\u200b'));
      caret.style.left = '0px';
      caret.style.top = '0.3em';
      caret.style.width = '1ch';
      caret.style.height = '1em';
      caret.hidden = false;
    } else updateCaret(input, mirror, caret);
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
    completions.clear();
    const text = input.value;
    history.reset();
    restore('');
    markActivity();
    return text;
  }

  // 临时菜单只修改输入草稿，候选不会写入输出流。
  function complete(reverse = false): void {
    try { completions.complete(getCompletions, reverse); }
    catch { completions.clear(); }
  }

  // 在首次 Tab 时获取消费端当前阶段的候选快照。
  function getCompletions(): CompletionResult {
    return actions.complete!(input.value, input.selectionEnd);
  }

  // 原生编辑使旧补全候选失效。
  function handleInput(): void {
    completions.clear();
    handleActivity();
  }

  // 处理提交、命令控制与上下历史导航。
  function handleKeydown(event: KeyboardEvent): void {
    markActivity();
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key !== 'Tab') completions.clear();
    if (event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'c' && actions.interrupt) {
      const selection = document.getSelection();
      if (!secret && (input.selectionStart !== input.selectionEnd || (selection && !selection.isCollapsed))) return;
      event.preventDefault();
      actions.interrupt(clear());
    } else if (actions.isReading?.() && event.key === 'Tab') {
      if (!event.shiftKey) event.preventDefault();
    } else if (event.key === 'Tab' && (!event.shiftKey || !completions.element.hidden) && !event.ctrlKey && !event.metaKey && !event.altKey && actions.complete) {
      event.preventDefault();
      complete(event.shiftKey);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (actions.isBusy?.() && !actions.isReading?.() && !actions.canInterrupt?.(input.value)) return;
      const text = input.value;
      if (!actions.isReading?.()) history.remember(text);
      restore('');
      actions.submit(text);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (actions.isReading?.()) {
        event.preventDefault();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      restore(event.key === 'ArrowUp' ? history.previous(input.value) : history.next(input.value));
    }
  }

  // 密码只交给回答处理器，拦截原生复制及剪切导出。
  function protectSecret(event: ClipboardEvent): void {
    if (secret) event.preventDefault();
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

  // 更新当前输入行标签，历史标签由终端独立保存。
  function setLabel(text: string): void {
    prefix.textContent = text;
  }

  // 切换秘密输入的视觉和辅助语义并清除旧草稿。
  function setSecret(enabled: boolean): void {
    if (disposed) return;
    clear();
    secret = enabled;
    input.classList.toggle('lk-input-secret', enabled);
    input.setAttribute('aria-label', enabled ? messages.secretLabel : messages.inputLabel);
    render();
  }

  // 在流内面板接管键盘期间暂停显示输入行。
  function setVisible(visible: boolean, focusInput = true): void {
    if (disposed) return;
    if (!visible) completions.clear();
    element.hidden = !visible;
    input.disabled = !visible;
    if (visible && focusInput) focus();
    if (!visible) stopBlinking();
  }

  // 将键盘焦点移到输入框。
  function focus(): void {
    if (disposed) return;
    input.focus({ preventScroll: true });
    render();
  }

  // 移除输入框监听器并释放全局选择监听。
  function destroy(): void {
    disposed = true;
    input.value = '';
    stopBlinking();
    observer?.disconnect();
    document.fonts?.removeEventListener('loadingdone', render);
    document.removeEventListener('selectionchange', handleSelection);
    input.removeEventListener('copy', protectSecret);
    input.removeEventListener('cut', protectSecret);
    input.removeEventListener('focus', handleActivity);
    input.removeEventListener('blur', stopBlinking);
    input.removeEventListener('input', handleInput);
    input.removeEventListener('select', handleActivity);
    input.removeEventListener('keydown', handleKeydown);
    input.removeEventListener('compositionstart', beginComposition);
    input.removeEventListener('compositionend', endComposition);
    element.remove();
  }

  input.addEventListener('copy', protectSecret);
  input.addEventListener('cut', protectSecret);
  input.addEventListener('focus', handleActivity);
  input.addEventListener('blur', stopBlinking);
  input.addEventListener('input', handleInput);
  input.addEventListener('select', handleActivity);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('compositionstart', beginComposition);
  input.addEventListener('compositionend', endComposition);
  document.addEventListener('selectionchange', handleSelection);
  document.fonts?.addEventListener('loadingdone', render);
  observer?.observe(editor);
  editor.append(mirror, input, caret);
  element.append(prefix, editor, completions.element);
  render();
  // 返回公开草稿，秘密回答始终留在当前输入行。
  function getDraft(): string { return secret ? '' : input.value; }
  return { element, focus, destroy, clear, getDraft, setDraft: restore, setLabel, setSecret, setVisible };
}

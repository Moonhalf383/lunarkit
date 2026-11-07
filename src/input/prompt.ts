import { createInputHistory } from './history.js';

export interface PromptController {
  element: HTMLDivElement;
  focus: () => void;
  destroy: () => void;
}

// 创建支持原生编辑、输入法和历史导航的输入行。
export function createPrompt(document: Document, label: string, onSubmit: (text: string) => void): PromptController {
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

  // 从完整文本镜像测量光标坐标，保持与原生输入相同的换行规则。
  function render(): void {
    const text = document.createTextNode(`${input.value}\u200b`);
    mirror.replaceChildren(text);
    const range = document.createRange();
    const position = input.selectionEnd;
    range.setStart(text, position);
    range.setEnd(text, Math.min(text.length, position + 1));
    if (typeof range.getBoundingClientRect !== 'function') return;
    const rectangle = range.getBoundingClientRect();
    const bounds = mirror.getBoundingClientRect();
    caret.style.left = `${rectangle.left - bounds.left}px`;
    caret.style.top = `${rectangle.top - bounds.top}px`;
  }

  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(render);

  // 在历史切换后将光标放到恢复文本的末尾。
  function restore(text: string): void {
    input.value = text;
    input.setSelectionRange(text.length, text.length);
    render();
  }

  // 处理回车提交和上下历史导航。
  function handleKeydown(event: KeyboardEvent): void {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      const text = input.value;
      history.remember(text);
      restore('');
      onSubmit(text);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      restore(event.key === 'ArrowUp' ? history.previous(input.value) : history.next(input.value));
    }
  }

  // 标记输入法组合开始。
  function beginComposition(): void {
    composing = true;
  }

  // 结束组合并同步已确认的文本。
  function endComposition(): void {
    composing = false;
    render();
  }

  // 只在当前输入框拥有焦点时同步全局选择变化。
  function handleSelection(): void {
    if (document.activeElement === input) render();
  }

  // 将键盘焦点移到输入框。
  function focus(): void {
    input.focus({ preventScroll: true });
    render();
  }

  // 移除输入框监听器并释放全局选择监听。
  function destroy(): void {
    observer?.disconnect();
    document.fonts?.removeEventListener('loadingdone', render);
    document.removeEventListener('selectionchange', handleSelection);
    input.removeEventListener('input', render);
    input.removeEventListener('select', render);
    input.removeEventListener('keydown', handleKeydown);
    input.removeEventListener('compositionstart', beginComposition);
    input.removeEventListener('compositionend', endComposition);
    element.remove();
  }

  input.addEventListener('input', render);
  input.addEventListener('select', render);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('compositionstart', beginComposition);
  input.addEventListener('compositionend', endComposition);
  document.addEventListener('selectionchange', handleSelection);
  document.fonts?.addEventListener('loadingdone', render);
  observer?.observe(editor);
  editor.append(mirror, input, caret);
  element.append(prefix, editor);
  render();
  return { element, focus, destroy };
}

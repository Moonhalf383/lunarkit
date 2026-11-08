import type { CompletionResult } from '../commands/types.js';

// 托管输入行下方的临时候选菜单，连续 Tab 在原始候选集中循环。
export function createCompletionMenu(document: Document, input: HTMLTextAreaElement, apply: (text: string, cursor: number) => void) {
  const element = document.createElement('div');
  element.className = 'lk-completions';
  element.setAttribute('role', 'listbox');
  element.setAttribute('aria-label', 'Completions');
  element.hidden = true;
  let result: CompletionResult | undefined;
  let selected = -1;
  let lastText = '';
  let lastCursor = 0;

  // 清除临时菜单及其关联的补全快照。
  function clear(): void {
    result = undefined;
    selected = -1;
    element.replaceChildren();
    element.hidden = true;
    input.removeAttribute('aria-controls');
    input.removeAttribute('aria-activedescendant');
  }
  // 更新候选的单色高亮和当前概要。
  function render(): void {
    element.replaceChildren();
    for (let index = 0; index < (result?.options?.length ?? 0); index += 1) {
      const candidate = result!.options![index]!;
      const row = document.createElement('div');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(index === selected));
      row.textContent = candidate.description ? `${candidate.value} — ${candidate.description}` : candidate.value;
      element.append(row);
    }
    element.hidden = false;
    element.children[selected]?.scrollIntoView?.({ block: 'nearest' });
  }
  // 保留插入后的文本和位置，以区别用户编辑与下一次循环。
  function insert(text: string, cursor: number): void {
    lastText = text;
    lastCursor = cursor;
    apply(text, cursor);
  }
  // 首次 Tab 完成公共前缀，后续 Tab 只替换当前候选。
  function complete(getResult: () => CompletionResult, reverse = false): void {
    if (!result || input.value !== lastText || input.selectionEnd !== lastCursor) {
      result = getResult();
      selected = -1;
      insert(result.text, result.cursor);
      if ((result.options?.length ?? 0) < 2) { clear(); return; }
      render();
      if (!reverse) return;
    }
    const count = result!.options!.length;
    selected = selected < 0 ? reverse ? count - 1 : 0 : (selected + (reverse ? -1 : 1) + count) % count;
    const replacement = result!.replacements?.[selected];
    if (replacement) insert(replacement.text, replacement.cursor);
    render();
  }
  return { element, clear, complete };
}

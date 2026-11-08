import type { ChooseOptions, InteractivePanel } from '../commands/types.js';

// 创建可键盘导航的通用流内选项面板，结果由调用方等待。
export function createChoices(options: ChooseOptions, document: Document) {
  if (!options.choices.some(enabled)) throw new Error('Provide at least one enabled choice.');
  const element = document.createElement('section');
  element.className = 'lk-choices';
  element.setAttribute('aria-label', options.prompt);
  const title = document.createElement('div');
  title.textContent = options.prompt;
  element.append(title);
  let selected = options.choices.findIndex(enabled);
  let resolveResult!: (value: string) => void;
  let resolveClosed!: () => void;
  let finished = false;
  const result = new Promise<string>(waitResult);
  const closed = new Promise<void>(waitClosed);
  const buttons: HTMLButtonElement[] = [];

  // 判断当前选项是否接受交互。
  function enabled(choice: { disabled?: boolean }): boolean { return !choice.disabled; }
  // 保存选择结果的完成入口。
  function waitResult(resolve: (value: string) => void): void { resolveResult = resolve; }
  // 保存面板关闭的完成入口。
  function waitClosed(resolve: () => void): void { resolveClosed = resolve; }
  // 更新唯一焦点和当前选项语义。
  function render(): void {
    for (let index = 0; index < buttons.length; index += 1) {
      buttons[index]!.tabIndex = index === selected ? 0 : -1;
      buttons[index]!.setAttribute('aria-pressed', String(index === selected));
    }
  }
  // 提交一次选择并保留可读记录。
  function accept(index: number): void {
    const choice = options.choices[index];
    if (finished || !choice || choice.disabled) return;
    finished = true;
    element.replaceChildren(title);
    const answer = document.createElement('div');
    answer.textContent = `❯ ${choice.label}`;
    element.append(answer);
    resolveResult(choice.value);
    resolveClosed();
  }
  for (let index = 0; index < options.choices.length; index += 1) {
    const choice = options.choices[index]!;
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = choice.disabled ?? false;
    button.textContent = choice.description ? `${choice.label} — ${choice.description}` : choice.label;
    // 将鼠标确认映射到同一结果出口。
    function click(): void { accept(index); }
    button.addEventListener('click', click);
    buttons.push(button);
    element.append(button);
  }
  // 在有效选项之间移动并处理键盘确认。
  function keydown(event: KeyboardEvent): void {
    if (finished) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      accept(selected);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
    if (event.key === 'Home') selected = options.choices.length - 1;
    if (event.key === 'End') selected = 0;
    do { selected = (selected + step + options.choices.length) % options.choices.length; } while (options.choices[selected]!.disabled);
    render();
    focus();
  }
  // 将键盘交给当前选项。
  function focus(): void { buttons[selected]?.focus({ preventScroll: true }); }
  // 释放交互面板并保留最终选择记录。
  function dispose(): void {
    element.removeEventListener('keydown', keydown);
    if (!finished) {
      finished = true;
      element.replaceChildren(title);
      resolveClosed();
    }
  }
  element.addEventListener('keydown', keydown);
  render();
  const panel: InteractivePanel = { element, closed, focus, dispose };
  return { panel, result };
}

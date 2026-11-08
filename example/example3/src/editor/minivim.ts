import type { InteractivePanel } from 'lunarkit';
import { moveCharacter, moveLine } from './movement';

interface MiniVimOptions {
  filename: string;
  text: string;
  save: (text: string) => void;
}

// 用 SDK 流内面板协议构建示例专用的轻量 Vim 编辑器。
export function createMiniVim({ filename, text, save }: MiniVimOptions): InteractivePanel {
  const element = document.createElement('section');
  element.className = 'minivim';
  element.setAttribute('aria-label', `minivim ${filename}`);
  const editor = document.createElement('textarea');
  editor.className = 'minivim-buffer';
  editor.setAttribute('aria-label', '编辑文件');
  editor.spellcheck = false;
  editor.wrap = 'off';
  editor.value = text;
  editor.readOnly = true;
  const status = document.createElement('div');
  status.className = 'minivim-status';
  const command = document.createElement('input');
  command.className = 'minivim-command';
  command.setAttribute('aria-label', 'Vim 命令');
  command.hidden = true;
  element.append(editor, status, command);
  let saved = text;
  let mode: 'NORMAL' | 'INSERT' | 'COMMAND' = 'NORMAL';
  let disposed = false;
  let finish!: () => void;
  // 保存面板结束入口，让 SDK 等待界面退出。
  function wait(resolve: () => void): void {
    finish = resolve;
  }
  const closed = new Promise<void>(wait);

  // 显示模式、文件名和修改状态。
  function updateStatus(message = ''): void {
    status.textContent = message || `-- ${mode} -- ${filename}${editor.value !== saved ? ' [+]' : ''}`;
  }

  // 定位光标并将当前行滚动到面板内部可见区域。
  function locate(position: number): void {
    editor.setSelectionRange(position, position);
    const line = editor.value.slice(0, position).split('\n').length - 1;
    const height = parseFloat(getComputedStyle(editor).lineHeight);
    if (line * height < editor.scrollTop) editor.scrollTop = line * height;
    if ((line + 1) * height > editor.scrollTop + editor.clientHeight) editor.scrollTop = (line + 1) * height - editor.clientHeight;
  }

  // 切换模式并将焦点交给相应输入。
  function setMode(next: typeof mode): void {
    mode = next;
    editor.readOnly = next !== 'INSERT';
    command.hidden = next !== 'COMMAND';
    if (next === 'COMMAND') {
      command.value = ':';
      command.focus();
    } else editor.focus();
    updateStatus();
  }

  // 保存当前内容并反馈写入结果。
  function write(): boolean {
    try {
      save(editor.value);
      saved = editor.value;
      updateStatus(`"${filename}" written`);
      return true;
    } catch (error) {
      updateStatus(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // 执行有限的 Vim 命令集并保留未保存修改提示。
  function execute(): void {
    const value = command.value.slice(1).trim();
    setMode('NORMAL');
    if (value === 'w') write();
    else if (value === 'wq') {
      if (write()) finish();
    } else if (value === 'q!') finish();
    else if (value === 'q') {
      if (editor.value === saved) finish();
      else updateStatus('Unsaved changes. Use :w to save or :q! to discard.');
    } else updateStatus(`Not an editor command: ${value}`);
  }

  // 普通模式实现 hjklai，插入模式保留原生输入法和编辑行为。
  function keydown(event: KeyboardEvent): void {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMode('NORMAL');
      return;
    }
    if (mode === 'COMMAND') {
      if (event.key === 'Enter') {
        event.preventDefault();
        execute();
      }
      return;
    }
    if (mode === 'INSERT') return;
    if (event.key === 'Tab') return;
    const position = editor.selectionStart;
    event.preventDefault();
    if (event.key === 'h' || event.key === 'ArrowLeft') locate(moveCharacter(editor.value, position, -1));
    else if (event.key === 'l' || event.key === 'ArrowRight') locate(moveCharacter(editor.value, position, 1));
    else if (event.key === 'j' || event.key === 'ArrowDown') locate(moveLine(editor.value, position, 1));
    else if (event.key === 'k' || event.key === 'ArrowUp') locate(moveLine(editor.value, position, -1));
    else if (event.key === 'i' || event.key === 'a') {
      if (event.key === 'a') locate(moveCharacter(editor.value, position, 1));
      setMode('INSERT');
    } else if (event.key === ':') setMode('COMMAND');
  }

  // 插入后更新修改标记。
  function input(): void {
    updateStatus();
  }

  // 聚焦当前编辑模式。
  function focus(): void {
    if (!disposed) (mode === 'COMMAND' ? command : editor).focus();
  }

  // 退出后移除面板监听及 DOM，保留已保存的内存数据。
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    element.removeEventListener('keydown', keydown);
    editor.removeEventListener('input', input);
    element.remove();
    finish();
  }
  element.addEventListener('keydown', keydown);
  editor.addEventListener('input', input);
  editor.setSelectionRange(0, 0);
  updateStatus();
  return { element, closed, focus, dispose };
}

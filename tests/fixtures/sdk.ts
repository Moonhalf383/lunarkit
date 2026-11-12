import { createTerminal, finishTypewrite, typewrite } from '../../src/core';
import { renderMarkdown } from '../../src/output/markdown';
import type { CommandContext, Terminal, TerminalOptions } from '../../src/core';

declare global {
  interface Window {
    terminal: Terminal;
    setup: (options?: { follow?: 'always' | 'near-bottom' | 'manual'; container?: boolean; autoFocus?: boolean }) => void;
    performanceSample: () => { milliseconds: number; entries: number; released: number; remaining: number };
  }
}

// 创建受控验收终端，业务逻辑只在测试夹具中存在。
function setup(options: { follow?: 'always' | 'near-bottom' | 'manual'; container?: boolean; autoFocus?: boolean } = {}): void {
  window.terminal?.destroy();
  const host = document.querySelector<HTMLElement>('#host')!;
  host.replaceChildren();
  host.style.cssText = options.container ? 'height:320px;overflow:auto;border:2px solid;margin-top:40px' : '';
  // 验证场景参数与可取消输出。
  async function scene(context: CommandContext): Promise<void> {
    await context.nextScene();
    context.write('New scene');
  }
  // 播放可聚焦跳过的叙事。
  async function story(context: CommandContext): Promise<void> {
    const message = document.createElement('p');
    message.textContent = 'A quiet message from the moon.';
    context.write(message);
    await typewrite({ element: message, signal: context.signal, interval: 100, skipLabel: 'Reveal message' });
  }
  // 输出已清理的非受信 Markdown 样本。
  function markdown(context: CommandContext): void { context.write(renderMarkdown('<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n[good](https://example.com)')); }
  // 返回两个候选以验证补全。
  function complete(): string[] { return ['alpha', 'beta']; }
  const config: TerminalOptions = {
    element: host, autoFocus: options.autoFocus ?? false,
    scroll: { follow: options.follow ?? 'always', sceneDuration: 0, sceneTopSpace: 12, ...(options.container ? { container: host } : {}) },
    messages: { inputLabel: 'Command', historyLabel: 'Messages' },
    commands: { scene: { description: '', run: scene }, story: { description: '', run: story }, markdown: { description: '', run: markdown, complete } },
  };
  window.terminal = createTerminal(config);
}

// 量化批量输出与组件释放，保留结果供测试报告。
function performanceSample(): { milliseconds: number; entries: number; released: number; remaining: number } {
  window.terminal.destroy();
  const host = document.querySelector<HTMLElement>('#host')!;
  let released = 0;
  // 统计淘汰与销毁阶段的资源释放。
  function dispose(): void { released += 1; }
  const terminal = createTerminal({ element: host, autoFocus: false, maxHistoryLines: 500, scroll: { follow: 'manual' } });
  const outputs = [];
  for (let index = 0; index < 5000; index += 1) {
    const element = document.createElement('div');
    element.textContent = String(index);
    outputs.push({ element, dispose });
  }
  const start = performance.now();
  terminal.writeBatch(outputs);
  const milliseconds = performance.now() - start;
  const entries = host.querySelector('.lk-stream')!.children.length;
  terminal.destroy();
  return { milliseconds, entries, released, remaining: host.children.length };
}
Object.assign(window, { setup, performanceSample, finishTypewrite });
setup();

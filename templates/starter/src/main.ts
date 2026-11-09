import { createCleanup, createTerminal, typewrite } from 'lunarkit/core';
import type { CommandContext } from 'lunarkit/core';
import 'lunarkit/style.css';
import 'lunarkit/fonts/kode-mono.css';
import 'lunarkit/fonts/prompt.css';

const element = document.querySelector<HTMLElement>('#app');
if (!element) throw new Error('Missing app mount.');
const cleanup = createCleanup();

// 输出模板指令及可取消任务说明。
function help(context: CommandContext): void {
  context.writeBatch(['story — a short interactive scene', 'load — fetch this page using a cancellable request', 'Ctrl+C cancels a running command. Click a message to reveal it immediately.']);
}

// 分页并展示一段可跳过的互动叙事。
async function story(context: CommandContext): Promise<void> {
  await context.nextScene();
  const message = document.createElement('p');
  message.textContent = 'A signal arrives from the quiet side of the moon.';
  context.write(message);
  await typewrite({ element: message, signal: context.signal });
  const action = await context.choose({ prompt: 'Reply?', choices: [{ value: 'yes', label: 'Send a greeting' }, { value: 'wait', label: 'Listen a little longer' }] });
  context.write(action === 'yes' ? 'Your greeting crosses the night.' : 'The signal repeats, patiently.');
}

// 将取消信号传入真实请求，并用文本句柄展示进展。
async function load(context: CommandContext): Promise<void> {
  const output = context.createTextOutput('Loading…');
  const response = await fetch(location.href, { signal: context.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  output.replace(`Loaded ${text.length} characters.`);
}

const terminal = createTerminal({
  element, banner: 'Hello, Moon',
  messages: { inputLabel: 'Command', secretLabel: 'Secret answer', historyLabel: 'Conversation' },
  commands: { help: { description: 'Available commands', run: help }, story: { description: 'Interactive story', run: story }, load: { description: 'Cancellable request', run: load } },
});
cleanup.add(terminal.destroy);
terminal.write('Type help to begin.');
cleanup.listen(window, 'pagehide', cleanup.dispose);
import.meta.hot?.dispose(cleanup.dispose);

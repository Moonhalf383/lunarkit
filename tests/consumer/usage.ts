import { createTerminal, createTextFiles, renderMarkdown, showLoading } from 'lunarkit';
import type { CommandContext, Commands, CompletionContext, InteractivePanel, TerminalOptions } from 'lunarkit';
import 'lunarkit/style.css';

const options: TerminalOptions = {
  element: document.createElement('main'),
  banner: 'LunarKit',
  paddingInline: '5vw',
  maxWidth: 1080,
};

const terminal = createTerminal(options);
terminal.write('消费接口类型验证');
terminal.focus();
terminal.destroy();

const files = createTextFiles({ 'readme.txt': 'text' });

// 验证构建后的命令上下文及异步文本读取接口。
async function cat({ args, signal, write }: CommandContext): Promise<void> {
  write(await files.read(args[0] ?? 'readme.txt', signal));
  write(document.createElement('section'));
}

// 验证文件补全的公开类型。
function complete({ prefix }: CompletionContext): readonly string[] {
  return files.complete(prefix);
}

const commands: Commands = { cat: { description: 'Print a file.', run: cat, complete } };
const commandTerminal = createTerminal({ element: document.createElement('main'), commands });
files.list();
commandTerminal.interrupt();
commandTerminal.setPrompt('consumer ❯');
commandTerminal.destroy();

// 验证通用面板的公开类型，业务实现留在消费端。
function focus(): void {}
// 释放消费端资源。
function dispose(): void {}
const panel: InteractivePanel = { element: document.createElement('section'), closed: Promise.resolve(), focus, dispose };

// 验证交互提问、面板及渲染工具的构建声明。
async function interactive(context: CommandContext): Promise<void> {
  const answer = await context.read({ prompt: 'Name:', secret: true });
  context.setPrompt(`${answer} ❯`);
  await showLoading({ label: 'Loading', duration: 1, signal: context.signal, write: context.write });
  context.write(renderMarkdown('# Title'));
  await context.present(panel);
}
const interactiveCommands: Commands = { interactive: { description: 'Consumer-defined interaction.', run: interactive } };
createTerminal({ element: document.createElement('main'), commands: interactiveCommands }).destroy();

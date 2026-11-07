import { createTerminal, createTextFiles } from 'lunarkit';
import type { CommandContext, Commands, CompletionContext, TerminalOptions } from 'lunarkit';
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
commandTerminal.destroy();

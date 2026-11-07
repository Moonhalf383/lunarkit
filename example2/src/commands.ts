import type { CommandContext, Commands, CompletionContext, TextFiles } from 'lunarkit';
import { createHelp } from './help';

// 以消费端业务定义 help、ls 和 cat 命令。
export function createFileCommands(files: TextFiles): Commands {
  // 输出双栏的套件介绍和命令说明。
  function help({ args, write }: CommandContext): void {
    if (args.length) throw new Error('Usage: help');
    write(createHelp(commands));
  }

  // 列出挂载根目录的直属条目。
  function ls({ args, write }: CommandContext): void {
    if (args.length) throw new Error('Usage: ls');
    write(files.list().join('\n'));
  }

  // 原样读取指定文件并使取消信号贯穿读取过程。
  async function cat({ args, signal, write }: CommandContext): Promise<void> {
    if (args.length !== 1) throw new Error('Usage: cat <filename>');
    write(await files.read(args[0]!, signal));
  }

  // 只对 cat 的第一个参数提供挂载路径补全。
  function completeFile({ args, prefix }: CompletionContext): readonly string[] {
    return args.length ? [] : files.complete(prefix);
  }

  const commands: Commands = {
    help: { description: 'Show LunarKit features and available commands.', run: help },
    ls: { description: 'List files in the mounted directory.', run: ls },
    cat: { description: 'Print a file: cat <filename>.', run: cat, complete: completeFile },
  };
  return commands;
}

import { completeCommand } from './complete.js';
import { parseCommand } from './parse.js';
import type { Commands, TerminalOutput } from './types.js';

// 管理单个运行命令的取消信号，过滤已取消任务的异步结果。
export function createCommandRuntime(commands: Commands, write: (output: TerminalOutput) => void) {
  // 当前控制器同时作为任务身份，防止旧任务覆盖新任务状态。
  let active: AbortController | undefined;

  // 判断运行状态以保护串行提交。
  function isBusy(): boolean {
    return active !== undefined;
  }

  // 取消当前任务并立即释放提交状态。
  function interrupt(): void {
    const previous = active;
    active = undefined;
    previous?.abort();
  }

  // 解析输入并执行命令，将有效任务的输出交给终端。
  async function execute(text: string): Promise<void> {
    if (active) return;
    const controller = new AbortController();
    active = controller;
    // 只写入当前仍有效的命令输出。
    function guardedWrite(output: TerminalOutput): void {
      if (active === controller && !controller.signal.aborted) write(output);
    }
    try {
      const [name, ...args] = parseCommand(text);
      if (!name) return;
      const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
      if (!command) throw new Error(`Unknown command: ${name}. Type help for commands.`);
      await command.run({ args, signal: controller.signal, write: guardedWrite });
    } catch (error) {
      guardedWrite(error instanceof Error ? error.message : String(error));
    } finally {
      if (active === controller) active = undefined;
    }
  }

  // 调用当前配置的命令或参数补全器。
  function complete(text: string, cursor: number) {
    return completeCommand(commands, text, cursor);
  }

  return { execute, interrupt, isBusy, complete };
}

import { completeCommand } from './complete.js';
import { parseCommand } from './parse.js';
import type { CommandInteraction, Commands, InteractivePanel, ReadOptions, TerminalOutput } from './types.js';

// 管理单个运行命令的取消信号，过滤已取消任务的异步结果。
export function createCommandRuntime(commands: Commands, write: (output: TerminalOutput) => void, interaction?: CommandInteraction) {
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
      // 在当前任务仍有效时请求一行交互输入。
      function read(options: ReadOptions): Promise<string> {
        controller.signal.throwIfAborted();
        if (active !== controller || !interaction) return Promise.reject(new Error('Interactive input unavailable.'));
        return interaction.read(options, controller.signal);
      }
      // 将交互面板交给终端托管并等待关闭。
      function present(panel: InteractivePanel): Promise<void> {
        if (controller.signal.aborted || active !== controller || !interaction) {
          panel.dispose();
          return Promise.reject(controller.signal.reason ?? new Error('Interactive panel unavailable.'));
        }
        return interaction.present(panel, controller.signal);
      }
      // 更新当前会话的提示符并过滤迟到任务。
      function setPrompt(text: string): void {
        if (active === controller && !controller.signal.aborted) interaction?.setPrompt(text);
      }
      await command.run({ args, signal: controller.signal, write: guardedWrite, read, present, setPrompt });
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

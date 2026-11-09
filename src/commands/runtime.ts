import { disposeSafely } from '../lifecycle/cleanup.js';
import { completeCommand } from './complete.js';
import { parseCommand } from './parse.js';
import type { ChooseOptions, CommandInteraction, Commands, InteractivePanel, ReadOptions, TerminalOutput, RuntimeOptions, CommandEvent, TextOutputHandle } from './types.js';

// 管理单个运行命令的取消信号，过滤已取消任务的异步结果。
export function createCommandRuntime(commands: Commands, write: (output: TerminalOutput) => void, interaction?: CommandInteraction, onBusyChange?: (busy: boolean) => void, options: RuntimeOptions = {}) {
  // 当前控制器同时作为任务身份，防止旧任务覆盖新任务状态。
  let active: AbortController | undefined;
  let activeCommand = '';

  // 将消费端观察器异常与命令运行状态隔离。
  function notify(event: CommandEvent): void { try { options.onCommand?.(event); } catch (error) { report(error); } }
  // 错误通知自身失败时保留命令与资源清理流程。
  function report(error: unknown): void { try { options.onError?.(error); } catch { return; } }

  // 判断运行状态以保护串行提交。
  function isBusy(): boolean {
    return active !== undefined;
  }

  // 取消当前任务并立即释放提交状态。
  function interrupt(): void {
    const previous = active;
    const command = activeCommand;
    active = undefined;
    previous?.abort();
    if (previous) { onBusyChange?.(false); notify({ phase: 'cancel', command }); }
  }

  // 解析输入并执行命令，将有效任务的输出交给终端。
  async function execute(text: string): Promise<void> {
    if (active) {
      if (!canInterrupt(text)) return;
      interrupt();
    }
    const controller = new AbortController();
    active = controller;
    activeCommand = text;
    onBusyChange?.(true);
    notify({ phase: 'start', command: text });
    // 只写入当前仍有效的命令输出。
    function guardedWrite(output: TerminalOutput): void {
      if (active === controller && !controller.signal.aborted) write(output);
      else if (typeof output !== 'string' && 'element' in output) disposeSafely(output, report);
    }
    const handles: TextOutputHandle[] = [];
    // 命令中断时立即冻结已创建的文本流。
    function closeHandles(): void { for (const handle of handles) handle.close(); }
    controller.signal.addEventListener('abort', closeHandles, { once: true });
    try {
      controller.signal.throwIfAborted();
      const [name, ...args] = parseCommand(text);
      if (!name) return;
      const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
      if (!command) throw new Error((options.unknownCommand ?? 'Unknown command: {command}. Type help for commands.').replace('{command}', name));
      // 在当前任务仍有效时请求一行交互输入。
      function read(options: ReadOptions): Promise<string> {
        controller.signal.throwIfAborted();
        if (active !== controller || !interaction) return Promise.reject(new Error('Interactive input unavailable.'));
        return interaction.read(options, controller.signal);
      }
      // 将交互面板交给终端托管并等待关闭。
      function present(panel: InteractivePanel): Promise<void> {
        if (controller.signal.aborted || active !== controller || !interaction) {
          disposeSafely(panel, report);
          return Promise.reject(controller.signal.reason ?? new Error('Interactive panel unavailable.'));
        }
        return interaction.present(panel, controller.signal);
      }
      // 更新当前会话的提示符并过滤迟到任务。
      function setPrompt(text: string): void {
        if (active === controller && !controller.signal.aborted) interaction?.setPrompt(text);
      }
      // 为当前命令提供可取消的声明式选择。
      function choose(options: ChooseOptions): Promise<string> {
        controller.signal.throwIfAborted();
        if (active !== controller || !interaction?.choose) return Promise.reject(new Error('Interactive choices unavailable.'));
        return interaction.choose(options, controller.signal);
      }
      // 会话视图只能由仍有效的命令创建。
      function openView() {
        controller.signal.throwIfAborted();
        if (active !== controller || !interaction?.openView) throw new Error('Terminal views unavailable.');
        return interaction.openView();
      }
      // 等待当前任务的通用场景分页，过滤已取消的调用。
      function nextScene(): Promise<void> {
        controller.signal.throwIfAborted();
        if (active !== controller || !interaction?.nextScene) return Promise.reject(new Error('Terminal scenes unavailable.'));
        return interaction.nextScene(controller.signal);
      }
      // 批量写入在终端中统一收敛布局，取消时释放所有组件。
      function writeBatch(outputs: readonly TerminalOutput[]): void {
        if (active === controller && !controller.signal.aborted && interaction?.writeBatch) interaction.writeBatch(outputs);
        else for (const output of outputs) guardedWrite(output);
      }
      // 托管当前命令文本流，结束与取消后自动停止更新。
      function createTextOutput(initial = ''): TextOutputHandle {
        controller.signal.throwIfAborted();
        if (!interaction?.createTextOutput || active !== controller) throw new Error('Text output unavailable.');
        const output = interaction.createTextOutput(initial);
        handles.push(output);
        return output;
      }
      await command.run({ args, signal: controller.signal, write: guardedWrite, writeBatch, createTextOutput, read, choose, present, setPrompt, openView, nextScene });
    } catch (error) {
      if (active === controller && !controller.signal.aborted) {
        report(error);
        notify({ phase: 'error', command: text, error });
        if (options.showErrors !== false) guardedWrite(error instanceof Error ? error.message : String(error));
      }
    } finally {
      controller.signal.removeEventListener('abort', closeHandles);
      closeHandles();
      if (active === controller) {
        active = undefined;
        onBusyChange?.(false);
        notify({ phase: 'end', command: text });
      }
    }
  }

  // 调用当前配置的命令或参数补全器。
  function complete(text: string, cursor: number) {
    return completeCommand(commands, text, cursor);
  }

  // 仅允许消费端显式标记的命令替换当前任务。
  function canInterrupt(text: string): boolean {
    try {
      const [name] = parseCommand(text);
      return Boolean(name && Object.hasOwn(commands, name) && commands[name]?.interruptRunning);
    } catch {
      return false;
    }
  }

  return { execute, interrupt, isBusy, complete, canInterrupt };
}

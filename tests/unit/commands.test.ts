import { describe, expect, it } from 'vitest';
import { completeCommand } from '../../src/commands/complete';
import { parseCommand } from '../../src/commands/parse';
import { createCommandRuntime } from '../../src/commands/runtime';
import type { CommandContext, Commands, CompletionContext } from '../../src/commands/types';

// 验证命令解析保留参数内的空白和 Unicode。
function parsing(): void {
  expect(parseCommand('  cat "hello world.txt"  ')).toEqual(['cat', 'hello world.txt']);
  expect(parseCommand("cat '你好 🙂.txt'")).toEqual(['cat', '你好 🙂.txt']);
  expect(parseCommand('cat hello\\ world.txt')).toEqual(['cat', 'hello world.txt']);
  expect(parseCommand('cat ""')).toEqual(['cat', '']);
  expect(parseCommand('cat "a\\"b\\\\c"')).toEqual(['cat', 'a"b\\c']);
  expect(parseCommand('   ')).toEqual([]);
  // 验证未闭合引号的错误提示。
  function unclosed(): void {
    parseCommand('cat "unfinished');
  }
  // 验证输入末尾未完成转义的错误提示。
  function unfinishedEscape(): void {
    parseCommand('cat unfinished\\');
  }
  expect(unclosed).toThrow('Unclosed quote');
  expect(unfinishedEscape).toThrow('Unfinished escape');
}

// 创建用于验证补全规则的声明式命令配置。
function completionCommands(): Commands {
  // 提供包含空格、引号和目录的参数候选。
  function complete({ args }: CompletionContext): readonly string[] {
    return args.length ? [] : ['hello world.txt', 'hello.txt', 'docs/', 'docs/guide.md', 'quote".txt', '😀.txt', '😁.txt'];
  }
  // 使用空处理器隔离补全测试。
  function run(): void {}
  return {
    help: { description: 'help', run },
    hello: { description: 'hello', run },
    cat: { description: 'cat', run, complete },
  };
}

// 验证公共前缀、候选列表、引用参数及中间编辑。
function completion(): void {
  const commands = completionCommands();
  expect(completeCommand(commands, 'c', 1).text).toBe('cat ');
  expect(completeCommand(commands, 'h', 1).text).toBe('hel');
  expect(completeCommand(commands, 'hel', 3).candidates).toEqual(['hello', 'help']);
  expect(completeCommand(commands, 'cat "hello w', 12).text).toBe('cat "hello world.txt" ');
  expect(completeCommand(commands, 'cat quote', 9).text).toBe('cat "quote\\".txt" ');
  expect(completeCommand(commands, 'cat d', 5).text).toBe('cat docs/');
  expect(completeCommand(commands, 'cat nonexistent', 15).text).toBe('cat nonexistent');
  expect(completeCommand(commands, 'c help', 1).text).toBe('cat help');
  expect(completeCommand(commands, 'cat hello.txt tail', 10).text).toBe('cat hello.txt tail');
  expect(completeCommand(commands, 'cat one ', 8).candidates).toEqual([]);
  const emoji = completeCommand(commands, 'cat ', 4);
  expect(emoji.text).toBe('cat ');
  expect(emoji.candidates).toContain('😀.txt');
  // 提供共享 UTF-16 高代理项的两个完整 emoji 候选。
  function completeEmoji(): readonly string[] {
    return ['😀.txt', '😁.txt'];
  }
  const emojiCommands: Commands = { cat: { ...commands.cat!, complete: completeEmoji } };
  expect(completeCommand(emojiCommands, 'cat ', 4).text).toBe('cat ');
}

// 验证取消后旧任务结果和错误均被过滤，新任务可立即执行。
async function cancellation(): Promise<void> {
  const outputs: string[] = [];
  let resolve!: () => void;
  let signal!: AbortSignal;
  // 收集终端文本输出。
  function write(output: unknown): void {
    outputs.push(String(output));
  }
  // 模拟遵循取消信号但仍可能迟到完成的命令。
  async function slow(context: CommandContext): Promise<void> {
    signal = context.signal;
    // 保存挂起命令的完成入口。
    function wait(done: () => void): void {
      resolve = done;
    }
    await new Promise<void>(wait);
    context.write('late');
    throw new Error('late error');
  }
  // 写出立即完成的后续命令结果。
  function quick(context: CommandContext): void {
    context.write('quick');
  }
  const runtime = createCommandRuntime({ slow: { description: '', run: slow }, quick: { description: '', run: quick } }, write);
  const previous = runtime.execute('slow');
  expect(runtime.isBusy()).toBe(true);
  await runtime.execute('quick');
  expect(outputs).toEqual([]);
  runtime.interrupt();
  expect(signal.aborted).toBe(true);
  expect(runtime.isBusy()).toBe(false);
  await runtime.execute('quick');
  resolve();
  await previous;
  expect(outputs).toEqual(['quick']);
  expect(runtime.isBusy()).toBe(false);
  await runtime.execute('toString');
  expect(outputs.at(-1)).toContain('Unknown command');
  await runtime.execute('"');
  expect(outputs.at(-1)).toBe('Unclosed quote.');
  await runtime.execute('');
  expect(runtime.isBusy()).toBe(false);
}

// 组织解析、补全和命令运行态测试。
function suite(): void {
  it('解析引用及转义参数', parsing);
  it('补全命令和文件参数', completion);
  it('取消隔离迟到结果', cancellation);
}

describe('commands', suite);

export interface CommandToken {
  value: string;
  start: number;
  end: number;
}

// 按引号和转义规则拆分参数，并为补全保留原文位置。
export function tokenizeCommand(text: string, partial = false): CommandToken[] {
  const tokens: CommandToken[] = [];
  let position = 0;
  while (position < text.length) {
    if (/\s/u.test(text[position]!)) {
      position += 1;
      continue;
    }
    const start = position;
    let value = '';
    // 引号状态允许带空格文件名作为一个参数。
    let quote = '';
    while (position < text.length) {
      const character = text[position]!;
      if (!quote && /\s/u.test(character)) break;
      if (character === '\\' && quote !== "'") {
        position += 1;
        if (position === text.length) {
          if (!partial) throw new Error('Unfinished escape.');
          break;
        }
        value += text[position]!;
      } else if (character === quote) {
        quote = '';
      } else if (!quote && (character === '"' || character === "'")) {
        quote = character;
      } else {
        value += character;
      }
      position += 1;
    }
    if (quote && !partial) throw new Error('Unclosed quote.');
    tokens.push({ value, start, end: position });
  }
  return tokens;
}

// 返回可直接交给命令处理器的参数值。
export function parseCommand(text: string): string[] {
  const values: string[] = [];
  for (const token of tokenizeCommand(text)) values.push(token.value);
  return values;
}

// 将包含空白或语法字符的候选转换为安全参数。
export function quoteArgument(value: string): string {
  return value && !/[\s'"\\]/u.test(value) ? value : `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

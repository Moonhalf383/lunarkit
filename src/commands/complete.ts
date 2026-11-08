import { quoteArgument, tokenizeCommand } from './parse.js';
import type { Commands, CompletionCandidate, CompletionResult } from './types.js';

// 计算全部候选共有的可补全前缀。
function commonPrefix(candidates: readonly string[]): string {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const prefix: string[] = [];
  for (const { segment } of segmenter.segment(candidates[0] ?? '')) prefix.push(segment);
  for (const candidate of candidates) {
    while (!candidate.startsWith(prefix.join(''))) prefix.pop();
  }
  return prefix.join('');
}

// 以光标所在参数为单位补全，并保留光标后的输入。
export function completeCommand(commands: Commands, text: string, cursor: number): CompletionResult {
  const before = text.slice(0, cursor);
  const tokens = tokenizeCommand(before, true);
  const last = tokens.at(-1);
  const active = last?.end === cursor ? last : undefined;
  const prefix = active?.value ?? '';
  const index = active ? tokens.length - 1 : tokens.length;
  const args: string[] = [];
  for (const token of tokens.slice(1, active ? -1 : undefined)) args.push(token.value);
  const name = tokens[0]?.value ?? '';
  const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
  const values = index === 0 ? Object.keys(commands) : (command?.complete?.({ args, prefix }) ?? []);
  const matches = new Map<string, CompletionCandidate>();
  for (const entry of values) {
    const candidate = typeof entry === 'string' ? { value: entry, description: commands[entry]?.description ?? '' } : entry;
    if (candidate.value.startsWith(prefix)) matches.set(candidate.value, candidate);
  }
  const candidates = [...matches.keys()].sort();
  const options: CompletionCandidate[] = [];
  const replacements: { text: string; cursor: number }[] = [];
  const fullTokens = tokenizeCommand(text, true);
  const end = fullTokens[index]?.end ?? cursor;
  const start = active?.start ?? cursor;
  const suffix = text.slice(end);
  for (const value of candidates) {
    options.push(matches.get(value)!);
    const insertion = quoteArgument(value) + (!value.endsWith('/') && !/^\s/u.test(suffix) ? ' ' : '');
    replacements.push({ text: text.slice(0, start) + insertion + suffix, cursor: start + insertion.length });
  }
  if (!candidates.length) return { text, cursor, candidates: [] };
  const replacement = candidates.length === 1 ? candidates[0]! : commonPrefix(candidates);
  if (replacement.length <= prefix.length && candidates.length > 1) return { text, cursor, candidates, options, replacements };
  const encoded = quoteArgument(replacement);
  const space = candidates.length === 1 && !replacement.endsWith('/') && !/^\s/u.test(suffix) ? ' ' : '';
  const insertion = encoded + space;
  return {
    text: text.slice(0, start) + insertion + suffix,
    cursor: start + insertion.length,
    candidates: [],
    options,
    replacements,
  };
}

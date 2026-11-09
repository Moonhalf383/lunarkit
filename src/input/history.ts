export interface InputHistoryOptions {
  limit?: number;
  filter?: (text: string) => boolean;
  deduplicate?: boolean;
}

export interface InputHistory {
  remember: (text: string) => void;
  previous: (draft: string) => string;
  next: (draft: string) => string;
  reset: () => void;
}

// 创建独立的输入历史并保留浏览历史前的草稿。
export function createInputHistory(options: InputHistoryOptions = {}): InputHistory {
  const limit = options.limit ?? 500;
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('Input history limit must be a nonnegative safe integer.');
  const entries: string[] = [];
  // 游标等于历史长度时表示正在编辑当前草稿。
  let position = 0;
  // 浏览历史前暂存的原始输入用于向下返回编辑现场。
  let savedDraft = '';

  // 保存每次提交的原文并重置浏览位置。
  function remember(text: string): void {
    if (limit && options.filter?.(text) !== false && (!options.deduplicate || entries.at(-1) !== text)) {
      entries.push(text);
      if (entries.length > limit) entries.splice(0, entries.length - limit);
    }
    reset();
  }

  // 放弃历史浏览并恢复新的草稿位置。
  function reset(): void {
    position = entries.length;
    savedDraft = '';
  }

  // 向前读取历史并在首次离开编辑位置时保存草稿。
  function previous(draft: string): string {
    if (entries.length === 0) return draft;
    if (position === entries.length) savedDraft = draft;
    position = Math.max(0, position - 1);
    return entries[position] ?? draft;
  }

  // 向后读取历史并在末尾恢复草稿。
  function next(draft: string): string {
    if (position === entries.length) return draft;
    position = Math.min(entries.length, position + 1);
    return position === entries.length ? savedDraft : (entries[position] ?? draft);
  }

  return { remember, previous, next, reset };
}

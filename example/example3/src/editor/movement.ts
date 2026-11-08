const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// 找到当前光标邻近的完整字素边界。
export function moveCharacter(text: string, position: number, direction: -1 | 1): number {
  const segments = segmenter.segment(text);
  if (direction < 0) return segments.containing(Math.max(0, position - 1))?.index ?? 0;
  const segment = segments.containing(position);
  return segment ? segment.index + segment.segment.length : text.length;
}

// 按行移动并尽量保留字素列，避免切入 emoji 或组合字符。
export function moveLine(text: string, position: number, direction: -1 | 1): number {
  const start = position === 0 ? 0 : text.lastIndexOf('\n', position - 1) + 1;
  const column = [...segmenter.segment(text.slice(start, position))].length;
  const target = direction < 0 ? (start <= 1 ? 0 : text.lastIndexOf('\n', start - 2) + 1) : text.indexOf('\n', position) + 1;
  if ((direction < 0 && start === 0) || (direction > 0 && target === 0)) return position;
  const end = text.indexOf('\n', target);
  const line = text.slice(target, end < 0 ? text.length : end);
  let offset = 0;
  let count = 0;
  for (const { segment } of segmenter.segment(line)) {
    if (count >= column) break;
    offset += segment.length;
    count += 1;
  }
  return target + offset;
}
